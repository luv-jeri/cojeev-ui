/** Focused docs journeys on this checkout's export, never the entire catalogue. */
import { spawn } from 'node:child_process';
import { preview } from 'vite';

const supplied = process.env.DOCS_BASE_URL;
if (supplied && !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(supplied).hostname)) {
  throw new Error('Component checks require a loopback preview, not a live website.');
}
const server = supplied ? null : await preview({
  configFile: false, base: '/cojeev-ui/', build: { outDir: 'out' },
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
});
try {
  const base = supplied ?? `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`;
  for (const file of [
    'tests/choice-recovery.docs.browser.mjs',
    'tests/disclosure-recovery.docs.browser.mjs',
    'tests/workbench.browser.mjs',
    'tests/docs-compact-navigation.browser.mjs',
  ]) {
    console.log(`Component checkpoint: ${file}`);
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [file], {
        stdio: 'inherit', timeout: 300_000,
        env: { ...process.env, DOCS_BASE_URL: base, POLISH_URL: base },
      });
      child.once('error', reject);
      child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${file} failed (${signal ?? code})`)));
    });
  }
} finally {
  if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
