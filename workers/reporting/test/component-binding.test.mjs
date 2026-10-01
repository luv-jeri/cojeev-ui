import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const production = {
  ENVIRONMENT: 'production',
  ALLOWED_ORIGINS: 'https://000h.cojeev.com,https://cojeev.com,https://feedback.cojeev.com,https://luv-jeri.github.io',
  SITE_URL: 'https://cojeev.com/ui',
  LEGACY_SITE_URL: 'https://000h.cojeev.com',
  RELEASE: 'test-release', DEPLOYMENT_ID: 'test-deployment', PHASE: 'switched',
};
const beta = {
  ...production, ENVIRONMENT: 'beta',
  ALLOWED_ORIGINS: 'https://beta.000h.cojeev.com,https://feedback-beta.cojeev.com',
  SITE_URL: 'https://beta.000h.cojeev.com/ui', LEGACY_SITE_URL: 'https://beta.000h.cojeev.com',
};
const admin = 'a'.repeat(64), token = 'b'.repeat(64);
const ipSecret = 'test-only-component-contact-salt-'.repeat(3);
const webhookSecret = 'test-only-component-webhook-secret';
const rejected = [
  'https://u:p@000h.cojeev.com/docs/x/',
  'https://000h.cojeev.com/docs/x/?a=1',
  'https://000h.cojeev.com/docs/x/#f',
  'http://000h.cojeev.com/docs/x/',
  'https://000h.cojeev.com/about/',
  'https://beta.000h.cojeev.com/docs/x/',
  'https://beta.000h.cojeev.com/ui/docs/x/',
  'https://cojeev.com/docs/button/',
  'https://cojeev.com/ui/about/',
];
const invalidComponent = error => error.status === 422;
const html = () => new Response(null, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
let mf, db, media, backend, issueNumber = 1000;
const registryCalls = [], outboundCalls = [];
const env = (more = {}) => ({
  ...production, DB: db, MEDIA: media, IP_HASH_SECRET: ipSecret,
  GITHUB_REPOSITORY: 'owner/library', GITHUB_WEBHOOK_SECRET: webhookSecret,
  DELIVERY_ACTIVATED_AT: '2020-01-01T00:00:00Z', ...more,
});
const request = (path, method = 'GET', body, auth, origin = 'https://cojeev.com') =>
  mf.dispatchFetch(`https://feedback.cojeev.com${path}`, {
    method, headers: { Origin: origin, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

async function seed(more = {}) {
  const id = randomUUID();
  const report = { id, kind: 'request', title: `Component request ${id}`, description: 'Please add this component.',
    email: 'person@example.com', references: [], pins: [], attachments: [], diagnostics: null };
  await backend.accept(new Request('http://localhost/v1/reports', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': id },
    body: JSON.stringify({ report, token }),
  }), env({ LOCAL_MODE: 'true', ...more }));
  await db.prepare("UPDATE reports SET triage_state='approved',issue_number=? WHERE id=?").bind(++issueNumber, id).run();
  return db.prepare('SELECT * FROM reports WHERE id=?').bind(id).first();
}

function releaseWebhook(row, component, delivery = randomUUID()) {
  const body = JSON.stringify({ action: 'closed', repository: { full_name: 'owner/library' }, issue: {
    number: row.issue_number, state: 'closed', state_reason: 'completed',
    labels: [{ name: 'feedback:released' }], updated_at: new Date().toISOString(), body: `Component: ${component}`,
  } });
  return new Request('https://feedback.cojeev.com/v1/github/webhook', { method: 'POST', body, headers: {
    'Content-Type': 'application/json', 'X-GitHub-Event': 'issues', 'X-GitHub-Delivery': delivery,
    'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', webhookSecret).update(body).digest('hex'),
  } });
}

async function snapshot(id) {
  return {
    report: await db.prepare('SELECT status,component_url,updated_at FROM reports WHERE id=?').bind(id).first(),
    topic: await db.prepare('SELECT status,component_url,updated_at FROM topics WHERE id=?').bind(id).first(),
    events: (await db.prepare('SELECT COUNT(*) AS n FROM webhook_events').first()).n,
    outbox: (await db.prepare('SELECT COUNT(*) AS n FROM outbox WHERE report_id=?').bind(id).first()).n,
  };
}

before(async () => {
  const compiled = await build({ entryPoints: ['workers/reporting/src/index.ts'], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022' });
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: compiled.outputFiles[0].text,
    compatibilityDate: '2026-09-01', d1Databases: ['DB'], r2Buckets: ['MEDIA'],
    bindings: { ...production, ADMIN_TOKEN: admin, IP_HASH_SECRET: ipSecret,
      GITHUB_REPOSITORY: 'owner/library', GITHUB_WEBHOOK_SECRET: webhookSecret },
    serviceBindings: { REGISTRY_SITE: async request => {
      registryCalls.push({ url: request.url, method: request.method });
      return html();
    } },
    outboundService: async request => {
      outboundCalls.push(request.url);
      return new Response(null, { status: 502 });
    },
  }));
  // Fail setup if this installed Miniflare cannot stub a binding with a function.
  const bindings = await mf.getBindings();
  assert.equal((await bindings.REGISTRY_SITE.fetch('https://cojeev.com/ui/docs/button/', { method: 'HEAD' })).status, 200);
  assert.deepEqual(registryCalls.splice(0), [{ url: 'https://cojeev.com/ui/docs/button/', method: 'HEAD' }]);
  db = await mf.getD1Database('DB'); media = await mf.getR2Bucket('MEDIA');
  for (const name of (await readdir('workers/reporting/migrations')).filter(n => n.endsWith('.sql')).sort())
    await db.exec((await readFile(`workers/reporting/migrations/${name}`, 'utf8')).replace(/\n/g, ' '));
  const helpers = await build({ stdin: { contents: `
    export { default as worker } from "./workers/reporting/src/index.ts";
    export { verifyLiveComponent, updateFromAdmin, webhook } from "./workers/reporting/src/lifecycle.ts";
    export { accept, componentURL } from "./workers/reporting/src/reports.ts";
    export { checkAbuse } from "./workers/reporting/src/security.ts";
    export { drain } from "./workers/reporting/src/delivery.ts";
  `, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022' });
  backend = await import(`data:text/javascript;base64,${Buffer.from(helpers.outputFiles[0].text).toString('base64')}`);
});
after(async () => { await mf?.dispose(); });

test('reporting_cors_accepts_cojeev_origin_without_path', async () => {
  const response = await request('/v1/reports', 'OPTIONS');
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://cojeev.com');
});

test('reporting_wrong_origin_remains_forbidden', async () => {
  for (const origin of ['https://cojeev.com.evil.example', 'https://000h.cojeev.com/ui', 'https://beta.000h.cojeev.com']) {
    const response = await request('/v1/reports', 'OPTIONS', undefined, undefined, origin);
    assert.equal(response.status, 403, origin);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('turnstile_hostname_and_reporting_action_are_verified', async t => {
  let result;
  const siteverify = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(init.method, 'POST');
    return Response.json({ success: true, ...result });
  });
  const check = () => backend.checkAbuse(new Request('https://feedback.cojeev.com/v1/reports', {
    headers: { Origin: 'https://cojeev.com', 'CF-Connecting-IP': randomUUID() },
  }), env({ TURNSTILE_SECRET: 'test-only-turnstile-secret' }), 'test-only-challenge', randomUUID());
  result = { hostname: 'cojeev.com', action: 'reporting' }; await check();
  result = { hostname: 'cojeev.com', action: 'other' };
  await assert.rejects(check, error => error.status === 403);
  result = { hostname: 'evil.example', action: 'reporting' };
  await assert.rejects(check, error => error.status === 403);
  assert.equal(siteverify.mock.callCount(), 3);
});

test('new_component_url_requires_canonical_docs_path', () => {
  assert.equal(backend.componentURL('https://cojeev.com/ui/docs/button/', env()), 'https://cojeev.com/ui/docs/button/');
  for (const value of ['https://cojeev.com/docs/button/', 'https://cojeev.com/ui/about/'])
    assert.throws(() => backend.componentURL(value, env()), invalidComponent);
});

test('approved_legacy_component_url_normalizes_before_direct_head', async t => {
  const globalFetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Global fetch forbidden.'); });
  const cases = [
    { settings: production, input: 'https://000h.cojeev.com/docs/button/', want: 'https://cojeev.com/ui/docs/button/' },
    { settings: beta, input: 'https://beta.000h.cojeev.com/docs/button/', want: 'https://beta.000h.cojeev.com/ui/docs/button/' },
    { settings: { ...production, SITE_URL: 'https://000h.cojeev.com' }, input: 'https://000h.cojeev.com/docs/button/', want: 'https://000h.cojeev.com/docs/button/' },
  ];
  for (const { settings, input, want } of cases) {
    const row = await seed(); const calls = [];
    await backend.updateFromAdmin(env({ ...settings, REGISTRY_SITE: { fetch: async (url, init) => {
      calls.push({ url, method: init.method, redirect: init.redirect, signal: init.signal }); return html();
    } } }), row.id, { status: 'resolved', componentUrl: input });
    assert.equal(calls.length, 1);
    assert.deepEqual({ url: calls[0].url, method: calls[0].method, redirect: calls[0].redirect },
      { url: want, method: 'HEAD', redirect: 'manual' });
    assert.ok(calls[0].signal instanceof AbortSignal);
    assert.equal((await snapshot(row.id)).report.component_url, want);
    assert.equal(backend.componentURL(input, env({ ...settings, SITE_URL: settings.SITE_URL + '/' })), want);
  }
  const row = await seed(); registryCalls.length = 0; outboundCalls.length = 0;
  assert.equal((await request(`/v1/admin/reports/${row.id}`, 'PATCH', {
    status: 'resolved', componentUrl: 'https://000h.cojeev.com/docs/button/',
  }, admin)).status, 200);
  assert.deepEqual(registryCalls, [{ url: 'https://cojeev.com/ui/docs/button/', method: 'HEAD' }]);
  assert.equal((await snapshot(row.id)).report.component_url, 'https://cojeev.com/ui/docs/button/');
  assert.equal(outboundCalls.length, 0); assert.equal(globalFetch.mock.callCount(), 0);
  assert.equal(await backend.verifyLiveComponent(env({ LOCAL_MODE: 'true' }), 'https://000h.cojeev.com/docs/button/'),
    'https://cojeev.com/ui/docs/button/');
});

test('component_normalization_rejects_credentials_queries_fragments_and_foreign_hosts', () => {
  for (const value of rejected) assert.throws(() => backend.componentURL(value, env()), invalidComponent, value);
});

test('invalid_component_input_never_dispatches_service_binding', async () => {
  const row = await seed(); registryCalls.length = 0; outboundCalls.length = 0;
  for (const componentUrl of rejected) {
    assert.equal((await request(`/v1/admin/reports/${row.id}`, 'PATCH', { status: 'resolved', componentUrl }, admin)).status, 422, componentUrl);
  }
  assert.equal(registryCalls.length, 0); assert.equal(outboundCalls.length, 0);
});

test('reporting_live_head_binds_only_same_environment_registry', async t => {
  const globalFetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Global fetch forbidden.'); });
  let calls = 0;
  for (const value of ['https://cojeev.com/ui/docs/button/', 'https://000h.cojeev.com/docs/button/'])
    await assert.rejects(() => backend.verifyLiveComponent(env({ ...beta,
      REGISTRY_SITE: { fetch: async () => { calls++; return html(); } },
    }), value), invalidComponent);
  assert.equal(calls, 0); assert.equal(globalFetch.mock.callCount(), 0);
});

test('component_head_failure_does_not_resolve_or_enqueue_notification', async t => {
  const seen = [];
  t.mock.method(AbortSignal, 'timeout', ms => {
    seen.push(ms);
    return AbortSignal.abort(new DOMException('', 'TimeoutError'));
  });
  const globalFetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Global fetch forbidden.'); });
  const failures = [
    ...[404, 301, 308].map(status => ({ name: String(status), reply: () => new Response(null, { status, headers: { 'Content-Type': 'text/html' } }) })),
    { name: 'plain text', reply: () => new Response(null, { headers: { 'Content-Type': 'text/plain' } }) },
    { name: 'throw', reply: () => { throw new Error('Registry unavailable.'); } },
    { name: '10 s timeout', reply: (_url, { signal }) => new Promise((resolve, reject) => {
      signal.throwIfAborted();
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }) },
    { name: 'missing binding' },
  ];
  for (const failure of failures) {
    const row = await seed(); const before = await snapshot(row.id); const calls = [];
    const settings = env({ REGISTRY_SITE: failure.reply ? { fetch: (url, init) => {
      calls.push({ url, method: init.method, redirect: init.redirect });
      return failure.reply(url, init);
    } } : undefined });
    // Both callers must stop before any report, webhook marker or outbox write.
    await Promise.all([
      assert.rejects(() => backend.updateFromAdmin(settings, row.id, { status: 'resolved', componentUrl: 'https://cojeev.com/ui/docs/button/' }), invalidComponent, failure.name),
      assert.rejects(() => backend.webhook(releaseWebhook(row, 'https://cojeev.com/ui/docs/button/'), settings), invalidComponent, failure.name),
    ]);
    assert.deepEqual(await snapshot(row.id), before, failure.name);
    assert.deepEqual(calls, failure.reply ? Array.from({ length: 2 }, () => ({
      url: 'https://cojeev.com/ui/docs/button/', method: 'HEAD', redirect: 'manual',
    })) : [], failure.name);
  }
  assert.deepEqual(seen, Array(12).fill(10000));
  assert.equal(globalFetch.mock.callCount(), 0);
});

test('resolved_request_webhook_accepts_existing_legacy_component_line', async () => {
  const row = await seed(); const delivery = randomUUID(); registryCalls.length = 0; outboundCalls.length = 0;
  const signed = releaseWebhook(row, 'https://000h.cojeev.com/docs/button/', delivery);
  const response = await mf.dispatchFetch(signed.url, { method: signed.method, headers: Object.fromEntries(signed.headers), body: await signed.text() });
  assert.equal(response.status, 202);
  assert.deepEqual(registryCalls, [{ url: 'https://cojeev.com/ui/docs/button/', method: 'HEAD' }]);
  assert.equal(outboundCalls.length, 0);
  const state = await snapshot(row.id);
  assert.equal(state.report.status, 'resolved'); assert.equal(state.report.component_url, 'https://cojeev.com/ui/docs/button/');
  assert.ok(await db.prepare('SELECT id FROM webhook_events WHERE id=?').bind(delivery).first());
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM outbox WHERE report_id=? AND kind='email_resolved'").bind(row.id).first()).n, 1);
});

test('new_delivery_links_include_ui', async () => {
  const settings = env({ LOCAL_MODE: 'true', EMAIL_ENABLED: 'true', EMAIL_FROM: 'updates@cojeev.com',
    RESEND_API_KEY: 'test-only-resend-key', REPORT_NOTIFICATION_EMAIL: 'owner@example.com' });
  const row = await seed(settings);
  const send = async (_url, init) => Response.json({ id: `test-provider-${JSON.parse(init.body).tags.find(tag => tag.name === 'kind').value}` });
  assert.equal((await backend.drain(settings, row.id, send)).processed, 2);
  await backend.updateFromAdmin(settings, row.id, { status: 'resolved', componentUrl: 'https://000h.cojeev.com/docs/button/' });
  assert.equal((await backend.drain(settings, row.id, send)).processed, 1);
  const jobs = (await db.prepare('SELECT kind,payload_json FROM outbox WHERE report_id=?').bind(row.id).all()).results;
  for (const [kind, want] of [
    ['email_received', `https://cojeev.com/ui/track/#${row.id}.${row.status_key}`],
    ['email_owner_received', `https://cojeev.com/ui/feedback-admin/?report=${row.id}`],
    ['email_resolved', 'https://cojeev.com/ui/docs/button/'],
  ]) {
    const payload = JSON.parse(jobs.find(job => job.kind === kind).payload_json);
    assert.ok(payload.text.includes(want), kind); assert.ok(payload.html.includes(`href="${want}"`), kind);
  }
});

test('api_health_exposes_deployment_identity_and_reporting_base', async () => {
  const response = await request('/health'); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', environment: 'production', release: 'test-release',
    deploymentId: 'test-deployment', phase: 'switched', reportingBase: 'https://cojeev.com/ui' });
  const unset = await backend.worker.fetch(new Request('https://feedback.cojeev.com/health'), { ALLOWED_ORIGINS: '' }, { waitUntil() {} });
  assert.deepEqual(await unset.json(), { status: 'ok', environment: 'unconfigured', release: 'unconfigured',
    deploymentId: 'unconfigured', phase: 'unconfigured', reportingBase: 'unconfigured' });
});

test('reporting_api_and_webhook_paths_remain_at_feedback_root', async () => {
  assert.equal((await request('/v1/config')).status, 200);
  assert.equal((await request('/v1/requests')).status, 200);
  assert.equal((await request('/v1/github/webhook', 'POST', {})).status, 401);
  const row = await seed();
  assert.equal((await request(`/v1/reports/${row.id}`, 'GET', undefined, token)).status, 200);
  for (const [path, method, body] of [['/ui/v1/config', 'GET'], ['/ui/v1/requests', 'GET'], ['/ui/v1/github/webhook', 'POST', {}]])
    assert.equal((await request(path, method, body)).status, 404, path);
});
