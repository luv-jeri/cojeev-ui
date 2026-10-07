import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
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
