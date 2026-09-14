import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ids = ['golf', 'alpha', 'foxtrot', 'bravo', 'echo', 'charlie', 'delta'];
const docsOutput = 'artifacts/fixture-docs';
const registry = JSON.stringify({ items: [
  ...ids.map(name => ({ name, type: 'registry:ui' })),
  { name: 'not-a-component', type: 'registry:lib' },
] });

function runGate(t, { shards = 3, scenario = 'success', sourceSnapshot = false } = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'production-gate-test-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.mkdirSync(path.join(cwd, 'scripts'));
  fs.mkdirSync(path.join(cwd, 'out/r'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'registry.json'), registry);
  fs.writeFileSync(path.join(cwd, 'out/r/registry.json'), registry);
  // Execute an unchanged copy of the production entrypoint in an isolated cwd.
  // Only its expensive browser child programs are replaced; spawn, wait,
  // aggregation, assertions, report formatting and exit propagation stay real.
  fs.copyFileSync(path.join(root, 'scripts/run-production-gate.mjs'), path.join(cwd, 'scripts/run-production-gate.mjs'));
  for (const name of ['check-docs.mjs', 'check-motion.mjs']) {
    fs.copyFileSync(new URL('./fixtures/production-gate-child.mjs', import.meta.url), path.join(cwd, 'scripts', name));
  }
  fs.symlinkSync(fs.realpathSync(path.join(root, 'node_modules')), path.join(cwd, 'node_modules'), 'dir');
  if (scenario === 'stale-report') {
    const stale = path.join(cwd, docsOutput, 'shard-2/results.json');
    fs.mkdirSync(path.dirname(stale), { recursive: true });
    fs.writeFileSync(stale, '{}');
    fs.utimesSync(stale, new Date(0), new Date(0));
  }
  const env = { ...process.env, COJEEV_DOCS_EVIDENCE: docsOutput, GATE_FIXTURE_SCENARIO: scenario };
  delete env.COJEEV_DOCS_SHARDS;
  delete env.COJEEV_SOURCE_SNAPSHOT;
  if (shards !== undefined) env.COJEEV_DOCS_SHARDS = String(shards);
  if (sourceSnapshot) env.COJEEV_SOURCE_SNAPSHOT = '1';
  const result = spawnSync(process.execPath, ['scripts/run-production-gate.mjs'], {
    cwd, env, encoding: 'utf8', timeout: 20_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  const read = file => fs.existsSync(path.join(cwd, file)) ? fs.readFileSync(path.join(cwd, file), 'utf8') : null;
  return { ...result, read, json: file => JSON.parse(read(file)) };
}

for (const shards of [1, 2, 3]) {
  test(`real gate aggregates exact coverage from ${shards} concurrent documentation worker(s)`, t => {
    const run = runGate(t, { shards, sourceSnapshot: true });
    assert.equal(run.status, 0, run.stderr);
    const docs = run.json(`${docsOutput}/results.json`);
    assert.deepEqual(docs.entries.map(entry => entry.id).sort(), [...ids].sort());
    assert.equal(docs.chrome.length, shards);
    assert.deepEqual(docs.revisionStart, docs.revisionEnd);
    if (shards > 1) {
      assert.equal(docs.workers, shards);
      assert.deepEqual(docs.entries.map(entry => entry.id), [...ids].sort());
    }
    const pids = new Set();
    for (let worker = 1; worker <= shards; worker++) {
      const invocation = run.json(`invocations/${worker}.json`);
      const expectedIds = ids.filter((_, index) => index % shards === worker - 1);
      assert.deepEqual(invocation.ids, expectedIds);
      assert.equal(invocation.output, shards === 1 ? docsOutput : `${docsOutput}/shard-${worker}`);
      assert(invocation.args.includes('--serve'));
      assert(invocation.args.includes('--source-snapshot'));
      if (shards > 1) {
        for (const id of expectedIds) assert.equal(docs.entries.find(entry => entry.id === id).evidenceDirectory, invocation.output);
      }
      pids.add(invocation.pid);
    }
    assert.equal(pids.size, shards);
    const motion = run.json('motion-invocation.json');
    assert.deepEqual(motion.args, ['--serve']);
    assert.deepEqual(motion.execArgv, ['--import', 'tsx']);
    const gate = run.read('GATE.md');
    assert.match(gate, /Result: \*\*PASS\*\*/);
    assert.match(gate, /Documentation: 7 entries, 14 layouts/);
    assert.match(gate, /Motion presets: 1\/1/);
    assert(gate.includes(createHash('sha256').update(registry).digest('hex')));
  });
}

for (const scenario of ['docs-failure', 'motion-failure']) {
  test(`real gate propagates ${scenario} even with fresh, complete documentation evidence`, t => {
    const run = runGate(t, { scenario });
    assert.equal(run.status, 1, run.stderr);
    assert.equal(run.json(`${docsOutput}/results.json`).entries.length, ids.length);
    assert(run.read('motion-invocation.json'), 'The later motion gate must still run');
    assert.match(run.read('GATE.md'), /Result: \*\*FAIL\*\*/);
  });
}

for (const [scenario, message] of [
  ['missing-report', /Every worker must produce fresh evidence/],
  ['stale-report', /Every worker must produce fresh evidence/],
  ['duplicate-entry', /Every component must occur exactly once/],
  ['missing-entry', /Every component must occur exactly once/],
  ['different-source', /Workers must use the same source snapshot/],
  ['changed-source', /Source must remain unchanged during verification/],
]) {
  test(`real gate rejects ${scenario} before publishing aggregate evidence`, t => {
    const run = runGate(t, { scenario });
    assert.equal(run.status, 1);
    assert.match(run.stderr, message);
    assert.equal(run.read(`${docsOutput}/results.json`), null);
    assert.equal(run.read('motion-invocation.json'), null);
    assert.equal(run.read('GATE.md'), null);
  });
}

for (const shards of [0, 4, 1.5]) {
  test(`real gate refuses unsupported documentation worker count ${shards}`, t => {
    const run = runGate(t, { shards });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Use one to three independent documentation workers/);
    assert.equal(run.read('invocations/1.json'), null);
  });
}
