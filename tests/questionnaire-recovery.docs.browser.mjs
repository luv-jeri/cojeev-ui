import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/questionnaire-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(12000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${base}/docs/questionnaire/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const example = page.locator(
    '.docs-playground [data-example-role="interactive"]',
  );
  const choose = async (name, value) => {
    await page.getByRole("combobox", { name: `Example ${name}` }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  for (const name of ["stacked", "journey", "worksheet"])
    assert.equal(
      await page
        .locator(`[data-example-role="gallery"][data-variant="${name}"]`)
        .count(),
      1,
      `${name} is discoverable`,
    );
  const answer = async (name) => {
    const input = example.getByRole("radio", { name });
    await input.locator("..").click();
    assert.equal(await input.isChecked(), true);
  };
  await answer(/Try something small/);
  await answer(/Every week/);
  const bands = example.locator(".v-glide__pill > i");
  await bands.first().waitFor({ state: "attached" });
  assert.notEqual(
    await bands.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor),
    await bands.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor),
    "Each question's travelling fill follows its own pink/blue selector palette",
  );
  for (const name of ["Journey", "Worksheet", "Stacked"]) {
    await choose("approach", name);
    assert.equal(
      await example
        .getByRole("progressbar", { name: "Questions answered" })
        .getAttribute("aria-valuenow"),
      "100",
    );
  }
  for (const shape of [
    "Organic",
    "Circle",
    "Rounded",
    "Pebble",
    "Leaf",
    "Flower",
  ]) {
    await choose("glyph shape", shape);
    assert.equal(
      await example
        .locator('[data-slot="questionnaire-option"]')
        .first()
        .getAttribute("data-selector-shape"),
      shape.toLowerCase(),
    );
  }
  for (const mark of ["Dot", "Check", "Diamond", "Flower", "None", "Auto"])
    await choose("selected mark", mark);
  await choose("approach", "Journey");
  await example.getByRole("button", { name: "Next question" }).click();
  assert.match(
    await example.locator("legend:visible").innerText(),
    /What rhythm feels right\?/,
  );
  assert.equal(
    await example
      .locator("legend:visible")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(
    await example
      .locator('[data-slot="questionnaire-question"][hidden]')
      .count(),
    1,
  );
  await example.getByRole("button", { name: "Save my plan" }).click();
  assert.match(
    await example.getByRole("status").last().innerText(),
    /small experiment.*Every week/i,
  );
  await example.getByRole("button", { name: "Start again" }).click();
  assert.equal(
    await example.getByRole("progressbar").getAttribute("aria-valuenow"),
    "0",
  );
  assert.equal(
    await example.getByRole("button", { name: "Next question" }).isDisabled(),
    true,
  );
  await example.getByRole("radio", { name: /Make a little room/ }).focus();
  await page.keyboard.press("Space");
  await example.getByRole("button", { name: "Next question" }).click();
  await answer(/Every day/);
  await choose("container corners", "Square");
  assert.equal(
    await example
      .locator('[data-slot="questionnaire-question"]:visible')
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    "0px",
  );
  await choose("container corners", "Round");
  await page.addStyleTag({
    content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
  });
  for (const approach of ["Stacked", "Journey", "Worksheet"]) {
    await choose("approach", approach);
    for (const width of [1280, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate(
          (t) => (document.documentElement.dataset.mode = t),
          theme,
        );
        await example.scrollIntoViewIfNeeded();
        await page.mouse.move(width - 5, 5);
        await page.waitForTimeout(80);
        assert.equal(
          await example.locator("legend:visible").evaluateAll((nodes) =>
            nodes.every((legend) => {
              const number = legend.querySelector(
                ".v-questionnaire-example__number",
              );
              const title = legend.querySelector(
                ".v-questionnaire-example__title",
              );
              return (
                number &&
                title &&
                title.getBoundingClientRect().left >=
                  number.getBoundingClientRect().right + 8
              );
            }),
          ),
          true,
          "Wrapped question titles keep their own column beside the numbered tab",
        );
        assert.equal(
          await example.evaluate((el) =>
            [...el.querySelectorAll("label,button,fieldset")].some(
              (n) =>
                n.getBoundingClientRect().width > 0 &&
                n.getBoundingClientRect().right >
                  el.getBoundingClientRect().right + 1,
            ),
          ),
          false,
          "Native content fits",
        );
        await example.screenshot({
          path: `${output}/${approach.toLowerCase()}-${width}-${theme}.png`,
        });
      }
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  await page
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(copied, /shape="flower"/);
  assert.match(copied, /variant="worksheet"/);
  console.log(
    "PASS questionnaire docs: three compositions, six shapes/marks retained, answers/progress/focus/reset/radius/copy and 12 responsive theme captures",
  );
} finally {
  await browser.close();
}
