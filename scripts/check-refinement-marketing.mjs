/** Current landing-page journeys. Uses the live dev site or the existing static export. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";

const staticServer = process.argv.includes("--serve") ? await (await import("vite")).preview({
  configFile: false, base: "/cojeev-ui/", build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = (process.env.BASE_URL ?? (staticServer
  ? `http://127.0.0.1:${staticServer.httpServer.address().port}/cojeev-ui`
  : "http://127.0.0.1:4320/cojeev-ui")).replace(/\/$/, "");
const output = process.env.OUTPUT_DIR ?? "output/playwright/refinement-marketing";
const widths = (process.env.WIDTHS ?? "390,768,1440").split(",").map(Number);
const engine = process.env.WEBKIT ? webkit : chromium;
const results = [];
await fs.mkdir(output, { recursive: true });

async function ready(composition, kind) {
  await composition.waitFor({ state: "visible" });
  await composition.evaluate((node, expected) => new Promise((resolve, reject) => {
    const started = performance.now();
    const check = () => {
      if (node.dataset.kind === expected && node.dataset.settled === "true" && node.dataset.assembled === "true") resolve(true);
      else if (performance.now() - started > 10000) reject(new Error(`Assembly did not settle as ${expected}`));
      else setTimeout(check, 40);
    };
    check();
  }), kind);
}

async function currentAssembly(page, reduced = false) {
  const assembly = page.locator('.launch-hero [data-slot="organism-assembly"]');
  const composition = assembly.locator('[data-slot="organism-composition"]');
  await assembly.scrollIntoViewIfNeeded();
  await ready(composition, "focus");
  const start = composition.getByRole("button", { name: "Start focusing", exact: true });
  await start.focus(); await start.press("Enter");
  await composition.getByRole("button", { name: "Pause", exact: true }).click();
  await composition.getByRole("button", { name: /^(Resume|Start focusing)$/ }).waitFor();
  await assembly.getByRole("button", { name: "Chat", exact: true }).click();
  await ready(composition, "chat");
  assert(await composition.locator('[data-slot="bubble-content"]').count() >= 3, "Chat uses native message bubbles");
  const composer = composition.getByRole("textbox", { name: "Your message", exact: true });
  const message = reduced ? "A quiet but useful thought." : "Make a thoughtful little thing.";
  await composer.fill(message);
  const send = composition.getByRole("button", { name: "Send message", exact: true });
  if (reduced) { await send.focus(); await send.press("Enter"); }
  else await send.click();
  await composition.getByRole("log").getByText(message, { exact: false }).waitFor();
  assert.equal(await composer.inputValue(), "");
  assert(await send.isDisabled(), "An empty message cannot be sent");
  await composition.getByRole("button", { name: "Clear conversation", exact: true }).click();
  await composition.getByText("A fresh page.", { exact: false }).waitFor();
  if (reduced) {
    assert(await assembly.getByRole("button", { name: "Replay assembly", exact: true }).isDisabled());
    assert(await composition.locator("button,input").evaluateAll(nodes => nodes.every(node => !node.closest("[inert]") && node.closest("[data-assembly-part]")?.style.clipPath === "")), "Quiet composition releases its interactive parts");
  }
}


let browser;
try {
  browser = await engine.launch();
  for (const width of widths) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, acceptDownloads: true });
    await context.addInitScript(value => {
      localStorage.setItem("cojeev-docs-theme", value);
      localStorage.removeItem("v-motion"); localStorage.removeItem("v-flow-v1");
    }, theme);
    await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const row = { engine: engine.name(), width, theme, errors, checks: [] };
    const filename = `${engine.name()}-${width}-${theme}`;
    try {
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
      const hero = page.locator(".launch-hero");
      const featured = page.locator(".launch-featured");
      assert.equal(await featured.locator("[data-featured-component]").count(), 6);
      await featured.getByRole("button", { name: "Scatter", exact: true }).click();
      await featured.getByRole("button", { name: "Gather", exact: true }).click();
      await featured.getByRole("button", { name: "Replay the details", exact: true }).click();
      await hero.getByRole("link", { name: /^Explore \d+ components$/ }).click();
      await page.waitForURL(url => url.pathname === new URL(`${base}/docs/`).pathname);
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
      row.checks.push("six named previews, live demo controls and real docs navigation");
      await currentAssembly(page);
      row.checks.push("native focus timer keyboard action and composite chat send/clear");
      const studio = page.locator("[data-shape-studio]");
      assert.equal(await studio.count(), 1, "Homepage uses one shared shape studio");
      assert.equal(await studio.locator("[data-studio-shape]").count(), 12);
      await studio.getByRole("button", { name: "Cushion", exact: true }).click();
      assert.equal(await studio.locator("[data-studio-art]").getAttribute("data-shape"), "cushion");
      await featured.getByRole("button", { name: "Open drawer", exact: true }).click();
      await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor({ state: "hidden" });
      await featured.getByRole("button", { name: "Done", exact: true }).click();
      assert.equal(await featured.locator('[data-slot="agent-state"]').getAttribute("data-status"), "complete");
      row.checks.push("live drawer and agent controls; one shared shape studio changes its actual contour");
      if (width < 801) {
        const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
        await trigger.focus(); await trigger.press("Enter");
        const link = page.locator(".story-mobile-nav").getByRole("link", { name: "Components", exact: true });
        await link.waitFor({ state: "visible" });
        assert(await link.evaluate(node => node === document.activeElement), "Keyboard opening focuses navigation");
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Open navigation", exact: true }).waitFor();
        assert(await page.getByRole("button", { name: "Open navigation", exact: true }).evaluate(node => node === document.activeElement));
        row.checks.push("mobile navigation keyboard focus and Escape return");
      }
      await page.evaluate(() => scrollTo(0, 0));
      row.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert(!row.overflow, "Homepage fits viewport");
      await page.screenshot({ path: path.join(output, `home-${filename}.png`), fullPage: true });
      await page.goto(`${base}/work-with-me/`, { waitUntil: "domcontentloaded" });
      assert.equal(await page.getByRole("link", { name: /Find me on GitHub/ }).getAttribute("href"), "https://github.com/luv-jeri");
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), "Creator page fits viewport");
      await page.screenshot({ path: path.join(output, `creator-${filename}.png`), fullPage: true });
      row.checks.push("creator route and GitHub contact");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await currentAssembly(page, true);
      row.checks.push("reduced motion keeps settled native controls and manual composition choices usable");
      assert.equal(errors.length, 0, errors.join("; "));
      row.pass = true;
    } catch (error) {
      row.pass = false; row.failure = error.message;
      await page.screenshot({ path: path.join(output, `failure-${filename}.png`), fullPage: true }).catch(() => {});
    } finally {
      results.push(row);
      await fs.writeFile(path.join(output, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
      console.log(JSON.stringify(row));
      await context.close();
    }
  }
} finally {
  await browser?.close();
  if (staticServer) await new Promise(resolve => staticServer.httpServer.close(resolve));
}
if (results.some(row => !row.pass)) process.exitCode = 1;
