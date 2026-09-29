// Glue for the main-push reuse step: fetch the marker artifact and its run, then defer to decideReuse.
// Every failure (network, shape, missing env) yields reuse=false; this never throws to the workflow.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decideReuse } from './ci-reuse.mjs';

export async function lookup({ env, api, readMarker }) {
  try {
    const { EVENT: event, TREE: headTree, REQUIRED_DEPTH: requiredDepth, REPOSITORY: repository, STRICT_SINCE: strictSince, NOW: now } = env;
    if (typeof headTree !== 'string' || !/^[0-9a-f]{40}$/.test(headTree) || typeof repository !== 'string') return { reuse: false, reason: 'invalid input' };
    const list = await api(`repos/${repository}/actions/artifacts?name=verified-tree-${headTree}&per_page=100`);
    let artifacts = list?.artifacts;
    if (!Array.isArray(artifacts)) return { reuse: false, reason: 'lookup failed' };
    artifacts = artifacts.filter((a) => a?.name === `verified-tree-${headTree}`);
    let runs = [];
    if (artifacts.length === 1) {
      artifacts = [{ ...artifacts[0], depth: await readMarker(artifacts[0].id) }];
      const runId = artifacts[0].workflow_run?.id;
      if (Number.isInteger(runId)) runs = [await api(`repos/${repository}/actions/runs/${runId}`)];
    }
    return decideReuse({ event, headTree, requiredDepth, repository, artifacts, runs, strictSince, now });
  } catch (e) {
    return { reuse: false, reason: `lookup failed: ${String(e.message).slice(0, 120)}` };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const gh = (args, opts) => execFileSync('gh', ['api', ...args], { encoding: 'utf8', maxBuffer: 1 << 24, ...opts });
  const api = async (p) => JSON.parse(gh([p]));
  const readMarker = async (id) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reuse-'));
    const zip = path.join(dir, 'm.zip');
    fs.writeFileSync(zip, execFileSync('gh', ['api', `repos/${process.env.REPOSITORY}/actions/artifacts/${id}/zip`], { maxBuffer: 1 << 20 }));
    return JSON.parse(execFileSync('unzip', ['-p', zip, 'marker.json'], { encoding: 'utf8', maxBuffer: 1 << 20 })).depth;
  };
  const r = await lookup({ env: { ...process.env, NOW: new Date().toISOString() }, api, readMarker });
  const out = `reuse=${r.reuse}\nreason=${String(r.reason).replace(/\s+/g, ' ')}${r.runId ? `\nrun_id=${r.runId}` : ''}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, out);
  const line = r.reuse ? `Reused verification from pull_request run ${r.runId} (identical source tree ${process.env.TREE}); lint, typecheck, tests and browser gates were not re-run. Release pack still runs on this commit.` : `No reuse (${String(r.reason).replace(/\s+/g, ' ')}): running the checks this push requires.`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Verification reuse\n${line}\n`);
  console.log(out + line);
}
