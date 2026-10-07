import test from 'node:test';
import assert from 'node:assert/strict';
import host from '../src/index.mjs';

const sha = 'a'.repeat(40);
function env(environment, status = 200, type = 'text/html') {
  return { ENVIRONMENT: environment, RELEASE: sha, ASSETS: { fetch: async () => new Response('asset', {status, headers:{'content-type':type}}) } };
}
test('beta and admin responses reject indexing; HTML revalidates and security headers allow the selected API only', async () => {
  for (const [environment,path,noindex] of [['beta','/ui/',true],['production','/ui/admin/',true],['production','/ui/feedback-admin/',true],['production','/',false]]) {
    const response = await host.fetch(new Request(`https://example.com${path}`),env(environment));
    assert.equal(response.headers.has('x-robots-tag'),noindex);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(response.headers.get('cache-control'),'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
    assert.ok(response.headers.get('content-security-policy').includes(environment === 'beta' ? 'https://feedback-beta.cojeev.com' : 'https://feedback.cojeev.com'));
  }
});
test('framework assets keep the asset layer cache (never a year-long one); missing routes retain real 404',async()=>{
  const response=await host.fetch(new Request('https://example.com/ui/_next/static/chunks/abc123.js'),env('beta',200,'text/javascript'));
  assert.equal(response.headers.get('cache-control'),null);
  assert.equal((await host.fetch(new Request('https://example.com/absent/'),env('beta',404))).status,404);
});
test('health reveals only identity and private media never reaches website assets',async()=>{
  assert.deepEqual(await (await host.fetch(new Request('https://example.com/health'),env('beta'))).json(),{status:'ok',environment:'beta',release:sha});
  for(const path of ['/media/private.png','/backups/data.sql','/v1/admin/reports']) assert.equal((await host.fetch(new Request(`https://example.com${path}`),env('beta'))).status,404);
});

test('legacy host redirects every application path and query to the release target, but root health stays available',async()=>{
  for(const [path,target] of [
    ['/','/ui/'],['/docs/button/?from=old','/ui/docs/button/?from=old'],
    ['/r/button.json?install=1','/ui/r/button.json?install=1'],['/ui/health','/ui/health'],
    ['/ui/_next/static/app.js','/ui/_next/static/app.js'],['/ui/r/button.json?install=1','/ui/r/button.json?install=1'],
    ['/ui/docs/button/','/ui/docs/button/'],['/ui?from=old','/ui/?from=old'],['/ui/','/ui/'],['/uiform','/ui/uiform'],
  ]) {
    const response=await host.fetch(new Request(`https://000h.cojeev.com${path}`),env('production'));
    assert.equal(response.status,301,path);
    assert.equal(response.headers.get('location'),`https://cojeev.com${target}`,path);
  }
  const response=await host.fetch(new Request('https://000h.cojeev.com/health'),env('production'));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('location'),null);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{status:'ok',environment:'production',release:sha});
});

test('prefixed health is identical on both production routes and beta',async()=>{
  for(const [hostname,environment] of [['www.cojeev.com','production'],['cojeev.com','production'],['beta.000h.cojeev.com','beta']]) {
    const response=await host.fetch(new Request(`https://${hostname}/ui/health`),env(environment));
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{status:'ok',environment,release:sha});
  }
});

test('bare ui and beta root redirect with queries intact; beta remains noindex',async()=>{
  for(const [hostname,environment,pathname] of [['www.cojeev.com','production','/ui'],['cojeev.com','production','/ui'],['beta.000h.cojeev.com','beta','/'],['beta.000h.cojeev.com','beta','/ui']]) {
    const response=await host.fetch(new Request(`https://${hostname}${pathname}?from=home`),env(environment));
    assert.equal(response.status,301);
    assert.equal(response.headers.get('location'),`https://${hostname}/ui/?from=home`);
    assert.equal(response.headers.has('x-robots-tag'),environment==='beta');
  }
  assert.deepEqual(await (await host.fetch(new Request('https://beta.000h.cojeev.com/health'),env('beta'))).json(),{status:'ok',environment:'beta',release:sha});
});

test('prefixed private paths never fetch assets; prefixed admin pages remain noindex',async()=>{
  const guarded={...env('production'),ASSETS:{fetch:async()=>{throw new Error('Private path fetched assets');}}};
  for(const path of ['/media','/backups','/private','/v1']) {
    for(const prefix of ['', '/ui']) assert.equal((await host.fetch(new Request(`https://www.cojeev.com${prefix}${path}/secret.txt`),guarded)).status,404);
  }
  for(const path of ['/ui/admin/','/ui/feedback-admin/']) assert.match((await host.fetch(new Request(`https://www.cojeev.com${path}`),env('production'))).headers.get('x-robots-tag'),/noindex/);
});
