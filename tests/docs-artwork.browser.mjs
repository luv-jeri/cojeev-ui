import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch();
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
await mkdir("output/playwright/docs-artwork", { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const compositions = [];
  for (const route of ["button", "slider"]) {
    await page.goto(`${base}/docs/${route}/`);
    const artwork = page.locator(".docs-intro-artwork");
    await artwork.locator('[data-ambient="true"]').first().waitFor();
    await artwork.locator('[data-artwork-role="hero"][data-reveal="shown"]').waitFor();
    compositions.push(await artwork.evaluate(element => ({
      seed: element.getAttribute("data-artwork-seed"),
      layout: element.getAttribute("data-artwork-layout"),
      shapes: [...element.querySelectorAll("[data-shape]")].map(shape => `${shape.getAttribute("data-shape")}>${shape.getAttribute("data-morph-to")}`),
    })));
    await page.screenshot({ path: `output/playwright/docs-artwork/${route}.png`, fullPage: false });
  }
  assert.notDeepEqual(compositions[0], compositions[1], "component pages should not repeat one decorative composition");

  await page.goto(`${base}/docs/theme-toggle/`);
  const artwork = page.locator(".docs-intro-artwork");
  const path = artwork.locator('[data-artwork-role="hero"] [data-artwork-layer="fill"] path');
  await path.waitFor();
  const beforePath = await path.getAttribute("d");
  await page.waitForTimeout(1200);
  assert.notEqual(await path.getAttribute("d"), beforePath, "ambient artwork contour should breathe");

  const beforeTransform = await artwork.evaluate(element => getComputedStyle(element).transform);
  const bounds = await artwork.boundingBox();
  await page.mouse.move(bounds.x + bounds.width + 90, bounds.y + bounds.height / 2);
  await page.waitForTimeout(450);
  assert.notEqual(await artwork.evaluate(element => getComputedStyle(element).transform), beforeTransform, "artwork should lean toward a nearby pointer");

  const usage = page.locator('.docs-contents a[href="#usage-heading"]');
  await usage.hover();
  assert.equal(await usage.evaluate(element => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)", "contents hover must not paint a full-row slab");
  await page.screenshot({ path: "output/playwright/docs-artwork/theme-toggle-hover.png", fullPage: false });

  const quietPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await quietPage.goto(`${base}/docs/theme-toggle/`);
  const quietPath = quietPage.locator('.docs-intro-artwork [data-artwork-role="hero"] [data-artwork-layer="fill"] path');
  await quietPath.waitFor();
  const quietBefore = await quietPath.getAttribute("d");
  await quietPage.waitForTimeout(800);
  assert.equal(await quietPath.getAttribute("d"), quietBefore, "reduced motion should keep the artwork contour still");
  await quietPage.close();
  console.log("PASS: seeded page artwork, living contour, pointer attraction, quiet mode, and restrained contents hover.");
} finally {
  await browser.close();
}
