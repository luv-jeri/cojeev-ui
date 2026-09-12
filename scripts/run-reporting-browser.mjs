/** Serves the prebuilt loopback fixture and cleans up only this run's resources. */
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { preview } from 'vite';
import { startReportingFixture } from './reporting-browser-fixture.mjs';

const privateDir = await mkdtemp(path.join(tmpdir(), '000h-reporting-browser-'));
let site, fixture;
try {
  site = await preview({ configFile: false, base: '/cojeev-ui/', build: { outDir: 'out' }, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  const origin = `http://127.0.0.1:${site.httpServer.address().port}`;
  // The separately built fixture embeds this exact loopback API. A port conflict
  // fails instead of silently testing a different process.
  fixture = await startReportingFixture(origin, 8787);
  const tokenFile = path.join(privateDir, 'admin-token');
  await writeFile(tokenFile, fixture.admin, { mode: 0o600 });
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/check-reporting-browser.mjs'], {
      stdio: 'inherit', env: { ...process.env,
        REPORTING_BROWSER_URL: `${origin}/cojeev-ui`, REPORTING_BROWSER_API: fixture.api,
        REPORTING_ADMIN_TOKEN_FILE: tokenFile,
        REPORTING_BROWSER_OUTPUT: 'artifacts/reporting-browser',
      },
    });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  if (code) throw new Error(`Reporting browser journey failed (${code}).`);
} finally {
  await fixture?.close();
  if (site?.httpServer.listening) await new Promise(resolve => site.httpServer.close(resolve));
  await rm(privateDir, { recursive: true, force: true });
}
