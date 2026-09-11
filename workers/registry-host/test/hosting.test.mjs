import test from 'node:test';
import assert from 'node:assert/strict';
import host from '../src/index.mjs';

const sha = 'a'.repeat(40);
function env(environment, status = 200, type = 'text/html') {
  return { ENVIRONMENT: environment, RELEASE: sha, ASSETS: { fetch: async () => new Response('asset', {status, headers:{'content-type':type}}) } };
}
test('beta and admin responses reject indexing; HTML revalidates and security headers allow the selected API only', async () => {
  for (const [environment,path,noindex] of [['beta','/',true],['production','/admin/',true],['production','/',false]]) {
    const response = await host.fetch(new Request(`https://example.com${path}`),env(environment));
    assert.equal(response.headers.has('x-robots-tag'),noindex);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(response.headers.get('cache-control'),'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
    assert.ok(response.headers.get('content-security-policy').includes(environment === 'beta' ? 'https://feedback-beta.cojeev.com' : 'https://feedback.cojeev.com'));
  }
});
test('hashed framework assets cache immutably; missing routes retain real 404',async()=>{
  const response=await host.fetch(new Request('https://example.com/_next/static/chunks/abc123.js'),env('beta',200,'text/javascript'));
  assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable');
  assert.equal((await host.fetch(new Request('https://example.com/absent/'),env('beta',404))).status,404);
});
test('health reveals only identity and private media never reaches website assets',async()=>{
  assert.deepEqual(await (await host.fetch(new Request('https://example.com/health'),env('beta'))).json(),{status:'ok',environment:'beta',release:sha});
  for(const path of ['/media/private.png','/backups/data.sql','/v1/admin/reports']) assert.equal((await host.fetch(new Request(`https://example.com${path}`),env('beta'))).status,404);
});
