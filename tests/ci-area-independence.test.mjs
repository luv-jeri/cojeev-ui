import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { releaseDepth } from '../scripts/ci-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Areas ci-scope treats as independent: nothing that ships in the site may import them.
const INDEPENDENT = ['apps/triage/', 'scripts/triage/', 'scripts/triage.ts', 'lib/reporting/triage-contract.ts', 'workers/'];
const OWN_AREA_FILE = 'lib/reporting/triage-contract.ts';
const SCANNED = ['app', 'components', 'lib', 'registry'];
const EXT = /\.(?:[cm]?[jt]sx?)$/;
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '/index.ts', '/index.tsx', '/index.js', '/index.mjs'];

const inArea = rel => INDEPENDENT.some(a => (a.endsWith('/') ? rel.startsWith(a) : rel === a));
// A specifier that names a repo path (relative or the "@/" alias) but resolves to no file.
const couldTarget = rel => inArea(rel) || INDEPENDENT.some(a => a.startsWith(`${rel}/`));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) { if (entry.name !== 'node_modules' && entry.name !== '.next') walk(rel, out); }
    else if (EXT.test(entry.name)) out.push(rel);
  }
  return out;
}

function specifiers(source) {
  const found = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\sfrom\s*)?['"]([^'"]+)['"]/g,
    /\b(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) for (const m of source.matchAll(re)) found.push(m[1]);
  return found;
}

function resolve(from, spec) {
  let base;
  if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else if (spec.startsWith('@/')) base = spec.slice(2);
  else return null; // bare package
  for (const ext of EXTS) if (fs.existsSync(path.join(root, base + ext)) && fs.statSync(path.join(root, base + ext)).isFile()) return { file: base + ext };
  return { unresolved: base };
}

test('site code never imports an area the classifier treats as independent', () => {
  const tsconfig = fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8');
  assert.match(tsconfig, /"@\/\*":\s*\[\s*"\.\/\*"/, 'the scan understands only the "@/*" -> "./*" alias');
  const files = SCANNED.flatMap(dir => (fs.existsSync(path.join(root, dir)) ? walk(dir) : []));
  assert.ok(files.length > 50, 'the scan must actually find source files');
  const bad = [];
  for (const file of files) {
    if (file === OWN_AREA_FILE) continue;
    for (const spec of specifiers(fs.readFileSync(path.join(root, file), 'utf8'))) {
      const hit = resolve(file, spec);
      if (!hit) continue;
      const target = hit.file ?? hit.unresolved;
      if (hit.file ? inArea(target) : couldTarget(target)) bad.push(`${file} -> ${spec}`);
    }
  }
  assert.deepEqual(bad, []);
});

// The other direction: a deployed Worker imports repo files. A file the classifier treats as quick (no release pack)
// that a Worker imports would ship untested, as lib/reporting/triage-contract.ts once did.
test('a Worker never imports a file the classifier treats as quick', () => {
  const files = walk('workers').filter(file => !file.includes('/node_modules/') && !file.includes('/test/') && !/\.test\./.test(file)) // tests are not deployed;
  assert.ok(files.length > 3, 'the scan must actually find Worker sources');
  const bad = [];
  for (const file of files) {
    for (const spec of specifiers(fs.readFileSync(path.join(root, file), 'utf8'))) {
      const hit = resolve(file, spec);
      if (!hit) continue;
      const target = hit.file ?? hit.unresolved;
      if (releaseDepth([target], '').depth === 'quick') bad.push(`${file} -> ${spec} (${target})`);
    }
  }
  assert.deepEqual(bad, []);
});

test('the specifier scan sees static, re-export, require and dynamic imports', () => {
  const src = `import a from "./a"; import type { B } from '@/b'; export * from "./c"; export { d } from "./d";
    import "./side"; const e = require('./e'); const f = await import("./f");`;
  assert.deepEqual(specifiers(src).sort(), ['./a', './c', './d', './e', './f', './side', '@/b']);
  assert.deepEqual(resolve('lib/x.ts', '../workers/reporting/src/x'), { unresolved: 'workers/reporting/src/x' });
  assert.ok(couldTarget('workers/reporting/src/x') && couldTarget('apps/triage') && !couldTarget('apps/triage-evil/x'));
});
