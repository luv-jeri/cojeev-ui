import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
const output = 'output/playwright/docs-sidebar-scrollbar';
await mkdir(output, { recursive: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    await page.goto(`${base}/docs/hero-button/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.report-launcher:not(:disabled)').waitFor();
    if (width < 900) await page.getByRole('button', { name: 'Browse', exact: true }).click();
    const scroll = page.locator('.docs-navigation-scroll');
    const viewport = scroll.locator('[data-slot="scroll-area-viewport"]');
    const thumb = scroll.locator('[data-slot="scroll-area-thumb"]');
    const rail = scroll.locator('[data-slot="scroll-area-scrollbar"]');
    await thumb.waitFor({ state: 'visible' });
    assert((await thumb.boundingBox()).width >= 6, 'The sidebar exposes a more legible, at least 6px thumb');
    assert((await rail.boundingBox()).width >= 24, 'Increasing paint thickness preserves the larger drag target');
    // Wait for the moving mobile drawer's target to settle before deriving a
    // drag coordinate; visibility alone includes its slide-in frames.
    await thumb.hover();
    const rect = await thumb.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 60, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.docs-navigation-viewport')?.scrollTop > 0);
    await viewport.focus();
    await page.keyboard.press('Control+Home');
    for (const mode of ['light', 'dark']) {
      await page.evaluate(mode => document.documentElement.dataset.mode = mode, mode);
      await page.locator('.docs-sidebar').evaluate(el => Promise.all(
        el.getAnimations({ subtree: true }).filter(animation => animation instanceof CSSTransition)
          .map(animation => animation.finished.catch(() => {}))));
      await page.locator('.docs-sidebar').screenshot({ path: `${output}/${width}-${mode}.png` });
    }
    console.log(`PASS: ${width}px sidebar has a thicker organic thumb and a working 24px drag target.`);
    await page.close();
  }
} finally { await browser.close(); }
