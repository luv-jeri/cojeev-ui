/**
 * One source of truth for the Wrangler version this repository verifies against.
 *
 * These guards used to hardcode a literal (release.mjs expected 4.130.0 while
 * pnpm/npm had moved to 4.136.3; operations.mjs still expected 4.131.1). A literal
 * drifts silently the moment the dependency range moves, and the failure surface is
 * the release pipeline rather than a test, so derive the expectation from
 * package.json and compare it to what is actually installed.
 */
import {readFileSync} from 'node:fs';
import path from 'node:path';

/** The Wrangler dependency range this repository declares, as the package itself states it. */
export function wranglerSpec(packageJsonPath) {
  const manifest=JSON.parse(readFileSync(packageJsonPath,'utf8'));
  const spec=manifest.devDependencies?.wrangler??manifest.dependencies?.wrangler;
  if(!spec) throw new Error('package.json declares no wrangler dependency to verify against');
  return spec;
}

/**
 * Resolve a pinned Wrangler installation and assert it is the version package.json
 * declares. `packageRoot` is the directory holding the installed wrangler package
 * (the node_modules/wrangler directory, or an external checkout's package root), and
 * `packageJsonPath` is the declaring manifest to read the range from.
 */
export function assertWranglerVersion(packageRoot,packageJsonPath,label='Wrangler') {
  const spec=wranglerSpec(packageJsonPath);
  const version=JSON.parse(readFileSync(path.join(packageRoot,'package.json'),'utf8')).version;
  if(!satisfiesRange(version,spec)) throw new Error(`${label} ${spec} required, found ${version}`);
  return version;
}

/**
 * Structural range check for the caret, exact, tilde and comparison ranges a pin like
 * this realistically uses. Pre-release ordering is intentionally not modelled: the pin
 * is a published release and a prerelease install should fail the guard loudly rather
 * than be compared as if it were the release it precedes.
 */
export function satisfiesRange(version,spec) {
  const candidate=parse(version);
  if(!candidate) return false;
  return spec.split('||').some(clause=>
    clause.trim().split(/\s+/).every(part=>satisfiesPart(candidate,part)),
  );
}

function satisfiesPart(candidate,part) {
  const match=/^(>=|<=|>|<|=|\^|~)?\s*(\d+)\.(\d+)\.(\d+)$/.exec(part);
  if(!match) return false;
  const [,operator='=',major,minor,patch]=match;
  const floor=[Number(major),Number(minor),Number(patch)];
  if(operator==='=') return compare(candidate,floor)===0;
  if(operator==='>') return compare(candidate,floor)>0;
  if(operator==='<') return compare(candidate,floor)<0;
  if(operator==='>=') return compare(candidate,floor)>=0;
  if(operator==='<=') return compare(candidate,floor)<=0;
  if(compare(candidate,floor)<0) return false;
  // Caret pins the leftmost non-zero field; tilde pins the minor.
  if(operator==='^') return candidate[0]===floor[0]&&(floor[0]>0||candidate[1]===floor[1]);
  return candidate[0]===floor[0]&&candidate[1]===floor[1];
}

function parse(version) {
  const match=/^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  return match?[Number(match[1]),Number(match[2]),Number(match[3])]:null;
}

function compare(a,b) {
  return a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
}
