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
