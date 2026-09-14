import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/activity-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const id of (
    process.env.COMPONENTS ?? "activity-feed,milestone-path"
  ).split(",")) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const root = page.locator(
      '.docs-playground [data-example-role="interactive"]',
    );
    if (id === "activity-feed") {
      const entries = root.locator("[data-activity-entry]");
      assert.equal(await entries.count(), 2);
      await root
        .getByRole("button", { name: "Add an example update", exact: true })
        .click();
      assert.equal(
        await entries.count(),
        3,
        "Prepending preserves the two updates already visible",
      );
      await root
        .getByRole("button", { name: "Show 2 more", exact: true })
        .click();
      assert.equal(await entries.count(), 5);
      assert.equal(
        await page.evaluate(() =>
          document.activeElement?.getAttribute("data-activity-entry"),
        ),
        "draft",
      );
      assert.ok(
        (await root.locator(".v-activity-feed__group").count()) >= 2,
        "Date groups help scan the history",
      );
    } else {
      for (const name of ["Journey", "Sequence", "Review"])
        assert.equal(
          await page
            .locator(
              `[data-example-role="gallery"][data-variant="${name.toLowerCase()}"]`,
            )
            .count(),
          1,
          `${name} is discoverable`,
        );
      await root
        .getByRole("button", { name: "Make a first version", exact: true })
        .click();
      await root.getByRole("region", { name: "Selected milestone" }).waitFor();
      await root
        .getByRole("button", { name: "Complete this milestone", exact: true })
        .click();
    }
    for (const name of id === "activity-feed"
      ? ["default"]
      : ["journey", "sequence", "review"]) {
      if (id === "milestone-path") {
        await page.getByRole("combobox", { name: "Example approach" }).click();
        await page
          .getByRole("option", {
            name: name[0].toUpperCase() + name.slice(1),
            exact: true,
          })
          .click();
        assert.equal(
          await root
            .locator('[data-milestone-id][data-state="complete"]')
            .count(),
          2,
        );
        assert.match(
          await root
            .getByRole("region", { name: "Selected milestone" })
            .innerText(),
          /Make a first version/,
        );
      }
      await page.addStyleTag({
        content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
      });
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await root.scrollIntoViewIfNeeded();
          await page.mouse.move(width - 4, 5);
          await page.waitForTimeout(100);
          assert.equal(
            await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
            `${id} ${name} fits`,
          );
          await root.screenshot({
            path: `${output}/${id}-${name}-${width}-${mode}.png`,
          });
        }
      await page.setViewportSize({ width: 1280, height: 1050 });
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS activity and milestone docs: retained visible entries, group hierarchy, three progress arrangements, selection continuity and16 responsive/theme views",
  );
} finally {
  await browser.close();
}
