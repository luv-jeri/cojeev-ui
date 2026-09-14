import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const started = performance.now(), errors = [], checks = [];
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const capture = (p, name) => p.screenshot({ path: new URL(`type-${name}.png`, import.meta.url).pathname });
const settle = p => p.waitForTimeout(800);
const visit = async p => {
  await p.goto("http://127.0.0.1:4345/?v=3");
  await p.locator(".type-feature").last().waitFor();
  await p.evaluate(() => document.fonts.ready);
  await settle(p);
};
const motionSample = p => p.evaluate(() => ({
  shape: document.querySelector(".type-letter-1 path")?.getAttribute("d"),
  float: getComputedStyle(document.querySelector(".type-o-motion")).translate,
  background: getComputedStyle(document.querySelector(".v-depth-background__piece")).transform,
}));
const noOverflow = async p => assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && scrollY === 0));
try {
  page.on("pageerror", e => errors.push(e.message));
  await visit(page);
  assert.equal(await page.locator(".type-feature").count(), 5);
  assert.equal(await page.locator("body").innerText().then(t => t.includes("A 30-day countdown")), false);
  await page.locator(".type-feature").first().hover();
  const moving = await motionSample(page);
  await page.waitForTimeout(1950);
  const after = await motionSample(page);
  for (const property of ["shape", "float", "background"]) assert.notEqual(after[property], moving[property], `${property} must move while another feature is selected`);
  const feature = page.locator(".type-feature").nth(2), body = feature.locator("[data-morph-body]");
  const resting = await body.getAttribute("d");
  await feature.hover(); await page.waitForTimeout(120);
  assert.notEqual(await body.getAttribute("d"), resting);
  assert.equal(await feature.locator("[data-slot=animated-icon]").first().getAttribute("data-animated"), "true");
  const icon = feature.locator("[data-slot=icon]").first();
  assert.notEqual(await icon.evaluate(e => getComputedStyle(e).stroke), "none");
  assert.notEqual(await icon.locator("[data-icon-part=glyph]").getAttribute("transform"), "translate(0 0)");
  await page.mouse.move(10, 100); await settle(page); await capture(page, "desktop");
  await feature.click(); await page.getByRole("dialog").waitFor(); await settle(page);
  assert.equal(await page.locator("#future-hooks").getAttribute("data-selected"), "true");
  assert.equal(await page.locator(".feature-detail").count(), 5);
  assert.ok(Math.abs((await page.getByRole("dialog").boundingBox()).height - 360) < 2);
  assert.ok((await page.locator(".tray-crown path").getAttribute("d")).includes("C"));
  assert.equal(await page.locator(".tray-scroll").evaluate(e => e.scrollHeight <= e.clientHeight), true);
  assert.equal(await page.locator(".type-background").getAttribute("data-quiet"), "true");
  await noOverflow(page); await capture(page, "footer-desktop");
  await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(await feature.evaluate(e => document.activeElement === e), true);
  const top = (await page.locator("h1").boundingBox()).y;
  await page.mouse.wheel(0, 160); await page.getByRole("dialog").waitFor(); await settle(page);
  assert.equal((await page.locator("h1").boundingBox()).y, top);
  await page.mouse.wheel(0, -180); await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Pause motion", exact: true }).click(); await settle(page);
  const paused = await motionSample(page); await page.waitForTimeout(1900); assert.deepEqual(await motionSample(page), paused);
  await page.getByRole("button", { name: "Resume motion", exact: true }).click();
  checks.push("all five feature labels and full descriptions", "continuous O path morph and drift with other features selected", "animated SVG background", "morphing feature controls and moving icon glyphs", "40dvh organic SVG footer", "stationary page, wheel reversal, Escape and focus return", "pause stops O and background");
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on("pageerror", e => errors.push(e.message));
  for (const [name, width, height] of [["mobile", 390, 844], ["narrow", 320, 667], ["landscape", 844, 390]]) {
    await mobile.setViewportSize({ width, height }); await visit(mobile); await noOverflow(mobile);
    const lastFeature = await mobile.locator(".type-feature").last().boundingBox();
    const footerTrigger = await mobile.locator(".footer-peek").boundingBox();
    assert.ok(lastFeature.y + lastFeature.height <= footerTrigger.y, `${name}: feature labels must not overlap the footer trigger`);
    await capture(mobile, name);
    await mobile.locator(".type-feature").last().tap(); await mobile.getByRole("dialog").waitFor(); await settle(mobile);
    assert.equal(await mobile.locator("#future-subagents").getAttribute("data-selected"), "true");
    assert.ok(Math.abs((await mobile.getByRole("dialog").boundingBox()).height - height * .4) < 2);
    const lastCopy = await mobile.locator("#future-subagents p").boundingBox();
    assert.ok(lastCopy.y >= height * .6 && lastCopy.y + lastCopy.height <= height, `${name}: last feature must be readable`);
    const close = await mobile.getByRole("button", { name: "Close features" }).boundingBox();
    assert.ok(close.y >= height * .6 && close.y + close.height <= height, `${name}: close control stays visible`);
    await capture(mobile, `footer-${name}`); await noOverflow(mobile);
    await mobile.keyboard.press("Escape"); await mobile.getByRole("dialog").waitFor({ state: "hidden" });
  }
  await mobile.emulateMedia({ reducedMotion: "reduce" }); await visit(mobile);
  const reduced = await motionSample(mobile); await mobile.waitForTimeout(1900); assert.deepEqual(await motionSample(mobile), reduced);
  checks.push("390px, 320px and short landscape layouts", "touch feature shortcuts and internally scrollable footer", "reduced motion keeps artwork still");
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
const report = { passed: true, checks, errors, checkSeconds: +((performance.now() - started) / 1000).toFixed(2) };
await writeFile(new URL("type-checks.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
