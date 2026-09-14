import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../scripts/run-component-polish.mjs', import.meta.url));
const files = ['choice-recovery.docs.browser.mjs', 'disclosure-recovery.docs.browser.mjs', 'workbench.browser.mjs', 'docs-compact-navigation.browser.mjs'];

for (const failAt of [-1, 1]) test(`polish runner ${failAt < 0 ? 'serves this export and runs all journeys' : 'propagates a child failure and stops later journeys'}`, t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'polish-runner-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.mkdirSync(path.join(cwd, 'tests'));
  fs.mkdirSync(path.join(cwd, 'out'));
  fs.writeFileSync(path.join(cwd, 'out/index.html'), 'local-checkpoint-fixture');
  for (const [index, file] of files.entries()) fs.writeFileSync(path.join(cwd, 'tests', file), `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    assert.equal(process.env.DOCS_BASE_URL, process.env.POLISH_URL);
    assert.match(await (await fetch(process.env.DOCS_BASE_URL + '/')).text(), /local-checkpoint-fixture/);
    assert.equal((await fetch(process.env.DOCS_BASE_URL + '/missing-component/')).status, 404);
    fs.appendFileSync('observed', '${index}');
    process.exit(${index === failAt ? 7 : 0});
  `);
  const env = { ...process.env };
  delete env.DOCS_BASE_URL;
  const result = spawnSync(process.execPath, [runner], { cwd, env, encoding: 'utf8', timeout: 20_000 });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, failAt < 0 ? 0 : 1, result.stderr);
  assert.equal(fs.readFileSync(path.join(cwd, 'observed'), 'utf8'), failAt < 0 ? '0123' : '01');
  if (failAt >= 0) assert.match(result.stderr, /disclosure-recovery.docs.browser.mjs failed \(7\)/);
});

test('polish runner refuses to test a public website instead of its candidate', () => {
  const result = spawnSync(process.execPath, [runner], {
    env: { ...process.env, DOCS_BASE_URL: 'https://example.invalid' }, encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /loopback preview/);
});
