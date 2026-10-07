import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync, readFileSync, statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createManifest, manifestDigest} from '../scripts/release-manifest.mjs';
import {recordGate} from '../scripts/release-phases.mjs';
import {backup, prepareDatabaseRecovery} from '../scripts/operations.mjs';
import {deploymentDiagnostic, recordDeploymentEvent} from '../scripts/deployment-diagnostics.mjs';

const repository = path.resolve(import.meta.dirname, '..');
const baseline = JSON.parse(readFileSync(path.join(repository, 'tests/fixtures/release-baseline/release-baseline.json'), 'utf8'));
const commit = 'a'.repeat(40);
const bootstrap = {ADMIN_TOKEN: 'a'.repeat(40), HEALTH_TOKEN: 'h'.repeat(40), IP_HASH_SECRET: 'i'.repeat(40), TURNSTILE_SECRET: 's'.repeat(40), TURNSTILE_SITE_KEY: '0x' + 'a'.repeat(24)};
const rows = {mounted: {migrationStage: 'additive', registryGraph: 'baseline'}, regenerated: {migrationStage: 'additive', registryGraph: 'canonical'}, redirect: {migrationStage: 'redirect', registryGraph: 'canonical'}};
const hosts = {beta: ['https://beta.000h.cojeev.com', 'https://beta.000h.cojeev.com/ui', 'https://feedback-beta.cojeev.com'], production: ['https://000h.cojeev.com', 'https://cojeev.com/ui', 'https://feedback.cojeev.com']};
const id = (side, phase) => `${side}-${phase}-aaaaaaaaaaaa-12345678`;
async function promotion(side) {
  const module = await import('../scripts/release-promote.mjs').catch(error => {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return {};
  });
  const fn = module[side === 'api' ? 'promoteApi' : 'promoteWebsite'];
  assert.equal(typeof fn, 'function', `targeted ${side} promotion must exist`);
  return fn;
}
async function write(directory, file, value) {
  await fs.mkdir(path.dirname(path.join(directory, file)), {recursive: true});
  await fs.writeFile(path.join(directory, file), value);
}
async function variant(directory, environment, side, phase) {
  const source = JSON.parse(readFileSync(path.join(repository, `workers/${side === 'api' ? 'reporting' : 'registry-host'}/wrangler.jsonc`), 'utf8'));
  const config = {...source, ...source.env[environment], services: source.env[environment].services, main: './index.js', vars: {...source.env[environment].vars, RELEASE: commit, PHASE: phase, DEPLOYMENT_ID: id(side, phase)}};
  delete config.env;
  const identity = {side, phase, deploymentId: id(side, phase)};
  if (side === 'api') {
    identity.reportingBase = phase === 'prepared' ? 'legacy' : 'canonical';
    config.vars.SITE_URL = hosts[environment][phase === 'prepared' ? 0 : 1];
    config.d1_databases = config.d1_databases.map(value => ({...value, migrations_dir: './migrations'}));
    await write(directory, 'api/migrations/0002_safe_delivery.sql', '-- additive fixture');
  } else {
    Object.assign(identity, rows[phase]);
    Object.assign(config.vars, {MIGRATION_STAGE: identity.migrationStage, REGISTRY_GRAPH: identity.registryGraph});
    config.assets = {...config.assets, directory: '../site'};
    await write(directory, 'site/ui/index.html', '<html><body>ui</body></html>');
    await write(directory, 'site/ui/release.json', JSON.stringify({environment, release: commit, deploymentId: identity.deploymentId, phase, ...rows[phase], analyticsEnabled: false}));
    await write(directory, 'site/r/button.json', '{"name":"button","registryDependencies":[]}');
    await write(directory, 'site/ui/r/button.json', '{"name":"button","registryDependencies":[]}');
    await write(directory, 'site/_headers', '/*\n  x-content-type-options: nosniff\n');
  }
  await write(directory, `${side}/wrangler.jsonc`, JSON.stringify(config));
  await write(directory, `${side}/index.js`, 'export default {}');
  const manifest = await createManifest(directory, environment, commit, identity);
  await write(directory, 'manifest.json', JSON.stringify(manifest));
  return {directory, digest: manifestDigest(manifest), manifest, config};
}
async function harness(t, environment = 'beta', website = 'mounted', api = 'linked') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'promotion-test-'));
  const cwd = process.cwd();
  const keys = ['REPORTING_SECRETS_JSON', 'REPORTING_ADDITIONAL_SECRETS_JSON', 'REPORTING_ADMIN_TOKEN', 'RESEND_WEBHOOK_SECRET', 'ROLLBACK_SCHEMA_ACK', 'GITHUB_STEP_SUMMARY'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.REPORTING_SECRETS_JSON = JSON.stringify(bootstrap);
  process.env.ROLLBACK_SCHEMA_ACK = '0002_safe_delivery.sql';
  await write(directory, 'scripts/release-baseline.json', JSON.stringify(baseline));
  process.chdir(directory);
  t.after(async () => {
    process.chdir(cwd);
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    await fs.rm(directory, {recursive: true, force: true});
  });
  const calls = [], cfCalls = [], order = [], evidence = path.join(directory, 'evidence.jsonl');
  const phases = {[environment]: {website, api}, beta: environment === 'beta' ? {website, api} : {website: 'redirect', api: 'linked'}};
  const options = {
    evidence, history: 'none', baselineVersions: {}, phases,
    run: (args, input) => {calls.push({args, input}); order.push(args[0]);},
    backupDatabase: async () => {order.push('backup');},
    fetcher: async (url, init) => {
      assert.equal(init.method ?? 'GET', 'GET');
      const env = url.includes('beta') ? 'beta' : 'production';
      const side = url.startsWith(hosts[env][2]) ? 'api' : 'website';
      const phase = phases[env][side];
      return Response.json(phase === 'baseline' ? {environment: env, release: baseline[env].commit} :
        {environment: env, release: commit, phase, deploymentId: id(side, phase), ...(side === 'website' ? {...rows[phase], analyticsEnabled: false} : {reportingBase: phase === 'prepared' ? 'legacy' : 'canonical'})});
    },
    cf: async (endpoint, init = {}) => {
      assert.equal(init.method ?? 'GET', 'GET', 'preflight must never mutate Cloudflare');
      cfCalls.push(endpoint);
      if (endpoint.endsWith('/secrets')) return ['ADMIN_TOKEN', 'HEALTH_TOKEN', 'IP_HASH_SECRET', 'TURNSTILE_SECRET'].map(name => ({name}));
      if (endpoint.endsWith('/deployments')) {
        const side = endpoint.includes('registry') ? 'website' : 'api';
        const env = endpoint.includes('-beta') ? 'beta' : 'production';
        return {deployments: [{versions: [{version_id: options.baselineVersions[side] ?? baseline[env][`${side}VersionId`], percentage: 100}]}]};
      }
      assert.match(endpoint, /\/versions(?:\?page=\d+)?$/);
      if (options.history === 'unreadable') throw new Error('Unreadable versions');
      return {items: options.history === 'redirect' ? [{id: 'history', annotations: {'workers/message': 'cojeev-migration side=website phase=redirect id=old'}}] : []};
    },
  };
  const peer = async (side, phase) => variant(path.join(directory, `peer-${side}-${phase}`), environment, side, phase);
  const target = async (side, phase) => variant(path.join(directory, `target-${side}-${phase}`), environment, side, phase);
  const invoke = async (artifact, expected, extras = {}) => (await promotion(artifact.manifest.side))(artifact.directory, environment, commit, artifact.digest, expected, {...options, ...extras});
  const gates = async (names, web = website, feedback = api) => {
    for (const gate of names) await recordGate(evidence, {environment, gate, website: web === 'baseline' ? `baseline:${baseline[environment].websiteVersionId}` : id('website', web), api: feedback === 'baseline' ? `baseline:${baseline[environment].apiVersionId}` : id('api', feedback), commit, runId: '1001', attest: 'fixture accepted'});
  };
  const stopped = async (fn, pattern) => {await assert.rejects(fn(), pattern); assert.deepEqual(calls, []); assert.deepEqual(order, []);};
  return {directory, options, calls, cfCalls, order, peer, target, invoke, gates, stopped};
}

// Exercise the real CLI and Wrangler wrapper, replacing only subprocess/network
// boundaries. The gate observer delegates to the real validator unchanged.
async function cliPromotion(h, artifact, expected, {peer, rollback = false} = {}) {
  const output = path.join(h.directory, 'cli-calls.jsonl'), gates = path.join(h.directory, 'cli-gates.jsonl');
  await fs.writeFile(output, ''); await fs.writeFile(gates, '');
  const runtime = await fs.mkdtemp(path.join(os.tmpdir(), 'promotion-runtime-')), bin = path.join(runtime, 'bin/wrangler.js');
  await write(runtime, 'package.json', '{"version":"4.131.1"}');
  await write(runtime, 'bin/wrangler.js', '// boundary replaced by preload');
  const original = pathToFileURL(path.join(repository, 'scripts/release-phases.mjs')).href;
  const observer = path.join(h.directory, 'gate-observer.mjs');
  await fs.writeFile(observer, `import fs from 'node:fs/promises'; import * as original from ${JSON.stringify(original)}; export * from ${JSON.stringify(original)}; export async function assertGates(file,options) {await fs.appendFile(${JSON.stringify(gates)},JSON.stringify(options)+'\\n'); return original.assertGates(file,options);}`);
  const loader = path.join(h.directory, 'observe-loader.mjs');
  await fs.writeFile(loader, `export function resolve(specifier,context,next) {if(specifier==='./release-phases.mjs'&&context.parentURL?.endsWith('/release-promote.mjs')) return {url:${JSON.stringify(pathToFileURL(observer).href)},shortCircuit:true}; return next(specifier,context);}`);
  const preload = path.join(h.directory, 'cli-preload.mjs');
  await fs.writeFile(preload, `
import fs from 'node:fs'; import cp from 'node:child_process'; import {register,syncBuiltinESMExports} from 'node:module';
register(${JSON.stringify(pathToFileURL(loader).href)});
cp.execFileSync=(exe,args)=>{fs.appendFileSync(${JSON.stringify(output)},JSON.stringify(args.slice(1))+'\\n');return args.includes('info')?'{"bookmark":"aaaaaaaa-bbbbbbbb"}':'';}; syncBuiltinESMExports();
const hosts=${JSON.stringify(hosts)}, phases=${JSON.stringify(h.options.phases)}, baseline=${JSON.stringify(baseline)}, rows=${JSON.stringify(rows)};
globalThis.fetch=async(url,init={})=>{
  if((init.method??'GET')!=='GET') throw new Error('Forbidden mutation');
  if(url.startsWith('https://api.cloudflare.com/')) {
    const side=url.includes('registry')?'website':'api',env=url.includes('-beta')?'beta':'production';
    return Response.json({success:true,result:url.includes('/deployments')?{deployments:[{versions:[{version_id:baseline[env][side+'VersionId'],percentage:100}]}]}:{items:[]}});
  }
  const env=url.includes('beta')?'beta':'production',side=url.startsWith(hosts[env][2])?'api':'website',phase=phases[env][side];
  return Response.json(phase==='baseline'?{environment:env,release:baseline[env].commit}:{environment:env,release:${JSON.stringify(commit)},phase,deploymentId:side+'-'+phase+'-aaaaaaaaaaaa-12345678',...(side==='website'?{...rows[phase],analyticsEnabled:false}:{reportingBase:phase==='prepared'?'legacy':'canonical'})});
};
`);
  const result = spawnSync(process.execPath, ['--import', preload, path.join(repository, 'scripts/release.mjs'), `promote-${artifact.manifest.side}`, artifact.manifest.environment, commit, artifact.directory, artifact.digest, expected, ...(rollback ? ['--rollback'] : [])], {
    cwd: h.directory, encoding: 'utf8', timeout: 10000,
    env: {PATH: process.env.PATH, WRANGLER_BIN: bin, CLOUDFLARE_API_TOKEN: 'fixture-only', REPORTING_SECRETS_JSON: process.env.REPORTING_SECRETS_JSON,
      ROLLBACK_SCHEMA_ACK: '0002_safe_delivery.sql', PROMOTION_EVIDENCE: h.options.evidence,
      ...(peer ? {PEER_DIRECTORY: peer.directory, PEER_DIGEST: peer.digest} : {})},
  });
  await fs.rm(runtime, {recursive: true, force: true});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const records = async file => (await fs.readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  return {result: JSON.parse(result.stdout.trim().split('\n').at(-1)), calls: await records(output), gates: await records(gates)};
}

// Removing peer verification, phase checks or any read-only guard must fail these cases.
test('promotion_rejects_unlisted_phase_pairs_and_stale_peer', async t => {
  const h = await harness(t), artifact = await h.target('api', 'linked'), peer = await h.peer('website', 'mounted');
  await h.stopped(() => h.invoke(artifact, id('website', 'redirect'), {peer}), /Stale peer/);
  h.options.phases.beta.website = 'regenerated';
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer}), /Stale peer/);
  h.options.phases.beta = {website: 'redirect', api: 'prepared'};
  const redirect = await h.peer('website', 'redirect');
  await h.stopped(() => h.invoke(artifact, redirect.manifest.deploymentId, {peer: redirect}), /unlisted/);
  h.options.phases.beta = {website: 'mounted', api: 'linked'};
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId), /peer/i);
  await fs.writeFile(path.join(peer.directory, 'website/index.js'), 'tampered');
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer}), /integrity/);
});

test('start_to_prepared_resolves_baseline_peer_through_record', async t => {
  const h = await harness(t, 'beta', 'baseline', 'baseline'), artifact = await h.target('api', 'prepared');
  // The public result exposes the verified live pair used for evidence.
  for (const expected of ['baseline', `baseline:${baseline.beta.websiteVersionId}`]) {
    const result = await h.invoke(artifact, expected);
    assert.equal(result.expectedPeerId, `baseline:${baseline.beta.websiteVersionId}`);
    assert.equal(result.phase, 'prepared');
  }
  for (const expected of ['baseline', `baseline:${baseline.beta.websiteVersionId}`]) {
    const cli = await cliPromotion(h, artifact, expected);
    assert.equal(cli.result.phase, 'prepared');
    assert.equal(cli.gates[0].live.website, `baseline:${baseline.beta.websiteVersionId}`);
    assert.deepEqual(cli.calls.map(args => args.slice(0, 3)), [['d1', 'time-travel', 'info'], ['d1', 'migrations', 'apply'], ['deploy', '--config', path.join(artifact.directory, 'api/wrangler.jsonc')]]);
  }
  h.calls.length = 0; h.order.length = 0;
  await h.stopped(() => h.invoke(artifact, 'baseline:99999999-9999-4999-8999-999999999999'), /Stale peer/);
  h.options.baselineVersions.website = 'unknown-version';
  await h.stopped(() => h.invoke(artifact, 'baseline'), /Stale peer/);
});

test('api_promotion_does_not_deploy_website', async t => {
  const h = await harness(t, 'beta', 'mounted', 'prepared'), artifact = await h.target('api', 'linked'), peer = await h.peer('website', 'mounted');
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer}), /Missing gate/);
  await h.gates(['live', 'ui-browser']);
  await h.invoke(artifact, peer.manifest.deploymentId, {peer});
  assert.deepEqual(h.order, ['backup', 'd1', 'deploy']);
  const config = path.join(artifact.directory, 'api/wrangler.jsonc');
  assert.deepEqual(h.calls[0].args, ['d1', 'migrations', 'apply', 'cojeev-ui-beta-reports', '--remote', '--config', config]);
  const args = h.calls[1].args;
  assert.deepEqual(args.slice(0, 5), ['deploy', '--config', config, '--no-bundle', '--secrets-file']);
  assert.deepEqual(args.slice(6), ['--message', `cojeev-migration side=api phase=linked id=${artifact.manifest.deploymentId}`]);
  assert.ok(!h.calls.some(call => call.args.some(value => value.includes('website/wrangler.jsonc'))));
  h.options.phases.beta.api = 'linked'; h.calls.length = 0; h.order.length = 0;
  delete process.env.ROLLBACK_SCHEMA_ACK;
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true}), /schema 0002/);
  process.env.ROLLBACK_SCHEMA_ACK = '0002_safe_delivery.sql';
  await h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true});
  assert.deepEqual(h.order, ['deploy']);
});

// An acknowledgement of an older schema must never permit a code-only rollback.
test('rollback_ack_must_name_newest_packaged_migration', async t => {
  const h = await harness(t), artifact = await h.target('api', 'linked'), peer = await h.peer('website', 'mounted');
  const repackage = async () => {
    artifact.manifest = await createManifest(artifact.directory, 'beta', commit, artifact.manifest);
    artifact.digest = manifestDigest(artifact.manifest);
    await write(artifact.directory, 'manifest.json', JSON.stringify(artifact.manifest));
  };
  for (const name of ['0004_status_key.sql', '0001_reporting.sql', '0003_triage.sql'])
    await write(artifact.directory, 'api/migrations/' + name, '-- additive fixture');
  await repackage();
  process.env.ROLLBACK_SCHEMA_ACK = '0004_status_key.sql';
  await h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true});
  assert.deepEqual(h.order, ['deploy'], 'code rollback must not back up or migrate D1');
  h.calls.length = 0; h.order.length = 0;
  process.env.ROLLBACK_SCHEMA_ACK = '0002_safe_delivery.sql';
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true}), /Code rollback requires reviewed compatible schema 0004_status_key\.sql/);
  await write(artifact.directory, 'api/migrations/0005_x.sql', '-- additive fixture');
  await repackage();
  process.env.ROLLBACK_SCHEMA_ACK = '0004_status_key.sql';
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true}), /Code rollback requires reviewed compatible schema 0005_x\.sql/);
  process.env.ROLLBACK_SCHEMA_ACK = '0005_x.sql';
  await fs.rm(path.join(artifact.directory, 'api/migrations/0002_safe_delivery.sql'));
  await repackage();
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true}), /Code rollback requires reviewed compatible schema 0005_x\.sql/);
});

test('website_promotion_cannot_revert_or_prematurely_switch_site_url', async t => {
  const h = await harness(t), artifact = await h.target('website', 'regenerated'), peer = await h.peer('api', 'linked');
  await write(artifact.directory, 'api/wrangler.jsonc', '{"vars":{"SITE_URL":"stale"}}');
  artifact.manifest = await createManifest(artifact.directory, 'beta', commit, artifact.manifest);
  artifact.digest = manifestDigest(artifact.manifest);
  await write(artifact.directory, 'manifest.json', JSON.stringify(artifact.manifest));
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer}), /Missing gate/);
  await h.gates(['live', 'component-head', 'browser-report']);
  process.env.REPORTING_SECRETS_JSON = 'invalid secret input';
  await h.invoke(artifact, peer.manifest.deploymentId, {peer});
  assert.deepEqual(h.calls, [{args: ['deploy', '--config', path.join(artifact.directory, 'website/wrangler.jsonc'), '--no-bundle', '--message', `cojeev-migration side=website phase=regenerated id=${artifact.manifest.deploymentId}`], input: undefined}]);
  const cli = await cliPromotion(h, artifact, peer.manifest.deploymentId, {peer});
  assert.deepEqual(cli.calls, [h.calls[0].args]);
  h.calls.length = 0; h.order.length = 0; h.options.phases.beta.api = 'prepared';
  const prepared = await h.peer('api', 'prepared');
  await h.stopped(() => h.invoke(artifact, prepared.manifest.deploymentId, {peer: prepared}), /unlisted/);
});

test('untargeted_migration_deployment_is_rejected', async t => {
  const h = await harness(t), artifact = await h.target('api', 'linked');
  const preload = path.join(h.directory, 'no-mutations.mjs'), mutations = path.join(h.directory, 'mutations');
  await fs.writeFile(preload, `import cp from 'node:child_process'; import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; cp.execFileSync=()=>{fs.writeFileSync(${JSON.stringify(mutations)},'forbidden');throw new Error('Forbidden run');}; syncBuiltinESMExports(); globalThis.fetch=()=>{throw new Error('Forbidden network');};`);
  for (const command of ['deploy', 'rollback']) {
    const result = spawnSync(process.execPath, ['--import', preload, path.join(repository, 'scripts/release.mjs'), command], {encoding: 'utf8', cwd: h.directory, env: {PATH: process.env.PATH}});
    assert.equal(result.status, 1);
    assert.equal(result.stderr, 'Untargeted deploy is retired: use promote-api or promote-website\n');
    assert.equal(existsSync(mutations), false);
  }
  const schema1 = path.join(repository, 'tests/fixtures/release-baseline/beta');
  for (const side of ['api', 'website']) {
    await h.stopped(async () => (await promotion(side))(schema1, 'beta', baseline.beta.commit, baseline.beta.digest, 'baseline', h.options), /Unversioned artifact/);
    const result = spawnSync(process.execPath, ['--import', preload, path.join(repository, 'scripts/release.mjs'), `promote-${side}`, 'beta', baseline.beta.commit, schema1, baseline.beta.digest, 'baseline'], {encoding: 'utf8', cwd: h.directory, env: {PATH: process.env.PATH}});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unversioned artifact/);
    assert.equal(existsSync(mutations), false);
  }
  const config = path.join(artifact.directory, 'api/wrangler.jsonc');
  await prepareDatabaseRecovery('beta', config, {run: () => '{"bookmark":"aaaaaaaa-bbbbbbbb"}'});
  const source = JSON.parse(await fs.readFile(config, 'utf8'));
  Object.assign(source.vars, {PHASE: 'unconfigured', DEPLOYMENT_ID: 'unconfigured'});
  await fs.writeFile(config, JSON.stringify(source));
  for (const fn of [backup, prepareDatabaseRecovery]) await h.stopped(() => fn('beta', config, h.options), /vars.PHASE/);
});

test('rollback_artifact_cannot_remove_ui_or_legacy_registry', async t => {
  const h = await harness(t, 'beta', 'regenerated', 'linked'), peer = await h.peer('api', 'linked');
  for (const file of ['site/ui/index.html', 'site/r']) {
    const artifact = await variant(path.join(h.directory, file.replaceAll('/', '-')), 'beta', 'website', 'regenerated');
    await fs.rm(path.join(artifact.directory, file), {recursive: true});
    for (const name of Object.keys(artifact.manifest.files)) if (name === file || name.startsWith(file + '/')) delete artifact.manifest.files[name];
    artifact.digest = manifestDigest(artifact.manifest);
    await write(artifact.directory, 'manifest.json', JSON.stringify(artifact.manifest));
    await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true}), /website artifact|legacy registry/i);
  }
  await h.stopped(async () => (await promotion('website'))('baseline', 'beta', commit, '0'.repeat(64), peer.manifest.deploymentId, {...h.options, peer, rollback: true}), /baseline/i);
});

test('rollback_from_any_post_linked_phase_keeps_canonical_site_url_and_accepts_canonical_and_legacy_component_urls', async t => {
  const h = await harness(t), prepared = await h.target('api', 'prepared'), linked = await h.target('api', 'linked');
  for (const phase of ['mounted', 'regenerated', 'redirect']) {
    h.options.phases.beta = {website: phase, api: 'linked'};
    const peer = await h.peer('website', phase);
    await h.stopped(() => h.invoke(prepared, peer.manifest.deploymentId, {peer, rollback: true}), /post-Linked/);
    await h.invoke(linked, peer.manifest.deploymentId, {peer, rollback: true});
    const config = JSON.parse(await fs.readFile(h.calls[0].args[2], 'utf8'));
    assert.equal(config.vars.SITE_URL, 'https://beta.000h.cojeev.com/ui');
    assert.equal(config.vars.LEGACY_SITE_URL, 'https://beta.000h.cojeev.com');
    assert.equal(h.calls.length, 1);
    h.calls.length = 0; h.order.length = 0;
  }
});

test('website_rollback_to_mounted_is_refused_after_redirect_was_reached', async t => {
  const h = await harness(t, 'beta', 'regenerated', 'linked'), artifact = await h.target('website', 'mounted'), peer = await h.peer('api', 'linked');
  for (const history of ['redirect', 'unreadable']) {
    h.options.history = history;
    await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer, rollback: true}), /after redirect/);
  }
});

test('health_recovery_and_diagnostics_keep_existing_protections', async t => {
  const h = await harness(t), artifact = await h.target('api', 'linked'), peer = await h.peer('website', 'mounted');
  let secretsFile;
  const run = (args, input) => {
    if (args[0] === 'deploy') {
      secretsFile = args[args.indexOf('--secrets-file') + 1];
      assert.equal(statSync(path.dirname(secretsFile)).mode & 0o777, 0o700);
      assert.equal(statSync(secretsFile).mode & 0o777, 0o600);
      assert.deepEqual(JSON.parse(readFileSync(secretsFile, 'utf8')), bootstrap);
      assert.deepEqual(JSON.parse(input), bootstrap);
      throw new Error('deploy failed');
    }
  };
  await assert.rejects(h.invoke(artifact, peer.manifest.deploymentId, {peer, run}), /deploy failed/);
  assert.equal(existsSync(path.dirname(secretsFile)), false);
  const message = `cojeev-migration side=api phase=linked id=${artifact.manifest.deploymentId}`;
  const event = deploymentDiagnostic({status: 1, stderr: '[ERROR] Bearer private-token person@example.invalid https://private.example/ sk-privatekey [code: 10021]'}, ['deploy', '--message', message], JSON.stringify({HEALTH_TOKEN: 'private-token'}), {});
  assert.equal(event.side, 'api'); assert.equal(event.phase, 'linked'); assert.equal(event.deploymentId, artifact.manifest.deploymentId);
  assert.ok(!/private-token|person@|https:|sk-privatekey/.test(JSON.stringify(event)));
  const events = [];
  t.mock.method(console, 'error', line => events.push(JSON.parse(line)));
  await h.invoke(artifact, peer.manifest.deploymentId, {peer});
  assert.ok(events.some(value => value.side === 'api' && value.phase === 'linked' && value.deploymentId === artifact.manifest.deploymentId && value.status === 'succeeded'));
  recordDeploymentEvent(event);
  assert.equal(events.at(-1).apiCode, '10021');
  recordDeploymentEvent({operation: 'deploy', status: 'started'}, ['deploy', '--message', message]);
  assert.equal(events.at(-1).deploymentId, artifact.manifest.deploymentId);
});

test('production_mounted_requires_beta_redirect_before_any_mutation', async t => {
  const h = await harness(t, 'production', 'baseline', 'prepared'), artifact = await h.target('website', 'mounted'), peer = await h.peer('api', 'prepared');
  await h.gates(['live', 'component-head']);
  h.options.phases.beta = {website: 'regenerated', api: 'linked'};
  await h.stopped(() => h.invoke(artifact, peer.manifest.deploymentId, {peer}), /beta.*Redirect/i);
  h.options.phases.beta.website = 'redirect';
  await h.invoke(artifact, peer.manifest.deploymentId, {peer});
  assert.equal(h.calls.length, 1);
});
