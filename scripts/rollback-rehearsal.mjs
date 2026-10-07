/** A disposable rehearsal; all promotion transports terminate locally. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes, randomUUID, createHash} from 'node:crypto';
import {createServer, request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {connect, isIP} from 'node:net';
import {spawn} from 'node:child_process';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {startAssetRouter} from './asset-router-harness.mjs';
import {environmentConfig} from './release-config.mjs';
import {manifestDigest} from './release-manifest.mjs';
import {readVariant} from './release-variants.mjs';
import {promoteWebsite, promoteApi} from './release-promote.mjs';
import {liveProblems} from './release.mjs';
import {componentGate} from './deployed-component-gate.mjs';
import {recordGate} from './release-phases.mjs';

const repository = path.resolve(import.meta.dirname, '..');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const secretNames = ['ADMIN_TOKEN', 'HEALTH_TOKEN', 'TURNSTILE_SECRET', 'IP_HASH_SECRET',
  'GITHUB_TOKEN', 'GITHUB_WEBHOOK_SECRET', 'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET'];
const loopback = host => host === 'localhost' || host === '::1' || host === '[::1]' ||
  isIP(host) === 4 && host.startsWith('127.');
// shadcn@4.21.0 init fetches its preset, style and registry from this host.
// npm tarballs and every transitive package remain on registry.npmjs.org.
const packageHosts = new Set(['registry.npmjs.org', 'ui.shadcn.com']);

export function createRehearsalFetcher(environment, {website, api}) {
  const target = environmentConfig(environment);
  const siteHosts = new Set([new URL(target.legacySite).host, new URL(target.canonicalSite).host]);
  return async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Rehearsal host refused');
    if (siteHosts.has(url.host)) return website(input, init);
    if (url.host === new URL(target.api).host) return api(input, init);
    throw new Error('Rehearsal host refused');
  };
}

export async function startInstallProxy() {
  const calls = [], sockets = new Set();
  const allows = host => loopback(host) || packageHosts.has(host);
  const allowed = url => allows(url.hostname) && !url.username && !url.password &&
    ['http:', 'https:'].includes(url.protocol) &&
    (loopback(url.hostname) || !url.port || ['80', '443'].includes(url.port));
  const server = createServer((request, response) => {
    let url;
    try {url = new URL(request.url);} catch {response.writeHead(400).end(); return;}
    calls.push({host: url.hostname, allowed: allowed(url)});
    if (!allowed(url)) {response.writeHead(403).end('Rehearsal proxy host refused'); return;}
    const headers = {...request.headers, host: url.host};
    delete headers['proxy-authorization']; delete headers['proxy-connection'];
    const upstream = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method: request.method, headers,
    }, result => {response.writeHead(result.statusCode, result.headers); result.pipe(response);});
    upstream.on('socket', socket => {sockets.add(socket); socket.on('close', () => sockets.delete(socket));});
    upstream.on('error', () => {if (!response.headersSent) response.writeHead(502); response.end();});
    request.pipe(upstream);
  });
  server.on('connection', socket => {sockets.add(socket); socket.on('close', () => sockets.delete(socket));});
  server.on('connect', (request, client, head) => {
    let url;
    try {url = new URL('https://' + request.url);} catch {client.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return;}
    const accepted = allowed(url);
    calls.push({host: url.hostname, allowed: accepted});
    if (!accepted) {client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return;}
    const upstream = connect(Number(url.port || 443), url.hostname.replace(/^\[|\]$/g, ''));
    sockets.add(upstream); upstream.on('close', () => sockets.delete(upstream));
    upstream.on('connect', () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      client.pipe(upstream); upstream.pipe(client);
    });
    upstream.on('error', () => client.destroy()); client.on('error', () => upstream.destroy());
    client.on('close', () => upstream.destroy());
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  return {url: `http://127.0.0.1:${server.address().port}`, allows, calls,
    close: async () => {for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve));}};
}

async function installEnvironment(scratch, proxy) {
  const guard = path.join(scratch, 'install-network-guard.mjs'), violation = path.join(scratch, 'proxy-bypass');
  // Proxy variables alone are advisory. Fail closed when a Node downloader
  // attempts a direct external socket; the violation also fails the parent.
  await fs.writeFile(guard, `import net from 'node:net';
import {appendFileSync} from 'node:fs';
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
  const options=net._normalizeArgs(args)[0];
  const host=options.host??'localhost';
  if(options.path || !(host==='localhost'||host==='::1'||host==='[::1]'||net.isIP(host)===4&&host.startsWith('127.'))){
    appendFileSync(${JSON.stringify(violation)},'proxy bypass refused\\n');
    throw new Error('Install attempted to bypass the rehearsal proxy');
  }
  return connect.apply(this,args);
};`);
  const env = {PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`, HOME: scratch,
    TMPDIR: scratch, CI: 'true', NEXT_TELEMETRY_DISABLED: '1',
    NODE_OPTIONS: `--import=${pathToFileURL(guard).href}`,
    HTTP_PROXY: proxy.url, HTTPS_PROXY: proxy.url,
    http_proxy: proxy.url, https_proxy: proxy.url,
    npm_config_proxy: proxy.url, npm_config_https_proxy: proxy.url,
    NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1',
    npm_config_registry: 'https://registry.npmjs.org', npm_config_cache: path.join(scratch, 'npm-cache'),
    npm_config_userconfig: path.join(scratch, 'npmrc'), npm_config_globalconfig: path.join(scratch, 'global-npmrc'),
    XDG_CONFIG_HOME: scratch, XDG_CACHE_HOME: scratch};
  await fs.writeFile(env.npm_config_userconfig, ''); await fs.writeFile(env.npm_config_globalconfig, '');
  return {env, violation};
}

async function realInstall(directory, environment, scratch, proxy, network) {
  const manifest = await json(path.join(directory, 'manifest.json'));
  const before = proxy.calls.length;
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repository, 'scripts/release-install.mjs'),
      environment, manifest.commit, directory, manifestDigest(manifest)], {cwd: scratch, env: network.env, stdio: 'inherit'});
    child.on('error', reject); child.on('exit', resolve);
  });
  if (await fs.stat(network.violation).then(() => true, () => false))
    throw new Error('Install attempted to bypass the rehearsal proxy; rehearsal stopped');
  if (proxy.calls.slice(before).some(call => !call.allowed)) throw new Error('Install proxy refused an outbound host');
  if (code !== 0) throw new Error('Candidate dual install failed');
  if (!proxy.calls.slice(before).some(call => call.allowed && packageHosts.has(call.host)))
    throw new Error('Install package downloads did not traverse the rehearsal proxy');
}

export async function rehearseRollback(artifactRoot, environment, {install} = {}) {
  const target = environmentConfig(environment), variants = {};
  for (const name of ['website-mounted', 'website-regenerated', 'website-redirect', 'api-linked', 'api-prepared']) {
    const directory = path.resolve(artifactRoot, environment, name);
    const manifest = await json(path.join(directory, 'manifest.json')), digest = manifestDigest(manifest);
    variants[name] = {...await readVariant(directory, environment, manifest.commit, digest), directory, digest};
  }
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'cojeev-rollback-rehearsal-'));
  let router, mf, proxy;
  let website = variants['website-redirect'], api = variants['api-linked'];
  const registryCalls = [], outboundCalls = [], runCalls = [], backupCalls = [], history = [
    {id: randomUUID(), annotations: {'workers/message': 'cojeev-migration side=website phase=redirect'}},
  ];
  const secrets = Object.fromEntries(secretNames.map(name => [name, randomBytes(32).toString('hex')]));
  const reportId = randomUUID(), title = `Fictional rollback gate ${reportId}`;
  const evidence = path.join(scratch, 'PROMOTION_EVIDENCE');
  // Prevent inherited deployment secrets and summary destinations from reaching
  // the fake promotion runner. Restore them even on setup/check failures.
  const isolated = ['REPORTING_SECRETS_JSON', 'REPORTING_ADDITIONAL_SECRETS_JSON', 'RESEND_WEBHOOK_SECRET',
    'REPORTING_ADMIN_TOKEN', 'GITHUB_STEP_SUMMARY', 'ROLLBACK_SCHEMA_ACK'];
  const saved = Object.fromEntries(isolated.map(key => [key, process.env[key]]));
  for (const key of isolated) delete process.env[key];
  process.env.ROLLBACK_SCHEMA_ACK = '0004_status_key.sql';
  process.env.REPORTING_SECRETS_JSON = JSON.stringify({...secrets,
    TURNSTILE_SITE_KEY: api.config.vars.TURNSTILE_SITE_KEY ?? '0x' + randomBytes(16).toString('hex')});
  const homepage = path.join(scratch, 'homepage');
  const fetcher = createRehearsalFetcher(environment, {
    website: (input, init) => router.fetch(input, init), api: (input, init) => mf.dispatchFetch(input, init),
  });
  async function startWebsite(variant) {
    if (router) await router.dispose();
    router = await startAssetRouter({worker: {kind: 'packaged', directory: variant.directory}, homepage});
    website = variant;
  }
  async function startApi(variant) {
    if (mf) await mf.dispose();
    if (variant.config.vars.LOCAL_MODE !== 'false') throw new Error('Packaged API requires LOCAL_MODE="false"');
    mf = new Miniflare(convertV4MiniflareOptions({
      modules: true, script: await fs.readFile(path.join(variant.directory, 'api/index.js'), 'utf8'),
      compatibilityDate: variant.config.compatibility_date, compatibilityFlags: variant.config.compatibility_flags,
      bindings: {...variant.config.vars, ...secrets}, d1Databases: ['DB'], r2Buckets: ['MEDIA'],
      resourcePersistencePath: path.join(scratch, 'state'),
      serviceBindings: {REGISTRY_SITE: async request => {
        registryCalls.push({method: request.method, url: request.url});
        return router.fetch(request.url, {method: request.method, headers: request.headers, redirect: 'manual'});
      }},
      outboundService: request => {outboundCalls.push({method: request.method, url: request.url}); return new Response('Rehearsal outbound refused', {status: 503});},
    }));
    try {await mf.ready;} catch {throw new Error('Miniflare could not load packaged API bindings DB, MEDIA, REGISTRY_SITE and dummy secrets with LOCAL_MODE="false"');}
    api = variant;
  }
  const cf = async endpoint => {
    if (endpoint === `workers/scripts/${target.website}/versions`) return {items: [...history]};
    if (endpoint === `workers/scripts/${target.worker}/secrets`) return secretNames.map(name => ({name}));
    throw new Error('Unexpected fake Cloudflare endpoint');
  };
  const run = async args => {
    runCalls.push(args);
    if (args[0] !== 'deploy' || !args.includes('--no-bundle')) throw new Error('Unexpected rehearsal mutation');
    const config = args[args.indexOf('--config') + 1];
    const variant = Object.values(variants).find(item => path.join(item.directory, `${item.side}/wrangler.jsonc`) === config);
    if (!variant) throw new Error('Unknown packaged deploy config');
    if (variant.side === 'website') await startWebsite(variant); else await startApi(variant);
    history.unshift({id: randomUUID(), annotations: {'workers/message': args[args.indexOf('--message') + 1]}});
  };
  const peer = artifact => ({directory: artifact.directory, digest: artifact.digest});
  let baseline;
  async function checks() {
    const problems = (await liveProblems(environment, {
      website: {kind: 'variant', manifest: website.manifest},
      api: {kind: 'variant', manifest: api.manifest},
      token: secrets.HEALTH_TOKEN, fetcher, baseline, robotsBefore: '',
    })).problems;
    const health = await (await fetcher(target.api + '/health')).json();
    if (health.reportingBase !== target.canonicalSite) problems.push('canonical-reporting-base');
    const bindingStart = registryCalls.length;
    problems.push(...(await componentGate(environment, {token: secrets.ADMIN_TOKEN, reportId, contact: 'gate@example.com', fetcher})).problems);
    const detail = target.api + '/v1/admin/reports/' + reportId;
    const headers = {Authorization: `Bearer ${secrets.ADMIN_TOKEN}`, Origin: target.origin, 'Content-Type': 'application/json'};
    const read = async () => (await (await fetcher(detail, {headers})).json()).report;
    const snapshot = await read();
    try {
      const response = await fetcher(detail, {method: 'PATCH', headers,
        body: JSON.stringify({status: 'resolved', componentUrl: target.canonicalSite + '/docs/button/'})});
      if (response.status !== 200) problems.push('canonical-success-not-accepted');
      const current = await read();
      if (current.status !== 'resolved' || current.component_url !== target.canonicalSite + '/docs/button/') problems.push('canonical-stored-component-url');
    } finally {
      const reset = await fetcher(detail, {method: 'PATCH', headers, body: JSON.stringify({status: snapshot.status})});
      const current = await read();
      if (reset.status !== 200 || current.status !== snapshot.status || current.component_url !== null) problems.push('canonical-reset-state');
    }
    const heads = registryCalls.slice(bindingStart).filter(call => call.method === 'HEAD' && call.url === target.canonicalSite + '/docs/button/');
    if (heads.length !== 2) problems.push('registry-binding-canonical-heads');
    if (outboundCalls.length) problems.push('unexpected-outbound-service');
    try {await (install ? install(website.directory) : realInstall(website.directory, environment, scratch, proxy, network));}
    catch (error) {
      if (error.message.includes('bypass')) throw error;
      problems.push('dual-install: ' + error.message);
    }
    return [...new Set(problems)];
  }
  let network;
  try {
    await fs.mkdir(homepage);
    await fs.writeFile(path.join(homepage, 'index.html'), '<h1>Fictional rehearsal homepage</h1>');
    await fs.writeFile(path.join(homepage, '404.html'), '<h1>Fictional missing homepage</h1>');
    await startWebsite(website); await startApi(api);
    const db = await mf.getD1Database('DB');
    for (const file of (await fs.readdir(path.join(repository, 'workers/reporting/migrations'))).filter(name => name.endsWith('.sql')).sort())
      await db.exec((await fs.readFile(path.join(repository, 'workers/reporting/migrations', file), 'utf8')).replace(/\n/g, ' '));
    const time = Date.now();
    await db.prepare('INSERT INTO topics(id,title,title_key,status,created_at,updated_at) VALUES(?,?,?,\'received\',?,?)')
      .bind(reportId, title, title, time, time).run();
    await db.prepare('INSERT INTO reports(id,token_hash,payload_hash,kind,title,description,email,contact_hash,references_json,pins_json,topic_id,status,created_at,updated_at) VALUES(?,?,?,\'request\',?,?,?,?,\'[]\',\'[]\',?,\'received\',?,?)')
      .bind(reportId, 'synthetic', 'synthetic', title, 'Fictional component request for a local rollback rehearsal.', 'gate@example.com', 'synthetic', reportId, time, time).run();
    if (environment === 'production') {
      baseline = {apexProbes: {}};
      for (const pathname of ['/', '/robots.txt', '/uikit?x=1', '/uikit.txt?x=1', '/ui-other.txt']) {
        const response = await router.homepage(target.origin + pathname);
        baseline.apexProbes[pathname] = {status: response.status, contentType: (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(),
          ...(pathname === '/robots.txt' ? {robots: 'absent'} : {sha256: createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')})};
      }
    }
    await fs.writeFile(evidence, '');
    proxy = await startInstallProxy(); network = await installEnvironment(scratch, proxy);
    const steps = [];
    async function step(name, expected, action, refusal) {
      const before = runCalls.length, backups = backupCalls.length;
      const problems = [];
      let succeeded = false;
      try {await action(); succeeded = true;} catch (error) {
        if (expected === 'permitted' || !error.message.includes(refusal)) problems.push(error.message);
      }
      if (expected === 'refused') {
        if (succeeded) problems.push('Expected promotion refusal');
        if (runCalls.length !== before) problems.push('Refused promotion invoked run');
      } else if (succeeded) {
        if (runCalls.length !== before + 1 || runCalls[before][0] !== 'deploy') problems.push('Expected exactly one deploy and no D1 migration');
        if (backupCalls.length !== backups) problems.push('Rollback invoked backupDatabase');
        problems.push(...await checks());
      }
      const result = {name, expected, ok: problems.length === 0, problems};
      steps.push(result); return result;
    }
    const websitePromotion = (name, rollback) => {
      const variant = variants[name];
      return promoteWebsite(variant.directory, environment, variant.manifest.commit, variant.digest, api.deploymentId,
        {rollback, run, cf, fetcher, evidence, peer: peer(api)});
    };
    const apiPromotion = name => {
      const variant = variants[name];
      return promoteApi(variant.directory, environment, variant.manifest.commit, variant.digest, website.deploymentId,
        {rollback: true, run, cf, fetcher, evidence, peer: peer(website), backupDatabase: async () => {backupCalls.push(true); throw new Error('Unexpected database backup');}});
    };
    const first = await step('website-regenerated rollback', 'permitted', () => websitePromotion('website-regenerated', true));
    if (first.ok) for (const gate of ['live', 'component-head', 'dual-install', 'browser-report', 'discovery'])
      await recordGate(evidence, {environment, gate, website: website.deploymentId, api: api.deploymentId,
        commit: website.manifest.commit, runId: 'rehearsal-local', ...(['browser-report', 'discovery'].includes(gate) ? {attest: 'rehearsal-local'} : {})});
    await step('website-redirect forward', 'permitted', () => websitePromotion('website-redirect', false));
    await step('website-mounted rollback', 'refused', () => websitePromotion('website-mounted', true), 'website rollback to mounted after redirect');
    await step('api-linked rollback', 'permitted', () => apiPromotion('api-linked'));
    await step('api-prepared rollback', 'refused', () => apiPromotion('api-prepared'), 'post-Linked rollback must keep API linked');
    return {steps};
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await Promise.allSettled([router?.dispose(), mf?.dispose(), proxy?.close()]);
    await fs.rm(scratch, {recursive: true, force: true});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Use rollback-rehearsal.mjs ARTIFACT_ROOT ENV');
    const {steps} = await rehearseRollback(process.argv[2], process.argv[3]);
    for (const step of steps) {
      console.log(`${step.ok ? 'PASS' : 'FAIL'} ${step.name}`);
      if (!step.ok) console.error(step.problems.join('; '));
    }
    if (steps.some(step => !step.ok)) process.exitCode = 1;
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
