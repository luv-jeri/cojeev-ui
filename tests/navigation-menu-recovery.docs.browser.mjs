import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/navigation-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/docs/navigation-menu/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const example = preview.locator('[data-example-role="interactive"]');
  assert.equal(
    await preview.locator('[data-example-role="gallery"]').count(),
    3,
    "Directory, Shelf and Compact must be real useful navigation approaches",
  );
  for (const approach of ["Directory", "Shelf", "Compact"]) {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: approach, exact: true }).click();
    if (approach !== "Directory") {
      const trigger = example.getByRole("button", {
        name: "Collections",
        exact: true,
      });
      await trigger.click();
      await example.getByRole("link", { name: /Ideas/ }).waitFor();
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () =>
          document
            .querySelector(
              '[data-example-role="interactive"] [data-slot="navigation-menu-trigger"]',
            )
            ?.getAttribute("aria-expanded") === "false",
      );
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.ok(
        await trigger.evaluate(async (node) => {
          for (let i = 0; i < 24; i++) {
            await new Promise(requestAnimationFrame);
            if (node.getAttribute("aria-expanded") !== "false") return false;
          }
          return true;
        }),
        "Escape is not undone by a pending hover-open",
      );
      await trigger.focus();
      await trigger.press("Enter");
      await page.waitForFunction(
        () =>
          document
            .querySelector(
              '[data-example-role="interactive"] [data-slot="navigation-menu-trigger"]',
            )
            ?.getAttribute("aria-expanded") === "true",
      );
    }
    const ideas = example.getByRole("link", { name: /Ideas/ });
    await ideas.click();
    assert.match(await example.innerText(), /Collection: Ideas/);
    if (approach !== "Directory") {
      const trigger = example.getByRole("button", {
        name: "Collections",
        exact: true,
      });
      await trigger.focus();
      if ((await trigger.getAttribute("aria-expanded")) !== "true")
        await trigger.press("Enter");
    }
    const reading = example.getByRole("link", { name: /Reading/ });
    await reading.focus();
    await reading.press("Enter");
    assert.match(await example.innerText(), /Collection: Reading/);
    if (approach !== "Directory") {
      const trigger = example.getByRole("button", {
        name: "Resources",
        exact: true,
      });
      await trigger.focus();
      if ((await trigger.getAttribute("aria-expanded")) !== "true")
        await trigger.press("Enter");
      await example.getByRole("link", { name: /Templates/ }).waitFor();
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
          await example
            .locator('[data-slot="navigation-menu-trigger"]')
            .evaluateAll((nodes) =>
              nodes.every((node) => {
                const probe = document.createElement("i");
                probe.style.color = "var(--nav-ink)";
                node.append(probe);
                const expected = getComputedStyle(probe).color;
                probe.remove();
                return getComputedStyle(node).color === expected;
              }),
            ),
          "standalone menu labels use paired navigation ink in either theme",
        );
        await example.screenshot({
          path: `${output}/navigation-menu-${approach.toLowerCase()}-${width}-${theme}.png`,
          style: ".report-launcher,nextjs-portal{visibility:hidden!important}",
        });
        assert.ok(
          await example.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1,
          ),
          `${approach} fits the preview`,
        );
      }
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.keyboard.press("Escape");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Navigation Menu: Directory, real Shelf/Compact content, pointer/keyboard destinations, Escape and12 captures",
  );
} finally {
  await browser.close();
}
