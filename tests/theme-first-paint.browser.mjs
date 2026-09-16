import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

// Removing the pre-paint theme, or replaying the server's light snapshot during
// hydration, must fail even when the eventual settled screenshot looks correct.
// The default matches the configured basePath in next.config.ts, as the sibling
// browser suites do. POLISH_URL still overrides it for a blank-base-path server.
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = process.env.THEME_OUTPUT ?? "output/playwright/theme-first-paint";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const { stored, system, expected, blocked } of [
    { stored: "dark", system: "light", expected: "dark" },
    { stored: "light", system: "dark", expected: "light" },
    { stored: null, system: "dark", expected: "dark" },
    // System dark, not light: an unusable stored value must fall through to the
    // system preference, and expecting light here would also pass a hard-coded one.
    { stored: "invalid", system: "dark", expected: "dark" },
    { stored: "invalid", system: "light", expected: "light" },
    { stored: null, system: "dark", expected: "dark", blocked: true },
  ]) {
    const page = await browser.newPage({ colorScheme: system, viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text()); });
    await page.addInitScript(({ stored, blocked }) => {
      if (blocked) Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
      else if (stored) localStorage.setItem("cojeev-docs-theme", stored);
      window.themeFrames = [];
      function sample() {
        if (document.body && document.querySelector("h1")) window.themeFrames.push(document.documentElement.dataset.mode);
        window.themeFrame = requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }, { stored, blocked });
    let release;
    const scripts = new Promise(resolve => { release = resolve; });
    await page.route("**/_next/**/*.js*", async route => { await scripts; await route.continue(); });
    try {
      const response = await page.goto(`${base}/docs/buy-me-coffee/`, { waitUntil: "commit" });
      assert.equal(response.status(), 200, "docs route responds successfully");
      await page.locator("h1").waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator("html").getAttribute("data-mode"), expected, "correct mode before React downloads");
    } finally { release(); }
    await page.waitForLoadState("load");
    await page.locator(".v-morph-live").first().waitFor({ state: "attached" });
    await page.waitForTimeout(1700); // Observe the old erroneous 1.2–1.38s hydration reveal too.
    const modes = await page.evaluate(() => { cancelAnimationFrame(window.themeFrame); return [...new Set(window.themeFrames)]; });
    assert.deepEqual(modes, [expected], "no opposite-theme frame during hydration");
    await page.reload();
    await page.locator(".v-morph-live").first().waitFor({ state: "attached" });
    await page.waitForTimeout(1700);
    assert.deepEqual(await page.evaluate(() => { cancelAnimationFrame(window.themeFrame); return [...new Set(window.themeFrames)]; }), [expected], "reload stays in the chosen mode");
    assert.deepEqual(errors, [], "no client or hydration errors");
    if (!blocked && stored === expected) {
      const card = page.locator(".v-buy-me-coffee").first();
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${expected}-desktop.png` });
      const ratios = await card.evaluate(card => {
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
            const c = v / 255;
            return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
          });
          return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        };
        const bg = luminance(getComputedStyle(card).backgroundColor);
        return [...card.querySelectorAll(".v-buy-me-coffee__copy strong,.v-buy-me-coffee__copy>span,.v-buy-me-coffee__action")].map(node => {
          const fg = luminance(getComputedStyle(node).color);
          return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
        });
      });
      assert.ok(ratios.every(ratio => ratio >= 4.5), `readable coffee text in ${expected}: ${ratios}`);
      await card.focus();
      await page.keyboard.press("Enter");
      assert.ok(new URL(page.url()).hash, "support link remains keyboard operable");
      await page.setViewportSize({ width: 390, height: 844 });
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${expected}-mobile.png` });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
      console.log(`${expected} coffee text contrast: ${ratios.map(value => value.toFixed(2)).join(", ")}:1`);
    }
    await page.close();
  }
  console.log("PASS saved/system themes, blocked storage, slow hydration, and stable paint");
} finally { await browser.close(); }
