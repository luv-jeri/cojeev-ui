import assert from "node:assert/strict";
import { chromium } from "playwright";
import fs from "node:fs/promises";

const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const out = "output/playwright/subtle-backgrounds";
const choices = ["Plain", "Dots", "Grid", "Contours", "Weave", "Pebbles", "Sunwash", "Folds", "Sprouts"];
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(mode => localStorage.setItem("cojeev-docs-theme", mode), mode);
    await page.goto(`${base}/docs/button/`);
    const preview = page.locator('[data-slot="preview"]').first();
    await preview.locator('.v-morph-live').first().waitFor({ state: "attached" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => document.fonts.ready);
    if (width < 900) await page.getByRole("button", { name: "Browse", exact: true }).click();
    const appearance = page.getByRole("switch", { name: "Dark appearance", exact: true });
    await appearance.waitFor({ state: "attached" });
    if ((await appearance.getAttribute("aria-checked") === "true") !== (mode === "dark")) await appearance.click();
    await page.waitForFunction(mode => document.documentElement.dataset.mode === mode, mode);
    if (width < 900) await page.keyboard.press("Escape");
    const trigger = preview.getByRole("button", { name: "Background", exact: true });
    const canvas = preview.locator('[data-slot="preview-canvas"]');
    const specimen = preview.locator('[data-button-demo="full"]').first();
    await specimen.getByRole("slider", { name: "Loading duration", exact: true }).press("Home");
    await specimen.getByRole("button", { name: "Add a note", exact: true }).click();
    await specimen.getByText("1 note added in this example.", { exact: true }).waitFor();
    const geometry = () => preview.evaluate(node => {
      const toolbar = node.querySelector('.v-preview__toolbar');
      const canvas = node.querySelector('[data-slot="preview-canvas"]');
      return [toolbar.offsetWidth, toolbar.offsetHeight, canvas.offsetWidth, canvas.offsetHeight];
    });
    const initialGeometry = await geometry();
    for (const name of choices) {
      await trigger.click();
      const palette = page.getByRole("dialog", { name: "Choose preview background" });
      await palette.waitFor();
      assert(await palette.getByRole("button").count() >= choices.length, "Existing choices remain available as the library grows");
      assert.equal(await palette.locator('[aria-pressed="true"]').count(), 1);
      if (name === "Plain") {
        const box = await palette.boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width, "palette stays within viewport");
        await page.screenshot({ path: `${out}/picker-${width}-${mode}.png` });
      }
      await palette.getByRole("button", { name, exact: true }).click();
      await palette.waitFor({ state: "hidden" });
      const paint = canvas.locator(':scope > [data-slot="pattern-background"]');
      if (name === "Plain") assert.equal(await paint.count(), 0, "Plain removes decoration");
      else assert.equal(await paint.getAttribute("data-pattern"), name.toLowerCase());
      assert.equal(await specimen.getByText("1 note added in this example.", { exact: true }).count(), 1, "background selection preserves specimen state");
      assert.equal(await specimen.getByRole("slider", { name: "Loading duration", exact: true }).getAttribute("aria-valuenow"), "0.5");
      assert.deepEqual(await geometry(), initialGeometry, "decoration selection does not shift layout");
    }
    await trigger.focus();
    await trigger.press("Enter");
    const palette = page.getByRole("dialog", { name: "Choose preview background" });
    await palette.getByRole("button", { name: "Grid", exact: true }).focus();
    await page.keyboard.press("Enter");
    await palette.waitFor({ state: "hidden" });
    assert(await trigger.evaluate(node => node === document.activeElement), "selection returns focus to trigger");
    await preview.getByRole("tab", { name: "Code", exact: true }).click();
    assert(await trigger.isDisabled(), "Code cannot expose an ineffective background control");
    await preview.getByRole("tab", { name: "Preview", exact: true }).click();
    await canvas.waitFor();
    assert.equal(await canvas.locator(':scope > [data-slot="pattern-background"]').getAttribute("data-pattern"), "grid", "background choice survives tab switching");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no mobile horizontal overflow");
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("PASS: nine background choices, Plain, stable specimen/toolbar, keyboard, tabs and mobile/light/dark.");
} finally { await browser.close(); }
