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
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/docs/pagination/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const example = preview.locator('[data-example-role="interactive"]');
  const next = example.getByRole("button", { name: "Next", exact: true });
  const start = await next.boundingBox();
  for (let n = 2; n <= 7; n++) {
    await next.click();
    await page.waitForFunction(
      (n) =>
        document
          .querySelector(
            '[data-example-role="interactive"] [data-slot="pagination"]',
          )
          ?.getAttribute("data-page") === String(n),
      n,
    );
    const box = await next.boundingBox();
    assert.ok(
      Math.abs(box.x - start.x) < 1 && Math.abs(box.y - start.y) < 1,
      "Next stays put while the page window changes",
    );
    const current = example.locator('[aria-current="page"]');
    assert.equal(
      await current.count(),
      1,
      "exactly one current page, including during transitions",
    );
    assert.ok(
      (await current.boundingBox()).height >= 44,
      "page links are touch sized",
    );
  }
  assert.equal(
    await preview.locator('[data-example-role="gallery"]').count(),
    3,
    "Pages, Chapter and Jump are real compositions",
  );
  for (const approach of ["Pages", "Chapter", "Jump"]) {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: approach, exact: true }).click();
    assert.equal(
      await example
        .locator('[data-slot="pagination"]')
        .getAttribute("data-page"),
      "7",
    );
    if (approach === "Jump") {
      await example.getByRole("spinbutton", { name: "Go to page" }).fill("11");
      await example.getByRole("button", { name: "Go", exact: true }).click();
      assert.equal(
        await example
          .locator('[data-slot="pagination"]')
          .getAttribute("data-page"),
        "11",
      );
      await example.getByRole("spinbutton", { name: "Go to page" }).fill("7");
      await example
        .getByRole("spinbutton", { name: "Go to page" })
        .press("Enter");
    }
    for (const width of [1440, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await example.scrollIntoViewIfNeeded();
        await example.screenshot({
          path: `${output}/pagination-${approach.toLowerCase()}-${width}-${theme}.png`,
          style: ".report-launcher,nextjs-portal{visibility:hidden!important}",
        });
        assert.ok(
          await example.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1,
          ),
          `pagination fits the preview: ${approach}/${width}/${theme} ` +
            JSON.stringify(
              await example.evaluate((node) => ({
                width: node.clientWidth,
                scroll: node.scrollWidth,
                children: [
                  ...node.querySelectorAll(
                    '[data-slot="pagination"],.v-pager__pages,.v-pager__info,[data-pager-direction]',
                  ),
                ].map((el) => ({
                  slot: el.className,
                  width: el.clientWidth,
                  scroll: el.scrollWidth,
                  x: el.getBoundingClientRect().x,
                })),
              })),
            ),
        );
        await example.screenshot({
          path: `${output}/pagination-${approach.toLowerCase()}-${width}-${theme}.png`,
        });
      }
    await page.setViewportSize({ width: 1440, height: 1100 });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Pagination: stable page-change targets, three approaches, current state, page entry, responsive/theme captures",
  );
  await page.goto(`${base}/docs/tabs/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const tabExample = page.locator('[data-example-role="interactive"]');
  const tabsRoot = tabExample.locator('[data-slot="tabs"]').first();
  const readings = tabExample.getByRole("tab", { name: /Reading/ });
  await tabExample.scrollIntoViewIfNeeded();
  const beforeHeight = (await tabsRoot.boundingBox()).height;
  await readings.click();
  const frameHeights = await tabsRoot.evaluate(async (root) => {
    const samples = [];
    for (let i = 0; i < 16; i++) {
      samples.push(root.getBoundingClientRect().height);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  const afterHeight = (await tabsRoot.boundingBox()).height;
  assert.ok(
    Math.max(...frameHeights) <= Math.max(beforeHeight, afterHeight) + 4,
    "entering and exiting tabs must not stack two panels in layout",
  );
  assert.equal(
    await preview.locator('[data-example-role="gallery"]').count(),
    5,
    "retained Pills/Underline/Lenses plus Notebook and Rail",
  );
  for (const approach of ["Notebook", "Rail", "Underline", "Pills", "Lenses"]) {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: approach, exact: true }).click();
    if (approach === "Underline")
      assert.ok(
        await tabExample
          .getByRole("tablist")
          .evaluate((node) =>
            [
              ...node.querySelectorAll(
                ":scope > .v-glide__pill, :scope > .v-glide__hover, :scope > .v-glide__trail",
              ),
            ].every((layer) => getComputedStyle(layer).position === "absolute"),
          ),
        "changing a same-kind tab appearance keeps motion paint out of layout",
      );
    assert.equal(
      await readings.getAttribute("aria-selected"),
      "true",
      "approach change preserves selected section",
    );
    await readings.focus();
    await readings.press("Home");
    await tabExample
      .getByRole("tab", { name: "Notes", exact: true })
      .press(approach === "Rail" ? "ArrowDown" : "ArrowRight");
    await tabExample
      .locator('[role="tab"][aria-selected="true"]')
      .filter({ hasText: "Ideas" })
      .waitFor();
    assert.equal(
      await tabExample
        .getByRole("tab", { name: "Ideas", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    await tabExample
      .getByRole("button", { name: "Save collection", exact: true })
      .click();
    await readings.click();
    await tabExample.getByRole("tab", { name: "Ideas", exact: true }).click();
    assert.ok(
      await tabExample
        .getByRole("button", { name: "Collection saved", exact: true })
        .isVisible(),
    );
    await tabExample
      .getByRole("button", { name: "Collection saved", exact: true })
      .click();
    await readings.click();
    for (const width of [1440, 390])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await tabExample.scrollIntoViewIfNeeded();
        const tabBounds = await tabExample
          .getByRole("tablist")
          .evaluate((node) => {
            const list = node.getBoundingClientRect();
            return [...node.querySelectorAll('[role="tab"]')].map((tab) => {
              const box = tab.getBoundingClientRect();
              return {
                label: tab.textContent,
                visible:
                  box.left >= list.left - 1 && box.right <= list.right + 1,
                left: box.left,
                right: box.right,
                listRight: list.right,
              };
            });
          });
        assert.ok(
          tabBounds.every((tab) => tab.visible),
          `${approach} at ${width}px ${theme}: labels fully visible: ${JSON.stringify(tabBounds)}`,
        );
        if (["Notebook", "Rail"].includes(approach))
          assert.ok(
            await tabExample.getByRole("tab").evaluateAll((nodes) =>
              nodes.every((node) => {
                const probe = document.createElement("i");
                probe.style.color = "var(--v-text)";
                node.append(probe);
                const expected = getComputedStyle(probe).color;
                probe.remove();
                return (
                  getComputedStyle(node).color === expected ||
                  node.getAttribute("aria-selected") !== "true"
                );
              }),
            ),
            "selected labels have immediate paired ink, not a delayed theme transition",
          );
        await tabExample.screenshot({
          path: `${output}/tabs-${approach.toLowerCase()}-${width}-${theme}.png`,
          style: ".report-launcher,nextjs-portal{visibility:hidden!important}",
        });
        assert.ok(
          await tabExample.evaluate(
            (node) => node.scrollWidth <= node.clientWidth + 1,
          ),
          `${approach} tabs fit the preview`,
        );
      }
    await page.setViewportSize({ width: 1440, height: 1100 });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Tabs: single panel position, retained styles plus Notebook/Rail, stateful actions, horizontal/vertical keys and20 captures",
  );
} finally {
  await browser.close();
}
