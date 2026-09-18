import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview as previewServer } from "vite";

const server = process.env.ANALYTICS_CONSENT_URL
  ? null
  : await previewServer({
      configFile: false,
      base: "/cojeev-ui/",
      build: { outDir: process.env.ANALYTICS_CONSENT_OUT_DIR ?? "out" },
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    });
const base = (process.env.ANALYTICS_CONSENT_URL ??
  `http://127.0.0.1:${server.httpServer.address().port}/cojeev-ui`).replace(/\/$/, "");
const consentKey = "000h.analytics-consent.v1";
const browser = await chromium.launch();

try {
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
  await page.getByText("Analytics stays off until you choose to allow it.", { exact: true }).waitFor();
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
  await page.getByRole("link", { name: "Privacy", exact: true }).waitFor();

  await page.keyboard.press("Escape");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
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
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

  await trigger.click();
  await close.click();
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

  await trigger.click();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press("Escape");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true);

  await trigger.click();
  await page.getByRole("button", { name: "No thanks", exact: true }).click();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), consentKey), "declined");
  assert.equal(await trigger.count(), 0);
  assert.equal(attempts.length, 0);

  await context.close();
  console.log("PASS: compact analytics disclosure remains accessible and fail-closed.");
} finally {
  await browser.close();
  await server?.close();
}
