import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const output = 'output/playwright/theme-glyph-seam';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const ratio of [1, 2]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: ratio });
  await page.goto(`${process.env.POLISH_URL ?? 'http://127.0.0.1:4321/cojeev-ui'}/docs/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.report-launcher:not(:disabled)').waitFor();
  const toggle = page.getByRole('switch', { name: 'Dark appearance' });
  for (const mode of ['dark', 'light']) {
    await toggle.click();
    await page.waitForFunction(() => Number(document.documentElement.dataset.themeProgress) > .1);
    const box = await toggle.locator('[data-slot="theme-toggle-icon"]').boundingBox();
    const png = PNG.sync.read(await page.screenshot({ path: `${output}/${ratio}x-${mode}-mid.png` }));
    const pixel = (x, y) => {
      const offset = (Math.floor(y * ratio) * png.width + Math.floor(x * ratio)) * 4;
      return [...png.data.subarray(offset, offset + 3)];
    };
    const distance = (a, b) => Math.max(...a.map((value, i) => Math.abs(value - b[i])));
    const samples = [];
    // This strip is outside every sun/moon path but inside the control face.
    // It catches a rectangular compositing edge, not the legitimate focus ring.
    for (let offset = 2; offset <= 6; offset++) {
      samples.push(distance(pixel(box.x + offset, box.y), pixel(box.x + offset, box.y - 3)));
      samples.push(distance(pixel(box.x, box.y + offset), pixel(box.x - 3, box.y + offset)));
    }
    console.log(`${ratio}x ${mode}`, 'glyph-boundary deltas:', samples);
    assert(Math.max(...samples) < 16, 'Theme reveal must not paint a visible rectangular seam around the glyph');
    assert.equal(await toggle.evaluate(el => el.matches(':focus-visible')), false, 'Pointer activation does not borrow keyboard focus paint');
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-reveal'));
    assert.equal(await page.locator('html').getAttribute('data-mode'), mode);
  }
  await toggle.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await toggle.evaluate(el => el.matches(':focus-visible')), true, 'Keyboard focus stays visible');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toggle.click();
  assert.equal(await page.locator('html').getAttribute('data-mode'), 'dark');
  assert.equal(await page.locator('html').getAttribute('data-theme-reveal'), null);
  console.log('PASS: seamless theme glyph in both directions, keyboard focus and quiet mode.');
  await page.close();
  }
} finally {
  await browser.close();
}
