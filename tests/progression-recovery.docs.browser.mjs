import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/ui",
  output = "output/playwright/progression-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(12000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const example = page.locator(
    '.docs-playground [data-example-role="interactive"]',
  );
  const choose = async (name) => {
    await page.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name, exact: true }).click();
  };
  for (const [id, names] of Object.entries({
    breadcrumb: ["Trail", "Pocket", "Directory"],
  })) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    for (const name of names)
      assert.equal(
        await page
          .locator(
            `[data-example-role="gallery"][data-variant="${name.toLowerCase()}"]`,
          )
          .count(),
        1,
        `${id}/${name} is discoverable`,
      );
    if (id === "breadcrumb") {
      await choose("Pocket");
      await example.getByRole("button", { name: "Show ancestors" }).click();
      await page
        .getByRole("menuitem", { name: "Library", exact: true })
        .focus();
      await page.keyboard.press("Escape");
      assert.equal(
        await example
          .getByRole("button", { name: "Show ancestors" })
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await choose("Directory");
      await example.getByRole("button", { name: "Go to Field notes" }).click();
      assert.equal(
        await example.locator('[aria-current="page"]').innerText(),
        "Field notes",
      );
      await example.getByRole("button", { name: "Reset path" }).click();
    }
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    for (const name of names) {
      await choose(name);
      for (const width of [1280, 390])
        for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.evaluate(
            (t) => (document.documentElement.dataset.mode = t),
            theme,
          );
          await example.scrollIntoViewIfNeeded();
          await page.mouse.move(width - 5, 5);
          await page.waitForTimeout(100);
          if (id === "breadcrumb" && name === "Pocket")
            assert.equal(
              await example
                .locator('[data-slot="breadcrumb-page"]')
                .evaluate(
                  (n) =>
                    n.getBoundingClientRect().top >
                    n
                      .closest("nav")
                      .querySelector('[data-slot="breadcrumb-link"]')
                      .getBoundingClientRect().top +
                      20,
                ),
              true,
              "Pocket gives the current page its own deliberate line",
            );
          assert.equal(
            await example.evaluate((el) =>
              [...el.querySelectorAll("button,a,input,[data-step-panel]")].some(
                (n) => {
                  const b = n.getBoundingClientRect(),
                    r = el.getBoundingClientRect();
                  return (
                    b.width > 0 &&
                    (b.right > r.right + 1 || b.left < r.left - 1)
                  );
                },
              ),
            ),
            false,
            "Native content stays inside its example",
          );
          await example.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${theme}.png`,
          });
        }
      await page.setViewportSize({ width: 1280, height: 1000 });
    }
    await page
      .getByRole("button", { name: "Copy code", exact: true })
      .first()
      .click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      new RegExp(`variant="${names.at(-1).toLowerCase()}"`),
    );
  }
  console.log(
    "PASS progression docs: three approaches, useful ancestors, keyboard, 12 theme/responsive captures and configured copy",
  );
} finally {
  await browser.close();
}
