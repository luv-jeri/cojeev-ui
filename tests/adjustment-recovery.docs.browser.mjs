import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const browser = await chromium.launch();
const output = "output/playwright/adjustment-recovery";
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(12000);
  const choose = async (control, value) => {
    await page.getByRole("combobox", { name: `Example ${control}` }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  for (const [id, approaches] of Object.entries({
    "number-input": ["Stepper", "Quantity", "Scrub"],
    "option-wheel": ["Arc", "Reel", "Compact"],
  })) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    // Exclude fixed application chrome from specimen-only evidence.
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
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
        `${id}: ${name} is directly discoverable`,
      );
    if (id === "number-input") {
      const input = example.getByRole("spinbutton", {
        name: "Weekly contribution",
      });
      await input.fill("42.5");
      await input.press("Tab");
      for (const name of approaches) {
        await choose("approach", name);
        assert.equal(await input.getAttribute("aria-valuenow"), "42.5");
      }
      const grip = example.getByRole("button", {
        name: "Drag to adjust value",
      });
      await grip.scrollIntoViewIfNeeded();
      const box = await grip.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 32,
        box.y + box.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.equal(
        await input.getAttribute("aria-valuenow"),
        "44.5",
        "Four eight-pixel drag steps add two dollars",
      );
      await grip.click();
      assert.equal(
        await input.evaluate((el) => document.activeElement === el),
        true,
        "A grip click still opens native editing",
      );
      await input.press("ArrowDown");
      assert.equal(await input.getAttribute("aria-valuenow"), "44");
      const ids = await page
        .locator('[data-slot="number-input"] input')
        .evaluateAll((nodes) => nodes.map((n) => n.id));
      assert.equal(
        new Set(ids).size,
        ids.length,
        "Gallery labels have unique native IDs",
      );
    } else {
      const stage = example.getByRole("listbox");
      await stage.focus();
      await stage.press("Home");
      const selected = () =>
        stage.getByRole("option", { selected: true }).innerText();
      const first = await selected();
      await stage.hover();
      await page.mouse.wheel(0, 100);
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-example-role="interactive"] .v-option-wheel')
            ?.getAttribute("data-selected-index") === "1",
      );
      assert.notEqual(await selected(), first);
      for (const name of approaches) {
        await choose("approach", name);
        assert.equal(
          await example
            .locator('[data-slot="option-wheel"]')
            .getAttribute("data-selected-index"),
          "1",
        );
      }
      await stage.press("End");
      const last = await selected();
      await stage.hover();
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(120);
      assert.equal(
        await selected(),
        last,
        "Wheel input does not wrap at the end",
      );
      await example
        .getByRole("button", { name: "Next option", exact: true })
        .click();
      assert.equal(
        await selected(),
        first,
        "Explicit navigation retains the legacy wrap contract",
      );
      await choose("wheel side", "Right");
      await choose("approach", "Arc");
      assert.equal(
        await example
          .locator('[data-slot="option-wheel"]')
          .getAttribute("data-side"),
        "right",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const currentSlot = stage.getByRole("option", { selected: true });
      await currentSlot.locator("svg.v-morph").waitFor({ state: "attached" });
      const slotBox = await currentSlot.boundingBox();
      await page.mouse.move(slotBox.x + 2, slotBox.y + slotBox.height / 2);
      const poses = await currentSlot.evaluate(async (el) => {
        const frames = [];
        for (let i = 0; i < 12; i++) {
          await new Promise(requestAnimationFrame);
          frames.push(el.querySelector("svg.v-morph path")?.getAttribute("d"));
        }
        return frames;
      });
      assert.ok(
        new Set(poses).size > 1,
        "The selected wheel paint has a real contour response",
      );
      await page.mouse.down();
      const held = await currentSlot.boundingBox();
      assert.ok(
        Math.abs(held.x - slotBox.x) < 0.5 &&
          Math.abs(held.width - slotBox.width) < 0.5,
        "The native option slot does not follow its paint",
      );
      await page.mouse.up();
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    for (const name of approaches) {
      await choose("approach", name);
      for (const width of [1280, 390])
        for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1100 });
          await page.evaluate((t) => {
            document.documentElement.dataset.mode = t;
            document.documentElement.classList.toggle("dark", t === "dark");
            document.documentElement.classList.toggle("light", t === "light");
          }, theme);
          await example.scrollIntoViewIfNeeded();
          await page.waitForTimeout(80);
          if (
            !(await example.evaluate(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ))
          ) {
            console.log(
              await example.evaluate((el) => ({
                host: [el.clientWidth, el.scrollWidth],
                overflow: [...el.querySelectorAll("*")]
                  .filter(
                    (node) =>
                      node.getBoundingClientRect().right >
                      el.getBoundingClientRect().right + 1,
                  )
                  .map((node) => [
                    node.tagName,
                    node.className,
                    node.getBoundingClientRect().width,
                  ])
                  .slice(0, 15),
              })),
            );
            await example.screenshot({
              path: `${output}/overflow-${id}-${width}.png`,
            });
          }
          assert.ok(
            await example.evaluate(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ),
            `${id}/${name}: no narrow overflow`,
          );
          await example.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${theme}.png`,
          });
        }
      await page.setViewportSize({ width: 1280, height: 1000 });
    }
    console.log(
      `PASS ${id}: three approaches, preserved values, actual adjustment, native keys and responsive themes`,
    );
  }
} finally {
  await browser.close();
}
