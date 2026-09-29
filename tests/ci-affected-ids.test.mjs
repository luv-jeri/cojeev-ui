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
const select = (paths, { deps = [], read = files() } = {}) => selectGateIds(paths, { registry: registry(deps), read });

test('component_edit_targets_its_ids', () => {
  assert.deepEqual(select(['registry/cojeev/ui/alpha.tsx']).ids, ['alpha', 'beta']);
  assert.deepEqual(select(['registry/cojeev/ui/beta.tsx']).ids, ['beta']);
  assert.equal(isComponentPath('registry/cojeev/ui/nested/x.tsx'), false);
  assert.equal(isComponentPath('registry/cojeev/lib/x.tsx'), false);
});

test('component_edit_targets_its_ids: real registry, button', () => {
  const real = selectGateIdsFromCheckout(['registry/cojeev/ui/button.tsx']);
  const total = JSON.parse(fs_read('registry.json')).items.filter(entry => entry.type === 'registry:ui').length;
  assert.ok(real.ids.includes('button'));
  assert.ok(real.ids.length > 1 && real.ids.length < total, `${real.ids.length} of ${total}`);
  const outputs = releaseOutputs(releaseDepth(['registry/cojeev/ui/button.tsx'], '', { gateIds: paths => selectGateIdsFromCheckout(paths) }));
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
  const withEdge = selectGateIds(['registry/cojeev/ui/alpha.tsx'], { registry: registry([]), read: files({ 'components/examples/b.tsx': 'import x from "react";' }) });
  const without = registry([]);
  without.items = without.items.map(entry => entry.name === 'beta' ? { ...entry, registryDependencies: [] } : entry);
  const dropped = selectGateIds(['registry/cojeev/ui/alpha.tsx'], { registry: without, read: files({ 'components/examples/b.tsx': 'import x from "react";' }) });
  assert.deepEqual(withEdge.ids, ['alpha', 'beta']);
  assert.deepEqual(dropped.ids, ['alpha']);
});

test('gate_ids is an explicit output for every depth', () => {
  assert.equal(releaseOutputs(releaseDepth(['docs/note.md'])).gate_ids, '');
  assert.equal(releaseOutputs(releaseDepth(['package-lock.json'])).gate_ids, '');
});

import fs from 'node:fs';
function fs_read(file) { return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); }
