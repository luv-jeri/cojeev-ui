import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/hero-recovery";
await mkdir(output, { recursive: true });
const concepts = [
  "organic",
  "capsule",
  "split-arrow",
  "paper-fold",
  "pressed-key",
  "ribbon",
  "ticket",
  "seal",
  "ink-sweep",
  "orbit",
  "sliding-window",
  "stacked-paper",
  "spotlight",
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/docs/hero-button/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const specimen = preview.locator('[data-example-role="interactive"]');
  assert.equal(
    await preview.locator('[data-example-role="gallery"]').count(),
    concepts.length,
    "twelve distinct hero concepts plus the retained regular capsule must all be visible",
  );
  let clicks = 0;
  for (const concept of concepts.filter(
    (value) => !process.env.ONLY_HERO || value === process.env.ONLY_HERO,
  )) {
    const label =
      concept[0].toUpperCase() + concept.slice(1).replaceAll("-", " ");
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    const button = specimen.locator('[data-slot="hero-button"]');
    assert.equal(
      await button.getAttribute("data-hero-appearance"),
      ["organic", "capsule"].includes(concept) ? "liquid" : concept,
    );
    assert.equal(
      await button.locator('[data-slot="hero-button-label"]').count(),
      1,
    );
    await button.click();
    clicks++;
    assert.match(
      await specimen.getByRole("status").innerText(),
      new RegExp(`^${clicks} `),
      "changing treatment preserves the example's action result",
    );
    await button.press("Space");
    clicks++;
    if (concept === "organic") {
      assert.notEqual(
        await button.evaluate((el) => getComputedStyle(el).outlineStyle),
        "none",
        "keyboard focus remains visible",
      );
      await specimen.screenshot({ path: `${output}/organic-focus.png` });
    }
    await button.evaluate((el) => el.blur());
    for (const width of [1440, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await button.scrollIntoViewIfNeeded();
        const b = await button.boundingBox(),
          s = await specimen.boundingBox();
        if (concept === "seal")
          assert.ok(
            Math.abs(b.width - b.height) < 1,
            "the seal must be round, not a flattened capsule",
          );
        assert.ok(
          b.height >= 44 &&
            b.x >= s.x - 1 &&
            b.x + b.width <= s.x + s.width + 1,
        );
        await specimen.screenshot({
          path: `${output}/${concept}-${width}-${theme}.png`,
          style: ".report-launcher,nextjs-portal{visibility:hidden!important}",
        });
      }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await button.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    const before = await button.boundingBox();
    await button.hover();
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            '[data-example-role="interactive"] [data-slot="hero-button"]',
          )
          ?.getAttribute("data-arrow-active") === "true",
    );
    const after = await button.boundingBox();
    for (const key of ["x", "y", "width", "height"])
      assert.ok(
        Math.abs(before[key] - after[key]) < 1,
        `${concept}: hover must not move the hit target`,
      );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        document
          .querySelector(
            '[data-example-role="interactive"] [data-slot="hero-button"]',
          )
          ?.getAttribute("data-motion-quiet") === "true",
      undefined,
      { timeout: 2000 },
    );
    assert.equal(await button.getAttribute("data-motion-quiet"), "true");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS hero collection:12 distinct concepts plus capsule,13 live galleries, retained click/Space results, stationary hover targets, reduced motion and52 responsive/theme captures",
  );
} finally {
  await browser.close();
}
