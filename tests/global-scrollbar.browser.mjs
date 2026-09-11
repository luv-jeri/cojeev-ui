import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui"}/docs/scroll-area/`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-slot="page-scrollbar"]').waitFor();

  assert.equal(await page.locator("html").getAttribute("data-scrollbar-policy"), "cojeev");
  assert.equal(await page.locator('[data-slot="page-scrollbar"]').count(), 1, "the page has one custom rail");

  await page.evaluate(() => {
    const native = document.createElement("div");
    native.id = "native-scroll-test";
    native.tabIndex = 0;
    native.setAttribute("aria-label", "Native overflow test");
    native.style.cssText = "width:120px;height:80px;overflow:auto";
    native.innerHTML = '<div style="width:280px;height:360px">Native overflow</div>';
    document.body.append(native);
  });
  const native = page.locator("#native-scroll-test");
  assert.equal(await native.evaluate(node => getComputedStyle(node).scrollbarWidth), "thin", "native fallback is slim");
  assert.notEqual(await native.evaluate(node => getComputedStyle(node).scrollbarColor), "auto", "native fallback uses theme color");
  await native.focus();
  await native.press("End");
  await page.waitForFunction(() => document.querySelector("#native-scroll-test").scrollTop > 0);

  const area = page.locator('[data-example-role="interactive"] [data-slot="scroll-area"]').first();
  await area.scrollIntoViewIfNeeded();
  await area.locator('[data-slot="scroll-area-thumb"]').first().waitFor();
  const viewport = area.locator('[data-slot="scroll-area-viewport"]');
  assert.equal(await viewport.evaluate(node => getComputedStyle(node).scrollbarWidth), "none", "managed viewports hide their native bar");
  assert.equal(await area.locator('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]').count(), 1, "managed areas have one custom rail");
  assert.equal(await page.locator("html").evaluate(node => getComputedStyle(node).scrollbarWidth), "none", "the mounted page rail suppresses the native page bar");

  const pageRail = page.locator('[data-slot="page-scrollbar"]');
  assert.equal(await pageRail.getAttribute("data-scrollbar-variant"), "organic");
  assert.equal(await pageRail.evaluate(node => getComputedStyle(node).getPropertyValue("--scrollbar-size").trim()), "4px", "the app policy uses the slim root setting");
  assert.equal(await page.locator("html").evaluate(node => getComputedStyle(node).getPropertyValue("--cojeev-scrollbar-size").trim()), "4px", "native and managed app scrollbars share the root size");
  const oldMaximum = Number(await pageRail.getAttribute("aria-valuemax"));
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.id = "scroll-growth-test";
    spacer.style.height = "1600px";
    document.body.append(spacer);
  });
  await page.waitForFunction(maximum => Number(document.querySelector('[data-slot="page-scrollbar"]').getAttribute("aria-valuemax")) > maximum, oldMaximum);

  await pageRail.focus();
  await pageRail.press("End");
  await page.waitForFunction(() => scrollY > 0);
  await pageRail.press("Home");
  await page.waitForFunction(() => scrollY === 0);
  const railBox = await pageRail.boundingBox();
  const thumbBox = await pageRail.locator('[data-slot="page-scrollbar-thumb"]').boundingBox();
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(railBox.x + railBox.width / 2, railBox.y + railBox.height * .65);
  await page.mouse.up();
  assert.ok(await page.evaluate(() => scrollY) > 0, "the shared page thumb remains draggable");
  console.log("PASS global scrollbar policy covers managed and native scrollports with shared sizing, content growth, keyboard, drag, and no double bars");
} finally {
  await browser.close();
}
