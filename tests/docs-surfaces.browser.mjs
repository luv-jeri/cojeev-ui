import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
await mkdir("output/playwright/round-5-surfaces", { recursive: true });
try {
  for (const width of [360, 1440]) for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await page.goto(`${base}/docs/dropdown-menu/`);
    const demo = page.locator('[data-example="dropdown-menu"]').first();
    await demo.locator('.v-morph-live').first().waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(mode => { document.documentElement.dataset.mode = mode; }, mode);
    const trigger = demo.getByRole('button', { name: 'Note actions', exact: true });
    const bounds = await trigger.boundingBox();
    assert(bounds.width < 280, `Dropdown demo trigger should be content-sized, not ${bounds.width}px wide`);
    const frame = page.locator('.docs-playground > [data-slot="preview"]');
    const dots = frame.locator('[data-slot="preview-canvas"] > [data-pattern="dots"]');
    assert.equal(await dots.getAttribute('aria-hidden'), 'true');
    assert(await dots.evaluate(element => getComputedStyle(element).backgroundImage.includes('radial-gradient')));
    assert.equal(await dots.evaluate(element => getComputedStyle(element).pointerEvents), 'none');
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
    assert.match(await demo.locator('[role="status"]').textContent(), /duplicated/);
    await frame.screenshot({ path: `output/playwright/round-5-surfaces/preview-${width}-${mode}.png` });
    await frame.getByRole('tab', { name: 'Code', exact: true }).click();
    const grid = frame.locator('[data-slot="code-block"] > [data-pattern="grid"]');
    assert(await grid.evaluate(element => getComputedStyle(element).backgroundImage.includes('linear-gradient')));
    await frame.screenshot({ path: `output/playwright/round-5-surfaces/code-${width}-${mode}.png` });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No page-wide overflow');
    if (width === 1440 && mode === 'light') for (const [route, name] of [['dialog', 'Rename workspace'], ['alert-dialog', 'Archive example note']]) {
      await page.goto(`${base}/docs/${route}/`);
      const example = page.locator(`[data-example="${route}"]`).first();
      await example.locator('.v-morph-live').first().waitFor({ state: "attached" });
      assert((await example.getByRole('button', { name, exact: true }).boundingBox()).width < 280, `${route} trigger should be content-sized`);
    }
    await page.close();
  }
  console.log('PASS: bounded menu/dialog triggers, decorative dots/grid, menu action, mobile/desktop light/dark overflow.');
} finally { await browser.close(); }
