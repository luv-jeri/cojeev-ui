import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
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
    stepper: ["Rail", "Ledger", "Compact"],
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
    } else {
      const next = example.getByRole("button", {
        name: "Next step",
        exact: true,
      });
      assert.equal(
        await next.isDisabled(),
        true,
        "Name validation gates progression",
      );
      await example
        .getByRole("textbox", { name: "Name your idea" })
        .fill("A small garden");
      await next.click();
      assert.equal(
        await example.locator("[data-step-heading]:visible").evaluate(el => el === document.activeElement),
        true,
        "Advancing focuses the new stage heading",
      );
      await choose("Rail");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const marker = example.locator(
        '[data-slot="stepper-item"][data-state="active"] [data-slot="stepper-indicator"]',
      );
      await marker.scrollIntoViewIfNeeded();
      const paint = marker.locator(":scope > svg.v-morph");
      await paint.waitFor({ state: "attached" });
      assert.notEqual(
        await paint
          .locator("[data-morph-body]")
          .evaluate((el) => getComputedStyle(el).fill),
        "rgba(0, 0, 0, 0)",
        "Normal-motion current marker has real paint",
      );
      const hit = marker.locator(".."),
        rect = await hit.boundingBox(),
        markRect = await marker.boundingBox();
      await page.mouse.move(markRect.x + 2, markRect.y + markRect.height / 2);
      const changes = await paint.evaluate(async (svg) => {
        const frames = [];
        for (let i = 0; i < 12; i++) {
          await new Promise(requestAnimationFrame);
          frames.push(svg.querySelector("[data-morph-body]").getAttribute("d"));
        }
        return new Set(frames).size;
      });
      assert.ok(
        changes > 1,
        "Current step contour responds through the shared paint engine",
      );
      await page.mouse.down();
      await page.waitForTimeout(80);
      const held = await hit.boundingBox();
      await page.mouse.up();
      assert.ok(
        Math.abs(held.x - rect.x) < 0.5 &&
          Math.abs(held.width - rect.width) < 0.5,
        "Held marker does not move its native trigger",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await example.getByRole("radio", { name: "Weekly", exact: true }).click();
      await next.click();
      assert.match(
        await example.locator("[data-step-panel]:visible").innerText(),
        /A small garden/,
      );
      for (const name of names) {
        await choose(name);
        assert.match(
          await example.getByRole("status").first().innerText(),
          /Stage 3 of 3/,
        );
      }
      await example
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      assert.match(
        await example.getByRole("status").last().innerText(),
        /Saved here.*A small garden/,
      );
      await example.getByRole("button", { name: "Back", exact: true }).click();
      await example.getByRole("button", { name: "Back", exact: true }).click();
      assert.equal(
        await example
          .getByRole("textbox", { name: "Name your idea" })
          .inputValue(),
        "A small garden",
      );
      await next.click();
      assert.equal(
        await example.getByRole("radio", { name: "Weekly" }).isChecked(),
        true,
      );
      await next.click();
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
          if (id === "stepper" && name === "Compact")
            assert.equal(
              await example
                .locator('[data-slot="stepper-progress-mark"]')
                .evaluateAll(
                  (nodes) =>
                    nodes.length === 3 &&
                    nodes.every((n) => {
                      const b = n.getBoundingClientRect();
                      return (
                        b.width > 30 &&
                        b.height >= 4 &&
                        getComputedStyle(n).visibility === "visible"
                      );
                    }),
                ),
              true,
              "Compact has three visible progress marks, not empty targets",
            );
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
    "PASS progression docs: six approaches, useful ancestors, draft validation/state/focus/keyboard, 24 theme/responsive captures and configured copy",
  );
} finally {
  await browser.close();
}
