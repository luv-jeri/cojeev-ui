import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const WEBSITE_PHASES = {
  mounted:     {MIGRATION_STAGE: "additive", REGISTRY_GRAPH: "baseline"},
  regenerated: {MIGRATION_STAGE: "additive", REGISTRY_GRAPH: "canonical"},
  redirect:    {MIGRATION_STAGE: "redirect", REGISTRY_GRAPH: "canonical"},
};
export const API_PHASES = {
  prepared: {reportingBase: "legacy"},
  linked:   {reportingBase: "canonical"},
};
export const PAIRS = [
  {name: "Prepared",    website: "baseline",    api: "prepared", initialOnly: true},
  {name: "Mounted",     website: "mounted",     api: "prepared", initialOnly: true},
  {name: "Linked",      website: "mounted",     api: "linked"},
  {name: "Regenerated", website: "regenerated", api: "linked"},
  {name: "Redirect",    website: "redirect",    api: "linked"},
];
export const STEADY_PAIR = "Redirect";
export const GATES = ["live", "component-head", "ui-browser", "browser-report", "dual-install", "discovery"];

const FORWARD = {
  start:       {side: 'api', target: 'prepared', gates: []},
  Prepared:    {side: 'website', target: 'mounted', gates: ['live', 'component-head']},
  Mounted:     {side: 'api', target: 'linked', gates: ['live', 'ui-browser']},
  Linked:      {side: 'website', target: 'regenerated', gates: ['live', 'component-head', 'browser-report']},
  Regenerated: {side: 'website', target: 'redirect', gates: ['live', 'dual-install']},
};
const ROLLBACK = {
  Prepared:    {api: ['prepared']},
  Mounted:     {website: ['mounted'], api: ['prepared']},
  Linked:      {website: ['mounted'], api: ['linked']},
  Regenerated: {website: ['regenerated', 'mounted'], api: ['linked']},
  Redirect:    {website: ['redirect', 'regenerated'], api: ['linked']},
};
const PHASE_ORDER = {
  website: ['baseline', 'mounted', 'regenerated', 'redirect'],
  api: ['baseline', 'prepared', 'linked'],
};
const refuse = reason => {throw new Error(`Promotion refused: ${reason}`);};

export function pairOf(websitePhase, apiPhase) {
  return PAIRS.find(pair => pair.website === websitePhase && pair.api === apiPhase);
}

export function assertTransition({environment, live, side, target, rollback = false, reachedRedirect}) {
  const current = pairOf(live.website, live.api);
  const start = live.website === 'baseline' && live.api === 'baseline';
  if (!current && !start) refuse('unlisted live pair');
  if (side !== 'website' && side !== 'api') refuse('unlisted target pair');

  // Specific rollback constraints precede the generic unlisted-target check.
  if (rollback) {
    if (target === 'baseline') refuse('rollback to baseline is never permitted');
    if (['Linked', 'Regenerated', 'Redirect'].includes(current?.name) && side === 'api' && target === 'prepared')
      refuse('post-Linked rollback must keep API linked');
    if (side === 'website' && target === 'mounted' &&
        (current?.name === 'Redirect' || current?.name === 'Regenerated' && reachedRedirect !== false))
      refuse('website rollback to mounted after redirect');
  }

  const pair = pairOf(side === 'website' ? target : live.website, side === 'api' ? target : live.api);
  if (!pair) refuse('unlisted target pair');
  const name = current?.name ?? 'start';
  if (rollback) {
    if (!ROLLBACK[name]?.[side]?.includes(target)) refuse('phase change requires its listed next promotion');
    return {pair, gates: []};
  }

  if (target === live[side] && target !== 'baseline') return {pair, gates: []};
  const next = FORWARD[name];
  if (next?.side === side && next.target === target) {
    const gates = [...next.gates];
    if (name === 'Regenerated' && environment === 'production') gates.push('discovery');
    return {pair, gates};
  }
  if (PHASE_ORDER[side].indexOf(target) < PHASE_ORDER[side].indexOf(live[side]))
    refuse('--rollback required to move backwards');
  refuse('phase change requires its listed next promotion');
}

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;

export async function recordGate(file, {environment, gate, website, api, commit, runId, attest}) {
  if (!GATES.includes(gate)) throw new Error(`Unknown gate: ${gate}`);
  if (gate === 'browser-report' && !nonEmpty(attest)) throw new Error('browser-report requires a non-empty attest');
  const record = {environment, gate, website, api, commit, runId};
  if (attest !== undefined) record.attest = attest;
  await fs.appendFile(file, `${JSON.stringify(record)}\n`);
}

export async function assertGates(file, {environment, live, gates}) {
  if (gates.length === 0) return;
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    content = '';
  }
  const records = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {records.push(JSON.parse(line));} catch { /* An incomplete line is not evidence. */ }
  }
  for (const gate of gates) {
    const found = GATES.includes(gate) && records.some(record =>
      record?.gate === gate && record.environment === environment &&
      record.website === live.website && record.api === live.api &&
      (gate !== 'browser-report' || nonEmpty(record.attest)));
    if (!found) throw new Error(`Missing gate evidence: ${gate}`);
  }
}

const invalidBaseline = field => {throw new Error(`Invalid baseline record: ${field}`);};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hex = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`, 'i').test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const APEX_PATHS = ['/', '/robots.txt', '/uikit?x=1', '/uikit.txt?x=1', '/ui-other.txt'];

export async function readBaselineRecord(environment, file = 'scripts/release-baseline.json') {
  if (environment !== 'beta' && environment !== 'production') invalidBaseline('environment');
  const content = await fs.readFile(file, 'utf8');
  let record;
  try {record = JSON.parse(content);} catch {invalidBaseline('schema');}
  if (!object(record) || record.schema !== 1) invalidBaseline('schema');
  const block = record[environment];
  if (!object(block)) invalidBaseline(environment);
  const requireField = (field, valid) => {if (!valid) invalidBaseline(`${environment}.${field}`);};
  requireField('commit', hex(block.commit, 40));
  requireField('runId', typeof block.runId === 'string' && /^\d+$/.test(block.runId));
  // B1 supplies manifestDigest(parsedManifest), not the hash of its formatted file.
  requireField('digest', hex(block.digest, 64));
  requireField('websiteVersionId', uuid(block.websiteVersionId));
  requireField('apiVersionId', uuid(block.apiVersionId));
  if (environment === 'beta') {
    requireField('apexProbes', !Object.hasOwn(block, 'apexProbes'));
  } else {
    requireField('apexProbes', object(block.apexProbes));
    for (const pathname of APEX_PATHS) {
      const probe = block.apexProbes[pathname];
      const field = `apexProbes.${pathname}`;
      requireField(field, object(probe));
      requireField(`${field}.status`, Number.isInteger(probe.status) && probe.status >= 100 && probe.status <= 599);
      requireField(`${field}.contentType`, nonEmpty(probe.contentType));
      if (pathname === '/robots.txt') {
        requireField(`${field}.sha256`, !Object.hasOwn(probe, 'sha256'));
        requireField(`${field}.robots`, probe.robots === 'present' || probe.robots === 'absent');
      } else {
        requireField(`${field}.sha256`, hex(probe.sha256, 64));
      }
    }
  }
  return block;
}

async function main(args) {
  const [command, file, environment, gate, website, api, ...options] = args;
  if (command !== 'record-gate' || !file || !environment || !gate || !website || !api ||
      options.length > 1 || options.some(option => !option.startsWith('--attest=')))
    throw new Error('Usage: record-gate FILE ENV GATE WEBSITE_ID API_ID [--attest=TEXT]');
  const commit = process.env.GITHUB_SHA;
  const runId = process.env.GITHUB_RUN_ID;
  if (!commit || !runId) throw new Error('record-gate requires GITHUB_SHA and GITHUB_RUN_ID');
  await recordGate(file, {environment, gate, website, api, commit, runId,
    attest: options[0]?.slice('--attest='.length)});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
