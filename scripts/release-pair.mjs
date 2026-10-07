/** Read-only migration identities and promotion planning. */
import fs from 'node:fs/promises';
import {readIdentities} from './release.mjs';
import {environmentConfig} from './release-config.mjs';
import {cloudflare} from './operations.mjs';
import {assertTransition, pairOf, readBaselineRecord, STEADY_PAIR} from './release-phases.mjs';

function validIdentity(environment, side, observation) {
  if (!observation?.ok || observation.environment !== environment)
    throw new Error(`Malformed live ${side} identity`);
  return observation;
}
function liveIdentity(observation) {
  return {phase: observation.phase ?? 'baseline', deploymentId: observation.deploymentId,
    commit: observation.release, id: observation.deploymentId ?? 'baseline'};
}

export async function readLivePair(environment, {fetcher = fetch, cf = cloudflare, record} = {}) {
  const config = environmentConfig(environment);
  const observed = await readIdentities(environment, {fetcher});
  const website = validIdentity(environment, 'website', observed.website.health);
  const api = validIdentity(environment, 'api', observed.api.health);
  if (website.deploymentId !== null) {
    for (const observation of [observed.website.uiHealth, observed.website.uiRelease]) {
      validIdentity(environment, 'website', observation);
      if (['environment', 'release', 'deploymentId', 'phase'].some(field => observation[field] !== website[field]))
        throw new Error('Website identity split');
    }
  }
  const live = {website: liveIdentity(website), api: liveIdentity(api)};
  let baseline;
  for (const side of ['website', 'api']) {
    if (live[side].deploymentId !== null) continue;
    baseline ??= await readBaselineRecord(environment, record);
    const versionId = baseline[`${side}VersionId`];
    let active;
    try {
      const result = await cf(`workers/scripts/${side === 'website' ? config.website : config.worker}/deployments`);
      active = result?.deployments?.[0]?.versions;
    } catch { /* An unreadable active deployment cannot establish a baseline. */ }
    if (!Array.isArray(active) || active.length !== 1 || active[0]?.percentage !== 100 || active[0]?.version_id !== versionId)
      throw new Error(`Unknown live ${side} deployment`);
    live[side] = {...live[side], versionId, id: `baseline:${versionId}`};
  }
  return live;
}

export async function reachedRedirect(environment, {cf = cloudflare} = {}) {
  const {website} = environmentConfig(environment);
  const endpoint = `workers/scripts/${website}/versions`;
  const seen = new Set();
  try {
    // The existing GET helper unwraps result and discards result_info. Read
    // until an empty page; a repeated page cannot prove complete history.
    for (let page = 1; ; page++) {
      const result = await cf(page === 1 ? endpoint : `${endpoint}?page=${page}`);
      if (!Array.isArray(result?.items)) return true;
      if (result.items.length === 0) return false;
      for (const version of result.items) {
        const message = version?.annotations?.['workers/message'];
        // Some version-list responses omit annotations altogether. Absence
        // of history evidence must never authorize a mounted rollback.
        if (typeof message !== 'string') return true;
        if (message.includes('cojeev-migration side=website phase=redirect')) return true;
        if (typeof version.id !== 'string' || seen.has(version.id)) return true;
        seen.add(version.id);
      }
    }
  } catch {return true;}
}

async function readReportPair(environment, fetcher) {
  const config = environmentConfig(environment);
  const endpoints = new Set([`${config.legacySite}/health`, `${config.api}/health`]);
  const observed = await readIdentities(environment, {fetcher: (url, options) => {
    // Report mode reuses A15a's health parser but suppresses its unused UI
    // probes. Only the two public /health requests reach the network.
    if (!endpoints.has(url)) throw new Error('Report mode reads only health');
    return fetcher(url, options);
  }});
  return {website: liveIdentity(validIdentity(environment, 'website', observed.website.health)),
    api: liveIdentity(validIdentity(environment, 'api', observed.api.health))};
}
const pairName = live => pairOf(live.website.phase, live.api.phase)?.name ??
  (live.website.phase === 'baseline' && live.api.phase === 'baseline' ? 'start' : 'unlisted');
const writeOutput = async (file, fields) => {
  if (file) await fs.appendFile(file, Object.entries(fields).map(([key, value]) => `${key}=${value}\n`).join(''));
};

export async function livePairCli(args, {fetcher = fetch, cf = cloudflare, record,
  output = process.env.GITHUB_OUTPUT, log = console.log} = {}) {
  try {
    const [environment, side, target, flag] = args;
    if (args.length !== 1 && !(args.length === 3 || args.length === 4 && flag === '--rollback'))
      throw new Error('Use live-pair ENV [SIDE TARGET [--rollback]]');
    if (args.length === 1) {
      const live = await readReportPair(environment, fetcher);
      const pair = pairName(live), steady = pair === STEADY_PAIR;
      await writeOutput(output, {steady, pair, website_id: live.website.id, website_commit: live.website.commit,
        api_id: live.api.id, api_commit: live.api.commit});
      log(steady ? 'steady' : `migrating ${pair}`);
      return;
    }
    const live = await readLivePair(environment, {fetcher, cf, record});
    const history = await reachedRedirect(environment, {cf});
    const result = assertTransition({environment, live: {website: live.website.phase, api: live.api.phase},
      side, target, rollback: flag === '--rollback', reachedRedirect: history});
    const pair = pairName(live), gates = result.gates.join(',');
    await writeOutput(output, {pair, result_pair: result.pair.name, gates, website_id: live.website.id, api_id: live.api.id});
    log(`plan ${pair} ${side} ${target} -> ${result.pair.name} gates=${gates || 'none'}`);
  } catch (error) {
    if (error.message.startsWith('Promotion refused: ')) throw error;
    throw new Error(`Promotion refused: ${error.message}`);
  }
}
