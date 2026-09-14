import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
await mkdir("output/playwright/overhaul-rubber", { recursive: true });
const browser = await chromium.launch();
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4320/cojeev-ui";
try {
  for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    await page.addInitScript(
      (mode) => localStorage.setItem("cojeev-docs-theme", mode),
      mode,
    );
    await page.goto(`${base}/docs/slider/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const specimen = page.locator(
      '[data-example-role="gallery"][data-variant="rubber"]',
    );
    assert.equal(
      await specimen.count(),
      1,
      "Rubber must be discoverable on the real slider page",
    );
    const thumb = specimen.getByRole("slider");
    await thumb.focus();
    await thumb.press("Home");
    await thumb.press("ArrowRight");
    const path = specimen.locator('[data-slot="slider-range"] path');
    // Extent and ResizeObserver geometry converge at the next paint. Measure
    // after two frames, not the first intermediate path mutation.
    const thickness = () =>
      path.evaluate(async (node) => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const box = node.getBBox(),
          x = box.x + box.width / 2,
          height = node.ownerSVGElement.viewBox.baseVal.height;
        let count = 0;
        for (let i = 0; i < 512; i++)
          if (node.isPointInFill(new DOMPoint(x, (height * (i + 0.5)) / 512)))
            count++;
        return (count / 512) * height;
      });
    await page.waitForFunction(() =>
      document
        .querySelector(
          '[data-variant="rubber"] [data-slot="slider-range"] path',
        )
        ?.getAttribute("d")
        ?.includes("C"),
    );
    const short = await path.getAttribute("d");
    await thumb.press("End");
    assert.equal(await thumb.getAttribute("aria-valuenow"), "100");
    await page.waitForFunction(
      (short) =>
        document
          .querySelector(
            '[data-variant="rubber"] [data-slot="slider-range"] path',
          )
          ?.getAttribute("d") !== short,
      short,
    );
    const long = await path.getAttribute("d");
    const longThickness = await thickness();
    assert.notEqual(
      short,
      long,
      "Extent, not animation, must change the rubber shape",
    );
    assert.ok(!/NaN|Infinity/.test(long));
    assert.equal(
      await specimen
        .locator('[data-slot="slider"]')
        .getAttribute("data-motion"),
      "off",
    );
    assert.ok(
      (await thumb.boundingBox()).width >= 28,
      "Thumb keeps its normal grab target",
    );
    await specimen.screenshot({
      path: `output/playwright/overhaul-rubber/${mode}-long.png`,
    });
    await thumb.press("Home");
    for (let i = 0; i < 12; i++) await thumb.press("ArrowRight");
    const shortThickness = await thickness();
    assert.ok(
      shortThickness > longThickness * 3 && longThickness < 4,
      `actual gum waist gets thin as extent grows: short=${shortThickness}, long=${longThickness}`,
    );
    await specimen.screenshot({
      path: `output/playwright/overhaul-rubber/${mode}-short.png`,
    });
    await page.close();
  }
  console.log(
    "PASS: rubber is discoverable, key-adjustable, near-round to grab and value-shaped with reduced motion.",
  );
} finally {
  await browser.close();
}
