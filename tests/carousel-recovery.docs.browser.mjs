import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/carousel-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${base}/docs/carousel/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const example = page.locator(
    '.docs-playground [data-example-role="interactive"]',
  );
  const choose = async (n) => {
    await page.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: n, exact: true }).click();
  };
  for (const name of ["shelf", "story", "index"])
    assert.equal(
      await page
        .locator(`[data-example-role="gallery"][data-variant="${name}"]`)
        .count(),
      1,
      `${name} is discoverable`,
    );
  await example.getByRole("button", { name: "Next slide" }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          '[data-example-role="interactive"] [data-slot="carousel-dot"][aria-current="true"]',
        )
        ?.getAttribute("aria-label") === "Tile 2",
  );
  await example
    .getByRole("button", { name: "Save Follow a thread", exact: true })
    .click();
  for (const name of ["Story", "Index", "Shelf"]) {
    await choose(name);
    assert.equal(
      await example
        .getByRole("button", { name: "Unsave Follow a thread", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await example
        .getByRole("button", { name: "Tile 2", exact: true })
        .getAttribute("aria-current"),
      "true",
    );
  }
  await page.addStyleTag({
    content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
  });
  for (const name of ["Shelf", "Story", "Index"]) {
    await choose(name);
    for (const width of [1280, 390])
      for (const mode of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1050 });
        await page.evaluate(
          (m) => (document.documentElement.dataset.mode = m),
          mode,
        );
        await example.scrollIntoViewIfNeeded();
        await page.mouse.move(width - 5, 5);
        await page.waitForTimeout(150);
        assert.equal(
          await example.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          true,
          "Example controls do not overflow",
        );
        const rail = example.locator(
          '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
        );
        assert.ok(
          (await rail.count()) > 0,
          "Owned horizontal scrollbar is present",
        );
        await example.screenshot({
          path: `${output}/${name.toLowerCase()}-${width}-${mode}.png`,
        });
      }
    await page.setViewportSize({ width: 1280, height: 1050 });
  }
  await example.getByRole("button", { name: "Tile 4", exact: true }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          '[data-example-role="interactive"] [data-slot="carousel-dot"][aria-current="true"]',
        )
        ?.getAttribute("aria-label") === "Tile 4",
  );
  await example.getByRole("button", { name: "Previous slide" }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          '[data-example-role="interactive"] [data-slot="carousel-dot"][aria-current="true"]',
        )
        ?.getAttribute("aria-label") === "Tile 3",
  );
  await page
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /variant="index"/,
  );
  console.log(
    "PASS Carousel docs: Shelf/Story/Index, saved state and index continuity, bounded custom scrolling, 12 responsive theme captures and configured copy",
  );
} finally {
  await browser.close();
}
