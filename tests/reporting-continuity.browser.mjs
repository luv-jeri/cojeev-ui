import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
const out = 'output/playwright/reporting-continuity';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(mode => localStorage.setItem('cojeev-docs-theme', mode), mode);
    await page.goto(`${base}/docs/hero-button/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    await page.getByRole('button', { name: 'Request a feature or report a bug', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Request a feature or report a bug', exact: true });
    for (const [kind, label] of [['request', 'Request a feature'], ['bug', 'Report a bug'], ['request-return', 'Request a feature']]) {
      await dialog.getByRole('tab', { name: label, exact: true }).click({ timeout: 5000 });
      await dialog.getByRole('heading', { name: label, exact: true }).waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const geometry = await dialog.evaluate(node => {
        const card = node.querySelector('[data-stack-card][data-active="true"]');
        const tab = card.querySelector('[role="tab"]');
        const surface = card.querySelector('.v-motion-drawer__stack-card-surface');
        const t = tab.getBoundingClientRect(), s = surface.getBoundingClientRect();
        const left = Math.abs(t.left - s.left) < Math.abs(t.right - s.right);
        const hits = Array.from(node.querySelectorAll('[role="tab"]'), item => {
          const r = item.getBoundingClientRect();
          return item.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        });
        const labels = Array.from(node.querySelectorAll('[role="tab"]'), item => {
          const range = document.createRange();
          range.selectNodeContents(item.querySelector('span:last-child'));
          return Array.from(range.getClientRects()).filter(r => r.width > 0).every(r =>
            item.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)));
        });
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const luminance = color => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const rgb = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => {
            const channel = value / 255;
            return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
          });
          return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
        };
        const contrast = Array.from(node.querySelectorAll('[role="tab"]'), item => {
          const style = getComputedStyle(item);
          const ink = luminance(style.color), paint = luminance(getComputedStyle(item.closest('[data-stack-card]').querySelector('.v-motion-drawer__stack-outline path')).fill);
          return (Math.max(ink, paint) + .05) / (Math.min(ink, paint) + .05);
        });
        return { gap: s.top - t.bottom, outerAlignment: left ? t.left - s.left : t.right - s.right,
          corner: { x: left ? s.left + 4 : s.right - 5, y: s.top + 4 },
          inside: { x: s.left + s.width / 2, y: s.top + 12 }, hits, labels, contrast };
      });
      assert(geometry.hits.every(Boolean), `${width}/${mode}/${kind}: every file handle has an unobscured pointer target`);
      assert(geometry.labels.every(Boolean), `${width}/${mode}/${kind}: every line of both file labels remains unobscured`);
      assert(geometry.contrast.every(ratio => ratio >= 4.5), `${width}/${mode}/${kind}: both file labels have readable contrast (${geometry.contrast})`);
      assert(geometry.gap <= 1, `${kind}: no daylight between active handle and sheet`);
      assert(Math.abs(geometry.outerAlignment) <= 1.5, `${kind}: outer file edge remains aligned`);
      const png = PNG.sync.read(await page.screenshot({ path: `${out}/${kind}-${width}-${mode}.png` }));
      const pixel = ({ x, y }) => {
        const offset = (Math.floor(y) * png.width + Math.floor(x)) * 4;
        return [...png.data.subarray(offset, offset + 3)];
      };
      const corner = pixel(geometry.corner), inside = pixel(geometry.inside);
      assert(corner.every((channel, index) => Math.abs(channel - inside[index]) < 8), `${kind}: joined outer corner has continuous surface paint, not a cutout (${corner} versus ${inside})`);
    }
    await context.close();
  }
  console.log('PASS: both file shoulders paint continuously, tabs remain clickable, desktop/mobile light/dark.');
} finally { await browser.close(); }
