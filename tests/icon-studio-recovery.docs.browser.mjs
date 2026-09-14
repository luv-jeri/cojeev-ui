import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/icon-studio-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: "reduce",
      permissions: ["clipboard-read", "clipboard-write"],
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const id of ["icon", "animated-icon"]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    const explorer = page.locator(`.docs-playground [data-icon-explorer]`),
      inspector = explorer.locator("[data-icon-inspector]"),
      glyph = inspector.locator("[data-slot=icon]").first();
    assert.equal(await explorer.locator("[data-icon-option]").count(), 24);
    await explorer
      .getByRole("button", { name: "Pink accent", exact: true })
      .click();
    const pink = await glyph.evaluate((e) => getComputedStyle(e).color);
    await explorer
      .getByRole("button", { name: "Blue accent", exact: true })
      .click();
    assert.notEqual(
      await glyph.evaluate((e) => getComputedStyle(e).color),
      pink,
      "Outline colour must actually change",
    );
    await explorer
      .getByRole("button", { name: "Copy JSX", exact: true })
      .click();
    let copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, /style=\{\{ color: "var\(--status-info-ink\)" \}\}/);
    assert.match(
      copied,
      id === "icon"
        ? /feedbackDuration=\{0.7\} feedbackEase="gentle"/
        : /duration=\{0.7\} ease="gentle"/,
    );
    assert.equal(
      await explorer
        .getByRole("button", { name: "Blue accent", exact: true })
        .evaluate(
          (e) =>
            e.getBoundingClientRect().width >= 44 &&
            e.getBoundingClientRect().height >= 44,
        ),
      true,
    );
    await explorer
      .getByRole("button", { name: "Motion timing", exact: true })
      .click();
    await explorer
      .getByRole("slider", { name: "Duration", exact: true })
      .press("End");
    await explorer.getByRole("button", { name: "Settle", exact: true }).click();
    await explorer
      .getByRole("button", { name: "Copy JSX", exact: true })
      .click();
    copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(
      copied,
      id === "icon"
        ? /feedbackDuration=\{2\} feedbackEase="settle"/
        : /duration=\{2\} ease="settle"/,
    );
    await explorer
      .getByRole("button", { name: "Motion timing", exact: true })
      .click();
    for (const treatment of ["Outline", "Duotone", "Organic"]) {
      await explorer
        .getByRole("group", { name: "Icon treatment", exact: true })
        .getByRole("button", { name: treatment, exact: true })
        .click();
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await inspector.scrollIntoViewIfNeeded();
          assert.equal(
            await explorer.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
            true,
          );
          await page.screenshot({
            path: `${output}/${id}-${treatment.toLowerCase()}-${width}-${mode}.png`,
          });
        }
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    const search = explorer.getByRole("searchbox", {
      name: "Find an icon",
      exact: true,
    });
    await search.fill("air-vent");
    await explorer.locator("[data-icon-option=air-vent]").click();
    assert.equal(
      await explorer.locator("[data-icon-selected]").innerText(),
      "air-vent",
    );
    await search.fill("no-result-12345");
    assert.equal(await explorer.locator("[data-icon-option]").count(), 0);
    await explorer
      .getByRole("button", { name: "Clear icon search", exact: true })
      .click();
    assert.equal(
      await search.evaluate((e) => document.activeElement === e),
      true,
    );
    await explorer
      .getByRole("button", { name: "Next icons", exact: true })
      .click();
    assert.match(
      await explorer
        .getByRole("navigation", { name: "Icon result pages" })
        .innerText(),
      /Page 2/,
    );
    await explorer
      .getByRole("button", { name: "Previous icons", exact: true })
      .click();
    assert.equal(
      await explorer
        .getByRole("button", { name: "Previous icons", exact: true })
        .isDisabled(),
      true,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Icon/AnimatedIcon outline colour, actual timing/colour copy,24 bounded tiles, search/paging and24 responsive/theme captures",
  );
} finally {
  await browser.close();
}
