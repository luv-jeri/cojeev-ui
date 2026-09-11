import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/disclosure-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/docs/accordion/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const example = preview.locator('[data-example-role="interactive"]');
  const accordion = example.locator('[data-slot="accordion"]');
  assert.equal(
    await preview.getByRole("combobox", { name: "Example approach" }).count(),
    1,
    "Accordion must expose its missing structural approaches",
  );
  const modes = ["Faq", "Chapters", "Editorial"];
  const triggers = example.locator('[data-slot="accordion-trigger"]');
  await triggers.nth(1).click();
  for (const mode of modes) {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: mode, exact: true }).click();
    assert.equal(
      await accordion.getAttribute("data-appearance"),
      mode.toLowerCase(),
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const paintedItem = accordion
      .locator('[data-slot="accordion-item"]')
      .nth(1);
    await paintedItem
      .locator(":scope > svg.v-morph")
      .waitFor({ state: "attached" });
    assert.equal(
      await paintedItem.evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
      "authored surface must reveal, not cover, its living contour",
    );
    assert.equal(
      await paintedItem.getAttribute("data-stable-hit"),
      "",
      "press response belongs to paint, not the summary hit area",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        document.querySelector(
          '[data-example-role="interactive"] [data-slot="accordion"]',
        )?.dataset.motion === "off",
    );
    assert.equal(
      await triggers.nth(1).getAttribute("aria-expanded"),
      "true",
      "open chapter is preserved across presentation changes",
    );
    const galleries = preview.locator(
      `[data-example-role="gallery"][data-variant="${mode.toLowerCase()}"] [data-slot="accordion"]`,
    );
    assert.equal(
      await galleries.count(),
      1,
      "every structural approach is directly shown, not just a dropdown option",
    );
    await triggers.nth(1).focus();
    await triggers.nth(1).press("ArrowDown");
    await page.waitForFunction(
      () =>
        document.activeElement ===
        document.querySelectorAll(
          '[data-example-role="interactive"] [data-slot="accordion-trigger"]',
        )[2],
    );
    await page.keyboard.press("Space");
    assert.equal(await triggers.nth(2).getAttribute("aria-expanded"), "true");
    for (let n = 0; n < 4; n++) {
      await triggers.nth(2).click();
      assert.equal(
        await triggers.nth(2).getAttribute("aria-expanded"),
        String(n % 2 !== 0),
      );
    }
    await triggers.nth(1).click();
    for (const width of [1440, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await example.scrollIntoViewIfNeeded();
        await example.screenshot({
          path: `${output}/accordion-${mode.toLowerCase()}-${width}-${theme}.png`,
          style:
            ".report-launcher, nextjs-portal { visibility: hidden !important; }",
        });
        assert.ok(
          await example.evaluate((root) => {
            const bounds = root.getBoundingClientRect();
            return [
              ...root.querySelectorAll('[data-slot="accordion-trigger"]'),
            ].every((el) => {
              const b = el.getBoundingClientRect();
              return (
                b.height >= 44 &&
                b.left >= bounds.left - 1 &&
                b.right <= bounds.right + 1
              );
            });
          }),
          "accordion triggers stay readable and within the specimen",
        );
      }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await triggers.nth(1).scrollIntoViewIfNeeded();
  const samples = await accordion.evaluate(async (root) => {
    const trigger = root.querySelectorAll('[data-slot="accordion-trigger"]')[1];
    const content = document.getElementById(
      trigger.getAttribute("aria-controls"),
    );
    trigger.click();
    const heights = [];
    for (let i = 0; i < 6; i++) {
      await new Promise(requestAnimationFrame);
      heights.push(content.getBoundingClientRect().height);
    }
    trigger.click();
    for (let i = 0; i < 25; i++) await new Promise(requestAnimationFrame);
    return {
      heights,
      opened: trigger.getAttribute("aria-expanded"),
      height: content.getBoundingClientRect().height,
      inert: content.inert,
      inner: content.firstElementChild?.getBoundingClientRect().height,
    };
  });
  assert.equal(
    samples.opened,
    "true",
    "reversal restores the latest requested state",
  );
  assert.equal(samples.inert, false);
  assert.ok(
    samples.height >= samples.inner - 1,
    "reversal does not leave content clipped at an intermediate height",
  );
  assert.ok(
    new Set(samples.heights.map(Math.round)).size > 1,
    "normal motion really animates the disclosure height",
  );
  const active = triggers.nth(1);
  await active.scrollIntoViewIfNeeded();
  const stable = await active.boundingBox();
  const paint = accordion
    .locator('[data-slot="accordion-item"]')
    .nth(1)
    .locator(":scope > svg.v-morph");
  await paint.waitFor({ state: "attached" });
  await page.mouse.move(stable.x + 2, stable.y + stable.height / 2);
  const contour = await paint.evaluate(async (svg) => {
    const frames = [];
    for (let n = 0; n < 12; n++) {
      await new Promise(requestAnimationFrame);
      frames.push(svg.querySelector("[data-morph-body]").getAttribute("d"));
    }
    return new Set(frames).size;
  });
  assert.ok(contour > 1, "the actual painted edge responds to the pointer");
  await page.mouse.down();
  const held = await active.boundingBox();
  await page.mouse.up();
  assert.equal(held.x, stable.x);
  assert.equal(
    held.width,
    stable.width,
    "pressing paint never resizes the native target",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS accordion recovery: three distinct visible approaches, retained open state, keyboard, reversal, real height motion and 12 light/dark responsive captures",
  );
} finally {
  await browser.close();
}
