import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// Focused check for C08-1: area selection, visible capture lifecycle, cancellation and redaction.
// It needs only a running site — no reporting Worker, no admin token, no attachment delivery.
const base = process.env.CAPTURE_BROWSER_URL ?? "http://127.0.0.1:3177/cojeev-ui";
const output = process.env.CAPTURE_BROWSER_OUTPUT ?? ".work/reporting/capture";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [], results = [], pageErrors = [], timings = {};
let activePage;
const panel = page => page.getByRole("dialog", { name: "Request a feature or report a bug", exact: true });
const areaDialog = page => page.getByRole("dialog", { name: "Select area", exact: true });
const review = page => page.getByRole("heading", { name: "Review your screenshot", exact: true });
const localOnly = context => context.route(/^https?:\/\//, route =>
  ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const openBug = async page => {
  await page.getByRole("button", { name: "Request a feature or report a bug" }).click();
  await panel(page).waitFor();
  await page.getByRole("button", { name: "Clear draft", exact: true }).waitFor();
  await panel(page).getByRole("tab", { name: "Report a bug", exact: true }).click();
};
const captureShape = page => page.locator(".report-crop img").evaluate(img => {
  const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const context = canvas.getContext("2d"); context.drawImage(img, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let magenta = 0;
  for (let index = 0; index < pixels.length; index += 4) if (pixels[index] === 255 && pixels[index + 1] === 0 && pixels[index + 2] === 255) magenta++;
  return { width: img.naturalWidth, height: img.naturalHeight, magenta };
});
const sandboxes = page => page.evaluate(() => document.querySelectorAll('iframe[id^="__SANDBOX__"]').length);

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await localOnly(context);
  const page = await context.newPage(); activePage = page;
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" });
  await openBug(page);

  const bugButtons = await panel(page).getByRole("button").allInnerTexts();
  assert.ok(bugButtons.some(label => label.includes("Select area")), "Select area replaces This view");
  assert.ok(!bugButtons.some(label => label.includes("This view")), "This view is gone");
  assert.ok(bugButtons.some(label => label.includes("Full page")), "Full page is retained");
  results.push("Bug attachments offer Select area and Full page; This view is gone");

  await page.evaluate(() => {
    const spacer = document.createElement("div"); spacer.id = "capture-spacer"; spacer.style.height = "12000px"; document.body.append(spacer);
    const secret = document.createElement("div"); secret.id = "capture-private"; secret.dataset.private = "";
    secret.style.cssText = "position:fixed;left:60px;top:120px;width:200px;height:200px;background:rgb(255,0,255);z-index:40";
    secret.textContent = "PRIVATE TEST"; document.body.append(secret);
  });

  // Keyboard: the picker opens on a valid default rectangle the toolbar fields can adjust.
  await page.getByRole("button", { name: "Select area", exact: true }).click();
  await areaDialog(page).waitFor();
  assert.equal(await panel(page).count(), 0, "The drawer closes so it cannot cover the chosen area");
  await areaDialog(page).focus();
  for (const value of ["40", "60", "520", "360"]) {
    await page.keyboard.press("Tab");
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(value);
  }
  await page.getByText("Area 520 × 360 px", { exact: true }).waitFor();
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  const keyboardStart = Date.now();
  await page.keyboard.press("Enter");
  await review(page).waitFor({ timeout: 60000 });
  timings.keyboardAreaMs = Date.now() - keyboardStart;
  const keyboardShape = await captureShape(page);
  assert.deepEqual({ width: keyboardShape.width, height: keyboardShape.height }, { width: 520, height: 360 });
  assert.equal(keyboardShape.magenta, 0, "A data-private region overlapping the rectangle must not be rendered");
  assert.equal(await sandboxes(page), 0, "The capture sandbox iframe is destroyed");
  await page.screenshot({ path: `${output}/area-review-desktop-light.png` });
  await page.getByRole("button", { name: "Discard screenshot", exact: true }).click();
  results.push(`Keyboard-only rectangle capture produced a 520×360 screenshot with the private region excluded (${timings.keyboardAreaMs}ms)`);

  // Pointer: dragging on the overlay draws the rectangle that is captured.
  await page.getByRole("button", { name: "Select area", exact: true }).click();
  await areaDialog(page).waitFor();
  await page.mouse.move(300, 200); await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 8 }); await page.mouse.move(700, 440, { steps: 8 });
  await page.mouse.up();
  await page.getByText("Area 400 × 240 px", { exact: true }).waitFor();
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  await page.screenshot({ path: `${output}/area-picker-desktop-dark.png` });
  const pointerStart = Date.now();
  await page.getByRole("button", { name: "Capture area", exact: true }).click();
  await review(page).waitFor({ timeout: 60000 });
  timings.pointerAreaMs = Date.now() - pointerStart;
  const pointerShape = await captureShape(page);
  assert.deepEqual({ width: pointerShape.width, height: pointerShape.height }, { width: 400, height: 240 });
  await page.getByRole("button", { name: "Discard screenshot", exact: true }).click();
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  results.push(`Pointer-drawn rectangle captured at its drawn size (${timings.pointerAreaMs}ms)`);

  // Escape leaves the picker without capturing and returns a usable form.
  await page.getByRole("button", { name: "Select area", exact: true }).click();
  await areaDialog(page).waitFor();
  await page.keyboard.press("Escape");
  await panel(page).waitFor();
  assert.equal(await review(page).count(), 0);
  assert.equal(await page.getByRole("dialog", { name: "Capturing a screenshot", exact: true }).count(), 0);
  results.push("Escape closes the picker, captures nothing and restores the report form");

  // Full page still works, shows live status, and Cancel attaches nothing.
  // The page is made deliberately heavy so the cancel lands while cloning is still running.
  await page.evaluate(() => {
    // Many nodes, little height: the page must stay inside the existing full-page size guard.
    const heavy = document.createElement("div"); heavy.id = "capture-heavy";
    heavy.style.cssText = "display:flex;flex-wrap:wrap;gap:1px";
    for (let index = 0; index < 6000; index += 1) {
      const cell = document.createElement("span"); cell.textContent = String(index % 10);
      cell.style.cssText = "width:18px;height:12px;font-size:9px;border:1px solid #cccccc";
      heavy.append(cell);
    }
    document.body.append(heavy);
  });
  const attachmentsBefore = await page.locator(".report-attachments figure").count();
  await page.getByRole("button", { name: "Full page", exact: true }).click();
  const status = page.getByRole("dialog", { name: "Capturing a screenshot", exact: true });
  await status.waitFor({ timeout: 30000 });
  assert.match(await status.innerText(), /elapsed/, "Elapsed seconds are shown beside the capture");
  assert.ok(await page.evaluate(() => document.activeElement?.textContent?.includes("Cancel screenshot")), "Cancel screenshot takes focus so it is keyboard reachable");
  await page.screenshot({ path: `${output}/capture-status-desktop-light.png` });
  await page.keyboard.press("Escape");
  await status.waitFor({ state: "detached" });
  await panel(page).waitFor();
  await page.waitForTimeout(3000);
  assert.equal(await review(page).count(), 0, "A cancelled capture never reaches review");
  assert.equal(await page.locator(".report-attachments figure").count(), attachmentsBefore, "A cancelled capture attaches nothing");
  assert.equal(await sandboxes(page), 0, "Cancelling releases the capture sandbox");
  await page.getByLabel("What went wrong?", { exact: true }).fill("The form is still usable after cancelling");
  assert.equal(await page.getByLabel("What went wrong?", { exact: true }).inputValue(), "The form is still usable after cancelling");
  await page.evaluate(() => { document.getElementById("capture-heavy")?.remove(); });
  results.push("Full page reports live status with elapsed seconds; keyboard Cancel discards it, attaches nothing and leaves the form usable");

  const fullStart = Date.now();
  await page.getByRole("button", { name: "Full page", exact: true }).click();
  await review(page).waitFor({ timeout: 90000 });
  timings.fullPageMs = Date.now() - fullStart;
  const fullShape = await captureShape(page);
  assert.ok(fullShape.height > 1000, "Full page extends beyond the viewport");
  assert.equal(fullShape.magenta, 0, "Full page still excludes the private region");
  await page.getByRole("button", { name: "Discard screenshot", exact: true }).click();
  await page.evaluate(() => { document.getElementById("capture-spacer")?.remove(); document.getElementById("capture-private")?.remove(); });
  results.push(`Full page capture still renders past the viewport and redacts private regions (${timings.fullPageMs}ms)`);
  assert.deepEqual(pageErrors, []);
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await localOnly(mobile);
  const mobilePage = await mobile.newPage(); activePage = mobilePage;
  mobilePage.on("pageerror", error => pageErrors.push(error.message));
  await mobilePage.goto(`${base}/requests/`, { waitUntil: "domcontentloaded" });
  await mobilePage.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  await openBug(mobilePage);
  await mobilePage.getByRole("button", { name: "Select area", exact: true }).click();
  await areaDialog(mobilePage).waitFor();
  assert.ok(await mobilePage.evaluate(() => {
    const toolbar = document.querySelector(".report-picker-toolbar");
    return toolbar.scrollWidth <= innerWidth && toolbar.getBoundingClientRect().right <= innerWidth + 1;
  }), "The picker toolbar fits a 390px viewport");
  await mobilePage.screenshot({ path: `${output}/area-picker-mobile-dark.png` });
  const mobileStart = Date.now();
  await mobilePage.getByRole("button", { name: "Capture area", exact: true }).click();
  await review(mobilePage).waitFor({ timeout: 60000 });
  timings.mobileAreaMs = Date.now() - mobileStart;
  await mobilePage.screenshot({ path: `${output}/area-review-mobile-dark.png` });
  assert.equal(await sandboxes(mobilePage), 0);
  await mobile.close();
  results.push(`Mobile dark picker fits 390px and captures its default rectangle (${timings.mobileAreaMs}ms)`);
} catch (error) {
  failures.push(error.stack ?? String(error));
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${output}/failure.png` });
    await writeFile(`${output}/failure.txt`, await activePage.locator("body").ariaSnapshot());
  }
} finally { await browser.close(); }
const report = { results, failures, pageErrors, timings, screenshots: output };
await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length || pageErrors.length) process.exitCode = 1;
