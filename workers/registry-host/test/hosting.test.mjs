import test from 'node:test';
import assert from 'node:assert/strict';
import host from '../src/index.mjs';
import * as headers from '../src/headers.mjs';

const sha = 'a'.repeat(40);
function env(environment, status = 200, type = 'text/html') {
  return { ENVIRONMENT: environment, RELEASE: sha, ASSETS: { fetch: async () => new Response('asset', {status, headers:{'content-type':type}}) } };
}
test('beta and admin responses reject indexing; HTML revalidates and security headers allow the selected API only', async () => {
  for (const [environment,path,noindex] of [['beta','/',true],['production','/admin/',true],['production','/feedback-admin/',true],['production','/',false]]) {
    const hostname = environment === 'beta' ? 'beta.000h.cojeev.com' : '000h.cojeev.com';
    const response = await host.fetch(new Request(`https://${hostname}${path}`),env(environment));
    assert.equal(response.headers.has('x-robots-tag'),noindex);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(response.headers.get('cache-control'),'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
    assert.ok(response.headers.get('content-security-policy').includes(environment === 'beta' ? 'https://feedback-beta.cojeev.com' : 'https://feedback.cojeev.com'));
  }
});
test('framework assets keep the asset layer cache (never a year-long one); missing routes retain real 404',async()=>{
  const assetEnv = env('beta',200,'text/javascript');
  assetEnv.ASSETS.fetch = async () => new Response('chunk bytes', {headers: {'content-type': 'text/javascript', 'cache-control': 'public, max-age=60'}});
  const response=await host.fetch(new Request('https://beta.000h.cojeev.com/ui/_next/static/chunks/abc123.js'),assetEnv);
  assert.equal(response.status,200);
  assert.equal(await response.text(),'chunk bytes');
  assert.equal(response.headers.get('cache-control'),'public, max-age=60');
  assert.equal((await host.fetch(new Request('https://beta.000h.cojeev.com/absent/'),env('beta',404))).status,404);
});
test('health reveals only identity and private media never reaches website assets',async()=>{
  assert.deepEqual(await (await host.fetch(new Request('https://beta.000h.cojeev.com/health'),env('beta'))).json(),{status:'ok',environment:'beta',release:sha,deploymentId:'unconfigured',phase:'unconfigured',migrationStage:'unconfigured',registryGraph:'unconfigured'});
  for(const path of ['/media/private.png','/backups/data.sql','/v1/admin/reports']) assert.equal((await host.fetch(new Request(`https://beta.000h.cojeev.com${path}`),env('beta'))).status,404);
});

function headerRules(environment) {
  return new Map(headers.siteHeaders(environment).trim().split(/\n\s*\n/).map(block => {
    const [pattern, ...lines] = block.split('\n');
    return [pattern, Object.fromEntries(lines.map(line => line.trim().split(/: (.*)/s).slice(0, 2)))];
  }));
}

test('worker_and_asset_security_headers_match', async () => {
  for (const environment of ['production', 'beta']) {
    const response = await host.fetch(new Request(`https://${environment === 'beta' ? 'beta.000h.cojeev.com' : 'cojeev.com'}/ui/docs/`), env(environment));
    const expected = headerRules(environment).get('/*');
    for (const [name, value] of Object.entries(expected)) assert.equal(response.headers.get(name), value, `${environment} ${name}`);
    const connect = response.headers.get('content-security-policy').split(';').find(part => part.trim().startsWith('connect-src')).trim().split(/\s+/).slice(1);
    assert.deepEqual(connect, ["'self'", environment === 'beta' ? 'https://feedback-beta.cojeev.com' : 'https://feedback.cojeev.com', 'https://eu.i.posthog.com', 'https://eu-assets.i.posthog.com']);
    for (const origin of connect.filter(value => value !== "'self'")) assert.equal(new URL(origin).origin, origin);
  }
});

test('ui_admin_and_beta_are_noindex', async () => {
  for (const environment of ['production', 'beta']) for (const path of ['/ui/feedback-admin/', '/ui/feedback-admin', '/ui/feedback-admin/x', '/ui/admin', '/ui/admin/x', '/feedback-admin/', '/admin', '/ui/docs/', '/ui/administrator/', '/ui/feedback-admin-other/']) {
    const hostname = environment === 'beta' ? 'beta.000h.cojeev.com' : path.startsWith('/ui/') ? 'cojeev.com' : '000h.cojeev.com';
    const response = await host.fetch(new Request(`https://${hostname}${path}`), env(environment));
    const admin = ['/ui/feedback-admin/', '/ui/feedback-admin', '/ui/feedback-admin/x', '/ui/admin', '/ui/admin/x', '/feedback-admin/', '/admin'].includes(path);
    assert.equal(response.headers.has('x-robots-tag'), environment === 'beta' || admin, `${environment} ${path}`);
  }
  const production = headerRules('production');
  for (const path of ['/admin/*', '/feedback-admin/*', '/ui/admin/*', '/ui/feedback-admin/*']) assert.deepEqual(production.get(path), {'x-robots-tag': 'noindex, nofollow, noarchive'});
  assert.deepEqual(headerRules('beta').get('/*')['x-robots-tag'], 'noindex, nofollow, noarchive');
  for (const path of ['/admin', '/admin/', '/admin/x', '/feedback-admin', '/feedback-admin/x', '/ui/admin', '/ui/admin/', '/ui/admin/x', '/ui/feedback-admin', '/ui/feedback-admin/', '/ui/feedback-admin/x']) assert.equal(headers.noindexPath(path), true, path);
  for (const path of ['/docs/', '/administrator', '/feedback-admin-other', '/ui/administrator', '/ui/feedback-admin-other', '/uikit/admin', '/ui-other/admin']) assert.equal(headers.noindexPath(path), false, path);
  for (const [url, method] of [['https://beta.000h.cojeev.com/ui', 'GET'], ['https://beta.000h.cojeev.com/ui/docs/', 'POST'], ['https://x.workers.dev/nope/', 'GET']]) {
    const response = await host.fetch(new Request(url, {method}), env('beta'));
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  }
});

test('production_legacy_ui_admin_paths_are_noindex', async () => {
  for (const stage of ['additive', 'redirect']) for (const path of ['/ui/admin', '/ui/admin/', '/ui/admin/x', '/ui/feedback-admin', '/ui/feedback-admin/', '/ui/feedback-admin/x']) {
    const response = await host.fetch(new Request(`https://000h.cojeev.com${path}`), {...env('production'), MIGRATION_STAGE: stage});
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive', `${stage} ${path}`);
  }
});

test('production_legacy_ui_metadata_is_no_store', async () => {
  for (const stage of ['additive', 'redirect']) for (const path of ['/ui/health', '/ui/release.json']) {
    const response = await host.fetch(new Request(`https://000h.cojeev.com${path}`), {...env('production', 200, 'application/json'), MIGRATION_STAGE: stage});
    assert.equal(response.headers.get('cache-control'), 'no-store', `${stage} ${path}`);
  }
});

test('health_and_release_are_no_store', async () => {
  for (const environment of ['production', 'beta']) {
    const legacy = environment === 'beta' ? 'beta.000h.cojeev.com' : '000h.cojeev.com';
    const canonical = environment === 'beta' ? legacy : 'cojeev.com';
    for (const url of [`https://${legacy}/health`, `https://${canonical}/ui/health`, `https://${canonical}/ui/release.json`, `https://${legacy}/release.json`]) {
      const response = await host.fetch(new Request(url), env(environment, 200, 'application/json'));
      assert.equal(response.headers.get('cache-control'), 'no-store', url);
    }
    const missing = await host.fetch(new Request(`https://${canonical}/ui/nope/`), env(environment, 404));
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  }
});
