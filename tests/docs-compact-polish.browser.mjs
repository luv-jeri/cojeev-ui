import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Catches mismatched labelled-tool alignment, moving click targets and a replaced
// disclosure glyph. Screenshot review separately judges the visual composition.
const browser = await chromium.launch();
const output = 'output/playwright/docs-compact-polish';
await mkdir(output, { recursive: true });
try {
  for (const mode of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(mode => {
      localStorage.setItem('cojeev-docs-theme', mode);
      localStorage.setItem('cojeev-docs-navigation', 'collapsed');
    }, mode);
    await page.goto('http://127.0.0.1:4320/cojeev-ui/docs/message/', { waitUntil: 'domcontentloaded' });
    await page.locator('.report-launcher:not(:disabled)').waitFor();
    const sidebar = page.locator('.docs-sidebar');
    await page.waitForFunction(() => document.querySelector('.docs-sidebar')?.getAttribute('data-state') === 'collapsed');
    await sidebar.evaluate(async el => { await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))); });
    const search = sidebar.getByRole('button', { name: 'Search components', exact: true });
    const motion = sidebar.getByRole('button', { name: 'Motion settings', exact: true });
    const theme = sidebar.getByRole('switch', { name: 'Dark appearance' });
    const colour = sidebar.getByRole('button', { name: 'Colour and contrast', exact: true });
    const brand = sidebar.locator('.docs-brand');
    const expand = sidebar.getByRole('button', { name: 'Expand navigation', exact: true });
    const left = async locator => (await locator.boundingBox()).x;
    assert(Math.abs(await left(search) - await left(motion)) < 1, 'Search and settings share one quiet alignment');
    assert(Math.abs(await left(theme) - await left(colour)) < 1, 'Theme and colours remain aligned labelled actions');
    assert((await brand.boundingBox()).width >= 40);
    for (const control of [search, motion, theme, colour, expand]) {
      const before = await control.boundingBox();
      assert(before.width >= 44 && before.height >= 44, 'Small visible icons retain accessible targets');
      const aligned = await control.evaluate(el => {
        const r = el.getBoundingClientRect(), icon = el.querySelector('svg:not(.v-morph)');
        const i = icon.getBoundingClientRect();
        return i.x >= r.x && i.x + i.width <= r.x + r.width && Math.abs(r.y + r.height / 2 - i.y - i.height / 2) < 1;
      });
      assert(aligned, 'Icon remains vertically centred and inside its labelled hit area');
      for (const dx of [3, before.width / 2, before.width - 3]) {
        await page.mouse.move(before.x + dx, before.y + before.height / 2);
        assert.equal(await control.evaluate((el, point) => document.elementFromPoint(...point)?.closest('button') === el, [before.x + dx, before.y + before.height / 2]), true, 'Decoration cannot steal control ownership');
      }
      const after = await control.boundingBox();
      assert(Math.abs(before.x - after.x) < .5 && Math.abs(before.y - after.y) < .5, 'Paint moves; control targets do not');
    }
    await page.mouse.move(500, 150);
    await sidebar.screenshot({ path: `${output}/${mode}-compact.png` });
    const disclosure = sidebar.getByRole('button', { name: 'Show compact component index' });
    const glyph = await disclosure.locator('[data-slot="icon"]').elementHandle();
    await disclosure.click();
    const fold = sidebar.getByRole('button', { name: 'Hide compact component index' });
    await fold.waitFor();
    assert(await glyph.evaluate(el => el.isConnected), 'Disclosure keeps one glyph while changing direction');
    await sidebar.evaluate(async el => { await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))); });
    await sidebar.screenshot({ path: `${output}/${mode}-index.png` });
    await fold.press('Enter');
    await disclosure.press('Enter');
    await fold.press('Enter');
    assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await disclosure.click();
    const arrowTransition = await fold.locator('.docs-compact-disclosure-arrow').evaluate(el => getComputedStyle(el).transitionDuration);
    assert.equal(arrowTransition, '0s', 'Quiet mode makes disclosure direction immediate');
    await page.keyboard.press('Escape');
    assert.equal(await disclosure.evaluate(el => el === document.activeElement), true);
    await page.close();
    console.log(`PASS: ${mode} aligned palette, stable pointer ownership, continuous direction cue and quiet/focus behaviour`);
  }
} finally { await browser.close(); }
