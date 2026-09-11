import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/reading-trail-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${base}/docs/reading-trail/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const example = page.locator(
    '.docs-playground [data-example-role="interactive"]',
  );
  const choose = async (name) => {
    await page.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name, exact: true }).click();
  };
  for (const name of ["spine", "bookmark", "overview"])
    assert.equal(
      await page
        .locator(`[data-example-role="gallery"][data-variant="${name}"]`)
        .count(),
      1,
      `${name} is discoverable`,
    );
  await example.scrollIntoViewIfNeeded();
  const link = example.getByRole("link", { name: /Make a connection/ });
  const before = await link.boundingBox();
  await link.hover();
  await page.waitForTimeout(380);
  assert.deepEqual(
    await link.boundingBox(),
    before,
    "Hover never moves the native link",
  );
  const pageY = await page.evaluate(() => window.scrollY);
  await link.click();
  await page.waitForFunction(() =>
    document
      .querySelector(
        '[data-example-role="interactive"] [aria-current="location"]',
      )
      ?.textContent.includes("Make a connection"),
  );
  assert.equal(
    await page.evaluate(() => window.scrollY),
    pageY,
    "Only the local article scrolls",
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.textContent.includes("Make a connection"),
    ),
    true,
    "The destination receives focus",
  );
  const reader = example.getByRole("region", { name: "Example article" });
  assert.equal(await example.locator('.v-reading-example__reader').evaluate(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(getComputedStyle(el).borderTopLeftRadius) >= 18),true,'The reader owns a calm paper surface, not the preview pattern');
  const position = await reader.evaluate((el) => el.scrollTop);
  for (const name of ["Bookmark", "Overview", "Spine"]) {
    await choose(name);
    assert.ok(
      Math.abs((await reader.evaluate((el) => el.scrollTop)) - position) < 2,
      "Changing composition preserves the reading position",
    );
  }
  await choose("Bookmark");
  await example.getByRole("button", { name: "Show contents" }).click();
  await example.getByRole("link", { name: /Leave a way back/ }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(
        '[data-example-role="interactive"] [aria-current="location"]',
      )
      ?.textContent.includes("Leave a way back"),
  );
  await example.getByRole("button", { name: "Hide contents" }).click();
  assert.equal(
    await example.locator(".v-reading-trail__list a:visible").count(),
    0,
  );
  assert.equal(
    await example.getByRole("button", { name: "Next chapter" }).isDisabled(),
    true,
  );
  await example
    .getByRole("link", { name: "Previous chapter", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector(
        '[data-example-role="interactive"] .v-reading-trail__current',
      )
      ?.textContent.includes("Make a connection"),
  );
  await page.addStyleTag({
    content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
  });
  for (const name of ["Spine", "Bookmark", "Overview"]) {
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
        await page.waitForTimeout(100);
        assert.equal(
          await example.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          true,
        );
        assert.equal(
          await example.locator('[data-slot="scroll-area"][data-scrollbar-variant="organic"]').count(),
          1,
        );
        await example.screenshot({
          path: `${output}/${name.toLowerCase()}-${width}-${mode}.png`,
        });
      }
    await page.setViewportSize({ width: 1280, height: 1050 });
  }
  await page
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /variant="overview"/,
  );
  console.log(
    "PASS Reading Trail docs: three layouts, stable links, local scroll/focus, reading continuity, reversible contents, boundaries, 12 responsive theme captures and copy",
  );
} finally {
  await browser.close();
}
