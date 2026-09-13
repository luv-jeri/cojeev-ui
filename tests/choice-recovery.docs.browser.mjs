import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/choice-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const errors = [];
  const shapeNames = [
    "Organic",
    "Circle",
    "Rounded",
    "Pebble",
    "Leaf",
    "Flower",
  ];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const id of ["checkbox", "radio-group"]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const preview = page
      .locator('.docs-playground [data-slot="preview"]')
      .first();
    const example = preview.locator('[data-example-role="interactive"]');
    // A capture must show the product, not a hover card the test's own cursor opened.
    const restPointer = async () => {
      const box = await example.locator(".v-choice-result").boundingBox();
      if (box) await page.mouse.move(box.x + 4, box.y + box.height - 2);
      await page
        .locator(".docs-component-peek")
        .waitFor({ state: "detached", timeout: 2000 })
        .catch(() => {});
      assert.equal(
        await page.locator(".docs-component-peek").count(),
        0,
        "no sidebar quick look may cover the captured example",
      );
    };
    const role = id === "checkbox" ? "checkbox" : "radio";
    const choose = async (setting, name) => {
      await preview
        .getByRole("combobox", { name: `Example ${setting}` })
        .click();
      await page.getByRole("option", { name, exact: true }).click();
    };
    assert.equal(
      await preview
        .getByRole("combobox", { name: "Example glyph shape" })
        .count(),
      1,
      "all retained glyph silhouettes must be discoverable from the actual docs",
    );
    assert.equal(
      await preview.getByRole("combobox", { name: /corners/i }).count(),
      0,
      "Row must not offer a no-op corner setting",
    );
    const shapeMenu = preview.getByRole("combobox", {
      name: "Example glyph shape",
    });
    await shapeMenu.click();
    for (const shape of shapeNames) {
      assert.equal(
        await page
          .getByRole("option", { name: shape, exact: true })
          .locator(
            `[data-slot="selector-glyph"][data-selector-shape="${shape.toLowerCase()}"]`,
          )
          .count(),
        1,
        `the ${shape} option must show its own retained silhouette, not an unrelated icon`,
      );
    }
    assert.equal(
      await page
        .getByRole("option", { name: "Organic", exact: true })
        .locator(".v-select__indicator")
        .count(),
      1,
      "the silhouette in use must stay visibly marked as selected",
    );
    assert.equal(
      await page.getByRole("listbox").locator(".v-select__indicator").count(),
      1,
      "exactly one silhouette reads as the current choice",
    );
    const silhouette = page
      .getByRole("option", { name: "Leaf", exact: true })
      .locator('[data-slot="item-adornment"] [data-slot="selector-glyph"]');
    assert.equal(
      await silhouette.evaluate((el) => getComputedStyle(el).pointerEvents),
      "none",
      "the drawing stays decoration; the option row owns the pointer",
    );
    await silhouette.click({ force: true });
    await page.getByRole("listbox").waitFor({ state: "detached" });
    assert.deepEqual(
      await example
        .getByRole(role)
        .evaluateAll((items) => items.map((item) => item.dataset.selectorShape)),
      Array(3).fill("leaf"),
      "pointing at the drawing still chooses its silhouette",
    );
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    assert.equal(
      await page.getByRole("listbox").locator(".v-select__indicator").count(),
      0,
      "the shape marker stays local; other menus keep their existing rows",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("listbox").waitFor({ state: "detached" });
    await example.getByRole(role).nth(1).click();
    const selected = () =>
      example
        .getByRole(role)
        .evaluateAll((items) =>
          items.map((item) => item.getAttribute("aria-checked")),
        );
    const before = await selected();
    const paths = new Set();
    for (const shape of shapeNames) {
      await choose("glyph shape", shape);
      assert.deepEqual(
        await example
          .getByRole(role)
          .evaluateAll((items) =>
            items.map((item) => item.dataset.selectorShape),
          ),
        Array(3).fill(shape.toLowerCase()),
      );
      paths.add(
        await example
          .locator('[data-slot="selector-surface"]')
          .first()
          .getAttribute("d"),
      );
      assert.deepEqual(
        await selected(),
        before,
        "shape changes preserve the answer",
      );
    }
    assert.equal(
      paths.size,
      6,
      "six reachable settings produce six actual silhouettes",
    );
    for (const mark of ["Auto", "Dot", "Check", "Diamond", "Flower", "None"]) {
      await choose("selected mark", mark);
      const glyph = example
        .locator('[data-slot="selector-glyph"][data-state="checked"]')
        .first();
      assert.equal(
        await glyph.getAttribute("data-selector-indicator"),
        mark === "Auto"
          ? id === "checkbox"
            ? "check"
            : "dot"
          : mark.toLowerCase(),
      );
      if (mark === "None")
        await glyph
          .locator('[data-slot="selector-mark"]')
          .waitFor({ state: "detached" });
      else await glyph.locator('[data-slot="selector-mark"]').waitFor();
      assert.deepEqual(
        await selected(),
        before,
        "mark changes preserve the answer",
      );
    }
    await preview
      .getByRole("button", { name: "Copy code", exact: true })
      .click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, /shape="flower"/);
    assert.match(copied, /showIndicator=\{false\}/);
    await shapeMenu.press("Enter");
    await page.getByRole("listbox").waitFor();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await page.getByRole("listbox").waitFor({ state: "detached" });
    assert.deepEqual(
      await example
        .getByRole(role)
        .evaluateAll((items) => items.map((item) => item.dataset.selectorShape)),
      Array(3).fill("leaf"),
      "the shape menu stays fully operable from the keyboard",
    );
    assert.deepEqual(
      await selected(),
      before,
      "keyboard shape selection preserves the answer",
    );
    await choose("glyph shape", "Organic");
    await choose("selected mark", "Check");
    for (const approach of ["Card", "Chip", "Row"]) {
      await choose("approach", approach);
      assert.deepEqual(
        await selected(),
        before,
        "changing the composition preserves selected values",
      );
      if (approach !== "Row") {
        await choose("container corners", "Square");
        const square = await example
          .getByRole(role)
          .first()
          .evaluate((el) => getComputedStyle(el).borderRadius);
        await choose("container corners", "Round");
        const round = await example
          .getByRole(role)
          .first()
          .evaluate((el) => getComputedStyle(el).borderRadius);
        assert.notEqual(
          square,
          round,
          "the visible container-corners control changes actual geometry",
        );
      }
      assert.equal(
        await example.locator('[data-slot$="-body"] svg').count(),
        0,
        "choice copy does not add a competing illustration beside the selection glyph",
      );
      for (const width of [1440, 390])
        for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (theme) => (document.documentElement.dataset.mode = theme),
            theme,
          );
          await example.scrollIntoViewIfNeeded();
          await restPointer();
          await example.screenshot({
            path: `${output}/${id}-${approach.toLowerCase()}-${width}-${theme}.png`,
          });
          const bounds = await example.evaluate((root, role) => {
            const outer = root.getBoundingClientRect();
            return [...root.querySelectorAll(`[role="${role}"]`)].every(
              (el) => {
                const r = el.getBoundingClientRect();
                return (
                  r.height >= 44 &&
                  r.left >= outer.left - 1 &&
                  r.right <= outer.right + 1
                );
              },
            );
          }, role);
          assert.ok(
            bounds,
            "choice targets remain readable and contained on desktop and mobile",
          );
        }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const rowBorders = await example
      .locator('.v-choice-options[data-approach="row"] > *')
      .evaluateAll((items) =>
        items.map((item) => getComputedStyle(item).borderBottomWidth),
      );
    assert.equal(rowBorders.length, 3);
    assert.equal(
      rowBorders.at(-1),
      "0px",
      "the last Row control does not double the closing rule",
    );
    assert.ok(
      rowBorders.slice(0, -1).every((width) => width !== "0px"),
      "Row keeps its quiet internal divisions",
    );
    assert.notEqual(
      await example
        .locator(".v-choice-result")
        .evaluate((el) => getComputedStyle(el).borderTopWidth),
      "0px",
      "the selected-value summary remains the one closing divider",
    );
    const gallery = preview.locator('[data-example-role="gallery"]');
    const tiles = await gallery.count();
    assert.ok(tiles >= 3, "every retained approach keeps a comparison tile");
    assert.equal(
      await gallery.locator(".v-choice-example header").count(),
      0,
      "comparison tiles let their approach label lead",
    );
    for (let tile = 0; tile < tiles; tile += 1) {
      assert.equal(
        await gallery.nth(tile).locator('[role="status"]').count(),
        1,
        "every comparison tile keeps live selection feedback",
      );
      assert.equal(
        await gallery
          .nth(tile)
          .locator(
            `[role="${role === "checkbox" ? "group" : "radiogroup"}"][aria-label]`,
          )
          .count(),
        1,
        "every interactive comparison tile keeps an accessible group name",
      );
    }
    const control = example.getByRole(role).nth(1);
    await control.focus();
    if (id === "checkbox") {
      const checked = await control.getAttribute("aria-checked");
      await control.press("Space");
      assert.notEqual(await control.getAttribute("aria-checked"), checked);
    } else {
      await control.press("ArrowDown");
      await page.waitForFunction(
        () =>
          document
            .querySelector(
              '[data-example-role="interactive"] [role="radio"]:nth-child(3)',
            )
            ?.getAttribute("aria-checked") === "true",
        undefined,
        { timeout: 2000 },
      );
      assert.equal(
        await example.getByRole(role).nth(2).getAttribute("aria-checked"),
        "true",
      );
    }
    console.log(
      `PASS ${id}: original shapes/marks and answers retained through all live settings`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS choice recovery: six named silhouettes in the menu, five marks plus hidden, preserved answers, honest corners, one closing rule, named compact tiles, copy, keyboard and 24 responsive/theme captures",
  );
} finally {
  await browser.close();
}
