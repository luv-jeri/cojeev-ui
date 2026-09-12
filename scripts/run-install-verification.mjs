/**
 * Install into a fresh consumer project from the registry this build produced,
 * served on loopback. Never the published website: a scoped check must prove
 * the candidate in hand, not whatever is already live.
 */
import { spawn } from 'node:child_process';
import { preview } from 'vite';

const site = await preview({
  configFile: false, base: '/cojeev-ui/', build: { outDir: 'out' },
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
});
try {
  const origin = `http://127.0.0.1:${site.httpServer.address().port}/cojeev-ui`;
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/verify-install.mjs', `--url=${origin}`, ...process.argv.slice(2)], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', value => resolve(value ?? 1));
  });
  if (code) throw new Error(`Consumer installation from the locally served registry failed (${code}).`);
} finally {
  if (site.httpServer.listening) await new Promise(resolve => site.httpServer.close(resolve));
}
