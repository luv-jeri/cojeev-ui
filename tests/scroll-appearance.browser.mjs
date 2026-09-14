/** RF-U-012: live scrollbar appearance keeps a 24px rail and working thin drag targets. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await page.goto(`${process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui"}/docs/scroll-area/`);
  const example = page.locator('[data-example="scroll-area"]').first();
  await page.evaluate(() => document.fonts.ready);
  await example.locator('.v-morph-live').first().waitFor({ state: "attached" });
  const size = example.getByRole("slider", { name: "Thumb thickness", exact: true });
  await size.press("Home");
  await example.getByRole("combobox", { name: "Thumb color", exact: true }).selectOption("rose");
  await example.getByRole("textbox", { name: "Custom thumb color", exact: true }).fill("#123456");
  await example.getByRole("radio", { name: "Minimal", exact: true }).check();

  const area = example.locator('[data-slot="scroll-area"]').first();
  const rail = area.locator('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]');
  const thumb = rail.locator('[data-slot="scroll-area-thumb"]');
  await thumb.waitFor();
  assert.equal(await area.getAttribute("data-scrollbar-variant"), "minimal");
  assert.equal(await rail.getAttribute("data-scrollbar-variant"), "minimal");
  assert.equal(await area.evaluate(node => getComputedStyle(node).getPropertyValue("--scrollbar-size").trim()), "2px");
  assert.equal(await area.evaluate(node => getComputedStyle(node).getPropertyValue("--scrollbar-color").trim()), "#123456");
  assert.equal(Math.round((await rail.boundingBox()).width), 24, "rail remains a 24px pointer target");
  assert.equal(Math.round((await thumb.boundingBox()).width), 2, "visible vertical thumb follows selected thickness");
  const selectedColor = await thumb.evaluate(node => getComputedStyle(node).color);
  assert.equal(await thumb.evaluate(node => getComputedStyle(node, "::after").borderRadius), "0px", "minimal style is a straight line");
  await rail.hover();
  await rail.evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))));
  assert.match(await rail.evaluate(node => getComputedStyle(node).backgroundColor), /(?:,|\/)\s*0\)$/, "A thin visual scrollbar must not paint its entire 24px hit area on hover");
  assert.equal(await thumb.evaluate(node => getComputedStyle(node).color), selectedColor, "custom thumb color survives hover");
  await example.getByRole("radio", { name: "Rounded", exact: true }).check();
  assert.notEqual(await thumb.evaluate(node => getComputedStyle(node, "::after").borderRadius), "0px", "rounded style is a pill");
  await example.getByRole("radio", { name: "Minimal", exact: true }).check();

  const viewport = area.locator('[data-slot="scroll-area-viewport"]');
  const box = await rail.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  assert.equal(await thumb.evaluate(node => getComputedStyle(node).color), selectedColor, "custom thumb color survives active drag");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 16);
  await page.mouse.up();
  assert.ok(await viewport.evaluate(node => node.scrollTop) > 0, "vertical rail drag scrolls at the 2px visual thickness");
  const horizontalArea = example.locator('[data-slot="scroll-area"]').nth(1);
  const horizontalRail = horizontalArea.locator('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]');
  const horizontalThumb = horizontalRail.locator('[data-slot="scroll-area-thumb"]');
  const horizontalViewport = horizontalArea.locator('[data-slot="scroll-area-viewport"]');
  const horizontalBox = await horizontalRail.boundingBox();
  assert.equal(Math.round(horizontalBox.height), 24, "horizontal rail remains a 24px pointer target");
  assert.equal(Math.round((await horizontalThumb.boundingBox()).height), 2, "inherited horizontal thumb follows selected thickness");
  await page.mouse.move(horizontalBox.x + 12, horizontalBox.y + horizontalBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(horizontalBox.x + horizontalBox.width - 16, horizontalBox.y + horizontalBox.height / 2);
  await page.mouse.up();
  assert.ok(await horizontalViewport.evaluate(node => node.scrollLeft) > 0, "horizontal rail drag scrolls at the 2px visual thickness");
  console.log("PASS RF-U-012 live scrollbar appearance preserves 24px rail, custom color, 2px thumb, and drag");
} finally {
  await browser.close();
}
