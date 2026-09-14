import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const output = "output/playwright/round-9";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(mode => localStorage.setItem("cojeev-docs-theme", mode), mode);
    await page.goto(`${base}/docs/dock/`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-slot="dock"]').first().waitFor();
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    await page.evaluate(() => document.fonts.ready);
    for (const variant of ["default", "shelf", "rail"]) {
      const specimen = page.locator(`.docs-specimen[data-example="dock"][data-variant="${variant}"]`).first();
      const dock = specimen.getByRole("navigation", { name: "Cojeev workspace", exact: true });
      await dock.getByRole("button", { name: "Work", exact: true }).click();
      await specimen.getByRole("heading", { name: "Work", exact: true }).waitFor();
      assert.equal(await specimen.getByRole("heading", { name: "Work", exact: true }).count(), 1);
      await dock.getByRole("button", { name: "Memory", exact: true }).click();
      await specimen.getByRole("heading", { name: "Memory", exact: true }).waitFor();
      assert.equal(await specimen.getByRole("heading", { name: "Memory", exact: true }).count(), 1);
      assert(await dock.getByRole("button", { name: "Automations", exact: true }).isDisabled());
      await page.mouse.move(0, 0);
      if (variant === "default") {
        const size = specimen.getByRole("slider", { name: "Item size", exact: true });
        const magnification = specimen.getByRole("slider", { name: "Magnification", exact: true });
        await size.focus(); await page.keyboard.press("End");
        assert.equal(await size.getAttribute("aria-valuenow"), "72");
        await magnification.focus(); await page.keyboard.press("End");
        assert.equal(await magnification.getAttribute("aria-valuenow"), "2");
        await dock.getByRole("button", { name: "Settings", exact: true }).focus();
        assert.equal(await specimen.getByRole("heading", { name: "Memory", exact: true }).count(), 1, "focus alone does not activate a workspace");
        await page.keyboard.press("Enter");
        await specimen.getByRole("heading", { name: "Settings", exact: true }).waitFor();
        assert.equal(await specimen.getByRole("heading", { name: "Settings", exact: true }).count(), 1);
        await size.focus(); await page.keyboard.press("Home");
        await magnification.focus(); await page.keyboard.press("Home");
      }
      assert(await specimen.evaluate(node => node.scrollWidth <= node.clientWidth + 1), `${variant} specimen stays within its host`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No page horizontal overflow");
      await specimen.screenshot({ path: `${output}/dock-${variant}-${width}-${mode}.png` });
    }
    await page.goto(`${base}/docs/motion-drawer/`, { waitUntil: "domcontentloaded" });
    const bottom = page.locator('.docs-specimen[data-example="motion-drawer"][data-variant="bottom"]').first();
    await bottom.locator(".v-morph-live").first().waitFor({ state: "attached" });
    await bottom.getByRole("button", { name: "Change layout", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Make room for your ideas", exact: true });
    await dialog.waitFor();
    const choices = dialog.getByRole("group", { name: "Note layout" }).getByRole("button");
    await page.waitForFunction(() => document.querySelector('[aria-label="Note layout"] .v-morph-live'));
    for (const choice of await choices.all()) {
      const geometry = await choice.evaluate(node => ({ height: node.getBoundingClientRect().height, radius: getComputedStyle(node).borderRadius, card: node.classList.contains("-card"), r: node.dataset.r }));
      assert.equal(geometry.card, true); assert.equal(geometry.r, "12");
      assert(geometry.height < 115, "Choices are compact rather than stretched pill buttons");
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.screenshot({ path: `${output}/bottom-${width}-${mode}.png` });
    await choices.filter({ hasText: "Cards" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator('[data-notes-layout]').getAttribute("data-notes-layout"), "cards");
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("PASS: live Dock variants/actions and size controls, compact shared card Buttons, desktop/mobile light/dark, no overflow or runtime errors.");
} finally { await browser.close(); }
