import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {recordGate, assertGates} from '../scripts/release-phases.mjs';

const pairModule = () => import('../scripts/release-pair.mjs');
const script = fileURLToPath(new URL('../scripts/release.mjs', import.meta.url));
const record = fileURLToPath(new URL('./fixtures/release-baseline/release-baseline.json', import.meta.url));
const baseline = JSON.parse(await fs.readFile(record, 'utf8'));
const websiteCommit = 'a'.repeat(40), apiCommit = 'b'.repeat(40);
const hosts = {
  beta: ['https://beta.000h.cojeev.com', 'https://beta.000h.cojeev.com/ui', 'https://feedback-beta.cojeev.com'],
  production: ['https://000h.cojeev.com', 'https://cojeev.com/ui', 'https://feedback.cojeev.com'],
};
function identity(environment, side, phase) {
  const release = phase === 'baseline' ? baseline[environment].commit : side === 'website' ? websiteCommit : apiCommit;
  if (phase === 'baseline') return {environment, release};
  return {environment, release, phase,
    deploymentId: `${side}-${phase}-${release.slice(0, 12)}-12345678`,
    ...(side === 'website' ? {migrationStage: phase === 'redirect' ? 'redirect' : 'additive',
      registryGraph: phase === 'mounted' ? 'baseline' : 'canonical', analyticsEnabled: false}
      : {reportingBase: phase === 'prepared' ? 'legacy' : 'canonical'})};
}
function observations(environment, website, api) {
  const [legacy, canonical, feedback] = hosts[environment];
  const health = identity(environment, 'website', website);
  return {[`${legacy}/health`]: health, [`${canonical}/health`]: health,
    [`${canonical}/release.json`]: health, [`${feedback}/health`]: identity(environment, 'api', api)};
}
const deployments = versionId => ({deployments: [{id: 'active-deployment',
  versions: [{version_id: versionId, percentage: 100}]}]});
const version = message => ({id: 'historical-version', annotations: {'workers/message': message}});
const noRedirect = {items: [version('cojeev-migration side=website phase=regenerated')]};
function dependencies(environment, website, api, options = {}) {
  const values = {...observations(environment, website, api), ...options.observations};
  const calls = {fetch: [], cf: [], run: 0};
  return {calls, record, run: () => {calls.run++; throw new Error('Forbidden run');},
    fetcher: async (url, init = {}) => {
      calls.fetch.push(url);
      assert.equal(init.method ?? 'GET', 'GET');
      assert.ok(Object.hasOwn(values, url), `Unexpected identity URL: ${url}`);
      return values[url] instanceof Response ? values[url].clone() : Response.json(values[url]);
    },
    cf: async (endpoint, init = {}) => {
      calls.cf.push(endpoint);
      assert.equal(init.method ?? 'GET', 'GET');
      if (endpoint.endsWith('/deployments')) {
        const side = endpoint.includes('registry') ? 'website' : 'api';
        return options.deployments?.[side] ?? deployments(baseline[environment][`${side}VersionId`]);
      }
      assert.match(endpoint, /^workers\/scripts\/cojeev-ui-registry(?:-beta)?\/versions(?:\?page=\d+)?$/);
      if (options.unreadable) throw new Error('Unreadable list');
      return endpoint.includes('?') ? options.nextPage ?? {items: []} : options.versions ?? noRedirect;
    }};
}
async function cliHarness(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cojeev-live-pair-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  await fs.mkdir(path.join(directory, 'scripts'));
  await fs.copyFile(record, path.join(directory, 'scripts/release-baseline.json'));
  const preload = path.join(directory, 'fetch.mjs'), output = path.join(directory, 'output');
  const requests = path.join(directory, 'requests');
  return {directory, output,
    async run(args, options = {}) {
      const environment = args[0];
      const values = {...observations(environment, options.website ?? 'regenerated', options.api ?? 'linked'), ...options.observations};
      await fs.writeFile(output, 'existing=value\n');
      await fs.writeFile(requests, '');
      // Only external boundaries are replaced; dispatch, parsing, pair checks,
      // output writes and exit status all run in the actual release CLI.
      await fs.writeFile(preload, `
import fs from 'node:fs/promises';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
for (const name of ['execFileSync', 'execSync', 'exec', 'execFile', 'spawn', 'spawnSync'])
  childProcess[name] = () => {throw new Error('Forbidden run');};
syncBuiltinESMExports();
const values = ${JSON.stringify(values)};
globalThis.fetch = async (url, init = {}) => {
  if ((init.method ?? 'GET') !== 'GET') throw new Error('Forbidden mutation');
  await fs.appendFile(${JSON.stringify(requests)}, url + '\\n');
  if (Object.hasOwn(values, url)) return Response.json(values[url]);
  const endpoint = new URL(url).pathname.split('/accounts/')[1]?.split('/').slice(1).join('/');
  if (!url.startsWith('https://api.cloudflare.com/')) throw new Error('Unexpected URL');
  if (endpoint.endsWith('/deployments')) {
    const side = endpoint.includes('registry') ? 'website' : 'api';
    const result = ${JSON.stringify(options.deployments ?? {})}[side] ??
      {deployments: [{versions: [{version_id: ${JSON.stringify(baseline[environment])}[side + 'VersionId'], percentage: 100}]}]};
    return Response.json({success: true, result});
  }
  if (!endpoint.endsWith('/versions')) throw new Error('Unexpected Cloudflare endpoint');
  ${options.unreadable ? "throw new Error('Unreadable list');" : ''}
  return Response.json({success: true, result: new URL(url).search ? {items: []} : ${JSON.stringify(options.versions ?? noRedirect)}});
};
`);
      const result = spawnSync(process.execPath, ['--import', preload, script, 'live-pair', ...args], {
        cwd: directory, encoding: 'utf8', timeout: 10000,
        env: {PATH: process.env.PATH, GITHUB_OUTPUT: output,
          ...(args.length > 1 ? {CLOUDFLARE_API_TOKEN: 'test-only'} : {})},
      });
      assert.ifError(result.error);
      return {...result, output: await fs.readFile(output, 'utf8'),
        requests: (await fs.readFile(requests, 'utf8')).trim().split('\n').filter(Boolean)};
    }};
}

// Misclassifying a pair, resolving report IDs, or probing canonical/CF endpoints
// would make the deployment summary claim the wrong state or require a token.
test('live_pair_reports_only_the_redirect_pair_as_steady', async t => {
  const cli = await cliHarness(t);
  const cases = [
    ['redirect', 'linked', 'Redirect', 'steady'],
    ['baseline', 'prepared', 'Prepared', 'migrating Prepared'],
    ['mounted', 'prepared', 'Mounted', 'migrating Mounted'],
    ['mounted', 'linked', 'Linked', 'migrating Linked'],
    ['regenerated', 'linked', 'Regenerated', 'migrating Regenerated'],
    ['baseline', 'baseline', 'start', 'migrating start'],
    ['redirect', 'prepared', 'unlisted', 'migrating unlisted'],
  ];
  for (const environment of ['beta', 'production']) for (const [website, api, pair, line] of cases) {
    const result = await cli.run([environment], {website, api});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, `${line}\n`);
    const web = identity(environment, 'website', website), feedback = identity(environment, 'api', api);
    assert.equal(result.output, `existing=value\nsteady=${pair === 'Redirect'}\npair=${pair}\nwebsite_id=${web.deploymentId ?? 'baseline'}\nwebsite_commit=${web.release}\napi_id=${feedback.deploymentId ?? 'baseline'}\napi_commit=${feedback.release}\n`);
    assert.deepEqual(result.requests, [`${hosts[environment][0]}/health`, `${hosts[environment][2]}/health`]);
  }
});

// Losing history, ignoring unreadable messages, or dropping --rollback could
// permit a phase that is incompatible with an already-redirected website.
test('website_rollback_to_mounted_is_refused_after_redirect_was_reached', async t => {
  const {reachedRedirect} = await pairModule();
  const cli = await cliHarness(t);
  for (const environment of ['beta', 'production']) {
    for (const options of [
      {versions: {items: [version('cojeev-migration side=website phase=redirect commit=old')]}},
      {unreadable: true},
      {versions: {items: [{id: 'no-message', metadata: {source: 'api'}}]}},
      {versions: {items: [version(''), {id: 'missing-message'}]}},
      {versions: {}},
    ]) {
      const deps = dependencies(environment, 'regenerated', 'linked', options);
      assert.equal(await reachedRedirect(environment, deps), true);
      const result = await cli.run([environment, 'website', 'mounted', '--rollback'], options);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'Promotion refused: website rollback to mounted after redirect\n');
      assert.equal(result.output, 'existing=value\n');
      assert.equal(deps.calls.run, 0);
    }
    const allowed = await cli.run([environment, 'website', 'mounted', '--rollback']);
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.equal(allowed.stdout, 'plan Regenerated website mounted -> Linked gates=none\n');
    assert.equal(allowed.output, 'existing=value\npair=Regenerated\nresult_pair=Linked\ngates=\nwebsite_id=website-regenerated-aaaaaaaaaaaa-12345678\napi_id=api-linked-bbbbbbbbbbbb-12345678\n');
    const nonWebsite = dependencies(environment, 'regenerated', 'linked', {
      versions: {items: [version('cojeev-migration side=api phase=redirect')]},
    });
    assert.equal(await reachedRedirect(environment, nonWebsite), false);
    const olderRedirect = dependencies(environment, 'regenerated', 'linked', {
      nextPage: {items: [version('cojeev-migration side=website phase=redirect')]},
    });
    assert.equal(await reachedRedirect(environment, olderRedirect), true);
    assert.ok(olderRedirect.calls.cf.includes(`workers/scripts/cojeev-ui-registry${environment === 'beta' ? '-beta' : ''}/versions?page=2`));
  }
});

// Wrong IDs invalidate gate evidence; an unverified baseline or repaired split
// can otherwise cause promotion against a peer that was never tested.
test('live_pair_ids_match_gate_evidence_format', async t => {
  const {readLivePair} = await pairModule();
  const cli = await cliHarness(t);
  for (const environment of ['beta', 'production']) {
    for (const [website, api, side, target, pair, resultPair, gates] of [
      ['baseline', 'baseline', 'api', 'prepared', 'start', 'Prepared', ''],
      ['baseline', 'prepared', 'website', 'mounted', 'Prepared', 'Mounted', 'live,component-head'],
      ['mounted', 'linked', 'website', 'regenerated', 'Linked', 'Regenerated', 'live,component-head,browser-report'],
      ['regenerated', 'linked', 'website', 'redirect', 'Regenerated', 'Redirect', environment === 'production' ? 'live,dual-install,discovery' : 'live,dual-install'],
      ['redirect', 'linked', 'api', 'linked', 'Redirect', 'Redirect', ''],
    ]) {
      const deps = dependencies(environment, website, api);
      const live = await readLivePair(environment, deps);
      const web = identity(environment, 'website', website), feedback = identity(environment, 'api', api);
      const websiteId = web.deploymentId ?? `baseline:${baseline[environment].websiteVersionId}`;
      const apiId = feedback.deploymentId ?? `baseline:${baseline[environment].apiVersionId}`;
      assert.deepEqual(live, {
        website: {phase: website, deploymentId: web.deploymentId ?? null, commit: web.release, id: websiteId,
          ...(website === 'baseline' ? {versionId: baseline[environment].websiteVersionId} : {})},
        api: {phase: api, deploymentId: feedback.deploymentId ?? null, commit: feedback.release, id: apiId,
          ...(api === 'baseline' ? {versionId: baseline[environment].apiVersionId} : {})},
      });
      const result = await cli.run([environment, side, target], {website, api});
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, `plan ${pair} ${side} ${target} -> ${resultPair} gates=${gates || 'none'}\n`);
      assert.equal(result.output, `existing=value\npair=${pair}\nresult_pair=${resultPair}\ngates=${gates}\nwebsite_id=${websiteId}\napi_id=${apiId}\n`);
      const file = path.join(cli.directory, `${environment}-${website}-${api}.jsonl`);
      await recordGate(file, {environment, gate: 'live', website: websiteId, api: apiId, commit: websiteCommit, runId: '1001'});
      await assertGates(file, {environment, live: {website: live.website.id, api: live.api.id}, gates: ['live']});
      await assert.rejects(assertGates(file, {environment, live: {website: `${live.website.id}-stale`, api: live.api.id}, gates: ['live']}), /Missing gate evidence/);
      assert.equal(deps.calls.run, 0);
    }
    for (const side of ['website', 'api']) {
      for (const active of [deployments('another-version'), {deployments: []},
        {deployments: [{versions: [{version_id: baseline[environment][`${side}VersionId`], percentage: 50}, {version_id: 'peer', percentage: 50}]}]}]) {
        await assert.rejects(readLivePair(environment, dependencies(environment, 'baseline', 'baseline', {deployments: {[side]: active}})),
          {message: `Unknown live ${side} deployment`});
      }
      const url = `${hosts[environment][side === 'website' ? 0 : 2]}/health`;
      for (const value of [{...identity(environment, side, side === 'website' ? 'mounted' : 'linked'), environment: environment === 'beta' ? 'production' : 'beta'}, {}, new Response('unavailable', {status: 503})])
        await assert.rejects(readLivePair(environment, dependencies(environment, 'mounted', 'linked', {observations: {[url]: value}})),
          {message: `Malformed live ${side} identity`});
    }
    const canonical = hosts[environment][1];
    for (const endpoint of ['health', 'release.json']) {
      const url = `${canonical}/${endpoint}`;
      for (const patch of [{deploymentId: 'website-mounted-aaaaaaaaaaaa-87654321'}, {release: 'c'.repeat(40)}, {phase: 'regenerated'}])
        await assert.rejects(readLivePair(environment, dependencies(environment, 'mounted', 'linked', {observations: {[url]: {...identity(environment, 'website', 'mounted'), ...patch}}})),
          {message: 'Website identity split'});
      await assert.rejects(readLivePair(environment, dependencies(environment, 'mounted', 'linked', {observations: {[url]: {...identity(environment, 'website', 'mounted'), environment: environment === 'beta' ? 'production' : 'beta'}}})),
        {message: 'Malformed live website identity'});
      await assert.rejects(readLivePair(environment, dependencies(environment, 'mounted', 'linked', {observations: {[url]: {}}})),
        {message: 'Malformed live website identity'});
    }
    const refused = await cli.run([environment, 'website', 'mounted'], {website: 'redirect', api: 'prepared'});
    assert.equal(refused.status, 1);
    assert.equal(refused.stderr, 'Promotion refused: unlisted live pair\n');
  }
});
