import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { runTriage } from '../../../scripts/triage/run.ts';

let mf, db;
const admin = 'a'.repeat(64), token = 'b'.repeat(64), origin = 'http://localhost:3000';
before(async () => {
  const compiled = await build({ entryPoints: ['workers/reporting/src/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2026-09-01', d1Databases: ['DB'], r2Buckets: ['MEDIA'], bindings: { ENVIRONMENT: 'production', ALLOWED_ORIGINS: origin, SITE_URL: 'https://library.example.com/ui', LOCAL_MODE: 'true', ADMIN_TOKEN: admin, HEALTH_TOKEN: 'h'.repeat(64), IP_HASH_SECRET: 'local-test-contact-salt-'.repeat(3), GITHUB_REPOSITORY: 'owner/library', GITHUB_WEBHOOK_SECRET: 'webhook-test-secret', DELIVERY_ACTIVATED_AT: '2020-01-01T00:00:00Z' } }));
  db = await mf.getD1Database('DB');
  for (const name of (await readdir('workers/reporting/migrations')).filter(n => n.endsWith('.sql')).sort()) await db.exec((await readFile(`workers/reporting/migrations/${name}`, 'utf8')).replace(/\n/g, ' '));
});
after(async () => { await mf?.dispose(); });

const submit = async title => {
  const p = { id: randomUUID(), kind: 'bug', title, description: 'Switch to dark mode, then the menu disappears.', email: 'person@example.com', references: [], pins: [], attachments: [], diagnostics: null };
  const r = await mf.dispatchFetch('http://localhost/v1/reports', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': p.id }, body: JSON.stringify({ report: p, token, turnstileToken: '' }) });
  assert.equal(r.status, 201);
  return p;
};

test('triage against the local Worker with a stub Codex approves one report and rejects another', async () => {
  const good = await submit('Menu disappears'), spam = await submit('asdf');
  const seen = [];
  const result = await runTriage({
    fetch: (url, init) => mf.dispatchFetch(url, { ...init, headers: { ...init?.headers, Origin: origin } }),
    api: 'http://localhost', token: admin, model: 'stub-model', dryRun: false, log: () => {},
    judge: async r => {
      seen.push(r);
      return r.id === good.id
        ? { decision: 'approved', reason: 'Clear steps.', title: 'Menu disappears in dark mode', body: 'Steps to reproduce.' }
        : { decision: 'rejected', reason: 'Test post.', title: 'Test post', body: 'Not actionable.' };
    }
  });
  assert.deepEqual(result, { approved: 1, rejected: 1, failed: 0, skipped: 0 });
  assert.ok(seen.every(r => !('email' in r)));
  const row = id => db.prepare('SELECT triage_state,triage_by,triage_model,triage_title FROM reports WHERE id=?').bind(id).first();
  assert.deepEqual(await row(good.id), { triage_state: 'approved', triage_by: 'ai', triage_model: 'stub-model', triage_title: 'Menu disappears in dark mode' });
  assert.equal((await row(spam.id)).triage_state, 'rejected');
  const kinds = async id => (await db.prepare("SELECT kind FROM outbox WHERE report_id=? AND kind IN ('github','email_rejected')").bind(id).all()).results.map(r => r.kind);
  assert.deepEqual(await kinds(good.id), ['github']);
  assert.deepEqual(await kinds(spam.id), ['email_rejected']);
  const again = await runTriage({ fetch: (u, i) => mf.dispatchFetch(u, i), api: 'http://localhost', token: admin, model: 'm', dryRun: true, log: () => {}, judge: async () => { throw new Error('nothing left to judge'); } });
  assert.equal(again.failed, 0);
});
