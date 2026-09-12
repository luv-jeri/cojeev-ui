import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch();
const output = 'output/playwright/docs-compact-navigation';
await mkdir(output, { recursive: true });
try {
  for (const mode of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${process.env.POLISH_URL ?? 'http://127.0.0.1:4321/cojeev-ui'}/docs/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.report-launcher:not(:disabled)').waitFor();
    const sidebar = page.locator('.docs-sidebar');
    const theme = sidebar.getByRole('switch', { name: 'Dark appearance' });
    if (mode === 'dark') {
      await theme.click();
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-reveal'));
    }
    assert.equal((await theme.innerText()).trim(), 'Theme', 'The quieter index identifies settings explicitly');
    await sidebar.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
    const disclosure = sidebar.getByRole('button', { name: 'Show compact component index' });
    await disclosure.waitFor();
    assert.equal(await theme.isVisible(), true, 'Theme is reachable while collapsed');
    for (const next of [mode === 'light' ? 'dark' : 'light', mode]) {
      await theme.click();
      await page.waitForFunction(next => document.documentElement.dataset.mode === next && !document.documentElement.hasAttribute('data-theme-reveal'), next);
      assert.equal(await theme.getAttribute('aria-checked'), String(next === 'dark'));
    }
    const colours = sidebar.getByRole('button', { name: 'Colour and contrast', exact: true });
    await colours.click();
    await page.getByText('Make it comfortable.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Colour and contrast');
    const motion = sidebar.getByRole('button', { name: 'Motion settings', exact: true });
    const iconColours = await motion.evaluate(el => ({ ink: getComputedStyle(el).color, icon: getComputedStyle(el.querySelector('[data-slot="icon"]')).color }));
    assert.equal(iconColours.icon, iconColours.ink, 'The motion glyph keeps its button ink, including on a blue dark-mode face');
    await motion.click();
    await page.getByRole('heading', { name: 'Make it feel right' }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Motion settings');
    await sidebar.screenshot({ path: `${output}/${mode}-compact.png` });
    const closed = await sidebar.boundingBox();
    assert(closed.width >= 140 && closed.width <= 160, 'Compact tools remain in a narrow ribbon');
    await disclosure.click();
    const hide = sidebar.getByRole('button', { name: 'Hide compact component index' });
    await page.waitForFunction(() => document.querySelector('.docs-sidebar').getBoundingClientRect().height > 800);
    const grown = await sidebar.boundingBox();
    assert(Math.abs(grown.width - closed.width) < 1, 'The ribbon grows downward without becoming the full sidebar');
    const links = sidebar.locator('.docs-navigation a');
    assert(await links.count() > 160, 'The actual full catalog remains available');
    const button = sidebar.getByRole('link', { name: 'Button', exact: true });
    assert.equal(await button.isVisible(), true);
    assert.equal(await button.locator('[data-slot="sidebar-menu-label"]').isVisible(), true, 'Base mini-rail CSS must not hide component names');
    await button.click();
    await page.waitForURL('**/docs/button/');
    assert.equal(await page.locator('.docs-shell').first().getAttribute('data-navigation'), 'collapsed');
    await sidebar.screenshot({ path: `${output}/${mode}-index.png` });
    await button.focus();
    await page.keyboard.press('Escape');
    if (await sidebar.getByRole('button', { name: 'Hide compact component index' }).count()) {
      assert.equal(await page.locator('.docs-component-peek').count(), 0, 'First Escape dismisses the focused quick look');
      await page.keyboard.press('Escape');
    }
    assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
    assert.equal(await disclosure.evaluate(el => el === document.activeElement), true);
    // Rapid reversal must settle folded, without leaving focusable hidden rows.
    await disclosure.press('Enter');
    await hide.press('Enter');
    await page.waitForFunction(() => document.querySelector('.docs-sidebar').getBoundingClientRect().height < 450);
    assert.equal(await button.isVisible(), false);
    await disclosure.click();
    await colours.click();
    await page.getByText('Make it comfortable.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await hide.getAttribute('aria-expanded'), 'true', 'Escape in settings closes only the nested overlay');
    await page.setViewportSize({ width: 1440, height: 560 });
    const last = sidebar.locator('.docs-navigation a').last();
    await last.scrollIntoViewIfNeeded();
    const lastRect = await last.boundingBox();
    assert(lastRect.y >= 0 && lastRect.y + lastRect.height < 560, 'The last component is reachable in a short viewport');
    assert.equal(await theme.isVisible(), true);
    await sidebar.screenshot({ path: `${output}/${mode}-short.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await hide.click();
    assert.equal(await sidebar.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Browse', exact: true }).click();
    await page.getByRole('heading', { name: 'Browse components', exact: true }).waitFor();
    assert.equal((await page.getByRole('switch', { name: 'Dark appearance' }).innerText()).trim(), 'Theme');
    await page.locator('.docs-mobile-index').screenshot({ path: `${output}/${mode}-mobile.png` });
    await page.keyboard.press('Escape');
    console.log(`PASS: ${mode} compact controls, vertical index, route/focus preservation, short viewport and mobile.`);
    await page.close();
  }
} finally { await browser.close(); }
