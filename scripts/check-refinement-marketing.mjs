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
  await composition.first().evaluate((node, expected) => new Promise((resolve, reject) => {
    const started = performance.now();
    const check = () => {
      if (node.dataset.kind === expected && node.dataset.settled === "true" && node.dataset.assembled === "true") resolve(true);
      else if (performance.now() - started > 10000) reject(new Error(`Assembly did not settle as ${expected}`));
      else setTimeout(check, 40);
    };
    check();
  }), kind);
}

async function currentAssembly(page, base, reduced = false) {
  await page.goto(`${base}/docs/organism-assembly/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
  const assembly = page.locator('[data-example-role="interactive"] [data-slot="organism-assembly"]');
  const composition = assembly.locator('[data-slot="organism-composition"]');
  // The documentation example opens as loose parts and animates its own height on arrival;
  // let it come to rest before driving its transport, then take the same journey.
  await assembly.evaluate(node => node.scrollIntoView({ block: "center" }));
  await composition.first().waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector('[data-example-role="interactive"] [data-slot="organism-composition"]')?.dataset.settled === "true");
  const assemble = assembly.getByRole("button", { name: "Assemble", exact: true });
  // Quiet mode keeps the parts assembled and disables the transport, so only drive it when it can run.
  if (await assemble.count() && await assemble.isEnabled()) await assemble.click();
  await assembly.getByRole("button", { name: "Focus", exact: true }).click();
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
      const stage = page.locator("[data-profile-stage]");
      const featured = page.locator("#featured-components");
      const shown = async () => featured.locator("[data-featured-component]:not([hidden])").count();
      assert.equal(await shown(), 4, "The gallery shows one filtered shelf of four");
      await stage.getByRole("button", { name: "Fold", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("[data-profile-stage]")?.dataset.treatment === "fold");
      assert.equal(await stage.getByRole("button", { name: "Fold", exact: true }).getAttribute("aria-pressed"), "true");
      await featured.getByRole("button", { name: "Motion", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "motion");
      assert.equal(await shown(), 4, "A filter swaps the shelf rather than emptying it");
      await featured.getByRole("button", { name: "Replay the details", exact: true }).click();
      await featured.getByRole("button", { name: "Done", exact: true }).click();
      assert.equal(await featured.locator('[data-slot="agent-state"]').getAttribute("data-status"), "complete");
      await featured.getByRole("button", { name: "Open drawer", exact: true }).click();
      await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor({ state: "hidden" });
      await featured.getByRole("button", { name: "Featured", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("#featured-components")?.dataset.filter === "featured");
      assert.equal(await stage.getAttribute("data-treatment"), "fold", "Filtering the gallery must not reset the stage");
      row.checks.push("one live profile stage, four filtered previews and live demo controls");
      await hero.getByRole("link", { name: /^Explore \d+ components$/ }).click();
      await page.waitForURL(url => url.pathname === new URL(`${base}/docs/`).pathname);
      row.checks.push("real docs navigation from the homepage");
      // The assembly opening and the shape studio now live on their own documentation pages.
      await currentAssembly(page, base);
      row.checks.push("native focus timer keyboard action and composite chat send/clear");
      await page.goto(`${base}/docs/shape/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
      const studio = page.locator("[data-shape-studio]");
      assert.equal(await studio.count(), 1, "Documentation keeps one shared shape studio");
      assert.equal(await studio.locator("[data-studio-shape]").count(), 12);
      await studio.getByRole("button", { name: "Cushion", exact: true }).click();
      // The studio renders the chosen contour on its own commit; read the state it settles on.
      await page.waitForFunction(() => document.querySelector("[data-shape-studio] [data-studio-art]")?.dataset.shape === "cushion", null, { timeout: 5000 }).catch(() => {});
      assert.equal(await studio.locator("[data-studio-art]").getAttribute("data-shape"), "cushion");
      row.checks.push("one shared shape studio changes its actual contour");
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
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
      await currentAssembly(page, base, true);
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(document.querySelector(".v-morph-live")));
      assert.equal(await page.locator("[data-profile-stage]").getAttribute("data-phase"), "settled", "Quiet mode renders the settled stage immediately");
      assert(await page.getByRole("button", { name: "Replay assembly", exact: true }).isDisabled(), "Quiet mode disables a replay that cannot run");
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
