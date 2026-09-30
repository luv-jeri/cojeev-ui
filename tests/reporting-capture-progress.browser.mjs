import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

// Run against a served build: POLISH_URL=http://127.0.0.1:4320/cojeev-ui node --test tests/reporting-capture-progress.browser.mjs
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const STEPS = ["Reading the page", "Drawing the screenshot", "Ready to check"];
// 1x1 PNG. The route below answers it slowly so the assets phase stays observable.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const HOLD_MS = 4500;

let browser;
test.before(async () => { browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); });

const panel = page => page.getByRole("dialog", { name: "Request a feature or report a bug", exact: true });
const card = page => page.locator(".report-capture-card");

async function openPage(reducedMotion = "reduce") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion });
  await context.route(/^https?:\/\//, route => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.route(/t16-image-\d\.png/, async route => { await new Promise(resolve => setTimeout(resolve, HOLD_MS)); await route.fulfill({ status: 200, contentType: "image/png", body: PNG }).catch(() => {}); });
  await page.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Request a feature / Report a bug" }).click();
  await panel(page).waitFor();
  await panel(page).getByRole("tab", { name: "Report a bug", exact: true }).click();
  await page.evaluate(() => {
    for (let index = 0; index < 4; index += 1) {
      const image = document.createElement("img"); image.src = `t16-image-${index}.png?n=${Math.random()}`; image.width = 40; image.height = 40; image.alt = "";
      image.dataset.t16 = ""; document.body.prepend(image);
    }
  });
  return { context, page };
}

// Records every step name and every live-region text the card ever shows, before the click.
const record = page => page.evaluate(() => {
  const log = { steps: [], live: [] };
  window.__capture = log;
  const push = (list, value) => { if (value && list[list.length - 1] !== value) list.push(value); };
  const read = () => {
    const root = document.querySelector(".report-capture-card");
    if (!root) return;
    push(log.steps, root.querySelector('[aria-current="step"]')?.textContent?.trim());
    push(log.live, root.querySelector('[aria-live="polite"]')?.textContent?.trim());
  };
  new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
});

const start = async (page, mode) => {
  await record(page);
  if (mode === "area") {
    await page.getByRole("button", { name: "Select area", exact: true }).click();
    await page.getByRole("button", { name: "Capture area", exact: true }).click();
  } else await page.getByRole("button", { name: "Full page", exact: true }).click();
  await card(page).waitFor({ timeout: 30000 });
};
const isSubsequence = (seen, all) => { let at = 0; return seen.every(name => { at = all.indexOf(name, at); return at++ >= 0; }); };

test("capture_progress_dims_the_page_and_names_the_step", async () => {
  const { context, page } = await openPage();
  try {
    await start(page, "full");
    const scrim = await page.locator(".report-capture-scrim").evaluate(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      const alpha = (style.backgroundColor.match(/[\d.]+/g) ?? []).map(Number)[3] ?? 1;
      const drawerZ = Math.max(0, ...[...document.querySelectorAll('[data-slot^="motion-drawer"], [role="dialog"]')].filter(el => !node.contains(el))
        .map(el => Number.parseInt(getComputedStyle(el).zIndex, 10) || 0));
      return { chrome: Boolean(node.closest("[data-reporting-chrome]")), covers: box.width >= innerWidth && box.height >= innerHeight, alpha, z: Number.parseInt(style.zIndex, 10), drawerZ, blocks: style.pointerEvents !== "none" };
    });
    assert.ok(scrim.chrome, "scrim is inside [data-reporting-chrome]");
    assert.ok(scrim.covers, "scrim covers the viewport");
    assert.ok(scrim.alpha > 0, `background is translucent, alpha ${scrim.alpha}`);
    assert.ok(scrim.z > scrim.drawerZ, `scrim z ${scrim.z} above drawer z ${scrim.drawerZ}`);
    assert.ok(scrim.blocks, "scrim blocks the pointer");
    const text = await card(page).innerText();
    assert.match(text, /Capturing a screenshot/);
    assert.match(text, /Nothing is attached until you check the screenshot\./);
    assert.equal(await card(page).locator(".report-progress-bar").count(), 1);
    assert.equal(await page.getByText(/Still working/).count(), 0, "no elapsed line before 3 s");
    await page.getByText(/Still working · \d+s/).waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: "Cancel screenshot", exact: true }).click();
    await card(page).waitFor({ state: "detached" });
    const seen = await page.evaluate(() => window.__capture.steps);
    assert.equal(seen[0], STEPS[0]);
    assert.ok(isSubsequence(seen, STEPS), `steps ${JSON.stringify(seen)} are a monotonic subsequence`);

    await panel(page).waitFor();
    await record(page);
    await page.getByRole("button", { name: "Select area", exact: true }).click();
    await page.getByRole("button", { name: "Capture area", exact: true }).click();
    await card(page).waitFor({ timeout: 30000 });
    assert.match(await card(page).innerText(), /Capturing a screenshot/);
    assert.equal(await card(page).locator(".report-capture-steps li").count(), 3);
    assert.equal(await card(page).locator(".report-progress-bar").count(), 1);
    await page.getByRole("button", { name: "Cancel screenshot", exact: true }).click();
  } finally { await context.close(); }
});

test("capture_progress_is_announced", async () => {
  const { context, page } = await openPage();
  try {
    await start(page, "full");
    assert.equal(await card(page).locator('[aria-live="polite"]').count(), 1);
    assert.equal(await card(page).locator('[aria-live="polite"]').getAttribute("role"), "status");
    assert.equal(await card(page).locator(".report-help", { hasText: /Still working/ }).count() ? await card(page).locator(".report-help", { hasText: /Still working/ }).getAttribute("aria-live") : "off", "off");
    await page.getByText(/Still working · \d+s/).waitFor({ timeout: 15000 });
    assert.equal(await page.getByText(/Still working · \d+s/).getAttribute("aria-live"), "off");
    await card(page).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
    if (await card(page).count()) await page.getByRole("button", { name: "Cancel screenshot", exact: true }).click();
    const { steps, live } = await page.evaluate(() => window.__capture);
    assert.deepEqual(live, steps, "each step is announced once, in order");
    assert.ok(new Set(live).size === live.length);
  } finally { await context.close(); }
});

test("capture_progress_has_no_motion_when_reduced", async () => {
  const probe = async mode => {
    const { context, page } = await openPage(mode);
    try {
      await start(page, "full");
      return await card(page).evaluate(node => {
        const bar = node.querySelector(".report-progress-bar > span"), style = getComputedStyle(bar);
        return { running: node.getAnimations({ subtree: true }).filter(a => a.playState === "running").length, duration: style.animationDuration, name: style.animationName };
      });
    } finally { await context.close(); }
  };
  const reduced = await probe("reduce");
  assert.equal(reduced.running, 0);
  assert.ok(reduced.duration === "0s" || reduced.name === "none", `bar animation ${reduced.name} ${reduced.duration}`);
  const normal = await probe("no-preference");
  assert.ok(normal.running > 0, "the bar animates without the reduce preference, so this check can fail");
});

test("capture_progress_shows_all_three_steps", async () => {
  for (const mode of ["reduce", "no-preference"]) {
    const { context, page } = await openPage(mode);
    try {
      await page.evaluate(() => document.querySelectorAll("img[data-t16]").forEach(node => node.remove()));
      await start(page, "full");
      await card(page).waitFor({ state: "detached", timeout: 30000 });
      const seen = await page.evaluate(() => window.__capture.steps);
      assert.deepEqual(seen, STEPS, `${mode}: steps ${JSON.stringify(seen)}`);
    } finally { await context.close(); }
  }
});
