import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const baseline = file => execFileSync('git', ['show', `1b50e87e6a4df79ce69877fdc9fae8d212ad4b2e:${file}`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const registryFiles = () => fs.readdirSync('public/r').filter(file => file.endsWith('.json'));

test('registry_regeneration_matches_all_three_indexes', () => {
  const env = { ...process.env, COJEEV_REGISTRY_URL: 'https://cojeev.com/ui' };
  delete env.NEXT_PUBLIC_SITE_URL;
  execFileSync('npm', ['run', 'registry:build'], { env, stdio: 'pipe' });
  const diff = spawnSync('git', ['diff', '--exit-code', 'registry.json', 'public/registry.json', 'public/r/'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.equal(diff.status, 0, 'Regeneration must leave the reviewed generated files unchanged; stage regenerated payloads before running this check.');
  const index = fs.readFileSync('registry.json', 'utf8');
  assert.equal(fs.readFileSync('public/registry.json', 'utf8'), index);
  assert.equal(fs.readFileSync('public/r/registry.json', 'utf8'), index);
  assert.equal(read('registry.json').homepage, 'https://cojeev.com/ui/');
  // The site homepage and registry endpoint are independent configuration.
  try {
    execFileSync(process.execPath, ['scripts/build-registry.mjs', '--metadata-only'], {
      env: { ...env, NEXT_PUBLIC_SITE_URL: 'https://beta.000h.cojeev.com/ui/', COJEEV_REGISTRY_URL: 'https://candidate.example/ui' },
      stdio: 'pipe',
    });
    const candidate = read('registry.json');
    assert.equal(candidate.homepage, 'https://beta.000h.cojeev.com/ui/');
    assert.equal(candidate.items[0].config.registries['@cojeev'], 'https://candidate.example/ui/r/{name}.json');
  } finally { fs.writeFileSync('registry.json', index); }
});

test('all_generated_dependencies_use_reviewed_registry_base', () => {
  for (const file of registryFiles()) {
    const source = fs.readFileSync(`public/r/${file}`, 'utf8');
    assert.doesNotMatch(source, /luv-jeri\.github\.io|000h\.cojeev\.com/, file);
    const payload = JSON.parse(source);
    for (const item of [payload, ...(payload.items ?? [])]) {
      for (const dependency of item.registryDependencies ?? []) assert.ok(dependency.startsWith('https://cojeev.com/ui/r/'), `${file}: ${dependency}`);
      if (item.config?.registries?.['@cojeev']) assert.ok(item.config.registries['@cojeev'].startsWith('https://cojeev.com/ui/r/'), file);
    }
  }
});

test('registry_schemas_and_component_identity_are_unchanged', () => {
  const original = JSON.parse(baseline('public/r/registry.json'));
  const names = items => items.map(item => item.name).sort();
  for (const file of ['registry.json', 'public/registry.json', 'public/r/registry.json']) {
    const index = read(file);
    assert.equal(index.name, '000h-cojeev', file);
    assert.equal(index.$schema, original.$schema, file);
    assert.deepEqual(names(index.items), names(original.items), file);
    for (const item of index.items) assert.equal(item.$schema, original.items.find(value => value.name === item.name).$schema, item.name);
  }
  assert.deepEqual(registryFiles().sort(), ['registry.json', ...original.items.map(item => `${item.name}.json`)].sort());
  for (const file of registryFiles()) {
    const item = read(`public/r/${file}`);
    const originalItem = JSON.parse(baseline(`public/r/${file}`));
    assert.equal(item.name, originalItem.name, file);
    assert.equal(item.$schema, originalItem.$schema, file);
    if (item.config?.registries) assert.deepEqual(Object.keys(item.config.registries), Object.keys(originalItem.config.registries), file);
  }
  assert.equal(fs.readFileSync('components.json', 'utf8'), baseline('components.json'));
});

test('foundation_alias_maps_to_new_registry_without_renaming', () => {
  assert.deepEqual(read('public/r/cojeev.json').config.registries, { '@cojeev': 'https://cojeev.com/ui/r/{name}.json' });
});
