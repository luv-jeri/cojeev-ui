// Disposable child-browser boundary for the real production-gate runner tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

assert(process.argv.includes('--serve'), 'The runner must request an isolated static server');
const scenario = process.env.GATE_FIXTURE_SCENARIO;
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
};

if (path.basename(process.argv[1]) === 'check-motion.mjs') {
  write('motion-invocation.json', { args: process.argv.slice(2), execArgv: process.execArgv });
  write('artifacts/production-motion/results.json', {
    rows: [{ id: 'fixture-motion', pass: scenario !== 'motion-failure' }],
    checks: [{ name: 'fixture-check', pass: true }],
  });
  process.exitCode = scenario === 'motion-failure' ? 9 : 0;
} else {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')));
  const ids = args.ids.split(',');
  const worker = Number(args.output.match(/shard-(\d+)$/)?.[1] ?? 1);
  write(`invocations/${worker}.json`, { args: process.argv.slice(2), ids, output: args.output, pid: process.pid });

  // A serial runner cannot release this barrier: every child must have started
  // before any child writes its report or exits. No wall-time speed assertion.
  const deadline = Date.now() + 10_000;
  while (fs.readdirSync('invocations').length < Number(process.env.COJEEV_DOCS_SHARDS ?? 1)) {
    assert(Date.now() < deadline, 'All documentation workers must start concurrently');
    await delay(10);
  }

  const revisionStart = { commit: 'a'.repeat(40), dirty: false };
  const revisionEnd = { ...revisionStart };
  if (worker === 2 && scenario === 'different-source') revisionStart.commit = 'b'.repeat(40);
  if (worker === 2 && scenario === 'changed-source') revisionEnd.commit = 'b'.repeat(40);
  let entries = ids.map(id => ({
    id,
    layouts: [{ status: 'pass' }, { status: 'pass' }],
    preview: { status: 'pass' },
    behavior: { status: 'pass', detail: 'synthetic child boundary' },
    runtimeErrors: [],
  }));
  if (worker === 2 && scenario === 'duplicate-entry') entries.push(entries[0]);
  if (worker === 2 && scenario === 'missing-entry') entries = entries.slice(1);
  if (!(worker === 2 && ['missing-report', 'stale-report'].includes(scenario))) {
    write(`${args.output}/results.json`, {
      revisionStart, revisionEnd, entries,
      chrome: [{ worker, status: 'pass' }],
    });
  }
  process.exitCode = worker === 2 && scenario === 'docs-failure' ? 7 : 0;
}
