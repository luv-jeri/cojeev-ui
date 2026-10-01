import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Run against a served build or dev server: POLISH_URL=http://127.0.0.1:4381/ui node --test tests/reporting-early-request.browser.mjs
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/ui";

test("a request opened before the reporting widget mounts opens once it mounts", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    // Hold the idle callback that mounts the widget, so the click lands before it can listen.
    await page.addInitScript(() => {
      const held = [];
      window.requestIdleCallback = callback => held.push(callback);
      window.cancelIdleCallback = () => {};
      window.releaseIdle = () => held.splice(0).forEach(callback => callback({ didTimeout: false, timeRemaining: () => 50 }));
    });
    await page.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" });
    const request = page.getByRole("button", { name: "Request a component", exact: true });
    await request.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent?.trim() === "Request a component" && Object.keys(button).some(key => key.startsWith("__reactProps"))));
    assert.equal(await page.locator(".report-launcher").count(), 0, "the reporting widget has not mounted yet");

    await request.click();
    await page.evaluate(() => window.releaseIdle());
    const dialog = page.getByRole("dialog", { name: "Request a feature or report a bug", exact: true });
    await dialog.waitFor({ timeout: 10000 });
    assert.equal(await dialog.getByRole("tab", { name: "Request a feature", exact: true }).getAttribute("aria-selected"), "true");

    // Once: closing the panel does not replay the early request.
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForTimeout(1500);
    assert.equal(await dialog.count(), 0, "the early request opened the panel only once");
  } finally {
    await browser.close();
  }
});
