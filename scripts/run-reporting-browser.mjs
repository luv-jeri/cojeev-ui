/** Serves the prebuilt loopback fixture and cleans up only this run's resources. */
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { startReportingFixture } from './reporting-browser-fixture.mjs';

const privateDir = await mkdtemp(path.join(tmpdir(), '000h-reporting-browser-'));
let site, fixture;
try {
  site = await preview({ configFile: false, base: '/ui/', build: { outDir: 'out' }, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
  const origin = `http://127.0.0.1:${site.httpServer.address().port}`;
  // The separately built fixture embeds this exact loopback API. A port conflict
  // fails instead of silently testing a different process.
  fixture = await startReportingFixture(origin, 8787);
  const tokenFile = path.join(privateDir, 'admin-token');
  await writeFile(tokenFile, fixture.admin, { mode: 0o600 });
  let submissionPassed = false;
  await test('ui_browser_submission_receipt_attachment_and_reload_work', async () => {
    const config = await fetch(`${fixture.api}/v1/config`, { headers: { Origin: origin } });
    assert.equal(config.headers.get('access-control-allow-origin'), origin);
    assert.equal((await config.json()).local, true);
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      await context.route(/^https?:\/\//, route => {
        const host = new URL(route.request().url()).hostname;
        return ['localhost', '127.0.0.1'].includes(host) ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto(`${origin}/ui/`);
      await page.getByRole('button', { name: 'Request a feature / Report a bug' }).click();
      await page.getByRole('tab', { name: 'Report a bug', exact: true }).click();
      await page.getByLabel('Short summary', { exact: true }).fill('A10 local attachment and tracking check');
      await page.getByLabel('What happened?', { exact: true }).fill('Disposable loopback verification of a report with an attachment.');
      await page.getByLabel('Your email', { exact: true }).fill('a10-browser@example.com');
      await page.getByLabel('Attach images or videos', { exact: true }).setInputFiles({
        name: 'a10.png', mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf3sAAAAASUVORK5CYII=', 'base64'),
      });
      await page.getByAltText('Attachment preview: a10.png').waitFor();
      await page.getByRole('button', { name: 'Include browser details', exact: true }).click();
      await page.getByRole('button', { name: 'Review report', exact: true }).click();
      const submitted = page.waitForResponse(response => response.url() === `${fixture.api}/v1/reports` && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Send report', exact: true }).click();
      const response = await submitted;
      assert.equal(response.status(), 201);
      assert.equal(response.request().headers().origin, origin);
      assert.equal(response.request().postDataJSON().report.diagnostics.environment.page, '/ui/');
      const receipt = await response.json();
      await page.waitForFunction(id => new Promise(resolve => {
        const open = indexedDB.open('cojeev-reporting-v1', 1);
        open.onsuccess = () => {
          const read = open.result.transaction('drafts').objectStore('drafts').get('sent');
          read.onsuccess = () => {
            const entry = read.result?.find(entry => entry.receipt.id === id);
            open.result.close();
            resolve(entry?.receipt.attachments.length === 1 && entry.receipt.attachments.every(file => ['uploaded', 'ready'].includes(file.state)));
          };
        };
      }), receipt.id);
      await page.locator('.report-sent-banner').waitFor();
      await page.goto(`${origin}/ui/track/#${receipt.id}.${receipt.statusKey}`);
      await page.getByRole('heading', { name: 'Your report', exact: true }).waitFor();
      await page.getByText('1 file attached', { exact: true }).waitFor();
      await page.reload();
      await page.getByRole('status').getByText('Being reviewed', { exact: true }).waitFor();
      await page.getByText('1 file attached', { exact: true }).waitFor();
      const board = page.waitForResponse(response => response.url().startsWith(`${fixture.api}/v1/requests?`) && response.request().method() === 'GET');
      await page.goto(`${origin}/ui/requests/`);
      assert.equal((await board).status(), 200);
      await page.getByRole('heading', { name: 'The request board', exact: true }).waitFor();
      await page.locator('.requests-rows[aria-busy="false"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('[data-board-state="offline"], [data-board-state="error"]').count(), 0);
      await page.getByRole('button', { name: 'Request a feature / Report a bug' }).click();
      const sent = page.getByRole('button', { name: 'Sent from this browser · 1', exact: true });
      await sent.waitFor();
      await sent.click();
      await page.locator('.report-sent-row').filter({ hasText: 'A10 local attachment and tracking check' }).waitFor();
      assert.deepEqual(pageErrors, []);
      submissionPassed = true;
    } finally { await browser.close(); }
  });
  if (!submissionPassed) throw new Error('The /ui reporting follow-up failed.');
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/check-reporting-browser.mjs'], {
      stdio: 'inherit', env: { ...process.env,
        REPORTING_BROWSER_URL: `${origin}/ui`, REPORTING_BROWSER_API: fixture.api,
        REPORTING_ADMIN_TOKEN_FILE: tokenFile,
        REPORTING_BROWSER_OUTPUT: 'artifacts/reporting-browser',
      },
    });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  if (code) throw new Error(`Reporting browser journey failed (${code}).`);
  // Follow-up checks, each run with the same environment. Add one entry per new check.
  const followUps = [
    // The widget mounts after the page is idle; a request made before then must still open it, once.
    ['Early reporting request check', 'tests/reporting-early-request.browser.mjs'],
    ['Tracking page check', 'tests/reporting-track.browser.mjs'],
    // The screenshot progress card must dim the page, name each step and stay still under reduced motion.
    ['Capture progress check', 'tests/reporting-capture-progress.browser.mjs'],
    // Pins: numbered markers, readable labels, toggle and the labels staying on this device.
    ['Pin feedback check', 'tests/reporting-pins.browser.mjs'],
    // A save React runs late for the pre-send draft must never put the sent receipt back.
    ['Late save check', 'tests/reporting-late-save.browser.mjs'],
  ];
  for (const [label, script] of followUps) {
    const failed = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--test', script], {
        stdio: 'inherit', env: { ...process.env, POLISH_URL: `${origin}/ui`,
          REPORTING_BROWSER_API: fixture.api, REPORTING_BROWSER_OUTPUT: 'artifacts/reporting-browser' },
      });
      child.once('error', reject);
      child.once('exit', code => resolve(code ?? 1));
    });
    if (failed) throw new Error(`${label} failed (${failed}).`);
  }
} finally {
  await fixture?.close();
  if (site?.httpServer.listening) await new Promise(resolve => site.httpServer.close(resolve));
  await rm(privateDir, { recursive: true, force: true });
}
