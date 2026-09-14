import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/table-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto(`${base}/docs/data-table/`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".report-launcher:not(:disabled)").waitFor();
  assert.equal(
    await page.getByRole("heading", { level: 1 }).innerText(),
    "Tables",
    "old Data Table URL teaches the same canonical guide",
  );
  const example = page
    .locator('.docs-playground [data-example-role="interactive"]')
    .first();
  const table = example.locator('[data-slot="data-table"]');
  await table.scrollIntoViewIfNeeded();
  const samples = await table.evaluate(async (node) => {
    const button = node.querySelector('button[aria-label="Next"]');
    button.click();
    const result = [];
    for (let frame = 0; frame < 24; frame++) {
      await new Promise(requestAnimationFrame);
      result.push({
        rows: node.querySelectorAll("tbody tr").length,
        exiting: node.querySelectorAll('tbody [data-motion-exiting="true"]')
          .length,
      });
    }
    return result;
  });
  assert.ok(
    samples.every((sample) => sample.rows <= 3 && sample.exiting === 0),
    `page changes never retain old rows in table flow: ${JSON.stringify(samples)}`,
  );
  console.log("PASS data-table row continuity");
  await page.goto(`${base}/docs/table/`, { waitUntil: "domcontentloaded" });
  await page.locator(".report-launcher:not(:disabled)").waitFor();
  assert.equal(
    await page
      .locator('.docs-playground [data-example-role="gallery"]')
      .count(),
    3,
    "Tables has Ledger, Rich rows and Comparison compositions",
  );
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const live = preview.locator('[data-example-role="interactive"]');
  const composed = live.locator('[data-slot="data-table"]');
  await composed
    .getByRole("button", { name: "Sort Words ascending", exact: true })
    .click();
  assert.match(
    await composed.locator("tbody tr").first().innerText(),
    /A blank page/,
  );
  await composed.locator("tbody tr").first().focus();
  await composed.locator("tbody tr").first().press("Enter");
  assert.match(
    await live.getByRole("status", { name: "Table feedback" }).innerText(),
    /A blank page/,
  );
  await composed.getByRole("button", { name: "Ready 3", exact: true }).click();
  assert.equal(await composed.locator("tbody tr").count(), 3);
  assert.match(await composed.locator("tbody").innerText(), /Weekend plan/);
  for (const approach of ["Ledger", "Rich", "Comparison"]) {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: approach, exact: true }).click();
    assert.match(
      await live.getByRole("status", { name: "Table feedback" }).innerText(),
      /A blank page/,
      "selection survives presentation changes",
    );
    if (approach === "Rich") {
      const pin = composed.getByRole("button", {
        name: "Pin Weekend plan",
        exact: true,
      });
      await pin.click();
      assert.equal(
        await composed
          .getByRole("button", { name: "Unpin Weekend plan", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.match(
        await live.getByRole("status", { name: "Table feedback" }).innerText(),
        /A blank page/,
        "nested action must not also open the record",
      );
      await composed
        .getByRole("button", { name: "Open Weekend plan", exact: true })
        .click();
      assert.match(
        await live.getByRole("status", { name: "Table feedback" }).innerText(),
        /Weekend plan/,
      );
      // Restore the common selection before checking the next presentation.
      await preview.getByRole("combobox", { name: "Example approach" }).click();
      await page.getByRole("option", { name: "Ledger", exact: true }).click();
      await composed
        .getByRole("button", { name: "All 6", exact: true })
        .click();
      await composed.locator("tbody tr").first().click();
      await preview.getByRole("combobox", { name: "Example approach" }).click();
      await page.getByRole("option", { name: "Rich", exact: true }).click();
    }
    if (approach === "Comparison") {
      assert.ok((await live.locator('th[scope="row"]').count()) >= 5);
      await live
        .getByRole("button", { name: "Next three", exact: true })
        .click();
      assert.match(await live.getByRole("table").innerText(), /A blank page/);
      assert.match(
        await live.getByRole("table").innerText(),
        /\b0\b/,
        "zero is displayed, not omitted",
      );
    }
    for (const width of [1440, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate((mode) => {
          document.documentElement.dataset.mode = mode;
        }, theme);
        await live.scrollIntoViewIfNeeded();
        await page.mouse.move(width - 8, 8);
        await page.locator(".docs-component-peek").waitFor({ state: "hidden" });
        assert.ok(
          await live.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1,
          ),
          `${approach}: no page overflow`,
        );
        if (width === 390) {
          const viewport = live
            .locator('[data-slot="table-container"]:visible')
            .first();
          const owner = viewport.locator(
            'xpath=ancestor::*[@data-slot="scroll-area"][1]',
          );
          await viewport.focus();
          await viewport.press("ArrowRight");
          await page.waitForFunction(() =>
            [
              ...document.querySelectorAll(
                '[data-example-role="interactive"] [data-slot="table-container"]',
              ),
            ].some((node) => node.scrollLeft > 0),
          );
          assert.equal(
            await owner
              .locator(
                '[data-orientation="horizontal"] [data-slot="scroll-area-thumb"] svg',
              )
              .count(),
            1,
            "real custom scrollbar, not a native recolor",
          );
          await viewport.evaluate((node) => {
            node.scrollLeft = 0;
          });
        }
        await live.screenshot({
          path: `${output}/${approach.toLowerCase()}-${width}-${theme}.png`,
        });
      }
  }
  assert.match(await live.innerText(), /1 pinned/);
  assert.ok(
    await page
      .getByRole("heading", { name: "DataTableProps", exact: true })
      .count(),
  );
  assert.ok(
    await page
      .getByRole("heading", { name: "TableProps", exact: true })
      .count(),
  );
  console.log(
    "PASS Tables: unified guide, three compositions, stable rows, sort/filter/record actions, preserved selection/pins, zero values and custom-scroll/theme/mobile captures",
  );
} finally {
  await browser.close();
}
