import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  for (const width of [360, 1440]) for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(mode => localStorage.setItem("cojeev-docs-theme", mode), mode);
    await page.goto(`${process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui"}/docs/pattern-background/`);
    const example = page.locator('[data-example="pattern-background"]').first();
    await example.getByRole('slider', { name: 'Pattern spacing', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(mode => document.documentElement.dataset.mode === mode, mode);
    const sample = example.locator('[aria-label="Pattern sample"]');
    const pattern = sample.locator('[data-slot="pattern-background"]');
    const initialHeight = await sample.evaluate(node => node.getBoundingClientRect().height);
    await example.getByRole('slider', { name: 'Pattern spacing', exact: true }).press('End');
    assert.equal(await pattern.evaluate(node => getComputedStyle(node).backgroundSize), '80px 80px');
    await example.getByRole('slider', { name: 'Pattern strength', exact: true }).press('Home');
    assert.equal(await pattern.evaluate(node => getComputedStyle(node).opacity), '0');
    assert.equal(await sample.evaluate(node => node.getBoundingClientRect().height), initialHeight);
    await example.getByRole('slider', { name: 'Pattern strength', exact: true }).press('End');
    assert.equal(await pattern.evaluate(node => getComputedStyle(node).opacity), '0.4');
    assert.equal(await page.getByRole('region', { name: 'Variants', exact: true }).locator('figure').count(), 9);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.close();
  }
  console.log('PASS: Pattern background route, all variants, spacing/strength controls and stable geometry at 360/1440 light/dark.');
} finally { await browser.close(); }
