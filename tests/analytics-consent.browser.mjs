import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { preview as previewServer } from "vite";

const server = process.env.ANALYTICS_CONSENT_URL
  ? null
  : await previewServer({
      configFile: false,
      base: "/ui/",
      build: { outDir: process.env.ANALYTICS_CONSENT_OUT_DIR ?? "out" },
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    });
const base = (process.env.ANALYTICS_CONSENT_URL ??
  `http://127.0.0.1:${server.httpServer.address().port}/ui`).replace(/\/$/, "");
const consentKey = "000h.analytics-consent.v1";
const browser = await chromium.launch();

try {
  await test("ui_privacy_banner_behavior_is_preserved", async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const attempts = [];
    for (const host of ["https://us.i.posthog.com/**", "https://eu.i.posthog.com/**"]) {
      await context.route(host, async route => {
        attempts.push(route.request().url());
        await route.abort();
      });
    }
    const page = await context.newPage();
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });

    const trigger = page.getByRole("button", { name: "Analytics choices", exact: true });
    await trigger.waitFor();
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await page.getByText("Optional PostHog analytics measures page views", { exact: false }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Allow analytics", exact: true }).count(), 0);
    assert.equal(await page.getByRole("link", { name: "Privacy", exact: true }).count(), 0);
    assert.equal(attempts.length, 0);

    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByText("PostHog analytics stays off until you choose to allow it.", { exact: true }).waitFor();
    await page.getByText("The site moved to cojeev.com/ui. Saved drafts and browser preferences from 000h.cojeev.com do not transfer. Keep your downloaded report receipts.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Analytics choices", exact: true }).count(), 0);
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await trigger.waitFor();

    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    const close = page.getByRole("button", { name: "Close analytics choices", exact: true });
    await close.waitFor();
    assert.equal(await close.evaluate(node => node === document.activeElement), true);
    await page.getByRole("button", { name: "Allow analytics", exact: true }).waitFor();
    await page.getByRole("button", { name: "No thanks", exact: true }).waitFor();
    const privacy = page.getByRole("link", { name: "Privacy", exact: true });
    await privacy.waitFor();
    assert.equal(new URL(await privacy.getAttribute("href"), base).pathname, "/ui/privacy/");

    await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.and(page.locator(":focus")).waitFor();
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

    await trigger.click();
    await page.evaluate(() => {
      const preventEscape = event => {
        if (event.key === "Escape") event.preventDefault();
      };
      window.__analyticsConsentPreventEscape = preventEscape;
      document.addEventListener("keydown", preventEscape, true);
    });
    await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    await page.evaluate(() => {
      document.removeEventListener("keydown", window.__analyticsConsentPreventEscape, true);
      delete window.__analyticsConsentPreventEscape;
    });
    await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.and(page.locator(":focus")).waitFor();
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

    await trigger.click();
    await close.click();
    await trigger.and(page.locator(":focus")).waitFor();
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

    await trigger.click();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.and(page.locator(":focus")).waitFor();
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

    await trigger.click();
    await page.getByRole("button", { name: "No thanks", exact: true }).click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "declined");
    assert.equal(await trigger.count(), 0);
    assert.equal(attempts.length, 0);

    await page.reload();
    await page.getByRole("combobox", { name: "Example approach", exact: true }).filter({ hasText: "Accent" }).waitFor();
    assert.equal(await trigger.count(), 0, "decline persists after reload");
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "declined");
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    await page.getByRole("button", { name: "Turn analytics off", exact: true }).waitFor();
    await page.reload();
    await page.getByRole("button", { name: "Turn analytics off", exact: true }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "allowed");
    await context.close();
  });

  await test("homepage_storage_survives_ui_preference_changes", async () => {
    const homepage = [
      { name: "cojeev-coming-soon-theme", value: "dark" },
      { name: "cojeev-preview-clock", value: '{ "time": "09:41", "offset": 330 }' },
    ];
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
      storageState: { cookies: [], origins: [{ origin: new URL(base).origin, localStorage: homepage }] },
    });
    for (const host of ["https://us.i.posthog.com/**", "https://eu.i.posthog.com/**"]) await context.route(host, route => route.abort());
    const page = await context.newPage();
    await page.goto(`${base}/docs/button/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("combobox", { name: "Example approach", exact: true }).filter({ hasText: "Accent" }).waitFor();
    const before = await page.evaluate(() => ({
      theme: localStorage.getItem("cojeev-docs-theme"),
      appearance: localStorage.getItem("cojeev-appearance"),
      motion: localStorage.getItem("v-motion"),
      flow: localStorage.getItem("v-flow-v1"),
    }));
    const preserved = async () => {
      assert.deepEqual(await page.evaluate(keys => keys.map(key => ({ name: key, value: localStorage.getItem(key) })), homepage.map(item => item.name)), homepage);
    };
    await preserved();
    await page.getByRole("switch", { name: "Dark appearance", exact: true }).first().click();
    assert.notEqual(await page.evaluate(() => localStorage.getItem("cojeev-docs-theme")), before.theme);
    await preserved();
    await page.getByRole("button", { name: "Colours and contrast", exact: true }).first().click();
    await page.getByRole("combobox", { name: "Colour palette", exact: true }).click();
    await page.getByRole("option", { name: "Grove", exact: true }).click();
    assert.notEqual(await page.evaluate(() => localStorage.getItem("cojeev-appearance")), before.appearance);
    await page.keyboard.press("Escape");
    await preserved();
    await page.getByRole("button", { name: "Motion settings", exact: true }).first().click();
    const panel = page.getByRole("dialog", { name: "Make it feel right", exact: true });
    await panel.getByRole("switch", { name: "Enable motion", exact: true }).click();
    assert.notEqual(await page.evaluate(() => localStorage.getItem("v-motion")), before.motion);
    await preserved();
    await panel.getByRole("button", { name: "Jelly", exact: true }).click();
    assert.notEqual(await page.evaluate(() => localStorage.getItem("v-flow-v1")), before.flow);
    await preserved();
    await panel.getByRole("button", { name: "Close motion settings", exact: true }).click();
    await page.getByRole("button", { name: "Analytics choices", exact: true }).click();
    await page.getByRole("button", { name: "Allow analytics", exact: true }).click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "allowed");
    await preserved();
    await page.goto(`${base}/privacy/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Turn analytics off", exact: true }).click();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "declined");
    await preserved();
    await page.reload();
    await page.getByRole("button", { name: "Allow analytics", exact: true }).waitFor();
    await preserved();
    await context.close();
  });
  console.log("PASS: compact analytics disclosure remains accessible and fail-closed.");
} finally {
  await browser.close();
  await server?.close();
}
