import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const output = "output/playwright/preview-background-library";
await fs.mkdir(output, { recursive: true });
const choices = [
  ["Pigment wash", "pigment", "pigment-field"],
  ["Pollen", "pollen", "depth-background"],
  ["Depth contours", "depth-contour", "depth-background"],
  ["Orbital", "orbital", "depth-background"],
  ["Ambient drift", "ambient-drift", "ambient-background"],
  ["Ambient orbit", "ambient-orbit", "ambient-background"],
  ["Ambient contours", "ambient-contour", "ambient-background"],
];
const browser = await chromium.launch();
try {
  for (const [width, mode] of [[1440, "light"], [390, "dark"]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(mode => localStorage.setItem("cojeev-docs-theme", mode), mode);
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    // The mobile appearance control lives in the navigation drawer.
    if (width < 900) await page.getByRole("button", { name: "Browse", exact: true }).click();
    const appearance = page.getByRole("switch", { name: "Dark appearance", exact: true });
    await appearance.waitFor({ state: "attached" });
    if ((await appearance.getAttribute("aria-checked") === "true") !== (mode === "dark")) await appearance.click();
    await page.waitForFunction(mode => document.documentElement.dataset.mode === mode, mode);
    if (width < 900) await page.keyboard.press("Escape");
    const preview = page.locator('[data-slot="preview"]').first();
    const specimen = preview.locator('[data-button-demo="full"]').first();
    const canvas = preview.locator('[data-slot="preview-canvas"]');
    const trigger = preview.getByRole("button", { name: "Background", exact: true });
    await specimen.getByRole("slider", { name: "Loading duration", exact: true }).press("Home");
    await specimen.getByRole("button", { name: "Add a note", exact: true }).click();
    await specimen.getByText("1 note added in this example.", { exact: true }).waitFor();
    const dimensions = await canvas.evaluate(el => [el.offsetWidth, el.offsetHeight]);
    await specimen.evaluate(el => { window.backgroundSpecimen = el; });
    for (const [name, value, slot] of choices) {
      await trigger.click();
      const picker = page.getByRole("dialog", { name: "Choose preview background" });
      assert.equal(await picker.getByRole("button", { name, exact: true }).count(), 1, `${name} is selectable in Preview, not just its own documentation`);
      assert.equal(await picker.locator('canvas').count(), 0, "Thumbnails must not allocate WebGL canvases");
      const bounds = await picker.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= 901, "Picker is bounded on narrow screens");
      if (value === "pigment") await page.screenshot({ path: `${output}/picker-${width}-${mode}.png` });
      await picker.getByRole("button", { name, exact: true }).click();
      await picker.waitFor({ state: "hidden" });
      const paint = canvas.locator(`:scope > [data-preview-background="${value}"]`);
      await paint.locator(`[data-slot="${slot}"]`).waitFor({ state: "attached" });
      assert.equal(await canvas.locator(':scope > [data-slot="pattern-background"]').count(), 0, "New background replaces the old dots instead of layering over them");
      assert.equal(await paint.evaluate(el => getComputedStyle(el).pointerEvents), "none");
      assert.equal(await specimen.evaluate(el => el === window.backgroundSpecimen), true, "Switching backgrounds keeps the actual specimen mounted");
      assert.equal(await specimen.getByText("1 note added in this example.", { exact: true }).count(), 1);
      assert.deepEqual(await canvas.evaluate(el => [el.offsetWidth, el.offsetHeight]), dimensions);
      if (value === "pigment" || value === "pollen") {
        await canvas.scrollIntoViewIfNeeded();
        assert.equal(await page.locator("html").getAttribute("data-mode"), mode, "Screenshot uses the actual requested theme");
        await page.screenshot({ path: `${output}/${value}-${width}-${mode}.png` });
      }
      if (slot === "depth-background") assert.equal(await paint.locator(`[data-slot="${slot}"]`).getAttribute("data-active"), "false", "Reduced motion freezes the chosen field");
      if (slot === "ambient-background") assert.equal(await paint.locator(`[data-slot="${slot}"]`).getAttribute("data-motion"), "static");
    }
    await trigger.click();
    await page.getByRole("dialog", { name: "Choose preview background" }).getByRole("button", { name: "Plain", exact: true }).click();
    assert.equal(await canvas.locator(':scope > [data-preview-background], :scope > [data-slot="pattern-background"]').count(), 0);
    await page.goto(`${base}/docs/depth-background/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    const depthCanvas = page.locator('[data-slot="preview-canvas"]').first();
    await depthCanvas.locator('[data-slot="depth-background"]').first().waitFor({ state: "attached" });
    assert.equal(await depthCanvas.locator(':scope > [data-slot="pattern-background"], :scope > [data-preview-background]').count(), 0, "Background examples start on Plain, without a second decoration");
    assert(await depthCanvas.locator('[data-slot="depth-background"]').count() > 0, "Plain does not hide the background being demonstrated");
    assert.deepEqual(errors, []);
    await page.close();
  }
  const motionPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await motionPage.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
  await motionPage.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
  const motionPreview = motionPage.locator('[data-slot="preview"]').first();
  const choose = async name => {
    await motionPreview.getByRole("button", { name: "Background", exact: true }).click();
    await motionPage.getByRole("dialog", { name: "Choose preview background" }).getByRole("button", { name, exact: true }).click();
    await motionPreview.locator('[data-slot="preview-canvas"]').scrollIntoViewIfNeeded();
  };
  await choose("Pollen");
  await motionPreview.locator('[data-slot="depth-background"][data-active="true"]').waitFor({ state: "attached" });
  const particle = motionPreview.locator('.v-depth-background__piece').first();
  const initialTransform = await particle.evaluate(el => el.style.transform);
  await motionPage.waitForFunction(({ initial }) => document.querySelector('[data-preview-background] .v-depth-background__piece')?.style.transform !== initial, { initial: initialTransform });
  await choose("Ambient drift");
  await motionPreview.locator('[data-slot="ambient-background"][data-motion="running"]').waitFor({ state: "attached" });
  await motionPage.emulateMedia({ reducedMotion: "reduce" });
  await motionPreview.locator('[data-slot="ambient-background"][data-motion="static"]').waitFor({ state: "attached" });
  await motionPage.emulateMedia({ forcedColors: "active" });
  assert.equal(await motionPreview.locator('[data-preview-background]').evaluate(el => getComputedStyle(el).display), "none", "Forced colors removes decoration, not content");
  assert(await motionPreview.locator('[data-button-demo="full"]').first().isVisible());
  await motionPage.close();
  console.log("PASS: existing pigment, depth and ambient fields selectable in Preview; static swatches, stable state, Plain, live/quiet motion, forced colors and responsive light/dark bounds.");
} finally { await browser.close(); }
