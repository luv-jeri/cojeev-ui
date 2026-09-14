import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const output = "output/playwright/card-collapsible-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const example = preview.locator('[data-example-role="interactive"]');
  const select = async (name, value) => {
    await preview.getByRole("combobox", { name: `Example ${name}` }).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  };
  for (const id of ["card", "collapsible"]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    const modes =
      id === "card"
        ? ["Editorial", "Project", "Collection"]
        : ["Inline", "Checklist", "Inspector"];
    for (const mode of modes) {
      assert.equal(
        await preview
          .getByRole("combobox", { name: "Example approach" })
          .count(),
        1,
        `${id} must expose its missing structural approaches`,
      );
      await select("approach", mode);
      assert.equal(
        await example
          .locator(`[data-slot="${id}"]`)
          .first()
          .getAttribute("data-appearance"),
        mode.toLowerCase(),
      );
      assert.equal(
        await preview
          .locator(
            `[data-example-role="gallery"][data-variant="${mode.toLowerCase()}"]`,
          )
          .count(),
        1,
      );
      if (id === "card") {
        await select("surface", "Blue");
        assert.ok(
          (
            await example.locator('[data-slot="card"]').getAttribute("class")
          ).includes("-blue"),
        );
        if (mode === "Editorial") {
          await example
            .getByRole("button", { name: "Save article", exact: true })
            .click();
          assert.equal(
            await example
              .getByRole("button", { name: "Article saved", exact: true })
              .getAttribute("aria-pressed"),
            "true",
          );
        } else if (mode === "Project") {
          await example
            .getByRole("button", { name: "Complete next step" })
            .click();
          assert.match(await example.getByRole("status").innerText(), /2 of 3/);
        } else {
          await example.getByRole("button", { name: "Next note" }).click();
          assert.match(await example.getByRole("status").innerText(), /2 of 3/);
        }
      } else {
        const trigger = example.locator('[data-slot="collapsible-trigger"]');
        assert.equal(
          await trigger.locator('[data-slot="collapsible-indicator"]').count(),
          1,
        );
        if ((await trigger.getAttribute("aria-expanded")) !== "true")
          await trigger.click();
        for (let i = 0; i < 4; i++) {
          await trigger.press("Space");
          assert.equal(
            await trigger.getAttribute("aria-expanded"),
            String(i % 2 !== 0),
          );
          if (i % 2 === 0)
            assert.ok(
              await example
                .locator('[data-slot="collapsible-content"]')
                .evaluate((el) => el.hidden || el.inert),
            );
        }
      }
      for (const width of [1440, 390])
        for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (theme) => (document.documentElement.dataset.mode = theme),
            theme,
          );
          await example.scrollIntoViewIfNeeded();
          if (id === "card")
            for (const action of await example.getByRole("button").all()) {
              assert.ok(
                (await action.boundingBox()).height >= 44,
                "card actions retain44px touch targets",
              );
            }
          assert.ok(
            await example.evaluate(
              (root) => root.scrollWidth <= root.clientWidth + 1,
            ),
            `${id}/${mode} must not overflow`,
          );
          await example.screenshot({
            path: `${output}/${id}-${mode.toLowerCase()}-${width}-${theme}.png`,
            style:
              ".report-launcher, nextjs-portal { visibility:hidden!important }",
          });
        }
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    if (id === "card") {
      await select("approach", "Editorial");
      assert.equal(
        await example
          .getByRole("button", { name: "Article saved" })
          .getAttribute("aria-pressed"),
        "true",
        "presentation changes retain saved state",
      );
    } else {
      await select("approach", "Inline");
      const trigger = example.locator('[data-slot="collapsible-trigger"]');
      assert.equal(
        await trigger.getAttribute("aria-expanded"),
        "true",
        "presentation changes retain expanded state",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const motion = await example.evaluate(async (root) => {
        const trigger = root.querySelector('[data-slot="collapsible-trigger"]');
        const content = root.querySelector('[data-slot="collapsible-content"]');
        trigger.click();
        const heights = [];
        for (let i = 0; i < 6; i++) {
          await new Promise(requestAnimationFrame);
          heights.push(content.getBoundingClientRect().height);
        }
        const inertWhileClosing = content.inert;
        trigger.click();
        for (let i = 0; i < 30; i++) await new Promise(requestAnimationFrame);
        return {
          heights,
          inertWhileClosing,
          inert: content.inert,
          height: content.getBoundingClientRect().height,
          inner: content.firstElementChild.getBoundingClientRect().height,
        };
      });
      assert.ok(
        motion.inertWhileClosing,
        "closing controls immediately leave the focus path",
      );
      assert.equal(motion.inert, false);
      assert.ok(motion.height >= motion.inner - 1);
      assert.ok(
        new Set(motion.heights.map(Math.round)).size > 1,
        "collapsible must animate its actual height, not merely fade content",
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS cards and collapsibles: six structural approaches, useful actions, retained state, native keyboard, real height reversal and 24 responsive/theme captures",
  );
} finally {
  await browser.close();
}
