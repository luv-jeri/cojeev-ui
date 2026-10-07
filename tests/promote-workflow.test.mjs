import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {parse} from 'yaml';

const root = path.resolve(import.meta.dirname, '..');
const load = name => {
  const file = path.join(root, '.github/workflows', name);
  assert.ok(fs.existsSync(file), `${name} must exist`);
  return parse(fs.readFileSync(file, 'utf8'));
};
const expression = name => '${{ inputs.' + name + ' }}';
const inputNames = ['environment', 'side', 'target_phase', 'rollback', 'schema_ack',
  'run_id', 'commit', 'digest', 'peer_run_id', 'peer_commit', 'peer_phase', 'peer_digest',
  'current_run_id', 'current_commit', 'current_phase', 'current_digest', 'attest'];
const gateNames = ['live', 'component-head', 'ui-browser', 'browser-report', 'dual-install', 'discovery'];
function stepsOf(workflow) { return workflow.jobs.promote.steps; }
function get(steps, id) {
  const step = steps.find(value => value.id === id);
  assert.ok(step, `step ${id} must exist`);
  return step;
}
function baselineCondition(condition, peer, current) {
  assert.equal(condition, "inputs.peer_run_id == 'baseline' || inputs.current_run_id == 'baseline'");
  return Function('inputs', `return (${condition})`)({peer_run_id: peer, current_run_id: current});
}

// A missing gate, reordered mutation, wider secret scope or wrong artifact directory
// must reject the workflow before it can become a production deploy path.
test('promote_workflow_runs_gates_before_targeted_promotion', t => {
  const workflow = load('promote.yml'), job = workflow.jobs.promote, steps = stepsOf(workflow);
  for (const trigger of ['workflow_dispatch', 'workflow_call']) {
    const inputs = workflow.on[trigger].inputs;
    if (trigger === 'workflow_dispatch') assert.ok(Object.keys(inputs).length <= 25);
    assert.deepEqual(Object.keys(inputs).sort(), [...inputNames].sort());
    for (const name of inputNames) {
      assert.equal(inputs[name].type, ['rollback', 'schema_ack'].includes(name) ? 'boolean' :
        trigger === 'workflow_dispatch' && ['environment', 'side'].includes(name) ? 'choice' : 'string');
    }
  }
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.environment.options, ['beta', 'production']);
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.side.options, ['api', 'website']);
  assert.equal(job.if, "github.ref == 'refs/heads/main' && (inputs.side != 'api' || !inputs.rollback || inputs.schema_ack)");
  assert.equal(job.environment, expression('environment'));
  assert.deepEqual(job.concurrency, {group: 'deploy-${{ inputs.environment }}', 'cancel-in-progress': false});
  assert.deepEqual(job.permissions, {contents: 'read', actions: 'read', issues: 'write'});
  assert.equal(steps[0].with.ref, '${{ github.sha }}');
  assert.equal(steps[0].with['persist-credentials'], false);
  assert.equal(steps[1].with['node-version'], '22.22.0');
  assert.equal(steps[2].run, 'npm ci --ignore-scripts');
  assert.match(get(steps, 'runtime').run, /wrangler-runtime\/package\*\.json/);
  assert.equal(job.env.PROMOTION_EVIDENCE, undefined);
  assert.match(get(steps, 'runtime').run, /echo "PROMOTION_EVIDENCE=\$RUNNER_TEMP\/promotion-evidence\.jsonl" >> "\$GITHUB_ENV"/);
  const order = ['runtime', 'provenance', 'candidate', 'peer', 'current', 'baseline', 'verify', 'plan',
    ...gateNames, 'promote', 'post-live', 'post-component', 'failure'];
  const positions = order.map(id => steps.indexOf(get(steps, id)));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  for (const step of steps) {
    assert.notEqual(step['continue-on-error'], true);
    if (step.id !== 'failure') assert.doesNotMatch(step.if ?? '', /always\(\)|failure\(\)/);
    assert.doesNotMatch(step.run ?? '', /\$\{\{/); // Untrusted inputs reach Bash via env only.
  }
  for (const [id, prefix] of [['candidate', ''], ['peer', 'peer_'], ['current', 'current_']]) {
    const download = get(steps, id);
    assert.match(download.uses, /^actions\/download-artifact@[a-f0-9]{40}$/);
    assert.equal(download.with.name, 'release-' + expression(prefix + 'commit'));
    assert.equal(download.with['run-id'], expression(prefix + 'run_id'));
    assert.equal(download.with.path, 'artifacts/' + id);
    if (prefix) assert.equal(download.if, `inputs.${prefix}run_id != 'baseline'`);
  }
  const baseline = get(steps, 'baseline');
  assert.equal(baselineCondition(baseline.if, 'baseline', '123'), true);
  assert.equal(baselineCondition(baseline.if, '123', 'baseline'), true);
  assert.equal(baselineCondition(baseline.if, '123', '456'), false);
  assert.match(baseline.run, /scripts\/release-baseline\.json/);
  assert.match(baseline.run, /gh release download migration-baseline -p "release-\$BASELINE_COMMIT\.tar\.gz"/);
  assert.match(baseline.run, /tar -xzf .* -C artifacts\/baseline/);
  // Execute the actual download/extraction/export block against a local pinned archive.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'promote-baseline-'));
  t.after(() => fs.rmSync(scratch, {recursive: true, force: true}));
  for (const directory of ['scripts', 'bin', 'source/beta', 'source/production', 'remote']) fs.mkdirSync(path.join(scratch, directory), {recursive: true});
  fs.copyFileSync(path.join(root, 'scripts/release-phases.mjs'), path.join(scratch, 'scripts/release-phases.mjs'));
  fs.copyFileSync(path.join(root, 'tests/fixtures/release-baseline/release-baseline.json'), path.join(scratch, 'scripts/release-baseline.json'));
  const record = JSON.parse(fs.readFileSync(path.join(scratch, 'scripts/release-baseline.json'), 'utf8'));
  for (const target of ['beta', 'production']) fs.writeFileSync(path.join(scratch, 'source', target, 'manifest.json'), '{}');
  for (const commit of new Set([record.beta.commit, record.production.commit])) {
    const archive = spawnSync('tar', ['-czf', `remote/release-${commit}.tar.gz`, '-C', 'source', 'beta', 'production'], {cwd: scratch});
    assert.equal(archive.status, 0, archive.stderr?.toString());
  }
  fs.writeFileSync(path.join(scratch, 'bin/gh'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.slice(0, 3).join(' ') !== 'release download migration-baseline') process.exit(8);
const file = args[args.indexOf('-p') + 1], dir = args[args.indexOf('--dir') + 1];
fs.copyFileSync('remote/' + file, dir + '/' + file);
fs.appendFileSync('downloads.jsonl', JSON.stringify(args) + '\\n');
`, {mode: 0o755});
  for (const target of ['beta', 'production']) {
    fs.rmSync(path.join(scratch, 'artifacts'), {recursive: true, force: true});
    fs.writeFileSync(path.join(scratch, 'env'), '');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', baseline.run], {
      cwd: scratch, env: {PATH: `${path.dirname(process.execPath)}:${scratch}/bin:${process.env.PATH}`, TARGET: target, GITHUB_ENV: path.join(scratch, 'env')},
    });
    assert.equal(result.status, 0, result.stderr?.toString());
    assert.equal(fs.readFileSync(path.join(scratch, 'env'), 'utf8'), `BASELINE_${target.toUpperCase()}_DIRECTORY=artifacts/baseline/${target}\n`);
    assert.ok(fs.existsSync(path.join(scratch, 'artifacts/baseline', target, 'manifest.json')));
  }
  const downloads = fs.readFileSync(path.join(scratch, 'downloads.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(downloads.map(args => args[args.indexOf('-p') + 1]), [`release-${record.beta.commit}.tar.gz`, `release-${record.production.commit}.tar.gz`]);
  const verify = get(steps, 'verify');
  assert.match(verify.run, /node scripts\/release\.mjs verify "\$TARGET" "\$COMMIT" "artifacts\/candidate\/\$TARGET\/\$SIDE-\$TARGET_PHASE" "\$DIGEST"/);
  assert.match(verify.run, /verify "\$TARGET" "\$PEER_COMMIT"/);
  assert.match(verify.run, /verify "\$TARGET" "\$CURRENT_COMMIT"/);
  const plan = get(steps, 'plan');
  assert.match(plan.run, /node scripts\/release\.mjs live-pair "\$TARGET" "\$SIDE" "\$TARGET_PHASE"/);
  assert.match(plan.run, /--rollback/);
  // Run plan wiring locally: either stale identity or a failed plan must block gates.
  fs.writeFileSync(path.join(scratch, 'bin/node'), `#!${process.execPath}
const fs = require('node:fs');
fs.writeFileSync('plan-args.json', JSON.stringify(process.argv.slice(2)));
if (process.env.FAIL_PLAN === 'true') process.exit(1);
fs.appendFileSync(process.env.GITHUB_OUTPUT, 'website_id=' + process.env.LIVE_WEBSITE_ID + '\\napi_id=' + process.env.LIVE_API_ID + '\\n');
`, {mode: 0o755});
  for (const [side, rollback, stale, fail, status] of [
    ['api', 'false', '', 'false', 0], ['website', 'true', '', 'false', 0],
    ['api', 'true', 'peer', 'false', 1], ['website', 'false', 'peer', 'false', 1],
    ['api', 'false', 'current', 'false', 1], ['website', 'true', 'current', 'false', 1],
    ['website', 'false', '', 'true', 1],
  ]) {
    const peer = side === 'api' ? 'website-mounted-peer' : 'api-linked-peer';
    const current = side === 'api' ? 'api-prepared-current' : 'website-mounted-current';
    fs.writeFileSync(path.join(scratch, 'output'), '');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', plan.run], {
      cwd: scratch, env: {PATH: `${scratch}/bin:${process.env.PATH}`, TARGET: 'beta', SIDE: side,
        TARGET_PHASE: side === 'api' ? 'linked' : 'regenerated', ROLLBACK: rollback,
        PEER_ID: stale === 'peer' ? 'stale' : peer, CURRENT_ID: stale === 'current' ? 'stale' : current,
        LIVE_WEBSITE_ID: side === 'api' ? peer : current, LIVE_API_ID: side === 'api' ? current : peer,
        FAIL_PLAN: fail, GITHUB_OUTPUT: path.join(scratch, 'output')},
    });
    assert.equal(result.status, status, result.stderr?.toString());
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(scratch, 'plan-args.json'), 'utf8')),
      ['scripts/release.mjs', 'live-pair', 'beta', side, side === 'api' ? 'linked' : 'regenerated', ...(rollback === 'true' ? ['--rollback'] : [])]);
  }
  for (const gate of gateNames) {
    const step = get(steps, gate);
    assert.equal(step.if, `contains(format(',{0},', steps.plan.outputs.gates), ',${gate},')`);
    assert.match(step.run, new RegExp('record-gate "\\$PROMOTION_EVIDENCE" "\\$TARGET" ' + gate + ' "\\$WEBSITE_ID" "\\$API_ID"'));
    assert.equal(step.env.WEBSITE_ID, '${{ steps.plan.outputs.website_id }}');
    assert.equal(step.env.API_ID, '${{ steps.plan.outputs.api_id }}');
  }
  const commands = {
    live: 'node scripts/release.mjs live', 'component-head': 'node scripts/deployed-component-gate.mjs',
    'ui-browser': 'node tests/navigation-ui.browser.mjs', 'dual-install': 'node scripts/live-install.mjs',
    discovery: 'node scripts/check-discovery.mjs shadcn-template',
  };
  for (const [gate, command] of Object.entries(commands)) {
    const run = get(steps, gate).run;
    assert.ok(run.indexOf(command) < run.indexOf('record-gate'));
  }
  assert.match(get(steps, 'ui-browser').run, /npx playwright install --with-deps chromium/);
  assert.match(get(steps, 'ui-browser').env.UI_BROWSER_URL, /https:\/\/cojeev\.com\/ui\//);
  assert.match(get(steps, 'ui-browser').env.UI_BROWSER_URL, /https:\/\/beta\.000h\.cojeev\.com\/ui\//);
  assert.match(get(steps, 'browser-report').run, /--attest="\$ATTEST"/);
  const discovery = get(steps, 'discovery').run;
  assert.match(discovery, /robots docs\/reports\/2026-10-01-move-baseline\/apex-robots\.before\.txt/);
  assert.match(discovery, /'https:\/\/cojeev\.com\/ui\/r\/\{name\}\.json' button,cojeev,bento-builder/);
  const check = discovery.indexOf('[[ -n "${ATTEST//[[:space:]]/}" ]]');
  assert.ok(check > discovery.indexOf('shadcn-template') && check < discovery.indexOf('record-gate'));
  // Exercise the actual whitespace guard, including a value that looks like shell code.
  const guard = discovery.slice(check, discovery.indexOf('node scripts/release-phases.mjs', check));
  for (const [attest, status] of [['', 1], [' \n\t ', 1], ['Owner checked discovery', 0], ['$(exit 9)', 0]]) {
    const result = spawnSync('bash', ['-e', '-c', guard], {env: {PATH: process.env.PATH, ATTEST: attest}});
    assert.equal(result.status, status);
  }
  const promote = get(steps, 'promote');
  assert.match(promote.run, /node scripts\/release\.mjs "promote-\$SIDE" "\$TARGET" "\$COMMIT" "artifacts\/candidate\/\$TARGET\/\$SIDE-\$TARGET_PHASE" "\$DIGEST" "\$PEER_ID"/);
  for (const key of ['PEER_DIRECTORY', 'PEER_DIGEST']) assert.ok(promote.env[key]);
  // The reviewed ack must name the newest migration (R-A22-1): adding 0005 fails here until a PR re-confirms rollback safety.
  const newest = fs.readdirSync(path.join(root, 'workers/reporting/migrations')).filter(name => name.endsWith('.sql')).sort().at(-1);
  assert.equal(promote.env.ROLLBACK_SCHEMA_ACK, `\${{ inputs.side == 'api' && inputs.rollback && '${newest}' || '' }}`);
  for (const name of ['promote.yml', 'rollback.yml'])
    for (const [named] of fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8').matchAll(/\b\d{4}_[a-z_]+\.sql\b/g))
      assert.equal(named, newest, `${name} names ${named}`);
  assert.match(get(steps, 'post-live').run, /node scripts\/release\.mjs live/);
  assert.equal(get(steps, 'post-component').if, "steps.plan.outputs.result_pair == 'Linked' || steps.plan.outputs.result_pair == 'Redirect'");
  for (const id of ['component-head', 'post-component']) {
    const step = get(steps, id);
    assert.match(step.run, /node scripts\/deployed-component-gate\.mjs "\$TARGET"/);
    assert.equal(step.env.ADMIN_TOKEN, '${{ secrets.REPORTING_ADMIN_TOKEN }}');
    assert.equal(step.env.COMPONENT_GATE_REPORT_ID, '${{ vars.COMPONENT_GATE_REPORT_ID }}');
    assert.equal(step.env.COMPONENT_GATE_CONTACT, '${{ vars.COMPONENT_GATE_CONTACT }}');
  }
  const allowed = {
    REPORTING_SECRETS_JSON: ['promote'], REPORTING_ADDITIONAL_SECRETS_JSON: ['promote'],
    RESEND_WEBHOOK_SECRET: ['promote'], REPORTING_ADMIN_TOKEN: ['promote', 'component-head', 'post-component'],
    CLOUDFLARE_API_TOKEN: ['plan', 'promote'], HEALTH_TOKEN: ['live', 'post-live'],
  };
  assert.doesNotMatch(JSON.stringify(job.env), /secrets\./);
  for (const [secret, ids] of Object.entries(allowed)) {
    const owners = steps.filter(step => JSON.stringify(step).includes(`secrets.${secret}`)).map(step => step.id);
    assert.deepEqual(owners.sort(), [...ids].sort(), secret);
  }
  assert.ok(!steps.some(step => /upload-artifact|cache@/.test(step.uses ?? '')));
  for (const file of fs.readdirSync(path.join(root, '.github/workflows'))) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'), /plan-promotion/);
  }
});

test('rollback_workflow_is_targeted_and_keeps_provenance', t => {
  const rollback = load('rollback.yml');
  assert.deepEqual(Object.keys(rollback.jobs), ['rollback']);
  const job = rollback.jobs.rollback;
  assert.equal(job.uses, './.github/workflows/promote.yml');
  assert.equal(job.with.rollback, true);
  assert.equal(job.secrets, 'inherit');
  assert.ok(!job.steps && !job.environment && !job.concurrency);
  assert.deepEqual(Object.keys(rollback.on.workflow_dispatch.inputs).sort(), inputNames.filter(name => !['rollback', 'attest'].includes(name)).sort());
  for (const input of Object.keys(rollback.on.workflow_dispatch.inputs)) assert.equal(job.with[input], expression(input));
  assert.doesNotMatch(JSON.stringify(rollback), /release\.mjs (rollback|deploy)/);
  const provenance = get(stepsOf(load('promote.yml')), 'provenance').run;
  for (const [run, commit] of [['RUN_ID', 'COMMIT'], ['PEER_RUN_ID', 'PEER_COMMIT'], ['CURRENT_RUN_ID', 'CURRENT_COMMIT']]) {
    assert.ok(provenance.includes(`node scripts/release-rollback-run.mjs "$${run}" "$${commit}"`));
    if (run !== 'RUN_ID') assert.ok(provenance.includes(`"$${run}" != baseline`));
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'promote-provenance-'));
  t.after(() => fs.rmSync(scratch, {recursive: true, force: true}));
  fs.mkdirSync(path.join(scratch, 'bin'));
  fs.writeFileSync(path.join(scratch, 'bin/node'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
if (args[1] === process.env.FAIL_RUN) process.exit(1);
`, {mode: 0o755});
  const env = {PATH: `${scratch}/bin:${process.env.PATH}`, TARGET: 'beta', SIDE: 'website', TARGET_PHASE: 'regenerated',
    RUN_ID: '101', COMMIT: 'a'.repeat(40), PEER_RUN_ID: '102', PEER_COMMIT: 'b'.repeat(40), PEER_PHASE: 'linked',
    CURRENT_RUN_ID: '103', CURRENT_COMMIT: 'c'.repeat(40), CURRENT_PHASE: 'mounted'};
  for (const [peer, current, fail, wanted, status] of [
    ['102', '103', '', ['101', '102', '103'], 0],
    ['baseline', '103', '', ['101', '103'], 0],
    ['102', 'baseline', '', ['101', '102'], 0],
    ['baseline', 'baseline', '', ['101'], 0],
    ['102', '103', '101', ['101'], 1],
    ['102', '103', '102', ['101', '102'], 1],
    ['102', '103', '103', ['101', '102', '103'], 1],
  ]) {
    fs.writeFileSync(path.join(scratch, 'calls.jsonl'), '');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', provenance], {
      cwd: scratch, env: {...env, PEER_RUN_ID: peer, CURRENT_RUN_ID: current, FAIL_RUN: fail},
    });
    assert.equal(result.status, status, result.stderr?.toString());
    const calls = fs.readFileSync(path.join(scratch, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(calls.map(args => args[1]), wanted);
    for (const args of calls) assert.equal(args[0], 'scripts/release-rollback-run.mjs');
  }
});

test('health_recovery_and_diagnostics_keep_existing_protections', () => {
  const steps = stepsOf(load('promote.yml')), failure = get(steps, 'failure');
  assert.equal(failure.if, 'failure()');
  assert.match(failure.run, /node scripts\/operations-health\.mjs "\$TARGET"/);
  assert.equal(failure.env.EXPECTED_WEBSITE_ID, '${{ steps.verify.outputs.expected_website_id }}');
  assert.equal(failure.env.EXPECTED_API_ID, '${{ steps.verify.outputs.expected_api_id }}');
  assert.equal(failure.env.UPDATE_ALERT, 'true');
  assert.equal(failure.env.OPERATIONS_FAILURE, 'deployment-failed');
  assert.equal(failure.env.GH_TOKEN, '${{ github.token }}');
  assert.doesNotMatch(JSON.stringify(failure), /secrets\./);
  assert.ok(steps.indexOf(failure) > steps.indexOf(get(steps, 'post-component')));
});

test('workflow_and_job_env_never_use_the_runner_context', () => {
  // GitHub rejects the whole file when workflow- or job-level env reads runner.* (it exists only inside steps).
  const dir = path.join(root, '.github/workflows');
  for (const name of fs.readdirSync(dir).filter(file => /\.ya?ml$/.test(file))) {
    const workflow = parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const envs = [['workflow', workflow.env], ...Object.entries(workflow.jobs ?? {}).map(([id, job]) => [id, job.env])];
    for (const [where, env] of envs)
      for (const [key, value] of Object.entries(env ?? {}))
        assert.doesNotMatch(String(value), /\$\{\{[^}]*\brunner\./, `${name} ${where}.env.${key}`);
  }
});
