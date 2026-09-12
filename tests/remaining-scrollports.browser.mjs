import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  for (const id of ["table", "dock", "resizable", "scroll-reveal", "preview"]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    await page
      .locator("[data-example-role=interactive]")
      .first()
      .scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const unmanaged = await page.locator(".docs-article").evaluate((root) =>
      [...root.querySelectorAll("*")]
        .filter((e) => {
          const s = getComputedStyle(e);
          return (
            e.getBoundingClientRect().width > 0 &&
            !e.hasAttribute("data-radix-scroll-area-viewport") &&
            e.getAttribute("data-element-scrollbar") !== "mounted" &&
            ((/(auto|scroll)/.test(s.overflowY) &&
              e.scrollHeight > e.clientHeight + 2) ||
              (/(auto|scroll)/.test(s.overflowX) &&
                e.scrollWidth > e.clientWidth + 2))
          );
        })
        .map((e) => [e.tagName, e.getAttribute("data-slot"), e.className]),
    );
    assert.deepEqual(unmanaged, [], `${id}: no hidden native scrolling region`);
    const ports = page.locator(
      "[data-example-role=interactive] [data-radix-scroll-area-viewport]",
    );
    for (const p of await ports.all()) {
      const geom = await p.evaluate((e) => ({
        x: e.scrollWidth - e.clientWidth,
        y: e.scrollHeight - e.clientHeight,
      }));
      if (geom.y > 8) {
        await p.evaluate((e) => e.scrollTo({ top: e.scrollHeight }));
        assert.ok((await p.evaluate((e) => e.scrollTop)) > 0);
      }
      if (geom.x > 8) {
        await p.evaluate((e) => e.scrollTo({ left: e.scrollWidth }));
        assert.ok(Math.abs(await p.evaluate((e) => e.scrollLeft)) > 0);
      }
    }
    console.log(
      "PASS " + id + " owned scrollports and native position updates",
    );
  }
} finally {
  await browser.close();
}
