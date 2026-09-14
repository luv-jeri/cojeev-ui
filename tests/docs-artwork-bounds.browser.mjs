import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 768, height: 1100 } });
  for (const id of ["activity-feed", "agent-state", "animated-icon"]) {
    await page.goto(`${base}/docs/${id}/`);
    await page.locator('[data-slot="preview"] [data-flow-owned]').first().waitFor();
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.mouse.move(width - 1, 160);
      await page.waitForTimeout(300);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}/${width}: decorative artwork must not widen the document`);
    }
  }
  console.log("PASS three route-specific artworks at four widths, including pointer attraction near the viewport edge");
} finally { await browser.close(); }
