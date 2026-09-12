import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/identity-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [id, names] of [
    ["avatar", ["Portrait", "Identity", "Participants"]],
    ["badge", ["Stamp", "Tag", "Counter"]],
  ]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const root = page.locator(
      '.docs-playground [data-example-role="interactive"]',
    );
    const choose = async (label, name) => {
      await page.getByRole("combobox", { name: `Example ${label}` }).click();
      await page.getByRole("option", { name, exact: true }).click();
    };
    for (const name of names)
      assert.equal(
        await page
          .locator(
            `[data-example-role="gallery"][data-variant="${name.toLowerCase()}"]`,
          )
          .count(),
        1,
        `${id} ${name} is discoverable`,
      );
    if (id === "avatar") {
      await page.addStyleTag({
        content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
      });
      await root.locator('[data-slot="avatar-image"]').first().waitFor();
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          (mode) => (document.documentElement.dataset.mode = mode),
          mode,
        );
        await root.screenshot({ path: `${output}/avatar-artwork-${mode}.png` });
      }
      await root
        .getByRole("textbox", { name: "Display name", exact: true })
        .fill("Anaya Rao");
      await root
        .getByRole("button", { name: "Show initials", exact: true })
        .click();
      for (const name of names) {
        await choose("approach", name);
        assert.match(await root.innerText(), /Anaya Rao/);
      }
      await root
        .getByRole("button", { name: "Show all participants", exact: true })
        .click();
      assert.equal(
        await root
          .getByRole("list", { name: "Participants" })
          .getByRole("listitem")
          .count(),
        4,
      );
      await choose("avatar shape", "Rounded");
      await choose("avatar accent", "Blue");
      assert.equal(
        await root
          .locator('[data-slot="avatar"]')
          .first()
          .getAttribute("data-avatar-shape"),
        "rounded",
      );
      const dimensions = [];
      for (const size of ["Sm", "Default", "Lg"]) {
        await choose("size", size);
        dimensions.push(
          (await root.locator('[data-slot="avatar"]').first().boundingBox())
            .width,
        );
      }
      assert.ok(
        dimensions[0] < dimensions[1] && dimensions[1] < dimensions[2],
        "All three sizes change the identity",
      );
      await choose("size", "Default");
    } else {
      await root
        .getByRole("button", { name: "Mark ready", exact: true })
        .click();
      for (const name of names) {
        await choose("approach", name);
        assert.match(await root.innerText(), /Ready for review/);
      }
      await root
        .getByRole("button", { name: "Add a local note", exact: true })
        .click();
      assert.equal(await root.locator("[data-badge-count]").innerText(), "4");
      await choose("badge treatment", "Blue");
    }
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    for (const name of names) {
      await choose("approach", name);
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await root.scrollIntoViewIfNeeded();
          await page.mouse.move(width - 4, 5);
          await page.waitForTimeout(120);
          assert.equal(
            await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
            `${id} ${name} fits`,
          );
          await root.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}.png`,
          });
        }
      await page.setViewportSize({ width: 1280, height: 1050 });
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
  assert.deepEqual(errors, []);
  console.log(
    "PASS identity/badge actual docs: named layouts, preserved identity/status/count, independent shape/tone and24 responsive/theme captures plus copy",
  );
} finally {
  await browser.close();
}
