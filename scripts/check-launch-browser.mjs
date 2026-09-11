import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.env.LAUNCH_TEST_URL || "http://127.0.0.1:4335/cojeev-ui").replace(/\/$/, "");
const output = "output/playwright/000h-launch";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const checks = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
// Verification never sends synthetic events to an analytics project.
await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
const mark = label => { checks.push(label); console.log(`Verified: ${label}`); };
async function ready() {
  await page.locator('.story-header [data-slot="button"], .story-header [data-slot="theme-toggle"]').first().waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
}
async function noOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "page must fit viewport width");
}
try {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.getByRole("link", { name: /^Explore \d+ components$/ }).waitFor();
  assert.equal(await page.locator("[data-featured-component]").count(), 6);
  await page.locator('[data-slot="semantic-bloom"] canvas').waitFor();
  await page.locator('.launch-hero [data-slot="organism-assembly"][data-phase="usable"]').waitFor();
  await page.waitForTimeout(900);
  for (const theme of ["light", "dark"]) {
    const current = await page.locator("html").getAttribute("data-mode");
    if (current !== theme) await page.getByRole("switch", { name: /appearance/i }).click();
    await page.waitForFunction(expected => document.documentElement.dataset.mode === expected && !document.querySelector("[data-theme-reveal]"), theme);
    await noOverflow();
    for (const article of await page.locator("[data-featured-component]").all()) {
      const box = await article.boundingBox();
      const install = await article.getByRole("button", { name: "Get component", exact: true }).boundingBox();
      assert.ok(box && install && install.y + install.height <= box.y + box.height + 1, "install control must fit its card");
    }
    await page.screenshot({ path: `${output}/desktop-${theme}.png`, fullPage: true });
  }
  mark("desktop previews fit in both themes with reachable installation controls");
  await page.locator('[data-featured-component="semantic-bloom"]').getByRole("button", { name: "Scatter", exact: true }).click();
  await page.getByRole("button", { name: "Gather", exact: true }).click();
  await page.getByRole("button", { name: "Replay the details" }).click();
  const drawerTrigger = page.getByRole("button", { name: "Open drawer" });
  await drawerTrigger.click();
  const stack = page.getByRole("dialog", { name: "A little room for ideas" });
  await stack.waitFor();
  await stack.getByRole("tab", { name: "The details" }).click();
  await stack.getByRole("link", { name: "Explore Motion Drawer" }).waitFor();
  await page.keyboard.press("Escape");
  await stack.waitFor({ state: "hidden" });
  assert.equal(await drawerTrigger.evaluate(element => element === document.activeElement), true);
  const dock = page.locator('[data-featured-component="dock"]');
  await dock.getByRole("button", { name: "Ideas", exact: true }).click();
  assert.equal(await dock.getByRole("status").innerText(), "Ideas");
  const agent = page.locator('[data-featured-component="agent-state"]');
  await agent.getByRole("button", { name: "Done", exact: true }).click();
  assert.equal(await agent.locator('[data-slot="agent-state"]').getAttribute("data-status"), "complete");
  const background = page.locator('[data-featured-component="pattern-background"]');
  await background.getByRole("button", { name: "Pebbles", exact: true }).click();
  assert.equal(await background.locator('[data-slot="pattern-background"]').getAttribute("data-pattern"), "pebbles");
  assert.equal(await page.locator(".shape-workbench-section, .studio-assembly, .studio-materials").count(), 0, "the homepage is a compact collection");
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  assert.ok(height < 2150, `desktop landing stays short, received ${height}px`);
  mark("six live previews respond, the drawer restores focus, and the homepage stays short");
  await page.locator('[data-featured-component="semantic-bloom"]').getByRole("button", { name: "Get component", exact: true }).click();
  const installDialog = page.getByRole("dialog", { name: "Add Semantic Bloom" });
  await installDialog.waitFor();
  await installDialog.getByRole("button", { name: "Copy command" }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] [role="status"]')].some(element => element.textContent?.includes("Copied")));
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /\/r\/semantic-bloom\.json$/);
  await page.keyboard.press("Escape");
  await installDialog.waitFor({ state: "hidden" });
  mark("featured installation copies the actual registry command");

  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    if (await page.locator("html").getAttribute("data-mode") !== theme) await page.getByRole("switch", { name: /appearance/i }).click();
    await page.waitForFunction(expected => document.documentElement.dataset.mode === expected && !document.querySelector("[data-theme-reveal]"), theme);
    await page.evaluate(() => window.scrollTo(0, 0));
    await noOverflow();
    await page.screenshot({ path: `${output}/mobile-${theme}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator(".story-mobile-nav").getByRole("link", { name: "About the maker" }).click();
  await page.waitForURL(`${base}/about/`);
  await page.getByRole("heading", { level: 1, name: /Hi, I’m Sanjay/ }).waitFor();
  await noOverflow();
  await page.screenshot({ path: `${output}/about-mobile.png` });
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://luv-jeri.github.io/cojeev-ui/about/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${output}/about-desktop.png` });
  mark("mobile navigation reaches the maker page without overflow");

  await page.getByRole("link", { name: "Get started", exact: true }).click();
  await page.waitForURL(`${base}/getting-started/`);
  await page.getByRole("heading", { name: "Make something yours." }).waitFor();
  await noOverflow();
  await page.screenshot({ path: `${output}/getting-started-desktop.png` });
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await page.waitForURL(`${base}/privacy/`);
  await page.getByRole("heading", { name: "A little clarity." }).waitFor();
  await page.getByRole("status").filter({ hasText: /analytics/i }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: `${output}/privacy-mobile.png` });
  mark("installation and privacy pages have usable, responsive content");

  await context.grantPermissions([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.getByRole("button", { name: "Open drawer" }).click();
  await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor({ state: "hidden" });
  mark("reduced motion keeps the featured drawer functional");
  assert.deepEqual(errors, [], "new routes must not throw browser errors");
  await writeFile(`${output}/report.json`, JSON.stringify({ base, checks, errors, passed: true }, null, 2));
} finally {
  await browser.close();
}
