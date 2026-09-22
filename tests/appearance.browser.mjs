import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  for (const width of [390, 1440]) for (const mode of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await context.addInitScript(mode => {
      localStorage.setItem("cojeev-docs-theme", mode);
      localStorage.setItem("cojeev-appearance", JSON.stringify({ palette: "paper", contrast: 60 }));
    }, mode);
    const page = await context.newPage();
    await page.goto(`${(process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4320/cojeev-ui").replace(/\/$/, "")}/docs/appearance/`);
    await page.waitForFunction(() => document.documentElement.dataset.palette === "paper");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.mode), mode);
    const ink = await page.evaluate(() => {
      const root = document.documentElement;
      const runtime = getComputedStyle(root).getPropertyValue("--v-text-3").trim();
      const inline = root.style.getPropertyValue("--v-text-3");
      root.style.removeProperty("--v-text-3");
      const css = getComputedStyle(root).getPropertyValue("--v-text-3").trim();
      root.style.setProperty("--v-text-3", inline);
      return { runtime, css };
    });
    assert.equal(ink.runtime.toUpperCase(), ink.css.toUpperCase(), `${mode}: CSS-only and mounted muted ink agree`);
    assert.equal(ink.css.toUpperCase(), mode === "dark" ? "#90897F" : "#68645E");
    const controls = page.locator('[data-example="appearance"] [data-slot="appearance-controls"]').first();
    await controls.waitFor();
    const slider = controls.getByRole("slider", { name: "Contrast", exact: true });
    assert.equal(await slider.count(), 0, "Paper must not expose an ineffective control");
    assert.match(await controls.innerText(), /Paper uses a fixed contrast/);
    const choose = async name => {
      await controls.getByRole("combobox").click();
      await page.getByRole("option", { name, exact: true }).click();
      await page.waitForFunction(name => document.documentElement.dataset.palette === name.toLowerCase(), name);
    };
    await choose("Tide");
    await slider.press("Home");
    await page.waitForFunction(() => document.documentElement.dataset.contrast === "0");
    const low = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--v-text-2"));
    await slider.press("End");
    await page.waitForFunction(() => document.documentElement.dataset.contrast === "100");
    const high = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--v-text-2"));
    assert.notEqual(high, low, "the available contrast control changes text paint");
    await choose("Paper");
    assert.equal(await slider.count(), 0);
    await choose("Tide");
    assert.equal(await slider.getAttribute("aria-valuenow"), "100", "switching palettes preserves the contrast preference");
    await controls.getByRole("button", { name: "Reset appearance", exact: true }).click();
    await page.waitForFunction(() => document.documentElement.dataset.palette === "paper");
    assert.equal(await slider.count(), 0);
    await context.close();
  }
  console.log("PASS appearance: light/dark CSS-runtime muted ink, fixed Paper contrast, adjustable Tide contrast, preference preservation and reset at 390/1440px");
} finally {
  await browser.close();
}
