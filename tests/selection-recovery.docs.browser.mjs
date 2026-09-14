import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/selection-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const cases = {
  "multi-select": ["Tokens", "Summary", "Checklist"],
  select: ["Field", "Action", "Rich"],
  "native-select": ["Field", "Toolbar", "Listbox"],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(12000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const choose = async (control, value) => {
    await page.getByRole("combobox", { name: `Example ${control}` }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  for (const [id, approaches] of Object.entries(cases)) {
    if (
      process.env.RECOVERY_COMPONENTS &&
      !process.env.RECOVERY_COMPONENTS.split(",").includes(id)
    )
      continue;
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const example = page.locator(
      '.docs-playground [data-example-role="interactive"]',
    );
    for (const name of approaches)
      assert.equal(
        await page
          .locator(
            `[data-example-role="gallery"][data-variant="${name.toLowerCase()}"]`,
          )
          .count(),
        1,
        `${id}: ${name} must be discoverable`,
      );
    if (id === "multi-select") {
      await example
        .getByRole("button", { name: "Workspaces", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Workspaces" })
        .getByRole("searchbox", { name: "Search Workspaces" })
        .fill("Research");
      await page
        .getByRole("dialog", { name: "Workspaces" })
        .getByRole("checkbox", { name: "Research" })
        .click();
      await page.keyboard.press("Escape");
      assert.equal(
        await example.locator('input[name="workspaces"]').count(),
        2,
      );
      for (const name of approaches) {
        await choose("approach", name);
        assert.equal(
          await example.locator('input[name="workspaces"]').count(),
          2,
        );
      }
      assert.equal(
        await example
          .getByRole("button", { name: "Workspaces", exact: true })
          .count(),
        0,
        "Checklist needs no popup step",
      );
      for (const [art, hasIcon, hasBackground] of [
        ["Icon only", true, false],
        ["Blob only", false, true],
        ["Both", true, true],
      ]) {
        await choose("item art", art);
        const decoration = example
          .locator('[data-slot="item-adornment"]')
          .first();
        assert.equal(
          await decoration.getAttribute("data-icon"),
          hasIcon ? "true" : null,
        );
        assert.equal(
          await decoration.getAttribute("data-background"),
          hasBackground ? "true" : null,
        );
        assert.equal(
          await example.locator('input[name="workspaces"]').count(),
          2,
        );
      }
      await choose("item art", "None");
      assert.equal(
        await example.locator('[data-slot="item-adornment"]').count(),
        0,
      );
      await example
        .getByRole("searchbox", { name: "Search Workspaces" })
        .fill("zzzz-no-result");
      await example.getByText("No matching workspaces.").waitFor();
      await example
        .getByRole("searchbox", { name: "Search Workspaces" })
        .fill("");
      await example
        .getByRole("checkbox", { name: "Research", exact: true })
        .focus();
      await page.keyboard.press("Space");
      assert.equal(
        await example.locator('input[name="workspaces"]').count(),
        1,
      );
      await choose("approach", "Tokens");
      const remove = example.getByRole("button", { name: "Remove Writing" });
      const box = await remove.boundingBox();
      assert.ok(
        box.width >= 44 && box.height >= 44,
        "Token removal has an accessible stable hit area",
      );
      await remove.click();
      assert.equal(
        await example.locator('input[name="workspaces"]').count(),
        0,
      );
      await choose("approach", "Checklist");
      await example
        .getByRole("checkbox", { name: "Writing", exact: true })
        .click();
      await example.getByRole("button", { name: "Save selection" }).click();
      assert.match(
        await example.getByRole("status").last().innerText(),
        /Writing/,
      );
    } else if (id === "select") {
      const trigger = example.getByRole("combobox", { name: "Review rhythm" });
      await trigger.locator('svg.v-morph').waitFor({state:"attached"});
      assert.equal(await trigger.evaluate(el=>getComputedStyle(el).backgroundColor),"rgba(0, 0, 0, 0)","The native field must not cover its painted contour");
      await trigger.click();
      await page.getByRole("option", { name: "Weekly", exact: true }).click();
      for (const name of approaches) {
        await choose("approach", name);
        assert.equal(await trigger.innerText(), "Weekly");
      }
      await trigger.click();
      await page.getByRole("option", { name: /Daily/ }).click();
      assert.equal(
        await trigger.innerText(),
        "Daily",
        "Rich descriptions must not become the selected value",
      );
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(
        () => document.activeElement?.getAttribute("role") === "option",
      );
      await page.keyboard.press("End");
      await page.waitForFunction(() =>
        document.activeElement?.textContent?.startsWith("Off"),
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await trigger.innerText(),
        "Off",
        "Keyboard skips the disabled Monthly option",
      );
      await choose("approach", "Action");
      await example.getByRole("button", { name: "Apply rhythm" }).click();
      assert.match(await example.getByRole("status").innerText(), /Off/);
    } else {
      const native = example.locator("select");
      assert.notEqual(
        await native.evaluate((el) => getComputedStyle(el).backgroundImage),
        "none",
        "Native field retains its dropdown indicator after appearance styling",
      );
      const controlId = await native.getAttribute("id");
      assert.ok(
        controlId &&
          (await example.locator(`label[for="${controlId}"]`).count()),
      );
      await native.selectOption("weekly");
      for (const name of approaches) {
        await choose("approach", name);
        assert.equal(await native.inputValue(), "weekly");
      }
      assert.equal(
        await native.getAttribute("size"),
        "4",
        "Listbox is the real native visible list",
      );
      await native.selectOption("off");
      await choose("approach", "Toolbar");
      await example.getByRole("button", { name: "Apply rhythm" }).click();
      assert.match(await example.getByRole("status").innerText(), /Off/);
    }
    await choose("field surface", "Editorial");
    assert.equal(
      await page.getByRole("combobox", { name: "Example Corners" }).count(),
      0,
    );
    await choose("field surface", "Contour");
    await choose("corners", "Square");
    const surface = example
      .locator(
        id === "multi-select"
          ? '[data-slot="multi-select"] input[type="search"],.v-multi-select__trigger'
          : id === "select"
            ? '[data-slot="select-trigger"]'
            : "select",
      )
      .first();
    assert.equal(
      await surface.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
      "0px",
    );
    await choose("corners", "Pill");
    assert.ok(
      parseFloat(
        await surface.evaluate(
          (el) => getComputedStyle(el).borderTopLeftRadius,
        ),
      ) > 0,
    );
    for (const width of [390, 1280])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        for (const name of approaches) {
          await choose("approach", name);
          await example.evaluate((el) =>
            el.scrollIntoView({ block: "center" }),
          );
          await page.mouse.move(width - 15, 16);
          assert.deepEqual(
            await example.evaluate((el) => {
              const box = el.getBoundingClientRect();
              return [
                ...el.querySelectorAll(
                  'input:not([type="hidden"]),button,select,label',
                ),
              ]
                .filter((node) => {
                  const rect = node.getBoundingClientRect();
                  return (
                    rect.width > 0 &&
                    (rect.left < box.left - 1 || rect.right > box.right + 1)
                  );
                })
                .map((node) => node.outerHTML.slice(0, 180));
            }),
            [],
            `${id}/${name}: native content stays within its bounds; decorative SVG bleed is not layout overflow`,
          );
          await example.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${theme}.png`,
          });
          if (id === "select" && name === "Rich") {
            await example
              .getByRole("combobox", { name: "Review rhythm" })
              .click();
            await page
              .getByRole("listbox")
              .screenshot({
                path: `${output}/${id}-rich-open-${width}-${theme}.png`,
              });
            await page.keyboard.press("Escape");
          }
        }
      }
    await choose("field surface", "Editorial");
    await page
      .getByRole("button", { name: "Copy code", exact: true })
      .first()
      .click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /fieldAppearance="editorial"/,
    );
    console.log(
      `PASS ${id}: actual compositions, retained values, semantic editing/feedback, radius, themes and configured copy`,
    );
  }
} finally {
  await browser.close();
}
