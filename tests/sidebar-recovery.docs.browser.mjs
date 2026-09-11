import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/sidebar-recovery";
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
  await page.goto(`${base}/docs/sidebar/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  await page.addStyleTag({
    content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
  });
  const root = page.locator(".docs-playground [data-example-role=interactive]");
  for (const name of ["folio", "index", "drawer"])
    assert.equal(
      await page
        .locator(`[data-example-role=gallery][data-variant=${name}]`)
        .count(),
      1,
      `${name} is a real approach`,
    );
  await root.getByRole("button", { name: "Ideas", exact: true }).click();
  await root
    .getByRole("textbox", { name: "Workspace draft", exact: true })
    .fill("Keep this draft");
  for (const name of ["Folio", "Index", "Drawer"]) {
    await page
      .getByRole("combobox", { name: "Example approach", exact: true })
      .click();
    await page.getByRole("option", { name, exact: true }).click();
    assert.match(await root.getByRole("status").innerText(), /Ideas/);
    assert.equal(
      await root
        .getByRole("textbox", { name: "Workspace draft", exact: true })
        .inputValue(),
      "Keep this draft",
    );
    for (const width of [1280, 390])
      for (const mode of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1050 });
        await page.evaluate(
          (m) => (document.documentElement.dataset.mode = m),
          mode,
        );
        await root.scrollIntoViewIfNeeded();
        let dialog;
        if (name === "Drawer") {
          await root
            .getByRole("button", {
              name: "Open notebook navigation",
              exact: true,
            })
            .click();
          dialog = page.getByRole("dialog", {
            name: "Your notebook",
            exact: true,
          });
          await dialog.waitFor();
        }
        await page.waitForTimeout(180);
        assert.equal(
          await root.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          true,
        );
        await page.screenshot({
          path: `${output}/${name.toLowerCase()}-${width}-${mode}.png`,
        });
        if (dialog) {
          await dialog.press("Escape");
          await dialog.waitFor({ state: "hidden" });
        }
      }
    await page.setViewportSize({ width: 1280, height: 1050 });
    if (name !== "Drawer") {
      await root
        .getByRole("button", { name: "Collapse the rail", exact: true })
        .click();
      await page.waitForTimeout(180);
      assert.equal(
        await root
          .getByRole("button", { name: "Ideas", exact: true })
          .isVisible(),
        true,
      );
      await page.screenshot({
        path: `${output}/${name.toLowerCase()}-collapsed.png`,
      });
      await root
        .getByRole("button", { name: "Expand the rail", exact: true })
        .click();
    }
  }
  await root
    .getByRole("button", { name: "Open notebook navigation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Your notebook",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Archive", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.match(await root.getByRole("status").innerText(), /Archive/);
  await page
    .getByRole("button", { name: "Copy code", exact: true })
    .first()
    .click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /variant="drawer"/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Sidebar actual three approaches,14 captures, retained draft/selection, collapsed labels, drawer selection/dismissal/copy",
  );
} finally {
  await browser.close();
}
