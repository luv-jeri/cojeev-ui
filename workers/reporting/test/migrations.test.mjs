import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

// Wrangler splits remote migrations at semicolons, and a comment can leave a statement with no SQL.
// Beta rejected 0008 for that reason ("SQL code did not contain a statement"); local runs did not split.
test('migrations hold only SQL statements, no comments', async () => {
  for (const name of (await readdir('workers/reporting/migrations')).filter(n => n.endsWith('.sql'))) {
    const sql = await readFile(`workers/reporting/migrations/${name}`, 'utf8');
    assert.doesNotMatch(sql, /\/\*|--/, `${name} has a comment; explain it in docs/reporting/README.md instead`);
  }
});
