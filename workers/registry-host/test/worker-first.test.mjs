import test from 'node:test';
import assert from 'node:assert/strict';
import {retainedTextInventory, workerFirstList, workerFirstProblems, FIXED_WORKER_FIRST} from '../../../scripts/worker-first.mjs';

const site = new URL('./fixtures/packaged-site/', import.meta.url).pathname;
test('legacy_text_exclusions_use_exact_root_files_and_scoped_directory_patterns', async () => {
  const inventory = await retainedTextInventory(site);
  assert.deepEqual(inventory, {rootFiles: ['/__next.$d$x.txt', '/index.txt', '/robots.txt'], directories: ['docs']});
  const list = workerFirstList(inventory);
  assert.deepEqual(list, ['/*', '!/_next/*', '!/ui/_next/*', '!/ui/*.txt', '!/ui/brand/*', '!/ui/icon.png', '!/ui/opengraph-image.png', '!/ui/twitter-image.png', '!/__next.$d$x.txt', '!/__next.%24d%24x.txt', '!/index.txt', '!/robots.txt', '!/docs/*.txt']);
  assert.deepEqual(workerFirstProblems(list, inventory), []);
  for (const rule of ['!/*.txt', '!/ui*', '!/ui*.txt', '!/u*', '!/docs/*', '!/media/*.txt', '!/about/*.txt']) {
    assert.ok(workerFirstProblems([...list, rule], inventory).length, rule);
  }
  assert.ok(workerFirstProblems(['/*', ...list.slice(2)], inventory).length);
  assert.ok(workerFirstProblems([...list, '!/invented.txt'], inventory).length);
  // Even an artifact-owned sibling must not bypass apex delegation.
  for (const inventory of [{rootFiles: ['/ui-new.txt'], directories: []}, {rootFiles: [], directories: ['uikit-extra']}]) {
    assert.ok(workerFirstProblems(workerFirstList(inventory), inventory).length);
  }
  assert.deepEqual(workerFirstList({rootFiles: ['/z.txt', '/a$.txt'], directories: ['z', 'doc$']}), [
    ...FIXED_WORKER_FIRST, '!/a$.txt', '!/a%24.txt', '!/z.txt', '!/doc$/*.txt', '!/doc%24/*.txt', '!/z/*.txt',
  ]);
});

test('generated_run_worker_first_list_stays_within_100_entry_limit', () => {
  const list = [...FIXED_WORKER_FIRST, ...Array.from({length: 92}, (_, i) => `!/file-${i}.txt`)];
  assert.deepEqual(workerFirstProblems(list), []);
  assert.ok(workerFirstProblems([...list, '!/extra.txt']).length);
  assert.ok(workerFirstProblems([...list.slice(0, 99), list[8], list[8]]).length);
});
