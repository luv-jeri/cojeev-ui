import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildVariants} from '../scripts/release.mjs';
import {manifestDigest} from '../scripts/release-manifest.mjs';

const repository = path.resolve(import.meta.dirname, '..');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
async function write(root, file, content) {
  await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
  await fs.writeFile(path.join(root, file), content);
}

// Only Next's export is replaced. A14 captures clean Git blobs and compiles the
// actual website and reporting sources into each packaged variant.
async function artifacts(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rollback-rehearsal-test-'));
  t.after(() => fs.rm(temporary, {recursive: true, force: true}));
  const source = path.join(temporary, 'source'), baseline = path.join(temporary, 'baseline');
  await fs.mkdir(source);
  await fs.cp(path.join(repository, 'tests/fixtures/release-baseline'), baseline, {recursive: true});
  for (const folder of ['workers/reporting', 'workers/registry-host', 'lib/reporting'])
    await fs.cp(path.join(repository, folder), path.join(source, folder), {recursive: true});
  await write(source, 'scripts/release-baseline.json', await fs.readFile(path.join(baseline, 'release-baseline.json')));
  await write(source, '.gitignore', 'node_modules/\n');
  await write(source, 'node_modules/wrangler/package.json', '{"version":"4.130.0"}');
  await write(source, 'package.json', JSON.stringify({scripts: {build: 'node export.mjs'}}));
  await write(source, 'export.mjs', `import fs from 'node:fs/promises';
await fs.cp('exports/'+process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT,'out',{recursive:true});`);
  for (const env of ['beta', 'production']) {
    const canonical = env === 'beta' ? 'https://beta.000h.cojeev.com/ui' : 'https://cojeev.com/ui';
    for (const route of ['', 'docs', 'docs/button', 'docs/aspect-ratio', 'getting-started', 'about', 'privacy', 'work-with-me']) {
      const own = route === 'docs/aspect-ratio' ? 'docs/bento-grid' : route === 'work-with-me' ? 'about' : route;
      const url = canonical + '/' + (own ? own + '/' : '');
      await write(source, `exports/${env}/${route ? route+'/' : ''}index.html`, `<html><head><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:image" content="${canonical}/opengraph-image.png"><meta name="twitter:image" content="${canonical}/twitter-image.png"></head><body>Fictional rehearsal page</body></html>`);
    }
    for (const [file, content] of Object.entries({
      '404.html': '<html>Fictional missing page</html>',
      'index.txt': 'rehearsal RSC', '_next/app.js': 'console.log("rehearsal")',
      'sitemap.xml': '<urlset/>', 'robots.txt': 'User-agent: *\n',
      'opengraph-image.png': 'png', 'twitter-image.png': 'png',
      'track/index.html': '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">',
      'feedback-admin/index.html': '<meta name="robots" content="noindex">',
      'r/button.json': '{"name":"button","registryDependencies":[]}',
    })) await write(source, `exports/${env}/${file}`, content);
  }
  const git = (...args) => execFileSync('git', args, {cwd: source, encoding: 'utf8'}).trim();
  git('init', '--quiet'); git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'fixture');
  const root = path.join(temporary, 'variants');
  const saved = {};
  try {
    for (const env of ['beta', 'production']) {
      const key = `BASELINE_${env.toUpperCase()}_DIRECTORY`;
      saved[key] = process.env[key]; process.env[key] = path.join(baseline, env);
    }
    await buildVariants(source, git('rev-parse', 'HEAD'), root);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  return root;
}
const moduleUnderTest = async () => {
  const mod = await import('../scripts/rollback-rehearsal.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  });
  assert.equal(typeof mod.rehearseRollback, 'function', 'rehearseRollback must implement the packaged local sequence');
  return mod;
};

// Skipping post-deploy checks, running a refused deploy, or using live network
// instead of the allowlisted local transport must break this invariant.
test('rollback_rehearsal_preserves_canonical_health_reporting_and_installs', async t => {
  const {rehearseRollback, createRehearsalFetcher, startInstallProxy} = await moduleUnderTest();
  const root = await artifacts(t);
  for (const environment of ['beta', 'production']) {
    const installs = [];
    const result = await rehearseRollback(root, environment, {install: async directory => {installs.push(directory);}});
    assert.deepEqual(result.steps.map(({expected, ok, problems}) => ({expected, ok, problems})), [
      {expected: 'permitted', ok: true, problems: []},
      {expected: 'permitted', ok: true, problems: []},
      {expected: 'refused', ok: true, problems: []},
      {expected: 'permitted', ok: true, problems: []},
      {expected: 'refused', ok: true, problems: []},
    ]);
    assert.deepEqual(installs, ['website-regenerated', 'website-redirect', 'website-redirect'].map(variant => path.join(root, environment, variant)));
  }
  const directory = path.join(root, 'beta/website-regenerated');
  const file = path.join(directory, 'website/index.js');
  const original = await fs.readFile(file, 'utf8');
  // Repackage the mutation: integrity must pass; the running health response
  // itself must make step 1 fail (M7).
  const wrapped = original.replace(/export\s*\{\s*([\w$]+)\s+as\s+default\s*\};?\s*$/, (_, name) =>
    `export default { ...${name}, fetch(request, env, ctx) { if (new URL(request.url).pathname === '/ui/health') return new Response(null, {status:404}); return ${name}.fetch(request, env, ctx); } };`);
  assert.notEqual(wrapped, original, 'the mutation must wrap the packaged default export');
  await fs.writeFile(file, wrapped);
  const manifest = await json(path.join(directory, 'manifest.json'));
  manifest.files['website/index.js'].sha256 = createHash('sha256').update(wrapped).digest('hex');
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.match(manifestDigest(manifest), /^[a-f0-9]{64}$/);
  const broken = await rehearseRollback(root, 'beta', {install: async () => {}});
  assert.equal(broken.steps[0].ok, false);
  assert.ok(broken.steps[0].problems.includes('http-health'));
  assert.equal(broken.steps[1].ok, false, 'failed local checks must not attest forward gates');

  const fetcher = createRehearsalFetcher('beta', {
    website: () => {throw new Error('unexpected local website access');},
    api: () => {throw new Error('unexpected local API access');},
  });
  for (const url of ['https://api.cloudflare.com/', 'https://cojeev.com/ui/health', 'https://example.workers.dev/'])
    await assert.rejects(() => fetcher(url), /Rehearsal host refused/);
  const proxy = await startInstallProxy();
  try {
    assert.equal(proxy.allows('registry.npmjs.org'), true);
    assert.equal(proxy.allows('ui.shadcn.com'), true);
    for (const host of ['api.cloudflare.com', 'cojeev.com', 'feedback.cojeev.com', 'example.workers.dev', 'registry.npmjs.org.evil.test']) {
      assert.equal(proxy.allows(host), false);
      const status = await new Promise((resolve, reject) => {
        const request = http.request(proxy.url, {method: 'CONNECT', path: host+':443'});
        request.on('connect', (response, socket) => {socket.destroy(); resolve(response.statusCode);});
        request.on('error', reject); request.end();
      });
      assert.equal(status, 403);
    }
  } finally {await proxy.close();}
});

// Changing LOCAL_MODE, losing REGISTRY_SITE, or storing either input verbatim
// breaks the actual PATCH/read-back checks after each permitted deployment.
test('rollback_from_any_post_linked_phase_keeps_canonical_site_url_and_accepts_canonical_and_legacy_component_urls', async t => {
  const {rehearseRollback} = await moduleUnderTest();
  const root = await artifacts(t);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {throw new Error('Global fetch must never reach a deployed service');};
  try {
    for (const environment of ['beta', 'production']) {
      const {steps} = await rehearseRollback(root, environment, {install: async () => {}});
      assert.equal(steps.length, 5);
      for (const index of [0, 1, 3]) {
        assert.equal(steps[index].ok, true, JSON.stringify(steps[index]));
        assert.deepEqual(steps[index].problems, []);
      }
    }
  } finally {globalThis.fetch = originalFetch;}
});
