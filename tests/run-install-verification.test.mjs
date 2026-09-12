import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const runner = fileURLToPath(new URL('../scripts/run-install-verification.mjs', import.meta.url));

test('consumer runner serves candidate dependencies, rejects other routes, and leaves source unchanged', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'candidate-install-test-'));
  let liveRequests = 0;
  const live = createServer((_request, response) => { liveRequests++; response.end(JSON.stringify({ marker: 'live-not-candidate' })); });
  await new Promise(resolve => live.listen(0, '127.0.0.1', resolve));
  const liveOrigin = `http://127.0.0.1:${live.address().port}`;
  const items = {
    button: { marker: 'candidate-button', registryDependencies: [`${liveOrigin}/cojeev-ui/r/card.json`] },
    card: { marker: 'candidate-card', registryDependencies: [`${liveOrigin}/cojeev-ui/r/cojeev.json`] },
    cojeev: { marker: 'candidate-foundation', config: { registries: { '@cojeev': `${liveOrigin}/cojeev-ui/r/{name}.json` } } },
  };
  try {
    await fs.mkdir(path.join(directory, 'out/r'), { recursive: true });
    await fs.mkdir(path.join(directory, 'scripts'));
    for (const [name, item] of Object.entries(items)) await fs.writeFile(path.join(directory, 'out/r', `${name}.json`), JSON.stringify(item));
    // Stand in for the expensive installer only at its process boundary. The
    // runner and its actual HTTP responses are exercised without npm/network.
    await fs.writeFile(path.join(directory, 'scripts/verify-install.mjs'), `
      import assert from 'node:assert/strict';
      const origin = process.argv.find(arg => arg.startsWith('--url=')).slice(6);
      const button = await (await fetch(origin + '/r/button.json')).json();
      assert.equal(button.marker, 'candidate-button');
      assert.equal(new URL(button.registryDependencies[0]).origin, new URL(origin).origin);
      const card = await (await fetch(button.registryDependencies[0])).json();
      assert.equal(card.marker, 'candidate-card');
      const foundation = await (await fetch(card.registryDependencies[0])).json();
      assert.equal(foundation.marker, 'candidate-foundation');
      assert.equal(foundation.config.registries['@cojeev'], origin + '/r/{name}.json');
      for (const route of ['/missing', '/r/unknown.json', '/package.json']) {
        assert.equal((await fetch(origin + route)).status, 404);
      }
    `);
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [runner], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { output += data; });
      const timer = setTimeout(() => child.kill('SIGTERM'), 10000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', code => { clearTimeout(timer); resolve({ code, output }); });
    });
    assert.equal(result.code, 0, result.output);
    assert.equal(liveRequests, 0, 'No component dependency may reach the live registry');
    for (const [name, item] of Object.entries(items)) assert.equal(await fs.readFile(path.join(directory, 'out/r', `${name}.json`), 'utf8'), JSON.stringify(item));
  } finally {
    await new Promise(resolve => live.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
