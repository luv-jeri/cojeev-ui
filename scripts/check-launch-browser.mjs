import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.env.LAUNCH_TEST_URL || "http://127.0.0.1:4335/cojeev-ui").replace(/\/$/, "");
// The public canonical origin is independent of the local verification server.
const expectedSite = (process.env.LAUNCH_EXPECTED_SITE_URL || "https://luv-jeri.github.io/cojeev-ui").replace(/\/$/, "");
const output = "output/playwright/000h-launch";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const checks = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
// Verification never sends synthetic events to an analytics project.
await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
const page = await context.newPage();
// A dev server compiles routes on demand; give it headroom without relaxing any assertion.
page.setDefaultTimeout(Number(process.env.LAUNCH_TIMEOUT ?? 30000));
page.setDefaultNavigationTimeout(Number(process.env.LAUNCH_NAV_TIMEOUT ?? 60000));
page.on("pageerror", error => errors.push(error.message));
const mark = label => { checks.push(label); console.log(`Verified: ${label}`); };
async function ready() {
  await page.locator('.story-header [data-slot="button"], .story-header [data-slot="theme-toggle"]').first().waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
}
// The stored appearance is re-applied in a client effect, so a freshly loaded document can still
// show the served default. Wait for the document to agree with the preference before reading it.
async function themeSettled() {
  await page.waitForFunction(() => {
    const stored = localStorage.getItem("cojeev-docs-theme");
    return !stored || document.documentElement.dataset.mode === stored;
  });
}
async function chooseTheme(theme) {
  await themeSettled();
  if (await page.locator("html").getAttribute("data-mode") !== theme) await page.getByRole("switch", { name: /appearance/i }).click();
  await page.waitForFunction(expected => document.documentElement.dataset.mode === expected && !document.querySelector("[data-theme-reveal]"), theme);
}
async function noOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "page must fit viewport width");
}
try {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.getByRole("link", { name: /^Explore \d+ components$/ }).waitFor();
  const gallery = page.locator("#featured-components");
  const shelf = gallery.locator("[data-featured-component]:not([hidden])");
  assert.equal(await shelf.count(), 4, "One filter shows one shelf of four live previews");
  await page.locator('[data-profile-stage][data-phase="settled"]').waitFor();
  await page.waitForTimeout(900);
  for (const theme of ["light", "dark"]) {
    await chooseTheme(theme);
    await noOverflow();
    for (const article of await shelf.all()) {
      const box = await article.boundingBox();
      const docs = await article.locator(".launch-specimen__docs").boundingBox();
      assert.ok(box && docs && docs.y + docs.height <= box.y + box.height + 1, "documentation link must fit its card");
    }
    await page.screenshot({ path: `${output}/desktop-${theme}.png`, fullPage: true });
  }
  mark("desktop previews fit in both themes with reachable documentation links");
  const stage = page.locator("[data-profile-stage]");
  await stage.getByRole("button", { name: "Stack", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "stack");
  assert.equal(await page.locator("[data-profile-live]").getAttribute("data-treatment"), "stack");
  const drawerTrigger = page.getByRole("button", { name: "Open drawer" });
  await drawerTrigger.click();
  const stack = page.getByRole("dialog", { name: "A little room for ideas" });
  await stack.waitFor();
  await stack.getByRole("tab", { name: "The details" }).click();
  await stack.getByRole("link", { name: "Explore Motion Drawer" }).waitFor();
  await page.keyboard.press("Escape");
  await stack.waitFor({ state: "hidden" });
  assert.equal(await drawerTrigger.evaluate(element => element === document.activeElement), true);
  // An overlay keeps the page out of the accessibility tree until it has finished leaving.
  const released = () => page.waitForFunction(() => {
    for (let node = document.querySelector("#featured-components"); node; node = node.parentElement) {
      if (node.inert || node.getAttribute?.("aria-hidden") === "true") return false;
    }
    return true;
  });
  await released();
  await gallery.getByRole("button", { name: "Layout", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "layout");
  assert.equal(await shelf.count(), 4, "A filter swaps the shelf rather than emptying it");
  const dock = page.locator('[data-featured-component="dock"]');
  await dock.getByRole("button", { name: "Ideas", exact: true }).click();
  assert.equal(await dock.getByRole("status").innerText(), "Ideas");
  const background = page.locator('[data-featured-component="pattern-background"]');
  await background.getByRole("button", { name: "Pebbles", exact: true }).click();
  assert.equal(await background.locator('[data-slot="pattern-background"]').getAttribute("data-pattern"), "pebbles");
  await gallery.getByRole("button", { name: "Motion", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "motion");
  const agent = page.locator('[data-featured-component="agent-state"]');
  await agent.getByRole("button", { name: "Done", exact: true }).click();
  assert.equal(await agent.locator('[data-slot="agent-state"]').getAttribute("data-status"), "complete");
  await page.getByRole("button", { name: "Replay the details" }).click();
  await gallery.getByRole("button", { name: "Featured", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "featured");
  await gallery.getByRole("button", { name: "Layout", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "layout");
  assert.equal(await dock.getByRole("status").innerText(), "Ideas", "Filtering away and back must not erase a choice already made");
  await gallery.getByRole("button", { name: "Featured", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "featured");
  assert.equal(await page.locator(".shape-workbench-section, .studio-assembly, .studio-materials").count(), 0, "the homepage is a compact collection");
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  assert.ok(height < 2150, `desktop landing stays short, received ${height}px`);
  mark("live previews respond across filters, the drawer restores focus, and the homepage stays short");
  // Installation lives on the documentation pages now, so the copy path is verified there.
  await page.goto(`${base}/docs/semantic-bloom/`, { waitUntil: "domcontentloaded" });
  // InstallCommand renders an inline terminal CodeBlock, so scope the feedback to that block.
  const install = page.locator(".docs-command").first();
  await install.waitFor();
  // The copy control only answers once the page is interactive.
  await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
  await install.scrollIntoViewIfNeeded();
  await install.getByRole("button", { name: "Copy command" }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.docs-command [role="status"]')].some(element => element.textContent?.includes("Copied")));
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /\/r\/semantic-bloom\.json$/);
  mark("documented installation copies the actual registry command");

  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await chooseTheme(theme);
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
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${expectedSite}/about/`);
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
  await writeFile(`${output}/report.json`, JSON.stringify({ base, expectedSite, checks, errors, passed: true }, null, 2));
} finally {
  await browser.close();
}
