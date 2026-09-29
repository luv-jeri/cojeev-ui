import assert from 'node:assert/strict';
import test from 'node:test';
import { isComponentPath, selectGateIds, selectGateIdsFromCheckout } from '../scripts/ci-affected-ids.mjs';
import { releaseDepth, releaseOutputs } from '../scripts/ci-scope.mjs';

const item = (name, files, deps = [], type = 'registry:ui') => ({
  name, type, files: files.map(path => ({ path })),
  registryDependencies: deps.map(dep => `https://example.test/r/${dep}.json`),
});
const registry = deps => ({ items: [
  item('base', [], [], 'registry:base'),
  item('alpha', ['registry/cojeev/ui/alpha.tsx', 'registry/cojeev/styles/alpha.css']),
  item('beta', ['registry/cojeev/ui/beta.tsx'], ['alpha', ...deps]),
  item('gamma', ['registry/cojeev/ui/gamma.tsx', 'registry/cojeev/styles/shared.css']),
  item('delta', ['registry/cojeev/ui/delta.tsx', 'registry/cojeev/styles/shared.css']),
  item('epsilon', ['registry/cojeev/ui/epsilon.tsx']),
  item('zeta', ['registry/cojeev/ui/zeta.tsx', 'registry/cojeev/styles/shared.css']),
  item('eta', ['registry/cojeev/ui/eta.tsx', 'registry/cojeev/styles/shared.css']),
] });
const lazy = (id, file) => `  "${id}": lazy(() => import("./${file}").then((m) => ({ default: m.X }))),`;
const files = (over = {}) => {
  const index = [lazy('alpha', 'a'), lazy('beta', 'b'), lazy('gamma', 'c'), lazy('delta', 'd'), lazy('epsilon', 'e'), lazy('zeta', 'd'), lazy('eta', 'd')];
  const manifest = ['alpha:a', 'beta:b', 'gamma:c', 'delta:d', 'epsilon:e', 'zeta:d', 'eta:d'].map(pair => { const [id, file] = pair.split(':'); return `  "${id}": { file: "${file}", name: "X" },`; });
  const all = {
    'components/examples/index.ts': `import { lazy } from "react";\nexport const examples = {\n${index.join('\n')}\n};`,
    'components/examples/manifest.ts': `export const exampleManifest = {\n${manifest.join('\n')}\n};`,
    'components/examples/a.tsx': 'import { Alpha } from "@/registry/cojeev/ui/alpha";',
    'components/examples/b.tsx': 'import { Beta } from "@/registry/cojeev/ui/beta";',
    // c renders epsilon through a shared helper, so c's docs page depends on epsilon.
    'components/examples/c.tsx': 'import { helper } from "./helper";',
    'components/examples/helper.tsx': 'import { Epsilon } from "../../registry/cojeev/ui/epsilon";',
    'components/examples/d.tsx': 'import x from "react";',
    'components/examples/e.tsx': 'import x from "react";',
    'package.json': '{"dependencies":{"react":"1","@scope/pkg":"1"},"devDependencies":{"typescript":"1"}}',
    'registry/cojeev/ui/alpha.tsx': '', 'registry/cojeev/ui/beta.tsx': '', 'registry/cojeev/ui/epsilon.tsx': '',
    'registry/cojeev/ui/gamma.tsx': '', 'registry/cojeev/ui/delta.tsx': '',
    ...over,
  };
  return file => all[file] ?? null;
};
const select = (paths, { deps = [], read = files() } = {}) => selectGateIds(paths, { registry: registry(deps), read, appModules: () => [] });

test('component_edit_targets_its_ids', () => {
  assert.deepEqual(select(['registry/cojeev/ui/alpha.tsx']).ids, ['alpha', 'beta']);
  assert.deepEqual(select(['registry/cojeev/ui/beta.tsx']).ids, ['beta']);
  assert.equal(isComponentPath('registry/cojeev/ui/nested/x.tsx'), false);
  assert.equal(isComponentPath('registry/cojeev/lib/x.tsx'), false);
});

test('component_edit_targets_its_ids: real registry, marquee', () => {
  const real = selectGateIdsFromCheckout(['registry/cojeev/ui/marquee.tsx']);
  const total = JSON.parse(fs_read('registry.json')).items.filter(entry => entry.type === 'registry:ui').length;
  assert.ok(real.ids.includes('marquee'));
  assert.ok(real.ids.length > 1 && real.ids.length < total, `${real.ids.length} of ${total}`);
  const outputs = releaseOutputs(releaseDepth(['registry/cojeev/ui/marquee.tsx'], '', { gateIds: paths => selectGateIdsFromCheckout(paths) }));
  assert.equal(outputs.run_catalogue, 'true');
  assert.equal(outputs.depth, 'affected');
  assert.equal(outputs.gate_ids, real.ids.join(','));
});

test('shared_component_source_runs_full', () => {
  for (const file of ['registry/cojeev/motion/x.ts', 'registry/cojeev/lib/x.ts', 'components/examples/a.tsx', 'registry/cojeev/scripts/x.mjs', 'registry/cojeev/ui/unlisted.tsx', 'registry/cojeev/styles/unlisted.css']) {
    const decision = releaseDepth([file], '', { gateIds: paths => select(paths) });
    assert.equal(decision.depth, 'full', file);
    assert.equal(releaseOutputs(decision).gate_ids, '', file);
  }
  // css listed by four items (> TARGET_MAX = 3)
  assert.ok(select(['registry/cojeev/styles/shared.css']).full);
  // a component mixed with any full-mapped path is full
  const mixed = releaseDepth(['registry/cojeev/ui/alpha.tsx', 'registry/cojeev/lib/x.ts'], '', { gateIds: paths => select(paths) });
  assert.equal(mixed.depth, 'full');
  // no resolver supplied: unchanged behaviour
  assert.equal(releaseDepth(['registry/cojeev/ui/alpha.tsx']).depth, 'full');
  // a component mixed with documentation stays targeted
  const docs = releaseOutputs(releaseDepth(['registry/cojeev/ui/beta.tsx', 'docs/note.md'], '', { gateIds: paths => select(paths) }));
  assert.equal(docs.gate_ids, 'beta');
});

test('example_importer_included', () => {
  // gamma's example imports epsilon through a helper: editing epsilon adds gamma.
  assert.deepEqual(select(['registry/cojeev/ui/epsilon.tsx']).ids, ['gamma', 'epsilon']);
  // an import that cannot be resolved anywhere in the scanned tree is full
  const broken = files({ 'components/examples/helper.tsx': 'import { Y } from "./missing-file";' });
  assert.ok(select(['registry/cojeev/ui/epsilon.tsx'], { read: broken }).full);
  assert.ok(select(['registry/cojeev/ui/epsilon.tsx'], { read: files({ 'components/examples/index.ts': null }) }).full);
  // an index entry the scan cannot parse is full
  assert.ok(select(['registry/cojeev/ui/epsilon.tsx'], { read: files({ 'components/examples/index.ts': 'export const examples = { a: lazy(load("x")) };' }) }).full);
});

test('component_closure_mutation_is_caught', () => {
  const withEdge = selectGateIds(['registry/cojeev/ui/alpha.tsx'], { registry: registry([]), read: files({ 'components/examples/b.tsx': 'import x from "react";' }), appModules: () => [] });
  const without = registry([]);
  without.items = without.items.map(entry => entry.name === 'beta' ? { ...entry, registryDependencies: [] } : entry);
  const dropped = selectGateIds(['registry/cojeev/ui/alpha.tsx'], { registry: without, read: files({ 'components/examples/b.tsx': 'import x from "react";' }), appModules: () => [] });
  assert.deepEqual(withEdge.ids, ['alpha', 'beta']);
  assert.deepEqual(dropped.ids, ['alpha']);
});

test('gate_ids is an explicit output for every depth', () => {
  assert.equal(releaseOutputs(releaseDepth(['docs/note.md'])).gate_ids, '');
  assert.equal(releaseOutputs(releaseDepth(['package-lock.json'])).gate_ids, '');
});

import fs from 'node:fs';
function fs_read(file) { return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); }

// R12 / R13 -----------------------------------------------------------------
import { CI_SMOKE_IDS } from '../scripts/ci-scope.mjs';
// marquee is not imported by site chrome; pick another leaf if that changes.
const REAL_LEAF = 'registry/cojeev/ui/marquee.tsx';
const realGateIds = paths => selectGateIdsFromCheckout(paths);
const contractOutputs = paths => releaseOutputs(releaseDepth(paths, '', { gateIds: realGateIds }));
const SMOKE = {
  depth: 'affected', run_checks: 'true', run_release: 'true', run_catalogue: 'true',
  gate_ids: 'button,tabs', run_transient: 'false', run_analytics: 'false', run_seo: 'false', run_reporting: 'true',
};

test('ci_contract_edit_runs_smoke_not_full', () => {
  assert.deepEqual(CI_SMOKE_IDS, ['button', 'tabs']);
  for (const file of ['.github/workflows/verify.yml', 'scripts/ci-scope.mjs']) {
    const { depth_reason, ...rest } = contractOutputs([file]);
    assert.deepEqual(rest, SMOKE, file);
    assert.ok(depth_reason.includes('button,tabs'), depth_reason);
  }
  // Docs mixed in change nothing.
  const docs = contractOutputs(['scripts/ci-scope.mjs', 'docs/note.md']);
  delete docs.depth_reason;
  assert.deepEqual(docs, SMOKE);
});

test('ci_contract_plus_component_unions_ids', () => {
  // Fixture: alpha's own ids are alpha,beta; the smoke ids are named button and tabs in the real
  // registry, so the fixture registry gets them too and the union must be in registry order.
  const reg = { items: [item('button', ['registry/cojeev/ui/button.tsx']), ...registry([]).items, item('tabs', ['registry/cojeev/ui/tabs.tsx'])] };
  const gateIds = paths => selectGateIds(paths, { registry: reg, read: files(), appModules: () => [] });
  const out = releaseOutputs(releaseDepth(['.github/workflows/verify.yml', 'registry/cojeev/ui/alpha.tsx'], '', { gateIds }));
  assert.equal(out.depth, 'affected');
  assert.equal(out.gate_ids, 'button,alpha,beta,tabs');
  // A component selection that is full keeps the whole change full.
  assert.equal(releaseDepth(['.github/workflows/verify.yml', 'registry/cojeev/styles/shared.css'], '', { gateIds }).depth, 'full');
  // Real registry: a non-chrome component plus the contract keeps affected and the union is in registry order.
  const real = selectGateIdsFromCheckout([REAL_LEAF]);
  assert.ok(real.ids, `${REAL_LEAF}: ${real.full}`);
  const real2 = contractOutputs(['.github/workflows/verify.yml', REAL_LEAF]);
  assert.equal(real2.depth, 'affected');
  const ids = real2.gate_ids.split(',');
  assert.ok(['button', 'tabs', ...real.ids].every(id => ids.includes(id)));
  assert.deepEqual(ids, real.order.filter(id => ids.includes(id)));
});

test('ci_contract_plus_lib_runs_full', () => {
  assert.equal(contractOutputs(['.github/workflows/verify.yml', 'registry/cojeev/lib/utils.ts']).depth, 'full');
  for (const other of ['package-lock.json', 'something/new.ts']) assert.equal(contractOutputs(['scripts/ci-scope.mjs', other]).depth, 'full', other);
  assert.equal(contractOutputs(['.github/wrangler-runtime/package.json']).depth, 'full');
});

test('release_script_edit_skips_catalogue', () => {
  for (const file of ['scripts/release.mjs', 'scripts/operations.mjs', 'tests/release-live.test.mjs', 'tests/reporting-webhook-secret.test.mjs']) {
    const out = releaseOutputs(releaseDepth([file], ''));
    assert.notEqual(out.depth, 'full', file);
    assert.equal(out.run_release, 'true', file);
    assert.equal(out.run_catalogue, 'false', file);
  }
  for (const file of ['scripts/release-config.mjs', 'scripts/release-manifest.mjs', 'scripts/release-csp.mjs', 'scripts/release-install.mjs']) {
    assert.equal(releaseDepth([file], '').depth, 'full', file);
  }
});

test('docs_chrome_component_runs_full', () => {
  const chrome = { 'app/page.tsx': 'import { Alpha } from "@/registry/cojeev/ui/alpha";' };
  const pick = (paths, over = chrome) => selectGateIds(paths, { registry: registry([]), read: files(over), appModules: () => ['app/page.tsx'] });
  // alpha is imported by site chrome, so editing it changes every docs page.
  assert.match(pick(['registry/cojeev/ui/alpha.tsx']).full, /imported by the docs site chrome/);
  // beta is reached only through its own example module.
  assert.deepEqual(pick(['registry/cojeev/ui/beta.tsx']).ids, ['beta']);
  // Mutation: chrome stops importing alpha, and alpha is confined again.
  assert.deepEqual(pick(['registry/cojeev/ui/alpha.tsx'], { 'app/page.tsx': 'import x from "react";' }).ids, ['alpha', 'beta']);
  // Chrome reaching a component through an example module does not count: examples are walked per id.
  assert.deepEqual(pick(['registry/cojeev/ui/beta.tsx'], { 'app/page.tsx': 'import { B } from "@/components/examples/b";' }).ids, ['beta']);
  // Real registry: the docs page imports Table directly, so a Table edit runs every id.
  assert.match(selectGateIdsFromCheckout(['registry/cojeev/ui/table.tsx']).full, /docs site chrome/);
  // An unresolvable chrome import fails closed, and so does a missing chrome listing.
  assert.ok(pick(['registry/cojeev/ui/beta.tsx'], { 'app/page.tsx': 'import x from "./missing";' }).full);
  assert.ok(selectGateIds(['registry/cojeev/ui/beta.tsx'], { registry: registry([]), read: files() }).full);
});

test('ci_pr_own_diff_is_not_full', () => {
  const paths = fs.readFileSync(new URL('./fixtures/ci-affected-pr-paths.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
  assert.ok(paths.length > 1);
  const out = contractOutputs(paths);
  assert.equal(out.depth, 'affected', out.depth_reason);
  assert.ok(out.gate_ids.split(',').includes('button') && out.gate_ids.split(',').includes('tabs'), out.gate_ids);
});

// Final fix wave ------------------------------------------------------------
import os from 'node:os';
import path from 'node:path';

test('component_css_edit_follows_its_owner', () => {
  // beta's example imports alpha.tsx; alpha.css is owned by alpha, so editing it reaches beta.
  const css = 'registry/cojeev/styles/alpha.css';
  const pick = (over = {}) => selectGateIds([css], { registry: registry([]), read: files(over), appModules: () => ['app/page.tsx'] });
  const quiet = { 'app/page.tsx': 'import x from "react";', 'components/examples/b.tsx': 'import { Alpha } from "@/registry/cojeev/ui/alpha";' };
  assert.ok(pick(quiet).ids.includes('beta'), JSON.stringify(pick(quiet)));
  // alpha.tsx reaches site chrome, so its stylesheet does too.
  assert.match(pick({ ...quiet, 'app/page.tsx': 'import { Alpha } from "@/registry/cojeev/ui/alpha";' }).full, /docs site chrome/);
  // Real checkout: card.css and tabs.css are full. marquee.css is full too, because app/styles/docs.css imports it.
  assert.ok(selectGateIdsFromCheckout(['registry/cojeev/styles/card.css']).full);
  assert.ok(selectGateIdsFromCheckout(['registry/cojeev/styles/tabs.css']).full);
  assert.match(selectGateIdsFromCheckout(['registry/cojeev/styles/marquee.css']).full, /docs site chrome/);
});

const chromePick = (page, over = {}, changed = 'registry/cojeev/ui/beta.tsx') =>
  selectGateIds([changed], { registry: registry([]), read: files({ 'app/page.tsx': page, ...over }), appModules: () => ['app/page.tsx'] });

test('chrome_scan_rejects_unknown_alias', () => {
  assert.ok(chromePick('import x from "@components/x";').full);
  assert.ok(chromePick('import x from "~/x";').full);
  assert.ok(chromePick('import x from "not-a-dependency";').full);
  for (const ok of ['react', '@scope/pkg', 'react/jsx-runtime', 'node:fs', 'fs', 'fs/promises', 'typescript']) {
    assert.deepEqual(chromePick(`import x from "${ok}";`).ids, ['beta'], ok);
  }
});

test('chrome_scan_rejects_nonliteral_dynamic_import', () => {
  assert.ok(chromePick('const m = await import(name);').full);
  assert.ok(chromePick('const m = await import(`./${name}`);').full);
  // A literal dynamic import is followed like a static one, and a code sample in a string or comment is not an import.
  assert.deepEqual(chromePick('const m = await import("react");').ids, ['beta']);
  assert.deepEqual(chromePick('const sample = "await import(name)"; // import(other)\nconst t = `import(x)`;').ids, ['beta']);
  // The example walk is covered too.
  assert.ok(chromePick('import x from "react";', { 'components/examples/b.tsx': 'export const load = () => import(pick());' }).full);
});

test('chrome_css_import_runs_full', () => {
  const styles = 'registry/cojeev/styles/alpha.css';
  const css = { 'app/x.css': '/* @import "./nope.css"; */\n@import "../registry/cojeev/styles/alpha.css" layer(a);', 'registry/cojeev/styles/alpha.css': '' };
  const pick = (page, over) => selectGateIds([styles], { registry: registry([]), read: files({ 'app/page.tsx': page, ...over }), appModules: () => ['app/page.tsx', 'app/x.css'] });
  assert.match(pick('import x from "react";', css).full, /docs site chrome/);
  // The same file, reached from a TypeScript import of a stylesheet.
  const viaTs = selectGateIds([styles], { registry: registry([]), read: files({ 'app/page.tsx': 'import "./x.css";', ...css }), appModules: () => ['app/page.tsx'] });
  assert.match(viaTs.full, /docs site chrome/);
  // @/ chains, and a commented-out import is not followed.
  const chain = selectGateIds([styles], { registry: registry([]), read: files({ 'app/x.css': '@import "@/app/y.css";', 'app/y.css': '@import "../registry/cojeev/styles/alpha.css";', 'registry/cojeev/styles/alpha.css': '' }), appModules: () => ['app/x.css'] });
  assert.match(chain.full, /docs site chrome/);
  const commented = selectGateIds([styles], { registry: registry([]), read: files({ 'app/x.css': '/* @import "../registry/cojeev/styles/alpha.css"; */', 'registry/cojeev/styles/alpha.css': '' }), appModules: () => ['app/x.css'] });
  assert.ok(commented.ids);
  // An unresolvable or unknown css import fails closed.
  assert.ok(selectGateIds([styles], { registry: registry([]), read: files({ 'app/x.css': '@import "./missing.css";' }), appModules: () => ['app/x.css'] }).full);
  assert.ok(selectGateIds([styles], { registry: registry([]), read: files({ 'app/x.css': '@import "unknown-pkg/x.css";' }), appModules: () => ['app/x.css'] }).full);
});

test('app_file_of_unknown_type_runs_full', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-ids-'));
  try {
    for (const file of ['registry.json', 'package.json', 'components/examples/index.ts', 'components/examples/manifest.ts']) {
      fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
      fs.copyFileSync(new URL(`../${file}`, import.meta.url), path.join(cwd, file));
    }
    fs.mkdirSync(path.join(cwd, 'app'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'app/page.tsx'), 'export default function P() { return null; }');
    for (const ok of ['a.png', 'b.svg', 'c.woff2', 'd.txt', 'e.json', 'f.css']) fs.writeFileSync(path.join(cwd, 'app', ok), '');
    const before = selectGateIdsFromCheckout(['registry/cojeev/ui/marquee.tsx'], cwd);
    assert.ok(!/app\//.test(before.full ?? ''), before.full);
    fs.writeFileSync(path.join(cwd, 'app/data.yaml'), '');
    assert.match(selectGateIdsFromCheckout(['registry/cojeev/ui/marquee.tsx'], cwd).full, /app\/data\.yaml/);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});

test('smoke_ids_exist_and_contract_only_output_is_in_registry_order', () => {
  const ids = new Set(JSON.parse(fs_read('registry.json')).items.map(entry => entry.name));
  for (const id of CI_SMOKE_IDS) assert.ok(ids.has(id), id);
  // A resolver whose registry order puts tabs first: the contract-only list follows it, not CI_SMOKE_IDS.
  const reversed = () => ({ ids: [], order: ['tabs', 'x', 'button'] });
  assert.equal(releaseOutputs(releaseDepth(['scripts/ci-scope.mjs'], '', { gateIds: reversed })).gate_ids, 'tabs,button');
  // Real registry order.
  const real = contractOutputs(['scripts/ci-scope.mjs']).gate_ids.split(',');
  const order = selectGateIdsFromCheckout([]).order;
  assert.deepEqual(real, order.filter(id => real.includes(id)));
});

// The depth step runs before `npm ci`, so the selector must load without typescript
// installed and answer full instead of crashing the job (PR #91's first CI run).
test('selector_without_typescript_runs_full', async () => {
  const { execFileSync } = await import('node:child_process');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-affected-ids-'));
  try {
    fs.copyFileSync(new URL('../scripts/ci-affected-ids.mjs', import.meta.url), path.join(dir, 'ci-affected-ids.mjs'));
    const code = `const m = await import(${JSON.stringify(path.join(dir, 'ci-affected-ids.mjs'))});
      const registry = { items: [{ name: 'alpha', type: 'registry:ui', files: [{ path: 'registry/cojeev/ui/alpha.tsx' }] }] };
      console.log(JSON.stringify(m.selectGateIds(['registry/cojeev/ui/alpha.tsx'], { registry, read: () => null, appModules: () => [] })));`;
    const env = { ...process.env }; delete env.NODE_PATH;
    const out = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, env, encoding: 'utf8' }));
    assert.match(out.full ?? '', /typescript/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('depth_step_has_the_import_scanner', () => {
  const workflow = fs_read('.github/workflows/verify.yml');
  const install = workflow.indexOf('- name: Install the import scanner for depth selection');
  const depth = workflow.indexOf('- name: Select release verification depth');
  assert.ok(install > 0 && install < depth, 'the scanner install runs before the depth step');
  const installStep = workflow.slice(install, depth);
  assert.match(installStep, /continue-on-error: true/, 'a failed install falls back to full, never fails the job');
  assert.match(installStep, /packages\['node_modules\/typescript'\]\.version/, 'the version comes from the lockfile');
  assert.match(installStep, /=~ \^\[0-9\]\+/, 'only a plain x.y.z version is installed');
  const depthStep = workflow.slice(depth, workflow.indexOf('- name:', depth + 10));
  assert.match(depthStep, /NODE_PATH: \$\{\{ runner\.temp \}\}\/ci-scope-typescript\/node_modules/);
});
