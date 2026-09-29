import assert from 'node:assert/strict';
import test from 'node:test';
import { decideReuse } from '../scripts/ci-reuse.mjs';

const tree = 'bee043a6eaea1a81d7cc7a4fa52924e44d54722b';
const repo = 'luv-jeri/cojeev-ui';
// Field names captured from GET /actions/runs/{id} and /actions/artifacts (2026-09-29).
const art = (o = {}) => ({ id: 1, name: `verified-tree-${tree}`, expired: false, expires_at: '2026-10-13T10:37:03Z', depth: 'full', workflow_run: { id: 36540645798, head_repository_id: 1360394020, repository_id: 1360394020 }, ...o });
const run = (o = {}) => ({ id: 36540645798, path: '.github/workflows/verify.yml', event: 'pull_request', conclusion: 'success', created_at: '2026-09-29T08:06:23Z', head_repository: { full_name: repo }, repository: { full_name: repo }, ...o });
const input = (o = {}) => ({ event: 'push', headTree: tree, requiredDepth: 'full', repository: repo, artifacts: [art()], runs: [run()], strictSince: '2026-09-01T00:00:00Z', now: '2026-09-29T10:40:00Z', ...o });

test('reuse_accepts_matching_tree', () => {
  assert.deepEqual(decideReuse(input()), { reuse: true, reason: 'reusing passing pull_request run 36540645798', runId: 36540645798 });
});
test('reuse_rejects_fork_run', () => {
  assert.equal(decideReuse(input({ runs: [run({ head_repository: { full_name: 'evil/cojeev-ui' } })] })).reuse, false);
  assert.equal(decideReuse(input({ runs: [run({ head_repository: null })] })).reuse, false);
});
test('reuse_rejects_failed_or_cancelled_run', () => {
  for (const conclusion of ['failure', 'cancelled', null, undefined]) assert.equal(decideReuse(input({ runs: [run({ conclusion })] })).reuse, false);
  assert.equal(decideReuse(input({ runs: [run({ event: 'push' })] })).reuse, false);
  assert.equal(decideReuse(input({ runs: [run({ path: '.github/workflows/other.yml' })] })).reuse, false);
  assert.equal(decideReuse(input({ runs: [run({ created_at: '2026-08-01T00:00:00Z' })] })).reuse, false);
});
test('reuse_rejects_tree_mismatch', () => {
  assert.equal(decideReuse(input({ headTree: 'a'.repeat(40) })).reuse, false);
  assert.equal(decideReuse(input({ headTree: 'bee04' })).reuse, false);
  assert.equal(decideReuse(input({ artifacts: [art({ name: 'verified-tree-BEE043A6EAEA1A81D7CC7A4FA52924E44D54722B' })] })).reuse, false);
});
test('reuse_rejects_weaker_depth_marker', () => {
  assert.equal(decideReuse(input({ artifacts: [art({ depth: 'affected' })], requiredDepth: 'full' })).reuse, false);
  assert.equal(decideReuse(input({ artifacts: [art({ depth: 'docs' })], requiredDepth: 'affected' })).reuse, false);
  assert.equal(decideReuse(input({ artifacts: [art({ depth: 'affected' })], requiredDepth: 'affected' })).reuse, true);
  assert.equal(decideReuse(input({ artifacts: [art({ depth: 'affected' })], requiredDepth: 'docs' })).reuse, true);
  assert.equal(decideReuse(input({ artifacts: [art({ depth: 'full' })], requiredDepth: 'docs' })).reuse, true);
  assert.equal(decideReuse(input({ artifacts: [art({ depth: 'bogus' })] })).reuse, false);
});
test('reuse_rejects_duplicate_artifacts', () => {
  assert.equal(decideReuse(input({ artifacts: [art(), art({ id: 2 })] })).reuse, false);
  assert.equal(decideReuse(input({ artifacts: [] })).reuse, false);
  assert.equal(decideReuse(input({ artifacts: [art({ expired: true })] })).reuse, false);
  assert.equal(decideReuse(input({ now: '2026-10-14T00:00:00Z' })).reuse, false);
});
test('reuse_rejects_dispatch', () => {
  for (const event of ['workflow_dispatch', 'pull_request', undefined]) assert.equal(decideReuse(input({ event })).reuse, false);
});
test('reuse_lookup_error_runs_checks', () => {
  for (const o of [{ artifacts: null }, { runs: undefined }, { runs: [] }, { now: 'garbage' }, { strictSince: undefined }, { requiredDepth: 'weird' }]) {
    const r = decideReuse(input(o));
    assert.equal(r.reuse, false);
    assert.ok(r.reason);
  }
  assert.equal(decideReuse().reuse, false);
});
test('reuse_still_builds_release_pair and deploy_needs_release_pack_on_pushed_commit: result is reuse-only, never a release-pack skip', () => {
  // Workflow assertions belong to Task 6; here the result has no field that could skip release-pack.
  for (const r of [decideReuse(input()), decideReuse(input({ event: 'workflow_dispatch' }))]) {
    assert.deepEqual(Object.keys(r).filter((k) => !['reuse', 'reason', 'runId'].includes(k)), []);
  }
});
