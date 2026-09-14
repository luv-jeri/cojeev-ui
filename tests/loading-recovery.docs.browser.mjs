import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/loading-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const [id, names] of [
    ["skeleton", ["Article", "Profile", "Board"]],
    ["spinner", ["Bloom", "Orbit", "Relay"]],
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
    if (id === "skeleton") {
      const region = root.locator('[data-slot="skeleton-async"]');
      assert.equal(await region.getAttribute("aria-busy"), "true");
      assert.equal(
        await region
          .locator('[data-slot="skeleton-async-content"]')
          .getAttribute("inert"),
        "",
      );
      await root
        .getByRole("button", { name: "Show content", exact: true })
        .click();
      const input = root.getByRole("textbox", {
        name: "A note for later",
        exact: true,
      });
      await input.fill("Keep this useful thought");
      for (const name of names) {
        await choose("approach", name);
        assert.equal(await input.inputValue(), "Keep this useful thought");
        assert.equal(await region.getAttribute("aria-busy"), "false");
      }
      await root
        .getByRole("button", { name: "Show placeholder", exact: true })
        .click();
      for (const effect of ["Shimmer", "Pulse", "Ink"]) {
        await choose("placeholder effect", effect);
        assert.equal(
          await region
            .locator('[data-slot="skeleton-item"]')
            .first()
            .getAttribute("data-effect"),
          effect.toLowerCase(),
        );
      }
      await root
        .getByRole("button", { name: "Show content", exact: true })
        .click();
      assert.equal(await input.inputValue(), "Keep this useful thought");
      await root
        .getByRole("button", { name: "Show placeholder", exact: true })
        .click();
      assert.equal(
        await root.locator("[data-building-block]").count(),
        6,
        "All legacy placeholder shapes remain discoverable",
      );
    } else {
      const indicator = root.locator('[data-slot="spinner"]');
      await choose("seed shape", "Point");
      assert.match(await indicator.getAttribute("class"), /-point/);
      await root
        .getByRole("button", { name: "Pause preview", exact: true })
        .click();
      assert.equal(await indicator.getAttribute("data-animated"), null);
      for (const name of names) {
        await choose("approach", name);
        assert.equal(
          await indicator.getAttribute("data-appearance"),
          name.toLowerCase(),
        );
        assert.equal(await indicator.getAttribute("data-paused"), "true");
      }
      await root
        .getByRole("button", { name: "Resume preview", exact: true })
        .click();
      await root
        .getByRole("button", { name: "Finish preview", exact: true })
        .click();
      assert.equal(await indicator.count(), 0);
      await root.getByText("Preview complete", { exact: true }).waitFor();
      await root
        .getByRole("button", { name: "Restart preview", exact: true })
        .click();
      await indicator.waitFor();
    }
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    if (id === "skeleton") {
      for (const effect of ["Shimmer", "Pulse", "Ink"]) {
        await choose("placeholder effect", effect);
        await root.scrollIntoViewIfNeeded();
        await root.screenshot({
          path: `${output}/skeleton-effect-${effect.toLowerCase()}.png`,
        });
      }
      await choose("placeholder effect", "Shimmer");
    }
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
          await page.mouse.move(width - 5, 5);
          await page.waitForTimeout(120);
          assert.equal(
            await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
            `${id} fits the specimen`,
          );
          await root.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}.png`,
          });
          if (id === "skeleton") {
            await root
              .getByRole("button", { name: "Show content", exact: true })
              .click();
            assert.equal(
              await root
                .getByRole("textbox", { name: "A note for later", exact: true })
                .inputValue(),
              "Keep this useful thought",
            );
            await root.screenshot({
              path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}-ready.png`,
            });
            await root
              .getByRole("button", { name: "Show placeholder", exact: true })
              .click();
          }
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
  console.log(
    "PASS Skeleton/Spinner docs: useful layouts, retained edits/choices, loading/quiet controls, 24 responsive theme captures and copy",
  );
} finally {
  await browser.close();
}
