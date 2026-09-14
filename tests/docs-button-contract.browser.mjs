import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? 'http://127.0.0.1:4320/cojeev-ui';
const output = 'output/playwright/docs-button-contract';
await mkdir(output, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  for (const route of ['hero-button', '']) {
    await page.goto(`${base}/docs/${route ? `${route}/` : ''}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.report-launcher:not(:disabled)').waitFor();
    const links = page.locator('.docs-related-link');
    assert(await links.count() >= 3, 'The docs retain all related/exploration destinations');
    for (const link of await links.all()) {
      assert.equal(await link.getAttribute('data-slot'), 'button', 'Button-shaped docs links must use the shared Button, not a CSS imitation');
      assert.equal(await link.locator('[data-slot="animated-icon"]').count(), 1, 'Action arrows use our AnimatedIcon');
      assert.equal(await link.locator('button,a').count(), 0, 'Each action has one native link, not nested interactive roots');
      assert.equal(await link.evaluate(el => getComputedStyle(el).textDecorationLine), 'none', 'Slotted Button links retain button typography rather than prose underlines');
    }
    const link = links.first();
    await link.scrollIntoViewIfNeeded();
    const body = link.locator('svg.v-morph [data-morph-body]');
    await body.waitFor({ state: 'attached' });
    const resting = await body.getAttribute('d');
    const before = await link.boundingBox();
    await page.mouse.move(before.x + before.width - 8, before.y + before.height / 2);
    await page.waitForFunction(resting => document.querySelector('.docs-related-link [data-morph-body]')?.getAttribute('d') !== resting, resting);
    const after = await link.boundingBox();
    assert(Math.abs(after.x - before.x) < 1 && Math.abs(after.width - before.width) < 1, 'Only the contour moves, not the link target');
    for (const fraction of [.1, .5, .9]) {
      const point = { x: after.x + after.width * fraction, y: after.y + after.height / 2 };
      await page.mouse.move(point.x, point.y);
      assert(await link.evaluate((el, point) => {
        const hit = document.elementFromPoint(point.x, point.y);
        return el.contains(hit) && getComputedStyle(hit).cursor === 'pointer'
          && !hit.closest('[data-slot="animated-icon"],svg.v-morph');
      }, point), 'The text, contour and glyph preserve a stable pointer target');
    }
    for (const mode of ['light', 'dark']) {
      await page.evaluate(mode => document.documentElement.dataset.mode = mode, mode);
      await page.locator('.docs-related').evaluate(el => Promise.all(
        el.getAnimations({ subtree: true }).filter(animation => animation instanceof CSSTransition)
          .map(animation => animation.finished.catch(() => {}))));
      await page.locator('.docs-related').screenshot({ path: `${output}/${route || 'start'}-${mode}.png` });
    }
    const movingBody = await body.elementHandle();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Wait for the media-change handler to replace the moving body with its
    // quiet one, not merely for the old path (which is already present).
    await page.waitForFunction(node => !node.isConnected, movingBody);
    await body.waitFor({ state: 'attached' });
    const quietPath = await body.getAttribute('d');
    await page.mouse.move(after.x + 8, after.y + after.height / 2);
    await page.evaluate(() => new Promise(resolve => {
      let frames = 0;
      const tick = () => ++frames === 12 ? resolve() : requestAnimationFrame(tick);
      requestAnimationFrame(tick);
    }));
    assert((await body.getAttribute('d')) === quietPath, 'Reduced motion keeps the action contour still');
    const href = await link.getAttribute('href');
    await link.focus();
    assert.notEqual(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'Keyboard focus remains visible');
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.pathname === href);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    console.log(`PASS: ${route || 'Getting started'} shared buttons, animated icons, real contour response, stable hit areas, keyboard navigation and quiet mode.`);
  }
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally { await browser.close(); }
