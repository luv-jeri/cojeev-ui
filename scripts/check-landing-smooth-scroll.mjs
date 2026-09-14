/** Focused landing-page smooth-scroll behavior and route-lifecycle proof. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";

const args = Object.fromEntries(process.argv.slice(2).map(argument => {
  const [name, ...value] = argument.replace(/^--/, "").split("=");
  return [name, value.join("=") || "true"];
}));
const staticServer = args.serve && !args.url ? await (await import("vite")).preview({
  configFile: false,
  base: "/cojeev-ui/",
  build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const address = staticServer?.httpServer.address();
const base = (args.url ?? `http://127.0.0.1:${address && typeof address === "object" ? address.port : 4320}/cojeev-ui`).replace(/\/$/, "");
const output = path.resolve(args.output ?? "artifacts/landing-smooth-scroll");
const report = { startedAt: new Date().toISOString(), base, checks: [] };
await fs.mkdir(output, { recursive: true });

async function record(name, run) {
  try {
    const evidence = await run();
    report.checks.push({ name, status: "PASS", evidence });
  } catch (error) {
    report.checks.push({ name, status: "FAIL", error: error.stack });
  }
}

const browser = await chromium.launch();
try {
  await record("wheel scroll interpolates and landing lifecycle stays route-scoped", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
    await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-landing-smooth-scroll]").waitFor();
    await page.locator("html.lenis").waitFor();
    assert.equal(await page.locator("html.lenis").count(), 1, "Landing page must mount one Lenis root");
    const frames = await page.evaluate(async () => {
      scrollTo(0, 0);
      const samples = [];
      dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaMode: 0, deltaY: 700 }));
      for (let frame = 0; frame < 12; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        samples.push({ at: performance.now(), y: scrollY });
      }
      return samples;
    });
    const positions = [...new Set(frames.map(frame => Math.round(frame.y)))];
    assert(positions[0] > 0, `Wheel must start scrolling: ${positions.join(", ")}`);
    assert(positions.length >= 4, `Scroll must advance through several rendered positions: ${positions.join(", ")}`);
    assert(positions[0] < 350, `Balanced smoothing must begin well before the wheel target: ${positions.join(", ")}`);
    assert(positions.some((value, index) => index > 0 && value > positions[index - 1]), `Scroll must advance over time: ${positions.join(", ")}`);
    await page.getByRole("link", { name: /^Explore \d+ components$/ }).click();
    await page.waitForURL(url => url.pathname.endsWith("/cojeev-ui/docs/"));
    assert.equal(await page.locator("html.lenis").count(), 0, "Documentation must return to native scrolling");
    assert.deepEqual(errors, [], "No landing or navigation runtime errors");
    await context.close();
    return { frames, positions, docsNative: true };
  });

  await record("landing anchor scroll reaches the requested section", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
    await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Meet the little parts/i }).click();
    await page.waitForFunction(() => location.hash === "#featured-components");
    await page.waitForFunction(() => Math.abs(document.querySelector("#featured-components").getBoundingClientRect().top) < 40);
    const top = await page.locator("#featured-components").evaluate(node => node.getBoundingClientRect().top);
    await context.close();
    return { hash: "#featured-components", top };
  });

  await record("reduced motion makes anchor navigation immediate", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Meet the little parts/i }).click();
    await page.waitForFunction(() => location.hash === "#featured-components", undefined, { polling: 10 });
    const evidence = await page.evaluate(() => ({
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      hash: location.hash,
      scrollY,
      top: document.querySelector("#featured-components").getBoundingClientRect().top,
    }));
    await page.waitForTimeout(34);
    evidence.scrollYAfterTwoFrames = await page.evaluate(() => scrollY);
    assert(evidence.reduced, "The browser must expose reduced motion");
    assert.equal(evidence.hash, "#featured-components");
    assert(Math.abs(evidence.top) < 40, `Reduced-motion anchor must settle immediately, got top=${evidence.top}`);
    assert.equal(evidence.scrollYAfterTwoFrames, evidence.scrollY, "Reduced-motion anchor must not continue interpolating");
    await context.close();
    return evidence;
  });
} finally {
  await browser.close();
}

const mobileBrowser = await webkit.launch();
try {
  await record("touch viewport keeps native page access and controls usable", async () => {
    const context = await mobileBrowser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
    await context.route(/https:\/\/(?:us|eu)\.i\.posthog\.com\//, route => route.fulfill({ status: 200, body: "1" }));
    await context.addInitScript(() => {
      window.__landingTouchStarts = 0;
      addEventListener("touchstart", () => window.__landingTouchStarts += 1, { capture: true, passive: true });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.locator("html.lenis").waitFor();
    assert.equal(await page.locator("html.lenis").count(), 1);
    await page.evaluate(() => scrollTo(0, 640));
    assert(await page.evaluate(() => scrollY > 0), "Touch viewport remains scrollable");
    await page.evaluate(() => scrollTo(0, 0));
    await page.getByRole("button", { name: "Open drawer", exact: true }).tap();
    await page.getByRole("dialog", { name: "A little room for ideas" }).waitFor();
    assert.deepEqual(errors, [], "No touch-viewport runtime errors");
    const evidence = await page.evaluate(() => ({
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      hover: matchMedia("(hover: hover)").matches,
      touchStarts: window.__landingTouchStarts,
    }));
    assert(evidence.coarsePointer && !evidence.hover && evidence.touchStarts > 0, `Expected a real touch interaction in a coarse, non-hover viewport: ${JSON.stringify(evidence)}`);
    await context.close();
    return evidence;
  });
} finally {
  await mobileBrowser.close();
  if (staticServer?.httpServer.listening) await new Promise((resolve, reject) => staticServer.httpServer.close(error => error ? reject(error) : resolve()));
}

report.finishedAt = new Date().toISOString();
report.status = report.checks.length === 4 && report.checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
await fs.writeFile(path.join(output, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
