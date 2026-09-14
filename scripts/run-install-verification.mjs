/**
 * Install into a fresh consumer project from the registry this build produced,
 * served on loopback. Never the published website: a scoped check must prove
 * the candidate in hand, not whatever is already live.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const registry = new Map();
for (const file of await fs.readdir('out/r')) {
  if (/^[a-z0-9-]+\.json$/.test(file)) registry.set(file, JSON.parse(await fs.readFile(path.join('out/r', file), 'utf8')));
}
const site = createServer((request, response) => {
  const file = request.url?.match(/^\/r\/([a-z0-9-]+\.json)$/)?.[1];
  if (!registry.has(file)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(registry.get(file)));
});
await new Promise((resolve, reject) => { site.once('error', reject); site.listen(0, '127.0.0.1', resolve); });
try {
  const origin = `http://127.0.0.1:${site.address().port}`;
  // Rewrite only this disposable in-memory view. Top-level URLs alone are not
  // enough: generated items embed absolute URLs for foundation and siblings.
  for (const item of registry.values()) {
    if (item.registryDependencies) item.registryDependencies = item.registryDependencies.map(value => {
      const file = value.match(/^https?:\/\/[^/]+(?:\/cojeev-ui)?\/r\/([a-z0-9-]+\.json)$/)?.[1];
      if (!file || !registry.has(file)) throw new Error(`Dependency is not in the candidate registry: ${value}`);
      return `${origin}/r/${file}`;
    });
    if (item.config?.registries?.['@cojeev']) item.config.registries['@cojeev'] = `${origin}/r/{name}.json`;
  }
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/verify-install.mjs', `--url=${origin}`, ...process.argv.slice(2)], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', value => resolve(value ?? 1));
  });
  if (code) throw new Error(`Consumer installation from the locally served registry failed (${code}).`);
} finally {
  await new Promise(resolve => site.close(resolve));
}
