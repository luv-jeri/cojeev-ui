import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/dialog-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: "reduce",
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const [id, names] of [
    ["dialog", ["Confirmation", "Editor", "Exhibit"]],
    ["linear-modal", ["Card", "Centered", "Gallery"]],
  ]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    const root = page.locator(
      ".docs-playground [data-example-role=interactive]",
    );
    for (const name of names)
      assert.equal(
        await page
          .locator(
            `[data-example-role=gallery][data-variant=${name.toLowerCase()}]`,
          )
          .count(),
        1,
        `${id} ${name} is a real documented approach`,
      );
    for (const name of names) {
      await page
        .getByRole("combobox", { name: "Example approach", exact: true })
        .click();
      await page.getByRole("option", { name, exact: true }).click();
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await root.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}-closed.png`,
          });
          const opener =
            id === "dialog"
              ? root.getByRole("button", { name: "Open note", exact: true })
              : root.getByRole("button", {
                  name: "Read Room for good ideas",
                  exact: true,
                });
          await opener.click();
          const modal = page.getByRole("dialog");
          await modal.waitFor();
          await page.waitForTimeout(200);
          assert.equal(
            await modal
              .locator("[data-slot=scroll-area-viewport]")
              .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
            true,
          );
          const b = await modal.boundingBox();
          assert.ok(
            b.x >= 0 &&
              b.y >= 0 &&
              b.x + b.width <= width + 1 &&
              b.y + b.height <= 1001,
          );
          await page.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}-open.png`,
          });
          await modal.press("Escape");
          await modal.waitFor({ state: "hidden" });
          assert.equal(
            await opener.evaluate((e) => document.activeElement === e),
            true,
          );
        }
      await page.setViewportSize({ width: 1280, height: 1000 });
    }
    await page
      .getByRole("button", { name: "Copy code", exact: true })
      .first()
      .click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      new RegExp(`${id === "dialog" ? "DialogExample" : "LinearModalExample"}`),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Dialog / Linear Modal six actual approaches,48 responsive/theme captures, native focus and configured copy",
  );
} finally {
  await browser.close();
}
