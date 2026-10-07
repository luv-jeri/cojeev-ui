import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as harness from '../../../scripts/asset-router-harness.mjs';
import {startAssetRouter, followChain, chainProblems} from '../../../scripts/asset-router-harness.mjs';
import {CODE_PROBES, retainedTextInventory, workerFirstList, ruleMatches} from '../../../scripts/worker-first.mjs';
import {CANONICAL_BASE} from '../src/routing.mjs';

const site = new URL('./fixtures/packaged-site/', import.meta.url).pathname;
const homepage = new URL('./fixtures/homepage/', import.meta.url).pathname;
let router, list;
before(async () => {
  list = workerFirstList(await retainedTextInventory(site));
  router = await startAssetRouter({worker: {kind: 'source', site, workerFirst: list, environment: 'production', migrationStage: 'redirect'}, homepage});
});
after(async () => {await router?.dispose();});
const bytes = async response => Buffer.from(await response.arrayBuffer());
const fixture = path => readFile(`${site}${path.slice(1)}`);

test('packaged_mode_runs_the_variant_bundle_with_its_vars', async () => {
  assert.equal(typeof harness.materializeVariant, 'function', 'materializeVariant must bundle a fresh fixture copy');
  const scratch = await mkdtemp(join(tmpdir(), 'cojeev-packaged-test-'));
  const variants = [];
  try {
    const markerEntry = join(scratch, 'marker.mjs');
    await writeFile(markerEntry, `import worker from ${JSON.stringify(new URL('../src/index.mjs', import.meta.url).pathname)};
export default {fetch(request, env, ctx) {
  if (new URL(request.url).pathname === '/ui/health') return new Response('packaged-health-marker');
  return worker.fetch(request, env, ctx);
}};\n`);
    for (const environment of ['production', 'beta']) {
      const fixtureDirectory = new URL(`./fixtures/browser-variants/${environment}/`, import.meta.url).pathname;
      const directory = await harness.materializeVariant(fixtureDirectory);
      variants.push(directory);
      const config = JSON.parse(await readFile(join(directory, 'website/wrangler.jsonc'), 'utf8'));
      assert.deepEqual(config.assets.run_worker_first, workerFirstList(await retainedTextInventory(join(directory, 'site'))));
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      const identity = JSON.parse(await readFile(join(directory, 'site/ui/release.json'), 'utf8'));
      const expected = {environment, release: manifest.commit, deploymentId: manifest.deploymentId,
        phase: manifest.phase, migrationStage: manifest.migrationStage, registryGraph: manifest.registryGraph};
      assert.deepEqual(identity, expected);
      // Temporary assets prove the packaged router bypasses code only for its exclusions.
      await mkdir(join(directory, 'site/ui/_next/static/chunks'), {recursive: true});
      await writeFile(join(directory, 'site/ui/_next/static/chunks/new.js'), 'packaged-chunk');
      await writeFile(join(directory, 'site/ui/index.html'), '<h1>Packaged UI</h1>');
      const origin = environment === 'production' ? 'https://cojeev.com' : 'https://beta.000h.cojeev.com';
      const packaged = await startAssetRouter({worker: {kind: 'packaged', directory}, homepage});
      try {
        const response = await packaged.fetch(`${origin}/ui/health`);
        assert.equal(response.status, 200);
        const health = await response.json();
        assert.deepEqual(health, {status: 'ok', ...expected});
        assert.equal(health.deploymentId, config.vars.DEPLOYMENT_ID);
        assert.equal(health.phase, config.vars.PHASE);
        assert.equal(health.migrationStage, config.vars.MIGRATION_STAGE);
        packaged.reset();
        assert.equal(await (await packaged.fetch(`${origin}/ui/_next/static/chunks/new.js`)).text(), 'packaged-chunk');
        assert.deepEqual(packaged.workerRuns(), []);
        assert.equal((await packaged.fetch(`${origin}/ui/`)).status, 200);
        assert.deepEqual(packaged.workerRuns(), ['/ui/']);
        const {hops, final} = await followChain(packaged, `${origin}/ui/docs/button?x=1`);
        assert.deepEqual(chainProblems(hops, {mount: 'canonical', query: '?x=1', canonicalBase: CANONICAL_BASE[environment]}), []);
        assert.ok(hops.some(hop => hop.location === '/ui/docs/button/?x=1'));
        assert.equal(final.status, 200);
        assert.match(await final.text(), /<h1>Button<\/h1>/);
        const missing = await packaged.fetch(`${origin}/ui/missing/`);
        assert.equal(missing.status, 404);
        assert.match(await missing.text(), /<h1>Page not found<\/h1>/);
      } finally {await packaged.dispose();}
      const markedDirectory = await harness.materializeVariant(fixtureDirectory, {entry: markerEntry});
      variants.push(markedDirectory);
      assert.notEqual(markedDirectory, directory);
      const markedConfigPath = join(markedDirectory, 'website/wrangler.jsonc');
      const markedConfig = JSON.parse(await readFile(markedConfigPath, 'utf8'));
      markedConfig.assets.html_handling = 'none';
      markedConfig.assets.not_found_handling = 'none';
      markedConfig.assets.run_worker_first.push('!/ui/docs/button/*');
      await writeFile(markedConfigPath, JSON.stringify(markedConfig));
      const marked = await startAssetRouter({worker: {kind: 'packaged', directory: markedDirectory}, homepage});
      try {
        const response = await marked.fetch(`${origin}/ui/health`);
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'packaged-health-marker');
        assert.deepEqual(marked.workerRuns(), ['/ui/health']);
        marked.reset();
        const html = await marked.fetch(`${origin}/ui/docs/button/index.html`, {redirect: 'manual'});
        assert.equal(html.status, 200, 'packaged html_handling none preserves the .html path');
        assert.match(await html.text(), /<h1>Button<\/h1>/);
        assert.deepEqual(marked.workerRuns(), [], 'packaged exclusions control the actual router');
        const missing = await marked.fetch(`${origin}/ui/missing/`);
        assert.equal(missing.status, 404);
        assert.doesNotMatch(await missing.text(), /<h1>Page not found<\/h1>/, 'packaged not_found_handling none skips 404.html');
      } finally {await marked.dispose();}
    }
  } finally {await Promise.all([...variants, scratch].map(directory => rm(directory, {recursive: true, force: true})));}
});

test('missing_ui_text_siblings_delegate_through_real_asset_router_with_body_header_parity', async () => {
  for (const method of ['GET', 'HEAD']) for (const path of ['/uikit.txt?x=1', '/ui-other.txt', '/uix.txt?y=2']) {
    router.reset();
    const url = `https://cojeev.com${path}`, init = {method, redirect: 'manual'};
    const actual = await router.fetch(url, init), expected = await router.homepage(url, init);
    assert.deepEqual(router.workerRuns(), [new URL(url).pathname]);
    assert.equal(actual.status, expected.status);
    assert.deepEqual(await bytes(actual), await bytes(expected));
    const headers = response => [...response.headers].filter(([key]) => key !== 'date');
    assert.deepEqual(headers(actual), headers(expected));
    assert.equal(actual.headers.get('x-homepage-fixture'), '1');
    assert.equal(actual.headers.get('content-security-policy'), null);
    assert.equal(actual.headers.get('x-robots-tag'), null);
  }
});

test('ui_asset_redirects_keep_mount_and_query', async () => {
  for (const path of ['/ui/docs/button?x=1', '/ui/docs/button/index.html?x=1']) {
    const {hops, final} = await followChain(router, `https://cojeev.com${path}`);
    assert.ok(hops.some(hop => hop.location), 'real asset-layer redirect');
    assert.deepEqual(chainProblems(hops, {mount: 'canonical', query: '?x=1', canonicalBase: CANONICAL_BASE.production}), []);
    assert.equal(final.status, 200);
    assert.match(final.headers.get('content-type'), /text\/html/);
  }
  for (const [environment, other] of [['production', 'beta'], ['beta', 'production']]) {
    assert.ok(chainProblems([{status: 301, location: `${CANONICAL_BASE[other]}/x`}], {mount: 'canonical', query: '', canonicalBase: CANONICAL_BASE[environment]}).length);
  }
  for (const location of ['/ui/ui/x?x=1', '/ui/x', '/ui/../outside?x=1']) {
    assert.ok(chainProblems([{status: 301, location}], {mount: 'canonical', query: '?x=1', canonicalBase: CANONICAL_BASE.production}).length, location);
  }
});

test('literal_and_encoded_canonical_rsc_paths_stay_under_ui', async () => {
  for (const name of ['__next.$d$component.txt', '__next.%24d%24component.txt']) {
    const {hops, final} = await followChain(router, `https://cojeev.com/ui/docs/button/${name}?_rsc=1`);
    assert.deepEqual(chainProblems(hops, {mount: 'canonical', query: '?_rsc=1', canonicalBase: CANONICAL_BASE.production}), []);
    assert.equal(final.status, 200);
    assert.deepEqual(await bytes(final), await fixture('/ui/docs/button/__next.$d$component.txt'));
  }
});

test('legacy_rsc_encoding_redirect_chains_keep_root_paths_and_queries', async () => {
  for (const path of ['/docs/button/__next.$d$component.txt?_rsc=1', '/docs/button/__next.%24d%24component.txt?_rsc=1', '/__next.$d$x.txt?q=1', '/__next.%24d%24x.txt?q=1']) {
    const {hops, final} = await followChain(router, `https://000h.cojeev.com${path}`);
    assert.deepEqual(chainProblems(hops, {mount: 'legacy', query: new URL(`https://000h.cojeev.com${path}`).search, canonicalBase: CANONICAL_BASE.production}), []);
    assert.ok([200, 404].includes(final.status));
    assert.ok(hops.every(hop => hop.status !== 301 || !hop.location?.includes('/ui')));
    if (final.status === 200) assert.deepEqual(await bytes(final), await fixture(decodeURIComponent(path.split('?')[0])));
  }
});

test('static_bypasses_do_not_cover_html', async () => {
  const html = (await readdir(site, {recursive: true})).filter(path => path.endsWith('.html')).map(path => `/${path}`);
  for (const path of [...CODE_PROBES, ...html]) {
    router.reset();
    await (await router.fetch(`https://cojeev.com${path}`, {redirect: 'manual'})).arrayBuffer();
    assert.deepEqual(router.workerRuns(), [path], path);
    assert.equal(router.workerRuns().includes(path), !list.some(rule => rule.startsWith('!') && ruleMatches(rule.slice(1), path)), path);
  }
  router.reset();
  const chunk = await router.fetch('https://cojeev.com/ui/_next/static/chunks/new.js');
  assert.equal(chunk.status, 200);
  assert.deepEqual(await bytes(chunk), await fixture('/ui/_next/static/chunks/new.js'));
  assert.deepEqual(router.workerRuns(), []);
  await (await router.fetch('https://cojeev.com/ui/')).arrayBuffer();
  assert.deepEqual(router.workerRuns(), ['/ui/']);
});

test('retained_legacy_text_and_chunks_are_direct', async () => {
  for (const path of ['/_next/static/chunks/old.js', '/docs/button/index.txt']) {
    router.reset();
    const response = await router.fetch(`https://000h.cojeev.com${path}`, {redirect: 'manual'});
    assert.equal(response.status, 200);
    assert.deepEqual(await bytes(response), await fixture(path));
    assert.deepEqual(router.workerRuns(), []);
  }
  const missing = await router.fetch('https://000h.cojeev.com/_next/static/chunks/missing.js', {redirect: 'manual'});
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('location'), null);
});

test('legacy_rsc_fetch_with_query_is_served_or_404_never_301', async () => {
  for (const [path, status, runs] of [['/docs/button/index.txt?_rsc=x', 200, []], ['/docs/missing/index.txt?_rsc=x', 404, []], ['/unlisted.txt?_rsc=1', 404, ['/unlisted.txt']]]) {
    router.reset();
    const response = await router.fetch(`https://000h.cojeev.com${path}`, {redirect: 'manual'});
    assert.equal(response.status, status);
    assert.equal(response.headers.get('location'), null);
    assert.deepEqual(router.workerRuns(), runs);
    if (status === 200) assert.deepEqual(await bytes(response), await fixture('/docs/button/index.txt'));
    else await response.arrayBuffer();
  }
});
