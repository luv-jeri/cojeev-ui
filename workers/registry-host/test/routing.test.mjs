import test from 'node:test';
import assert from 'node:assert/strict';
import host from '../src/index.mjs';

const stages = ['additive', 'redirect'];
const legacyHosts = {production: '000h.cojeev.com', beta: 'beta.000h.cojeev.com'};
const healthIdentity = {
  status: 'ok', environment: 'production', release: 'a'.repeat(40),
  deploymentId: 'website-mounted-1', phase: 'mounted', migrationStage: 'redirect', registryGraph: 'canonical-v1',
};

function fixture({environment = 'production', stage = 'additive', status = 200, type = 'text/html', cache} = {}) {
  const assets = [];
  const homepage = [];
  const homepageResponse = new Response('homepage bytes', {status: 202, headers: {'x-homepage': 'original', 'cache-control': 'public, max-age=37'}});
  return {assets, homepage, homepageResponse, env: {
    ENVIRONMENT: environment, MIGRATION_STAGE: stage,
    RELEASE: healthIdentity.release, DEPLOYMENT_ID: healthIdentity.deploymentId,
    PHASE: healthIdentity.phase, REGISTRY_GRAPH: healthIdentity.registryGraph,
    ASSETS: {fetch: async request => {
      assets.push(request);
      return new Response('asset bytes', {status, headers: {'content-type': type, ...(cache ? {'cache-control': cache} : {})}});
    }},
    COJEEV_HOMEPAGE: {fetch: async request => {homepage.push(request); return homepageResponse;}},
  }};
}

async function checkRedirect(url, location, environment = 'production', stage = 'redirect') {
  const f = fixture({environment, stage});
  const response = await host.fetch(new Request(url), f.env);
  assert.equal(response.status, 301, url);
  assert.equal(response.headers.get('location'), location, url);
  assert.equal(response.headers.get('cache-control'), 'no-store', url);
  assert.equal(f.assets.length, 0, url);
  assert.equal(f.homepage.length, 0, url);
  return response;
}

test('apex_ui_route_wins_and_catches_query_bearing_bare_ui', async () => {
  for (const stage of stages) await checkRedirect('https://cojeev.com/ui?utm_source=move', 'https://cojeev.com/ui/?utm_source=move', 'production', stage);
});

test('ui_prefix_siblings_delegate_without_header_changes', async () => {
  for (const path of ['/uikit?x=1', '/ui-other', '/uikit.txt?x=1']) {
    const f = fixture({stage: 'redirect'});
    const request = new Request(`https://cojeev.com${path}`);
    const expectedHeaders = [...f.homepageResponse.headers];
    const response = await host.fetch(request, f.env);
    assert.equal(response, f.homepageResponse);
    assert.deepEqual(f.homepage, [request]);
    assert.equal(f.homepage[0], request);
    assert.equal(f.assets.length, 0);
    assert.deepEqual([...response.headers], expectedHeaders);
    assert.equal(await response.text(), 'homepage bytes');
    assert.equal(response.headers.has('content-security-policy'), false);
    assert.equal(response.headers.has('x-robots-tag'), false);
  }
});

test('legacy_pages_301_to_same_encoded_path_and_query', async () => {
  for (const path of ['/docs/button/?utm_source=move&x=a%2Fb', '/docs/button/?a=1&a=2', '/', '/about/', '/requests/', '/track/', '/feedback-admin/', '/nope/']) {
    await checkRedirect(`https://000h.cojeev.com${path}`, `https://cojeev.com/ui${path}`);
  }
});

test('legacy_alias_redirect_does_not_use_its_canonical_target', async () => {
  await checkRedirect('https://000h.cojeev.com/work-with-me/', 'https://cojeev.com/ui/work-with-me/');
});

test('legacy_registry_get_and_head_never_redirect', async () => {
  for (const stage of stages) for (const environment of ['production', 'beta']) for (const method of ['GET', 'HEAD']) {
    const f = fixture({environment, stage, type: 'application/json'});
    const request = new Request(`https://${legacyHosts[environment]}/r/button.json`, {method});
    const response = await host.fetch(request, f.env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets.length, 1);
    assert.equal(f.assets[0], request);
    assert.equal(f.homepage.length, 0);
  }
});

test('legacy_missing_registry_returns_404', async () => {
  for (const stage of stages) {
    const f = fixture({stage, status: 404, type: 'application/json'});
    const response = await host.fetch(new Request('https://000h.cojeev.com/r/missing.json'), f.env);
    assert.equal(response.status, 404);
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets.length, 1);
  }
});

test('legacy_health_stays_direct', async () => {
  for (const stage of stages) {
    const f = fixture({stage});
    const response = await host.fetch(new Request('https://000h.cojeev.com/health'), f.env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {...healthIdentity, migrationStage: stage});
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets.length, 0);
  }
});

test('beta_never_redirects_to_production', async () => {
  for (const stage of stages) for (const path of ['/', '/ui', '/track/?r=1', '/docs/button/?x=a%2Fb', '/ui/docs/button/', '/r/button.json', '/health', '/private/x']) {
    const f = fixture({environment: 'beta', stage});
    const response = await host.fetch(new Request(`https://beta.000h.cojeev.com${path}`), f.env);
    const location = response.headers.get('location');
    if (location) assert.ok(location.startsWith('https://beta.000h.cojeev.com/ui/'), location);
    if (stage === 'redirect' && path === '/') assert.equal(location, 'https://beta.000h.cojeev.com/ui/');
  }
});

test('beta_root_pages_redirect_same_host_preserving_encoded_path_and_query', async () => {
  for (const path of ['/track/?r=1', '/feedback-admin/?report=a%2Fb', '/docs/button/']) {
    await checkRedirect(`https://beta.000h.cojeev.com${path}`, `https://beta.000h.cojeev.com/ui${path}`, 'beta');
  }
});

test('beta_canonical_paths_do_not_double_prefix', async () => {
  for (const stage of stages) {
    const f = fixture({environment: 'beta', stage});
    const request = new Request('https://beta.000h.cojeev.com/ui/docs/button/');
    const response = await host.fetch(request, f.env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets[0], request);
    await checkRedirect('https://beta.000h.cojeev.com/ui', 'https://beta.000h.cojeev.com/ui/', 'beta', stage);
  }
});

test('beta_root_registry_health_and_static_exceptions_stay_direct', async () => {
  for (const [path, status, assetCalls] of [['/r/button.json', 200, 1], ['/health', 200, 0], ['/_next/x.js', 404, 0], ['/docs/x.txt', 404, 0]]) {
    const f = fixture({environment: 'beta', stage: 'redirect'});
    const response = await host.fetch(new Request(`https://beta.000h.cojeev.com${path}`), f.env);
    assert.equal(response.status, status, path);
    assert.equal(response.headers.has('location'), false, path);
    assert.equal(f.assets.length, assetCalls, path);
  }
});

test('root_and_ui_reserved_paths_are_404', async () => {
  for (const stage of stages) for (const environment of ['production', 'beta']) {
    const paths = ['/media/x', '/backups/x', '/private/x', '/v1', '/ui/media/x', '/ui/backups/x', '/ui/private/', '/ui/v1'];
    for (const path of paths) {
      const f = fixture({environment, stage});
      const response = await host.fetch(new Request(`https://${legacyHosts[environment]}${path}`), f.env);
      assert.equal(response.status, 404, `${environment} ${stage} ${path}`);
      assert.equal(response.headers.has('location'), false);
      assert.equal(f.assets.length, 0);
    }
    if (environment === 'production') for (const path of ['/ui/media/x', '/ui/backups/x', '/ui/private/', '/ui/v1']) {
      const f = fixture({stage});
      const response = await host.fetch(new Request(`https://cojeev.com${path}`), f.env);
      assert.equal(response.status, 404, path);
      assert.equal(f.assets.length, 0);
    }
  }
  await checkRedirect('https://000h.cojeev.com/ui/docs/', 'https://cojeev.com/ui/ui/docs/');
});

test('retained_legacy_text_and_chunks_are_direct', async () => {
  for (const environment of ['production', 'beta']) for (const stage of stages) for (const path of ['/_next/x.js', '/index.txt', '/docs/x.txt']) {
    const f = fixture({environment, stage});
    const response = await host.fetch(new Request(`https://${legacyHosts[environment]}${path}`), f.env);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets.length, 0);
  }
});

test('website_health_exposes_variant_deployment_identity', async () => {
  for (const [environment, hostname, path] of [['production', '000h.cojeev.com', '/health'], ['production', 'cojeev.com', '/ui/health'], ['beta', 'beta.000h.cojeev.com', '/health'], ['beta', 'beta.000h.cojeev.com', '/ui/health']]) {
    const f = fixture({environment, stage: 'redirect'});
    const response = await host.fetch(new Request(`https://${hostname}${path}`), f.env);
    assert.deepEqual(await response.json(), {...healthIdentity, environment});
    assert.equal(f.assets.length, 0);
    const defaults = fixture({environment});
    for (const key of ['RELEASE', 'DEPLOYMENT_ID', 'PHASE', 'MIGRATION_STAGE', 'REGISTRY_GRAPH']) delete defaults.env[key];
    assert.deepEqual(await (await host.fetch(new Request(`https://${hostname}${path}`), defaults.env)).json(), {
      status: 'ok', environment, release: 'unconfigured', deploymentId: 'unconfigured',
      phase: 'unconfigured', migrationStage: 'unconfigured', registryGraph: 'unconfigured',
    });
  }
});

test('missing_assets_are_not_long_cached', async () => {
  for (const environment of ['production', 'beta']) {
    const hostname = environment === 'production' ? 'cojeev.com' : legacyHosts.beta;
    const f = fixture({environment, status: 404, type: 'text/javascript'});
    const request = new Request(`https://${hostname}/ui/_next/x.js`);
    const response = await host.fetch(request, f.env);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), null);
    assert.equal(f.assets[0], request);
  }
});

test('legacy_redirect_location_always_stays_under_canonical_base', async () => {
  for (const [path, expected] of [
    ['/docs/%2e%2e/x', 'https://cojeev.com/ui/x'],
    ['//evil.example/', 'https://cojeev.com/ui//evil.example/'],
    ['/a%2Fb/', 'https://cojeev.com/ui/a%2Fb/'],
    ['/docs/button/index.html', 'https://cojeev.com/ui/docs/button/index.html'],
  ]) {
    const response = await checkRedirect(`https://000h.cojeev.com${path}`, expected);
    assert.ok(response.headers.get('location').startsWith('https://cojeev.com/ui/'));
    assert.equal(response.headers.get('location').startsWith('//'), false);
  }
});

test('unknown_and_variant_hosts_fail_closed', async () => {
  const mixed = fixture({stage: 'redirect'});
  const response = await host.fetch(new Request('https://000H.cojeev.com/about/'), mixed.env);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://cojeev.com/ui/about/');
  for (const hostname of ['000h.cojeev.com.', 'x.workers.dev', 'beta.000h.cojeev.com']) {
    const f = fixture({stage: 'redirect'});
    const response = await host.fetch(new Request(`https://${hostname}/about/`), f.env);
    assert.equal(response.status, 404, hostname);
    assert.equal(f.assets.length, 0);
    assert.equal(f.homepage.length, 0);
  }
  for (const hostname of ['cojeev.com', '000h.cojeev.com']) {
    const f = fixture({environment: 'beta', stage: 'redirect'});
    assert.equal((await host.fetch(new Request(`https://${hostname}/ui/about/`), f.env)).status, 404);
    assert.equal(f.assets.length, 0);
    assert.equal(f.homepage.length, 0);
  }
});

test('head_matches_get_for_redirects_registry_and_health', async () => {
  for (const url of ['https://cojeev.com/ui', 'https://000h.cojeev.com/about/', 'https://000h.cojeev.com/r/button.json', 'https://000h.cojeev.com/health']) {
    const f = fixture({stage: 'redirect', type: 'application/json'});
    const get = await host.fetch(new Request(url), f.env);
    const head = await host.fetch(new Request(url, {method: 'HEAD'}), f.env);
    assert.equal(head.status, get.status, url);
    assert.equal(head.headers.get('location'), get.headers.get('location'), url);
    assert.equal(head.headers.get('cache-control'), get.headers.get('cache-control'), url);
  }
});

test('owned_methods_are_rejected_after_apex_delegation_and_host_checks', async () => {
  for (const url of ['https://cojeev.com/ui', 'https://cojeev.com/ui/health', 'https://000h.cojeev.com/r/button.json']) {
    const f = fixture({stage: 'redirect'});
    const response = await host.fetch(new Request(url, {method: 'POST'}), f.env);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets.length, 0);
  }
  const f = fixture();
  const request = new Request('https://cojeev.com/private/x', {method: 'POST'});
  assert.equal(await host.fetch(request, f.env), f.homepageResponse);
  assert.equal(f.homepage[0], request);
  assert.equal((await host.fetch(new Request('https://x.workers.dev/ui', {method: 'POST'}), f.env)).status, 404);
});

test('missing_homepage_binding_returns_secured_502', async () => {
  const f = fixture();
  delete f.env.COJEEV_HOMEPAGE;
  const response = await host.fetch(new Request('https://cojeev.com/uikit'), f.env);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(f.assets.length, 0);
});

test('non_redirect_stages_keep_additive_assets_and_physical_requests', async () => {
  for (const stage of [undefined, 'unconfigured', 'future', 'additive']) for (const url of ['https://000h.cojeev.com/docs/button/', 'https://cojeev.com/ui/docs/button/', 'https://beta.000h.cojeev.com/docs/button/', 'https://beta.000h.cojeev.com/ui/docs/button/']) {
    const environment = url.includes('beta.') ? 'beta' : 'production';
    const f = fixture({environment});
    f.env.MIGRATION_STAGE = stage;
    const request = new Request(url);
    const response = await host.fetch(request, f.env);
    assert.equal(response.status, 200, `${stage} ${url}`);
    assert.equal(response.headers.has('location'), false);
    assert.equal(f.assets[0], request);
  }
});

test('pure_decisions_expose_mounts_logical_paths_and_ordered_outcomes', async () => {
  const {decide, CANONICAL_BASE, LEGACY_HOST} = await import('../src/routing.mjs');
  assert.deepEqual(CANONICAL_BASE, {production: 'https://cojeev.com/ui', beta: 'https://beta.000h.cojeev.com/ui'});
  assert.deepEqual(LEGACY_HOST, legacyHosts);
  const env = {ENVIRONMENT: 'production', MIGRATION_STAGE: 'redirect'};
  for (const [url, method, expected] of [
    ['https://cojeev.com/ui/r/button.json', 'GET', {kind: 'asset', mount: 'canonical', logical: '/r/button.json', registryName: 'button'}],
    ['https://000h.cojeev.com/r/button.json', 'HEAD', {kind: 'asset', mount: 'legacy', logical: '/r/button.json', registryName: 'button'}],
    ['https://cojeev.com/ui/docs/button/', 'GET', {kind: 'asset', mount: 'canonical', logical: '/docs/button/', registryName: null}],
    ['https://cojeev.com/ui/health', 'HEAD', {kind: 'health'}],
    ['https://cojeev.com/ui/private/x', 'GET', {kind: 'not-found'}],
    ['https://cojeev.com/ui', 'POST', {kind: 'method-not-allowed'}],
    ['https://cojeev.com/uikit', 'POST', {kind: 'delegate'}],
    ['https://x.workers.dev/ui', 'POST', {kind: 'not-found'}],
    ['https://cojeev.com/ui?x=1', 'GET', {kind: 'redirect', location: 'https://cojeev.com/ui/?x=1'}],
    ['https://000h.cojeev.com/ui/docs/', 'GET', {kind: 'redirect', location: 'https://cojeev.com/ui/ui/docs/'}],
  ]) assert.deepEqual(decide(new URL(url), method, env), expected, url);
  assert.deepEqual(decide(new URL('https://000h.cojeev.com/ui/r/button.json'), 'GET', {...env, MIGRATION_STAGE: 'additive'}), {kind: 'asset', mount: 'legacy', logical: '/ui/r/button.json', registryName: null});
  assert.deepEqual(decide(new URL('https://beta.000h.cojeev.com/ui/r/button.json'), 'GET', {ENVIRONMENT: 'beta', MIGRATION_STAGE: 'redirect'}), {kind: 'asset', mount: 'canonical', logical: '/r/button.json', registryName: 'button'});
});
