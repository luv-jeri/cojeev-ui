import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { lookup } from '../scripts/ci-reuse-lookup.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const wf = parse(fs.readFileSync(`${root}.github/workflows/verify.yml`, 'utf8'));
const steps = wf.jobs.verify.steps;
const step = (id) => steps.find((s) => s.id === id);
const REUSE_OFF = "steps.reuse.outputs.reuse != 'true'";

const tree = 'bee043a6eaea1a81d7cc7a4fa52924e44d54722b';
const repo = 'luv-jeri/cojeev-ui';
const env = { EVENT: 'push', TREE: tree, REQUIRED_DEPTH: 'full', REPOSITORY: repo, STRICT_SINCE: '2026-09-01T00:00:00Z', NOW: '2026-09-29T10:40:00Z' };
const art = { id: 7, name: `verified-tree-${tree}`, expired: false, expires_at: '2026-10-13T10:37:03Z', workflow_run: { id: 99 } };
const run = { id: 99, path: '.github/workflows/verify.yml', event: 'pull_request', conclusion: 'success', created_at: '2026-09-29T08:06:23Z', head_repository: { full_name: repo }, repository: { full_name: repo }, pull_requests: [] };
const api = (o = {}) => async (p) => {
  if (p.includes('/actions/artifacts')) return o.artifacts ?? { artifacts: [art] };
  if (p.endsWith('/actions/runs/99')) return 'run' in o ? o.run : run;
  throw new Error(`unexpected ${p}`);
};
const marker = async () => ({ depth: 'full', base: 'main' });

test('lookup_reuses_matching_pr_run', async () => {
  const r = await lookup({ env, api: api(), readMarker: marker });
  assert.deepEqual(r, { reuse: true, reason: 'reusing passing pull_request run 99', runId: 99 });
});
test('lookup_fails_closed_on_any_error', async () => {
  const boom = async () => { throw new Error('rate limited'); };
  assert.equal((await lookup({ env, api: boom, readMarker: marker })).reuse, false);
  assert.equal((await lookup({ env, api: api(), readMarker: boom })).reuse, false);
  assert.equal((await lookup({ env, api: api({ run: null }), readMarker: marker })).reuse, false);
  assert.equal((await lookup({ env, api: api({ artifacts: {} }), readMarker: marker })).reuse, false);
  assert.equal((await lookup({ env: { ...env, TREE: undefined }, api: api(), readMarker: marker })).reuse, false);
});
test('lookup_rejects_zero_or_many_artifacts_and_bad_marker', async () => {
  assert.equal((await lookup({ env, api: api({ artifacts: { artifacts: [] } }), readMarker: marker })).reuse, false);
  assert.equal((await lookup({ env, api: api({ artifacts: { artifacts: [art, { ...art, id: 8 }] } }), readMarker: marker })).reuse, false);
  assert.equal((await lookup({ env, api: api(), readMarker: async () => ({ depth: 'bogus', base: 'main' }) })).reuse, false);
  assert.equal((await lookup({ env, api: api(), readMarker: async () => ({ depth: 'affected', base: 'main' }) })).reuse, false);
});

test('deferred_run_writes_no_marker', () => {
  const m = steps.find((s) => s.uses?.startsWith('actions/upload-artifact') && String(s.with?.name).startsWith('verified-tree-'));
  assert.ok(m, 'marker upload step exists');
  assert.match(m.if, /steps\.launch_policy\.outputs\.deferred != 'true'/);
  assert.match(m.if, /github\.event_name == 'pull_request'/);
  assert.match(m.if, /head\.repo\.full_name == github\.repository/);
  assert.match(m.if, /success\(\)/);
  assert.doesNotMatch(m.if, /always\(\)/);
  assert.equal(m['continue-on-error'], true);
  assert.ok(steps.indexOf(m) > steps.findIndex((s) => s.name === 'Preserve sanitized browser gate evidence'), 'marker is the last gate step');
  const writer = steps[steps.indexOf(m) - 1];
  assert.equal(writer.if, m.if, 'file writer and upload share one condition');
});
test('marker_only_for_main_base', () => {
  const m = steps.find((s) => s.uses?.startsWith('actions/upload-artifact') && String(s.with?.name).startsWith('verified-tree-'));
  const writer = steps[steps.indexOf(m) - 1];
  assert.match(writer.run, /marker\.json/);
  for (const s of [writer, m]) assert.match(s.if, /github\.base_ref == 'main'/);
});
test('transient_harness_runs_under_a_targeted_catalogue', () => {
  const h = steps.find((s) => String(s.run).includes('docs-transient-timing.browser.mjs'));
  assert.ok(h);
  assert.ok(h.if.includes("(steps.depth.outputs.run_catalogue != 'true' || steps.depth.outputs.gate_ids != '')"), h.if);
  assert.match(h.if, /steps\.depth\.outputs\.run_transient == 'true'/);
});
test('depth_summary_reports_gate_ids_and_reuse_through_env', () => {
  const r = steps.find((s) => s.name === 'Report the selected release depth');
  assert.match(r.run, /Gate ids \| \$\{GATE_IDS:-all\}/);
  assert.match(r.run, /Reused verified tree \| \$\{REUSED:-no\}/);
  assert.equal(r.env.GATE_IDS, '${{ steps.depth.outputs.gate_ids }}');
  assert.equal(r.env.REUSED, '${{ steps.reuse.outputs.reuse }}');
  assert.ok(!r.run.includes('${{'));
});
test('reuse_never_on_dispatch_or_pr', () => {
  const l = step('reuse');
  assert.ok(l);
  assert.match(l.if, /github\.event_name == 'push'/);
  assert.match(l.if, /github\.ref == 'refs\/heads\/main'/);
  assert.equal(l['continue-on-error'], true);
  assert.equal(wf.jobs.verify.permissions.actions, 'read');
  assert.equal(wf.jobs.verify.permissions.contents, 'read');
  assert.match(l.env.STRICT_SINCE, /^\d{4}-\d\d-\d\dT/);
});
test('reuse_still_builds_release_pair', () => {
  const skipped = steps.filter((s) => s.if?.includes(REUSE_OFF));
  const cmds = skipped.map((s) => s.run ?? '').join('\n');
  for (const c of ['npm run lint', 'npm run typecheck', 'npm test', 'npm run gate']) assert.ok(cmds.includes(c), c);
  for (const s of steps) {
    const text = `${s.run ?? ''} ${s.name ?? ''} ${s.uses ?? ''}`;
    if (/build-variants|release-csp|release-install|release-\$\{\{|npm ci|Select release verification depth/.test(text)) {
      assert.ok(!s.if?.includes(REUSE_OFF), `must still run on reuse: ${text}`);
    }
  }
  const rel = step('release');
  assert.equal(rel.if, "steps.depth.outputs.run_release == 'true'");
});
test('deploy_needs_release_pack_on_pushed_commit', () => {
  assert.equal(wf.jobs.verify.outputs.beta_website_mounted_digest, '${{ steps.release.outputs.beta_website_mounted_digest }}');
  assert.match(wf.jobs.beta.if, /needs\.verify\.outputs\.run_release == 'true'/);
  assert.equal(wf.jobs.beta.needs, 'verify');
  assert.deepEqual(wf.jobs.production.needs, ['verify', 'beta']);
  assert.ok(!JSON.stringify(wf.jobs.beta).includes('steps.reuse') && !JSON.stringify(wf.jobs.production).includes('steps.reuse'));
  const up = steps.find((s) => s.uses?.startsWith('actions/upload-artifact') && s.with?.name === 'release-${{ github.sha }}');
  assert.equal(up.if, "steps.depth.outputs.run_release == 'true'");
});

test('marker_records_its_base_and_lookup_requires_main', async () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
  const writer = workflow.slice(workflow.indexOf('- name: Write the verified-tree marker'), workflow.indexOf('- name: Upload the verified-tree marker'));
  assert.match(writer, /"base":"%s"/);
  assert.match(writer, /BASE: \$\{\{ github\.base_ref \}\}/);
  assert.equal((await lookup({ env, api: api(), readMarker: async () => ({ depth: 'full' }) })).reuse, false, 'a marker from before the base field never reuses');
  assert.equal((await lookup({ env, api: api(), readMarker: async () => ({ depth: 'full', base: 'dev' }) })).reuse, false);
});
