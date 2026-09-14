import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/collection-actions-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const [id, names] of [
    ["toggle", ["Tool", "Bookmark", "Preference"]],
    ["item", ["Ledger", "Cover", "Detail"]],
  ]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    const root = page.locator(
      '.docs-playground [data-example-role="interactive"]',
    );
    for (const name of names)
      assert.equal(
        await page
          .locator(
            `[data-example-role="gallery"][data-variant="${name.toLowerCase()}"]`,
          )
          .count(),
        1,
        `${name} approach is discoverable`,
      );
    if (id === "toggle")
      await root.getByRole("button", { name: "Pin note", exact: true }).click();
    else
      await root
        .getByRole("button", { name: "Select Small discoveries", exact: true })
        .click();
    for (const name of names) {
      await page
        .getByRole("combobox", { name: "Example approach", exact: true })
        .click();
      await page.getByRole("option", { name, exact: true }).click();
      if (id === "toggle")
        assert.equal(
          await root
            .getByRole("button", { name: "Pin note", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
      else
        assert.match(
          await root.getByRole("status").innerText(),
          /Small discoveries/,
        );
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await root.scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);
          assert.equal(
            await root.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
            true,
            `${id} ${name} fits ${width}`,
          );
          await page.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}.png`,
          });
        }
      await page.setViewportSize({ width: 1280, height: 1050 });
    }
    if (id === "item") {
      await root
        .getByRole("button", { name: "Keep Small discoveries", exact: true })
        .click();
      assert.equal(
        await root
          .getByRole("button", { name: "Keep Small discoveries", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
    }
    await page
      .getByRole("combobox", { name: "Example corners", exact: true })
      .click();
    await page.getByRole("option", { name: "Square", exact: true }).click();
    await page
      .getByRole("button", { name: "Copy code", exact: true })
      .first()
      .click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, /--v-control-radius/);
    assert.match(copied, new RegExp(`variant="${names.at(-1).toLowerCase()}"`));
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Toggle/Item: six real approaches,24 responsive theme captures, retained state, actual actions/corners/copy",
  );
} finally {
  await browser.close();
}
