/** Targeted promotions: all peer, phase and evidence checks precede mutations. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readVariant} from './release-variants.mjs';
import {readLivePair, reachedRedirect} from './release-pair.mjs';
import {assertTransition, assertGates, readBaselineRecord, pairOf} from './release-phases.mjs';
import {environmentConfig} from './release-config.mjs';
import {cloudflare, prepareDatabaseRecovery, wrangler} from './operations.mjs';
import {deploymentSecrets} from './release.mjs';
import {recordDeploymentEvent} from './deployment-diagnostics.mjs';

async function verifyPeer(environment, side, expected, peer) {
  if (expected === 'baseline' || typeof expected === 'string' && expected.startsWith('baseline:')) {
    const record = await readBaselineRecord(environment);
    const resolved = `baseline:${record[`${side}VersionId`]}`;
    if (expected !== 'baseline' && expected !== resolved) throw new Error('Stale peer');
    return resolved;
  }
  if (!peer?.directory || !peer.digest) throw new Error('Peer artifact required');
  const manifest = JSON.parse(await fs.readFile(path.join(peer.directory, 'manifest.json'), 'utf8'));
  const verified = await readVariant(peer.directory, environment, manifest.commit, peer.digest);
  if (verified.side !== side || verified.deploymentId !== expected) throw new Error('Stale peer');
  return expected;
}

async function preflight(side, directory, environment, commit, digest, expected, {
  rollback = false, cf = cloudflare, fetcher = fetch, evidence, peer,
}) {
  if (rollback && (directory === 'baseline' || path.basename(directory).startsWith('baseline:')))
    throw new Error('Promotion refused: rollback to baseline is never permitted');
  const artifact = await readVariant(directory, environment, commit, digest);
  if (artifact.side !== side) throw new Error('Promotion artifact side mismatch');
  if (side === 'website') {
    if (!Object.keys(artifact.manifest.files).some(file => /^site\/r\/.+\.json$/.test(file)))
      throw new Error('Missing legacy registry in website artifact');
    if (!artifact.manifest.files['site/_headers']) throw new Error('Missing website artifact site/_headers');
  }
  const other = side === 'api' ? 'website' : 'api';
  const expectedPeerId = await verifyPeer(environment, other, expected, peer);
  let live;
  try {live = await readLivePair(environment, {fetcher, cf});}
  catch (error) {
    if (error.message === `Unknown live ${other} deployment`) throw new Error('Stale peer');
    throw error;
  }
  if (live[other].id !== expectedPeerId) throw new Error('Stale peer');
  const history = await reachedRedirect(environment, {cf});
  const transition = assertTransition({environment, live: {website: live.website.phase, api: live.api.phase},
    side, target: artifact.phase, rollback, reachedRedirect: history});
  if (side === 'website' && environment === 'production' && artifact.phase === 'mounted') {
    const beta = await readLivePair('beta', {fetcher, cf});
    if (pairOf(beta.website.phase, beta.api.phase)?.name !== 'Redirect')
      throw new Error('Production mounted requires beta Redirect pair');
  }
  await assertGates(evidence, {environment, live: {website: live.website.id, api: live.api.id}, gates: transition.gates});
  return {...artifact, expectedPeerId};
}

const message = artifact => `cojeev-migration side=${artifact.side} phase=${artifact.phase} id=${artifact.deploymentId}`;
function deployed(artifact, environment, commit, digest, rollback) {
  const result = {environment, commit, manifestDigest: digest, rollback, side: artifact.side,
    phase: artifact.phase, deploymentId: artifact.deploymentId, expectedPeerId: artifact.expectedPeerId};
  recordDeploymentEvent({operation: 'deploy', status: 'succeeded', ...result});
  return result;
}

export async function promoteApi(directory, environment, commit, digest, expectedWebsiteId, {
  rollback = false, run = wrangler, backupDatabase = prepareDatabaseRecovery,
  cf = cloudflare, fetcher = fetch, evidence = process.env.PROMOTION_EVIDENCE, peer,
} = {}) {
  const artifact = await preflight('api', directory, environment, commit, digest, expectedWebsiteId,
    {rollback, cf, fetcher, evidence, peer});
  const target = environmentConfig(environment), config = path.join(directory, 'api/wrangler.jsonc');
  const secrets = deploymentSecrets(environment);
  if (environment === 'production') {
    const existing = await cf(`workers/scripts/${target.worker}/secrets`);
    for (const name of ['ADMIN_TOKEN', 'HEALTH_TOKEN', 'IP_HASH_SECRET', 'TURNSTILE_SECRET'])
      if (!secrets[name] && !existing.some(item => item.name === name)) throw new Error('Required production secret is not provisioned');
    if (!/^0x[A-Za-z0-9_-]{20,}$/.test(secrets.TURNSTILE_SITE_KEY ?? artifact.config.vars.TURNSTILE_SITE_KEY ?? ''))
      throw new Error('Production Turnstile site key missing');
  }
  const migrations = Object.keys(artifact.manifest.files)
    .filter(file => /^api\/migrations\/[^/]+\.sql$/.test(file))
    .map(file => path.basename(file)).sort();
  if (rollback && (!migrations.includes('0002_safe_delivery.sql') ||
      process.env.ROLLBACK_SCHEMA_ACK !== migrations.at(-1)))
    throw new Error('Code rollback requires reviewed compatible schema' +
      (migrations.length ? ' ' + migrations.at(-1) : ''));
  if (!rollback) {
    await backupDatabase(environment, config);
    await run(['d1', 'migrations', 'apply', target.database, '--remote', '--config', config]);
  }
  const secretDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'cojeev-deploy-secrets-'));
  try {
    await fs.chmod(secretDirectory, 0o700);
    const secretsFile = path.join(secretDirectory, 'secrets.json'), serialized = JSON.stringify(secrets);
    await fs.writeFile(secretsFile, serialized, {mode: 0o600, flag: 'wx'});
    await run(['deploy', '--config', config, '--no-bundle', '--secrets-file', secretsFile, '--message', message(artifact)], serialized);
  } finally {await fs.rm(secretDirectory, {recursive: true, force: true});}
  return deployed(artifact, environment, commit, digest, rollback);
}

export async function promoteWebsite(directory, environment, commit, digest, expectedApiId, {
  rollback = false, run = wrangler, cf = cloudflare, fetcher = fetch,
  evidence = process.env.PROMOTION_EVIDENCE, peer,
} = {}) {
  const artifact = await preflight('website', directory, environment, commit, digest, expectedApiId,
    {rollback, cf, fetcher, evidence, peer});
  await run(['deploy', '--config', path.join(directory, 'website/wrangler.jsonc'), '--no-bundle', '--message', message(artifact)]);
  return deployed(artifact, environment, commit, digest, rollback);
}
