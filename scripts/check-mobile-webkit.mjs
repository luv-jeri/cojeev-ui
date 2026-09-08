/** Bounded Safari-engine smoke check; does not claim physical iPhone coverage. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { webkit, devices } from "playwright";
import { PNG } from "pngjs";
import { preview as startPreview } from "vite";

const args = Object.fromEntries(process.argv.slice(2).map(argument => { const [name, ...value] = argument.replace(/^--/, "").split("="); return [name, value.join("=") || "true"]; }));
const staticServer = args.serve && !args.url ? await startPreview({
  configFile: false,
  base: "/sahajiv-ui/",
  build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
async function closeStaticServer() {
  if (staticServer?.httpServer.listening) await new Promise((resolve, reject) => staticServer.httpServer.close(error => error ? reject(error) : resolve()));
}
const address = staticServer?.httpServer.address();
const base = (args.url || `http://127.0.0.1:${address && typeof address === "object" ? address.port : 4320}/sahajiv-ui`).replace(/\/$/, "");
const output = path.resolve(args.output || `output/playwright/mobile-webkit-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
function revision() {
  if (!args.checkout) return null;
  const checkout = path.resolve(args.checkout);
  const head = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const diff = execFileSync("git", ["-C", checkout, "diff", "--", "app", "components", "registry/sahajiv"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return { head, dirty: !!diff, dirtyDiffSHA256: createHash("sha256").update(diff).digest("hex") };
}
const report = { startedAt: new Date().toISOString(), url: base, revisionStart: revision(), scope: { engine: "WebKit", viewport: { width: 390, height: 844 }, mobile: true, touch: true, physicalDevice: false }, cases: [] };
const browser = await webkit.launch({ headless: true }).catch(async error => { await closeStaticServer(); throw error; });
report.browserVersion = browser.version();
async function checkText(locator, value) {
  await locator.getByText(value, { exact: false }).first().waitFor({ state: "visible" });
}
async function attribute(locator, name, value) {
  await locator.evaluate((element, { name, value }) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { observer.disconnect(); reject(new Error(`Expected ${name}=${value}, got ${element.getAttribute(name)}`)); }, 5000);
    const check = () => { if (element.getAttribute(name) === value) { clearTimeout(timeout); observer.disconnect(); resolve(); } };
    const observer = new MutationObserver(check); observer.observe(element, { attributes: true }); check();
  }), { name, value });
}
async function go(page, pathname) {
  const response = await page.goto(`${base}${pathname}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);
}
async function example(page, id) {
  await go(page, `/docs/${id}/`);
  const preview = page.locator('[data-slot="preview"]').first();
  await preview.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
  await preview.getByRole("tab", { name: "Code", exact: true }).tap();
  await preview.locator("pre").first().waitFor();
  await preview.getByRole("tab", { name: "Preview", exact: true }).tap();
  const root = page.locator(`[data-example="${id}"]`).first();
  await root.waitFor();
  return root;
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    for (let pass = 0; pass < 10; pass++) {
      await frame(); await frame();
      const finite = document.getAnimations().filter(animation => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime));
      if (!finite.length) return;
      await Promise.race([
        Promise.allSettled(finite.map(animation => animation.finished)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Finite layout animations did not settle within 5 seconds")), 5000)),
      ]);
    }
    throw new Error("Finite layout animations kept restarting");
  });
}
async function startLayoutObservation(page) {
  await page.evaluate(() => {
    const observation = { viewport: innerWidth, maximumDocumentWidth: document.documentElement.scrollWidth, frames: 0, overflowFrames: 0, maximumContributors: [] };
    window.__webkitLayoutObservation = observation;
    const sample = () => {
      observation.frames++;
      const width = document.documentElement.scrollWidth;
      if (width > innerWidth + 1) observation.overflowFrames++;
      if (width > observation.maximumDocumentWidth) {
        observation.maximumDocumentWidth = width;
        observation.maximumContributors = [...document.querySelectorAll("svg.v-morph")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => {
          const rect = element.getBoundingClientRect(); const host = element.parentElement; const hostRect = host.getBoundingClientRect();
          return { svg: { width: rect.width, right: rect.right, inlineWidth: element.style.width }, host: { slot: host.dataset.slot, text: host.textContent.slice(0,80), width: hostRect.width, right: hostRect.right }, animation: getComputedStyle(host).animationName };
        });
      }
      window.__webkitLayoutFrame = requestAnimationFrame(sample);
    };
    sample();
  });
}
async function endLayoutObservation(page) {
  await settle(page);
  const observation = await page.evaluate(() => { cancelAnimationFrame(window.__webkitLayoutFrame); return window.__webkitLayoutObservation; });
  assert(observation.maximumDocumentWidth <= observation.viewport + 1, `Transient horizontal overflow: ${JSON.stringify(observation)}`);
  return observation;
}
async function layout(page) {
  await settle(page);
  const measured = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, touchPoints: navigator.maxTouchPoints, coarsePointer: matchMedia("(pointer: coarse)").matches }));
  assert(measured.documentWidth <= measured.viewport + 1, `Horizontal overflow: ${measured.documentWidth} > ${measured.viewport}`);
  return measured;
}
const cases = {
  "home-and-getting-started": async page => {
    await go(page, "/");
    await page.getByRole("heading", { level: 1, name: /Make it\s*feel\s*alive\s*\./ }).waitFor();
    const homeLayout = await layout(page);
    await page.screenshot({ path: path.join(output, "home-390.png"), fullPage: true });
    await page.locator(".studio-hero").getByRole("link", { name: "Explore the library", exact: true }).tap();
    await page.waitForURL(/\/docs\/?$/);
    await page.getByRole("navigation", { name: "Start exploring" }).getByRole("link", { name: "Explore components" }).tap();
    await page.waitForURL(/\/docs\/button\/?$/);
    await page.locator('[data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached" });
    await page.getByRole("button", { name: "Browse", exact: true }).tap();
    await startLayoutObservation(page);
    await page.getByRole("link", { name: "Getting started", exact: true }).tap();
    await page.waitForURL(/\/docs\/?$/);
    await page.getByRole("heading", { name: "Make it yours.", exact: true }).waitFor();
    assert((await page.locator('[data-slot="code-block"] code').first().textContent()).includes("shadcn"));
    assert.equal(await page.getByRole("link", { name: "Source on GitHub" }).getAttribute("href"), "https://github.com/luv-jeri/sahajiv-ui");
    const navigationLayout = await endLayoutObservation(page);
    const startedLayout = await layout(page);
    await page.screenshot({ path: path.join(output, "getting-started-390.png"), fullPage: true });
    await page.getByRole("navigation", { name: "Start exploring" }).getByRole("link", { name: "Explore components" }).tap();
    await page.waitForURL(/\/docs\/button\/?$/);
    return { detail: "Home and getting-started render; main component links and mobile navigation work by touch", homeLayout, startedLayout, navigationLayout };
  },
  button: async page => {
    const root = await example(page, "button");
    await root.getByRole("button", { name: "Add a note", exact: true }).tap();
    await checkText(root, "Running the local example…");
    assert(await root.getByRole("button", { name: "Adding…", exact: true }).isDisabled());
    await checkText(root, "1 note added in this example.");
    await root.getByLabel("Example outcome", { exact: true }).selectOption("error");
    await root.getByRole("button", { name: "Add a note", exact: true }).tap();
    await checkText(root, "The example action failed.");
    await root.getByLabel("Example outcome", { exact: true }).selectOption("success");
    await root.getByRole("button", { name: "Retry example", exact: true }).tap();
    await checkText(root, "2 notes added in this example.");
    return { detail: "Touch success, pending disabled state, visible local error, and retry", layout: await layout(page) };
  },
  tabs: async page => {
    const root = await example(page, "tabs");
    for (const [label, content] of [["Ideas", "8 ideas taking shape"], ["Reading", "4 things to read"], ["Notes", "12 useful notes"]]) {
      const tab = root.getByRole("tab", { name: label, exact: true });
      await tab.tap(); await attribute(tab, "aria-selected", "true"); await checkText(root, content);
    }
    return { detail: "Touch selects all three tabs and shows the matching content", layout: await layout(page) };
  },
  "motion-settings": async page => {
    await example(page, "button");
    await page.locator('[data-slot="preview"]').first().getByRole("button", { name: "Motion settings", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Make it feel right" });
    await dialog.waitFor();
    const controls = dialog.locator('[data-slot="motion-controls"]');
    const names = ["Glide", "Stretch", "Jelly", "Comet", "Ink drop", "Rubber", "Pebble", "Ripple", "Halo"];
    for (const name of names) {
      const choice = controls.getByRole("button", { name, exact: true });
      await choice.tap(); await attribute(choice, "aria-pressed", "true");
    }
    const activity = controls.getByRole("tab", { name: "Activity", exact: true });
    await activity.tap(); await attribute(activity, "aria-selected", "true");
    const enabled = controls.getByRole("switch", { name: "Enable motion", exact: true });
    await enabled.tap(); await attribute(enabled, "aria-checked", "false");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("v-motion")).mode), "off");
    await enabled.tap(); await attribute(enabled, "aria-checked", "true");
    await settle(page);
    const panelLayout = await dialog.evaluate(element => ({ width: element.getBoundingClientRect().width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, scrollLeft: element.scrollLeft }));
    assert(panelLayout.scrollWidth <= panelLayout.clientWidth + 1, `Motion panel internal overflow: ${JSON.stringify(panelLayout)}`);
    assert.equal(panelLayout.scrollLeft, 0, "Motion controls must not pan the panel horizontally");
    await page.screenshot({ path: path.join(output, "motion-settings-open-390.png") });
    await startLayoutObservation(page);
    await dialog.getByRole("button", { name: "Close motion settings", exact: true }).tap();
    await dialog.waitFor({ state: "hidden" });
    return { detail: "All nine motion choices respond; real preview, global Off, and touch close work", choices: names, panelLayout, closeLayout: await endLayoutObservation(page), layout: await layout(page) };
  },
  "multi-select": async page => {
    const root = await example(page, "multi-select");
    const trigger = root.getByRole("button", { name: "Shared workspaces", exact: true });
    await trigger.tap();
    const search = page.getByRole("searchbox", { name: "Search Shared workspaces", exact: true });
    await search.fill("Workspace 24");
    const option = page.getByRole("checkbox", { name: "Workspace 24", exact: true });
    await option.tap(); await attribute(option, "aria-checked", "true");
    await page.screenshot({ path: path.join(output, "multi-select-open-390.png") });
    await page.keyboard.press("Escape", { delay: 60 });
    await search.waitFor({ state: "hidden" });
    assert(await trigger.evaluate(element => element === document.activeElement));
    await checkText(trigger, "2 selected");
    await root.getByRole("list", { name: "Selected Shared workspaces", exact: true }).getByText("Workspace 24", { exact: true }).waitFor();
    return { detail: "Touch open/search/select; Escape dismisses and restores trigger focus", layout: await layout(page) };
  },
  "shape-scene": async page => {
    const root = await example(page, "shape-scene");
    const scene = root.locator('[data-slot="shape-scene"]');
    await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => ["webgl", "fallback"].includes(document.querySelector('[data-example="shape-scene"] [data-slot="shape-scene"]')?.getAttribute("data-renderer")), undefined, { timeout: 30000 });
    const renderer = await scene.getAttribute("data-renderer");
    let colors = null;
    if (renderer === "webgl") {
      const pixels = PNG.sync.read(await scene.locator("canvas").screenshot());
      const unique = new Set(); for (let offset = 0; offset < pixels.data.length; offset += 64) unique.add(pixels.data.subarray(offset, offset + 4).toString("hex"));
      colors = unique.size; assert(colors > 40, "WebGL sculpture must have real shaded pixels");
    } else {
      assert.equal(await scene.locator('[data-slot="shape-scene-fallback"] [data-slot="shape"]').count(), 6);
      assert.equal(await scene.getAttribute("aria-description"), "3D is unavailable. Showing the static composition.");
    }
    const initialShapes = await scene.locator('[data-slot="shape-scene-fallback"]').innerHTML();
    await root.getByRole("button", { name: "Change the shapes", exact: true }).tap();
    assert.notEqual(await scene.locator('[data-slot="shape-scene-fallback"]').innerHTML(), initialShapes);
    await scene.scrollIntoViewIfNeeded();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(250);
    const draws = await page.evaluate(() => window.__webkitSceneDraws);
    const canHover = await page.evaluate(() => matchMedia("(any-hover: hover) and (any-pointer: fine)").matches);
    if (renderer === "webgl" && !canHover) {
      // WebKit can synthesize mouse movement after a touch. A touch-only
      // device must not start the independent hover-tilt animation.
      const box = await scene.boundingBox();
      await scene.dispatchEvent("pointermove", { pointerType: "mouse", clientX: box.x + box.width - 1, clientY: box.y + 1 });
    }
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__webkitSceneDraws), draws, "Quiet sculpture must stop WebGL draws");
    await scene.screenshot({ path: path.join(output, "shape-scene-390.png") });
    return { detail: "Supported 3D output, touch composition change, quiet rendering and compatibility mouse rejection checked", renderer, shadedColors: colors, canHover, pausedDrawCount: draws, layout: await layout(page) };
  },
  marquee: async page => {
    const root = await example(page, "marquee");
    const marquee = root.locator('[data-slot="marquee"]');
    await root.getByRole("button", { name: "Pause motion", exact: true }).tap();
    await attribute(marquee, "data-motion", "paused");
    const track = marquee.locator('[data-slot="marquee-track"]');
    const first = await track.evaluate(element => getComputedStyle(element).transform);
    await page.waitForTimeout(300);
    assert.equal(await track.evaluate(element => getComputedStyle(element).transform), first);
    await root.getByRole("button", { name: "Resume motion", exact: true }).tap();
    await root.getByRole("button", { name: "Pause motion", exact: true }).waitFor();
    await root.getByRole("button", { name: "Pause motion", exact: true }).tap();
    await attribute(marquee, "data-motion", "paused");
    return { detail: "Touch pause freezes the actual track; resume and repeated pause remain operable", layout: await layout(page) };
  },
};
try {
  for (const [id, test] of Object.entries(cases)) {
    if (args.ids && !args.ids.split(",").includes(id)) continue;
    const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, colorScheme: "light", reducedMotion: "no-preference" });
    await context.addInitScript(() => {
      localStorage.setItem("sahajiv-docs-theme", "light");
      window.__webkitSceneDraws = 0;
      window.__webkitInput = { pointerTypes: [], touchStarts: 0 };
      addEventListener("pointerdown", event => { if (!window.__webkitInput.pointerTypes.includes(event.pointerType)) window.__webkitInput.pointerTypes.push(event.pointerType); }, true);
      addEventListener("touchstart", () => { window.__webkitInput.touchStarts++; }, { capture: true, passive: true });
      if (typeof WebGL2RenderingContext !== "undefined") for (const name of ["drawElements", "drawArrays"]) {
        const original = WebGL2RenderingContext.prototype[name];
        WebGL2RenderingContext.prototype[name] = function (...values) { window.__webkitSceneDraws++; return original.apply(this, values); };
      }
    });
    const page = await context.newPage(); page.setDefaultTimeout(8000);
    const errors = []; const consoleErrors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const record = { id, startedAt: new Date().toISOString(), revision: revision() };
    try {
      Object.assign(record, await test(page));
      assert.deepEqual(errors, [], "No browser page errors");
      assert.deepEqual(consoleErrors, [], "No browser console errors");
      await page.screenshot({ path: path.join(output, `${id}-390.png`) });
      record.status = "PASS";
    } catch (error) {
      record.status = "FAIL"; record.error = error.message;
      await page.screenshot({ path: path.join(output, `${id}-failure.png`) }).catch(() => {});
    } finally {
      record.input = await page.evaluate(() => window.__webkitInput).catch(() => null);
      record.errors = errors; record.consoleErrors = consoleErrors; record.finishedAt = new Date().toISOString();
      report.cases.push(record);
      fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
      console.log(JSON.stringify(record));
      await context.close();
    }
  }
} finally {
  await browser.close(); await closeStaticServer(); report.finishedAt = new Date().toISOString(); report.revisionEnd = revision();
  report.runtimeSeconds = (Date.parse(report.finishedAt) - Date.parse(report.startedAt)) / 1000;
  report.status = report.cases.length && report.cases.every(record => record.status === "PASS") ? "PASS" : "FAIL";
  fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status, cases: report.cases.length, runtimeSeconds: report.runtimeSeconds, output }));
  if (report.status !== "PASS") process.exitCode = 1;
}
