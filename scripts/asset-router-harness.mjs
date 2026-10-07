import {build} from 'esbuild';
import {Miniflare, convertV4MiniflareOptions, CoreHeaders} from 'miniflare';
import {unstable_getMiniflareWorkerOptions, unstable_readConfig} from 'wrangler';
import {cp, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';

const fixtureEntry = fileURLToPath(new URL('../workers/registry-host/test/fixtures/harness-entry.mjs', import.meta.url));
const sourceEntry = fileURLToPath(new URL('../workers/registry-host/src/index.mjs', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));

export async function materializeVariant(fixtureDirectory, {entry = 'workers/registry-host/src/index.mjs'} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'cojeev-browser-variant-'));
  try {
    await cp(fixtureDirectory, directory, {recursive: true});
    await build({entryPoints: [resolve(root, entry)], outfile: join(directory, 'website/index.js'),
      bundle: true, format: 'esm', platform: 'browser', target: 'es2022', logLevel: 'silent'});
    return directory;
  } catch (error) {await rm(directory, {recursive: true, force: true}); throw error;}
}

export async function startAssetRouter({worker, homepage}) {
  let selectedEntry, registryOptions;
  if (worker.kind === 'packaged') {
    if (Object.keys(worker).some(key => !['kind', 'directory'].includes(key))) throw new Error('Packaged mode accepts only directory');
    selectedEntry = resolve(worker.directory, 'website/index.js');
    const config = unstable_readConfig({config: resolve(worker.directory, 'website/wrangler.jsonc')});
    registryOptions = unstable_getMiniflareWorkerOptions(config).workerOptions;
    // The selected module is already bundled into the harness wrapper; V5's
    // converter rejects Wrangler's source-loading rules, which are unused here.
    delete registryOptions.modulesRules;
    // Packaged vars are authoritative, even if local dev-vars files are present.
    registryOptions.bindings = config.vars;
    registryOptions.assets.directory = resolve(worker.directory, 'site');
  } else if (worker.kind === 'source') {
    selectedEntry = sourceEntry;
    registryOptions = {compatibilityDate: '2026-09-10',
      bindings: {ENVIRONMENT: worker.environment, MIGRATION_STAGE: worker.migrationStage},
      assets: {directory: resolve(worker.site), binding: 'ASSETS', run_worker_first: worker.workerFirst,
        not_found_handling: '404-page', html_handling: 'auto-trailing-slash', routerConfig: {has_user_worker: true}}};
  } else throw new Error(`Unknown asset-router mode: ${worker.kind}`);
  const compiled = await build({entryPoints: [fixtureEntry], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
    plugins: [{name: 'selected-worker', setup(build) {build.onResolve({filter: /^harness-selected-worker$/}, () => ({path: selectedEntry}));}}],
  });
  const runs = [];
  const options = convertV4MiniflareOptions({workers: [
    {...registryOptions, name: 'registry', modules: true, script: compiled.outputFiles[0].text,
      serviceBindings: {COJEEV_HOMEPAGE: 'homepage', HARNESS_LOG: request => {runs.push(new URL(request.url).pathname); return new Response(null);}},
    },
    {name: 'homepage', modules: true, script: 'export default {fetch(request, env) {return env.ASSETS.fetch(request)}}', compatibilityDate: '2026-09-10',
      assets: {directory: resolve(homepage), binding: 'ASSETS', not_found_handling: '404-page', html_handling: 'auto-trailing-slash', routerConfig: {has_user_worker: true}}},
  ]});
  // V4 conversion drops source/homepage top-level handling fields. Wrangler's
  // packaged assetConfig converts intact and must retain its own handling values.
  for (const [i, optionsWorker] of options.workers.entries()) {
    if (i === 1 || worker.kind === 'source') Object.assign(optionsWorker.config.assets, {notFoundHandling: '404-page', htmlHandling: 'auto-trailing-slash'});
  }
  const mf = new Miniflare(options);
  try {
    await mf.ready;
    // Both observations use the same HTTP transport. Miniflare strips its route override
    // before the homepage receives the identical host, pathname, query and request headers.
    const home = (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set(CoreHeaders.ROUTE_OVERRIDE, 'homepage');
      return mf.dispatchFetch(url, {...init, headers});
    };
    return {fetch: (url, init) => mf.dispatchFetch(url, init), homepage: home,
      workerRuns: () => [...runs], reset: () => {runs.length = 0;}, dispose: () => mf.dispose()};
  } catch (error) {await mf.dispose(); throw error;}
}
export async function followChain(router, url, maxHops = 5) {
  const hops = [];
  for (let redirects = 0; ; redirects++) {
    const response = await router.fetch(url, {redirect: 'manual'});
    const location = response.headers.get('location');
    hops.push({status: response.status, location});
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) return {hops, final: response};
    await response.arrayBuffer();
    if (redirects >= maxHops) throw new Error(`Redirect chain exceeds ${maxHops} hops`);
    url = new URL(location, url).href;
  }
}
export function chainProblems(hops, {mount, query, canonicalBase}) {
  const problems = [];
  for (const {location} of hops) {
    if (location === null) continue;
    const url = new URL(location, canonicalBase);
    if (url.search !== query) problems.push(`Redirect lost query: ${location}`);
    if (mount === 'canonical' && (!(location.startsWith('/ui/') || location.startsWith(`${canonicalBase}/`)) || !url.pathname.startsWith('/ui/'))) problems.push(`Redirect escaped canonical mount: ${location}`);
    if (mount === 'canonical' && url.pathname.includes('/ui/ui/')) problems.push(`Redirect doubled mount: ${location}`);
    if (mount === 'legacy' && /^\/ui(?:\/|$)/.test(url.pathname)) problems.push(`Redirect added canonical mount: ${location}`);
  }
  return problems;
}
