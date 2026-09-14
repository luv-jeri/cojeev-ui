import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/chart-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const modes = {
    "area-chart": ["Linear", "Step", "Stacked"],
    "bar-chart": ["Grouped", "Stacked", "Horizontal"],
    "line-chart": ["Linear", "Smooth", "Step"],
    "pie-chart": ["Pie", "Donut"],
    "radar-chart": ["Polygon", "Rounded", "Grid"],
    "radial-chart": ["Full", "Semicircle"],
  };
  for (const [id, geometries] of Object.entries(modes)) {
    if (process.env.ONLY_CHART && id !== process.env.ONLY_CHART) continue;
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const preview = page
      .locator('.docs-playground [data-slot="preview"]')
      .first();
    const example = preview.locator('[data-example-role="interactive"]');
    const dataset = example.getByRole("combobox", {
      name: "Sample data",
      exact: true,
    });
    assert.equal(
      await dataset.evaluate((node) => node.tagName),
      "BUTTON",
      `${id}: the reported native chart menu must be replaced`,
    );
    assert.equal(
      await preview.locator('[data-example-role="gallery"]').count(),
      3,
    );
    for (const geometry of geometries) {
      await preview
        .getByRole("combobox", { name: "Example chart mode" })
        .click();
      await page.getByRole("option", { name: geometry, exact: true }).click();
      assert.equal(
        await example
          .locator(".v-chart-example")
          .getAttribute("data-chart-mode"),
        geometry.toLowerCase(),
      );
    }
    await preview
      .getByRole("button", { name: "Copy code", exact: true })
      .click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      new RegExp(`chartMode="${geometries.at(-1).toLowerCase()}"`),
      "copied configuration retains the independently selected geometry",
    );
    const chooseData = async (label) => {
      await dataset.click();
      await page.getByRole("option", { name: label, exact: true }).click();
    };
    await chooseData("Next week");
    const frame = example.locator(".v-chart-frame");
    if (id === "radar-chart") {
      const values = await frame
        .locator('[data-slot="chart-data-table"] tbody tr')
        .evaluateAll((rows) =>
          rows.map((row) => Number(row.querySelectorAll("td")[1]?.textContent)),
        );
      assert.ok(
        values.length > 0 &&
          values.every((value) => Number.isFinite(value) && value <= 100),
        "the example's generated measures must fit its advertised 0–100 scale",
      );
    }
    const legend = frame.locator(".v-chart-legend button").first();
    await legend.click();
    assert.equal(await legend.getAttribute("aria-pressed"), "false");
    for (const approach of ["Analysis", "Brief", "Ledger"]) {
      await preview.getByRole("combobox", { name: "Example approach" }).click();
      await page.getByRole("option", { name: approach, exact: true }).click();
      assert.equal(
        await frame.getAttribute("data-appearance"),
        approach.toLowerCase(),
      );
      assert.match(await dataset.innerText(), /Next week/);
      assert.equal(
        await legend.getAttribute("aria-pressed"),
        "false",
        "changing composition preserves hidden-series state",
      );
      if (approach === "Ledger") {
        assert.ok(
          await frame.locator('[data-slot="chart-data-table"]').isVisible(),
        );
        assert.equal(
          await frame.locator('[data-slot="table-container"]').count(),
          1,
          "visible values use the real custom-scroll container",
        );
        if (["area-chart", "bar-chart", "line-chart"].includes(id)) {
          assert.ok(
            await frame
              .locator('[data-slot="table-container"]')
              .evaluate(
                (node) =>
                  node.clientHeight <= 421 &&
                  node.scrollHeight > node.clientHeight,
              ),
            "the actual values viewport is bounded and scrollable, not just wrapped in a scrollbar component",
          );
        }
      }
      for (const width of [1440, 390])
        for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1100 });
          await page.evaluate(
            (theme) => (document.documentElement.dataset.mode = theme),
            theme,
          );
          await example.scrollIntoViewIfNeeded();
          assert.ok(
            await example.evaluate(
              (node) => node.scrollWidth <= node.clientWidth + 1,
            ),
            `${id}/${approach} must fit the workbench`,
          );
          await example.screenshot({
            path: `${output}/${id}-${approach.toLowerCase()}-${width}-${theme}.png`,
            style:
              ".report-launcher,nextjs-portal{visibility:hidden!important}",
          });
        }
      await page.setViewportSize({ width: 1440, height: 1100 });
    }
    await legend.click();
    for (const label of [
      "Empty dataset",
      "All zero",
      "Missing observations",
      "This week",
    ]) {
      await chooseData(label);
      if (label === "Empty dataset")
        await frame
          .locator('[data-slot="chart-svg"]')
          .waitFor({ state: "hidden" });
      else await frame.locator('[data-slot="chart-svg"]').waitFor();
      if (id === "radar-chart" && label === "Missing observations") {
        assert.equal(
          await frame.locator('[data-slot="chart-point"]').count(),
          6,
          "only six observed radar values receive a point; missing axes are not zero",
        );
        assert.ok(
          await frame
            .locator('[data-slot="chart-mark"]')
            .evaluateAll((paths) =>
              paths.every(
                (path) =>
                  path.getAttribute("fill") === "none" &&
                  !path.getAttribute("d").includes("Z"),
              ),
            ),
        );
      }
      assert.ok(
        await frame.evaluate((node) =>
          [...node.querySelectorAll("path,rect,circle")].every(
            (mark) =>
              !/NaN|Infinity/.test(
                [...mark.attributes].map((a) => a.value).join(" "),
              ),
          ),
        ),
        "no invalid plot geometry",
      );
    }
    const plot = frame.locator('[data-slot="chart-svg"]');
    await plot.focus();
    await plot.press("End");
    await frame.getByRole("tooltip").waitFor();
    await plot.press("Escape");
    await frame.getByRole("tooltip").waitFor({ state: "hidden" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const livePlot = await plot.elementHandle();
    for (const label of ["Next week", "This week", "Next week"])
      await chooseData(label);
    assert.ok(
      await livePlot.evaluate((node) => node.isConnected),
      "ordinary data updates do not unmount the plot",
    );
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll(
          '[data-example-role="interactive"] [data-slot="chart-mark"]',
        ),
      ].every((node) => !/NaN|Infinity/.test(node.getAttribute("d") ?? "")),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    console.log(
      `PASS ${id}: restored geometry controls,3 compositions, real dataset menu, state, numeric edge cases, keyboard and12 captures`,
    );
  }
  await page.goto(`${base}/docs/chart/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const intro = page.locator('[data-example-role="interactive"]');
  assert.equal(
    await intro.locator(".v-chart-frame").count(),
    1,
    "Charts introduction demonstrates one complete composition",
  );
  assert.equal(
    await intro
      .getByRole("list", { name: "Chart composition" })
      .getByRole("listitem")
      .count(),
    3,
  );
  await intro.getByRole("button", { name: "Show data", exact: true }).click();
  assert.ok(await intro.locator('[data-slot="chart-data-table"]').isVisible());
  assert.match(
    await intro.locator('[data-slot="chart-data-table"]').innerText(),
    /Wed\s+0/,
  );
  await intro.screenshot({ path: `${output}/chart-introduction.png` });
  assert.deepEqual(errors, []);
  console.log(
    "PASS Charts introduction: one useful annotated frame, real data table, zero preserved",
  );
} finally {
  await browser.close();
}
