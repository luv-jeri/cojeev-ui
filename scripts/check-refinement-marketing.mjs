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
  const assembly = page.locator('#assembly [data-slot="organism-assembly"]');
  const composition = assembly.locator('[data-slot="organism-composition"]');
  await assembly.scrollIntoViewIfNeeded();
  if (!reduced) await assembly.getByRole("button", { name: "Assemble", exact: true }).click();
  await ready(composition, "profile");
  const follow = composition.locator('[data-assembly-part="primary"]');
  await follow.focus();
  await follow.press("Enter");
  assert.equal(await follow.getAttribute("aria-pressed"), "true", "Profile follow works by keyboard");
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

async function shapeExport(page, name) {
  const workbench = page.locator(".shape-workbench-section");
  await workbench.getByRole("radio", { name: "Clover", exact: true }).click();
  await workbench.getByRole("radio", { name: "Blue", exact: true }).click();
  const artwork = workbench.locator('[data-slot="shape-artwork"]');
  assert.equal(await artwork.getAttribute("data-shape"), "clover-soft");
  assert.equal(await artwork.getAttribute("data-tone"), "blue");
  for (const label of ["Rotation", "Shadow direction", "Outline angle"]) {
    const slider = workbench.getByRole("slider", { name: label, exact: true });
    const before = Number(await slider.getAttribute("aria-valuenow"));
    await slider.focus(); await slider.press("ArrowRight");
    assert.equal(Number(await slider.getAttribute("aria-valuenow")), before + 1, `${label} has keyboard control`);
  }
  await workbench.getByRole("switch", { name: "Solid fill", exact: true }).click();
  assert.equal(await artwork.locator('[data-artwork-layer="fill"] path').getAttribute("fill"), "none");
  await workbench.getByRole("switch", { name: "Cast shadow", exact: true }).click();
  assert.equal(await artwork.locator('[data-artwork-layer="shadow"]').count(), 0);
  assert(await workbench.getByRole("slider", { name: "Shadow direction", exact: true }).evaluate(node => node.closest('[data-slot="slider"]').hasAttribute("data-disabled") && node.tabIndex < 0), "Removed shadow disables its angle control");
  const outline = workbench.getByRole("switch", { name: "Rear outline", exact: true });
  await outline.click();
  assert.equal(await artwork.locator('[data-artwork-layer="echo"]').count(), 0);
  await outline.click();
  const code = await workbench.locator('[data-slot="code-block"] code').innerText();
  for (const setting of ['name={"clover-soft"}', 'tone={"blue"}', "rotation={1}", "filled={false}", "shadow={false}", "echoAngle={-17}"]) {
    assert(code.includes(setting), `React export retains ${setting}`);
  }
  const downloadEvent = page.waitForEvent("download");
  await workbench.getByRole("button", { name: "Download SVG", exact: true }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "cojeev-clover-soft.svg");
  const file = path.join(output, `${name}-clover.svg`);
  await download.saveAs(file);
  const svg = await fs.readFile(file, "utf8");
  const parity = await artwork.evaluate((node, source) => {
    const exported = new DOMParser().parseFromString(source, "image/svg+xml");
    const layers = svg => [...svg.querySelectorAll("[data-artwork-layer]")].map(layer => ({
      name: layer.getAttribute("data-artwork-layer"), transform: layer.getAttribute("transform"),
      outlined: layer.querySelector("path").getAttribute("fill") === "none",
    }));
    return { live: layers(node), exported: layers(exported), valid: exported.documentElement.localName === "svg" && !exported.querySelector("parsererror"), portable: !source.includes("var(--") };
  }, svg);
  assert(parity.valid && parity.portable, "Downloaded SVG is standalone and uses resolved palette colors");
  assert.deepEqual(parity.exported, parity.live, "Export retains the displayed layers and angles");
  await workbench.getByText("SVG download started. All selected layers and palette colors are included.", { exact: true }).waitFor();
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
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const row = { engine: engine.name(), width, theme, errors, checks: [] };
    const filename = `${engine.name()}-${width}-${theme}`;
    try {
      await page.goto(`${base}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const hero = page.locator(".studio-hero");
      await hero.getByRole("button", { name: "Give me a nudge", exact: true }).click();
      await hero.getByRole("button", { name: "Again? 1", exact: true }).waitFor();
      const motion = hero.getByRole("switch", { name: "Background motion", exact: true });
      await motion.click(); assert.equal(await hero.getAttribute("data-playing"), "false");
      await motion.click(); assert.equal(await hero.getAttribute("data-playing"), "true");
      const explore = hero.getByRole("link", { name: "Explore the library", exact: true });
      await explore.click();
      await page.waitForURL(url => url.pathname === new URL(`${base}/docs/`).pathname);
      await page.goto(`${base}/`, { waitUntil: "networkidle" });
      row.checks.push("native hero press, background motion and real docs navigation");
      await currentAssembly(page);
      row.checks.push("native profile keyboard action and composite chat send/clear");
      await shapeExport(page, filename);
      row.checks.push("shape and palette selection, keyboard angles, removable layers and real SVG/React export");
      await page.getByRole("radio", { name: "Done", exact: true }).click();
      assert.equal(await page.locator('.studio-motion [data-slot="agent-state"]').getAttribute("data-status"), "complete");
      row.checks.push("agent motion control");
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
      await page.goto(`${base}/work-with-me/`, { waitUntil: "networkidle" });
      assert.equal(await page.getByRole("link", { name: /Find me on GitHub/ }).getAttribute("href"), "https://github.com/luv-jeri");
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), "Creator page fits viewport");
      await page.screenshot({ path: path.join(output, `creator-${filename}.png`), fullPage: true });
      row.checks.push("creator route and GitHub contact");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${base}/`, { waitUntil: "networkidle" });
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
