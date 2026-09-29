// Pure decision: may a push to main reuse a passing PR run for the identical tree?
// No network, git or env reads; the workflow step injects API responses. Every uncertain input fails closed.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const DEPTH = { docs: 0, affected: 1, full: 2 };
const TREE = /^[0-9a-f]{40}$/;
const no = (reason) => ({ reuse: false, reason });

// artifacts: `artifacts` array of GET /actions/artifacts?name=... with `depth` (from the marker file) added by the caller.
// runs: array of GET /actions/runs/{id} responses. strictSince: ISO time main protection strict went on.
// The result never says to skip release-pack: reuse only removes lint/typecheck/tests/catalogue.
export function decideReuse({ event, headTree, requiredDepth, repository, artifacts, runs, strictSince, now } = {}) {
  if (event !== 'push') return no(`event ${event} never reuses`);
  if (typeof headTree !== 'string' || !TREE.test(headTree)) return no('invalid tree hash');
  if (typeof requiredDepth !== 'string' || !Object.hasOwn(DEPTH, requiredDepth) || typeof repository !== 'string' || !repository) return no('invalid input');
  if (!Array.isArray(artifacts) || !Array.isArray(runs)) return no('lookup failed');
  const nowMs = Date.parse(now);
  const strictMs = Date.parse(strictSince);
  if (Number.isNaN(nowMs) || Number.isNaN(strictMs)) return no('invalid time input');

  const found = artifacts.filter((a) => a?.name === `verified-tree-${headTree}`);
  if (found.length !== 1) return no(`${found.length} matching artifacts`);
  const [artifact] = found;
  if (artifact.expired !== false) return no('artifact expired');
  const expiresMs = Date.parse(artifact.expires_at);
  if (Number.isNaN(expiresMs) || expiresMs <= nowMs) return no('artifact expired');
  if (typeof artifact.depth !== 'string' || !Object.hasOwn(DEPTH, artifact.depth)) return no('unknown marker depth');
  if (DEPTH[artifact.depth] < DEPTH[requiredDepth]) return no(`marker depth ${artifact.depth} below required ${requiredDepth}`);

  const runId = artifact.workflow_run?.id;
  const matching = runs.filter((r) => r?.id === runId);
  if (!Number.isInteger(runId) || matching.length !== 1) return no('run not found');
  const [run] = matching;
  if (run.path !== '.github/workflows/verify.yml') return no('not the verify workflow');
  if (run.event !== 'pull_request') return no('run is not a pull_request run');
  if (run.conclusion !== 'success') return no(`run conclusion ${run.conclusion}`);
  // A marker from a pull request into another branch could carry unreviewed code to main.
  if (run.pull_requests?.[0]?.base?.ref !== 'main') return no('run is not a pull request into main');
  if (run.head_repository?.full_name !== repository || run.repository?.full_name !== repository) return no('fork or foreign run');
  const createdMs = Date.parse(run.created_at);
  if (Number.isNaN(createdMs) || createdMs < strictMs) return no('run predates strict protection');
  return { reuse: true, reason: `reusing passing pull_request run ${runId}`, runId };
}

// CLI: node scripts/ci-reuse.mjs <input.json>  -> reuse=/reason=/run_id= lines for $GITHUB_OUTPUT
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  try { result = decideReuse(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))); } catch (e) { result = no(`lookup failed: ${e.message}`); }
  console.log(`reuse=${result.reuse}\nreason=${String(result.reason).replace(/\s+/g, ' ')}${result.runId ? `\nrun_id=${result.runId}` : ''}`);
}
