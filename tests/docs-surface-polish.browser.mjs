import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const out = "output/playwright/surface-polish";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(mode => localStorage.setItem("cojeev-docs-theme", mode), mode);
    await page.goto(`${base}/docs/action-dock/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    await page.getByRole("button", { name: "Collapse navigation", exact: true }).click();
    const expand = page.getByRole("button", { name: "Expand navigation", exact: true });
    await expand.waitFor();
    await page.waitForTimeout(400);
    const surface = page.locator('.docs-navigation-surface [data-morph-body]');
    assert.equal(await surface.count(), 1, 'Collapsed navigation has its own living background');
    const still = await surface.getAttribute('d');
    const rail = await page.locator('.docs-sidebar').boundingBox();
    await page.mouse.move(rail.x + rail.width - 1, rail.y + 75);
    await page.waitForFunction(previous => document.querySelector('.docs-navigation-surface [data-morph-body]')?.getAttribute('d') !== previous, still);
    assert(await page.locator(".docs-sidebar").evaluate(el => el.clientHeight < 260), "Collapsed index is a compact tool rail");
    assert.equal(await page.locator(".docs-sidebar > svg.v-morph").count(), 0, "Structural rail does not morph its hit area");
    assert.equal(await page.locator(".docs-atmosphere").evaluate(el => el.getBoundingClientRect().left), 0, "Atmosphere continues behind the rail");
    for (const target of [expand, page.getByRole("button", { name: "Search components", exact: true })]) {
      const rect = await target.boundingBox();
      for (const dx of [2, rect.width / 2, rect.width - 2]) {
        const point = { x: rect.x + dx, y: rect.y + rect.height / 2 };
        await page.mouse.move(point.x, point.y);
        const samples = await target.evaluate(async (el, point) => {
          const result = [];
          for (let frame = 0; frame < 24; frame++) {
            await new Promise(requestAnimationFrame);
            const hit = document.elementFromPoint(point.x, point.y);
            result.push({ inside: el.contains(hit), cursor: getComputedStyle(hit).cursor });
          }
          return result;
        }, point);
        assert(samples.every(sample => sample.inside && sample.cursor === "pointer"), "Control center and edges retain a pointer over consecutive frames");
      }
    }
    await page.screenshot({ path: `${out}/rail-${mode}.png` });
    await expand.click();
    await page.waitForTimeout(400);
    assert.equal(await surface.count(), 1, 'Expanded navigation retains the same living background');
    await page.screenshot({ path: `${out}/sidebar-${mode}.png` });
    await page.getByRole("tab", { name: "Code", exact: true }).first().click();
    const code = page.locator('.v-preview code').first();
    const text = await code.innerText();
    assert.match(text, /function ActionDockExample\(\) \{\n\s+return <ActionDock \/>;/);
    assert(await code.locator('.token.keyword').count() > 0);
    assert(await code.locator('.token.tag').count() > 0);
    assert.equal(await page.locator('.v-preview [data-slot="code-block"] > [data-slot="pattern-background"]').count(), 0);
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.copiedCode = value; } } }));
    await page.getByRole("button", { name: "Copy code", exact: true }).first().click();
    assert.equal(await page.evaluate(() => window.copiedCode), text, "Copy matches the formatted visible source");
    await code.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/code-${mode}.png` });
    await page.goto(`${base}/docs/motion-drawer/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    await page.getByRole("button", { name: "Choose a chapter", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "The field guide", exact: true });
    await dialog.getByRole("tab", { name: "Shapes", exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(await dialog.locator('[data-stack-card][data-active=true] .v-motion-drawer__stack-outline path').count(), 1);
    assert.equal(await dialog.getByRole("tab", { name: "Shapes", exact: true }).evaluate(el => getComputedStyle(el).borderBottomWidth), "0px");
    await page.screenshot({ path: `${out}/stack-${mode}.png` });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/stack-keyboard-${mode}.png` });
    await page.setViewportSize({ width: 390, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${out}/stack-mobile-before-${mode}.png` });
    await dialog.getByRole("tab", { name: "Shapes", exact: true }).click();
    await page.screenshot({ path: `${out}/stack-mobile-${mode}.png` });
    for (const label of ['Overview', 'Shapes', 'Motion', 'Principles']) {
      await dialog.getByRole('tab', { name: label, exact: true }).click();
      const clearLabels = await dialog.getByRole('tab').evaluateAll(tabs => tabs.every(tab => {
        const range = document.createRange();
        range.selectNodeContents(tab.querySelector('span'));
        return [...range.getClientRects()].every(rect => [rect.left + 1, rect.right - 1].every(x => tab.contains(document.elementFromPoint(x, rect.top + rect.height / 2))));
      }));
      assert(clearLabels, 'All rear-card labels remain fully uncovered, not just their centers');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("PASS: stable cursor targets, continuous atmosphere, formatted/highlighted exact-copy code, joined middle stack tabs.");
} finally { await browser.close(); }
