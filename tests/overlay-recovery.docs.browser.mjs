import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/overlay-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const [id, names] of [
    ["tooltip", ["Callout", "Shortcut", "Annotation"]],
    ["hover-card", ["Identity", "Preview", "Media"]],
    ["chart-tooltip", ["Compare", "Summary", "Ranked"]],
  ]) {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
    const root = page.locator(
      '.docs-playground [data-example-role="interactive"]',
    );
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
    for (const name of names) {
      await page
        .getByRole("combobox", { name: "Example approach", exact: true })
        .click();
      await page.getByRole("option", { name, exact: true }).click();
      for (const width of [1280, 390])
        for (const mode of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.evaluate(
            (m) => (document.documentElement.dataset.mode = m),
            mode,
          );
          await root.scrollIntoViewIfNeeded();
          const trigger = root.getByRole("button", {
            name:
              id === "tooltip"
                ? "Save note"
                : id === "hover-card"
                  ? "About this notebook"
                  : "Morning",
            exact: true,
          });
          await trigger.scrollIntoViewIfNeeded();
          await trigger.evaluate(async (el) => {
            let last = "",
              stable = 0;
            for (let i = 0; i < 60 && stable < 6; i++) {
              await new Promise(requestAnimationFrame);
              const b = el.getBoundingClientRect(),
                key = `${b.x},${b.y},${b.width},${b.height},${window.scrollY}`;
              stable = key === last ? stable + 1 : 0;
              last = key;
            }
          });
          await trigger.focus();
          if (id === "chart-tooltip") await trigger.press("Enter");
          const popup = page
            .locator(
              `[data-slot="${id === "hover-card" ? "hover-card-content" : id === "tooltip" ? "tooltip-content" : "chart-tooltip"}"]`,
            )
            .filter({ visible: true })
            .first();
          await popup.waitFor({ timeout: 4000 }).catch(async (error) => {
            console.log({
              id,
              name,
              width,
              mode,
              trigger: await trigger.evaluate((el) => ({
                html: el.outerHTML,
                focus: el === document.activeElement,
                rect: el.getBoundingClientRect().toJSON(),
              })),
            });
            await page.screenshot({ path: `${output}/failure.png` });
            throw error;
          });
          await page.waitForTimeout(140);
          const box = await popup.boundingBox();
          assert.ok(
            box.x >= -1 && box.x + box.width <= width + 1,
            `${id} ${name} fits viewport`,
          );
          assert.equal(
            await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
          );
          await page.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}.png`,
          });
          await trigger.press("Escape");
          await popup.waitFor({ state: "hidden" });
          await page.mouse.move(width - 2, 2);
          await trigger.blur();
        }
      await page.setViewportSize({ width: 1280, height: 1050 });
    }
    if (id === "tooltip") {
      const save = root.getByRole("button", { name: "Save note", exact: true });
      await save.focus();
      await save.press("Control+s");
      assert.match(
        await root.getByRole("status").innerText(),
        /Saved locally 1 time/,
      );
      await save.press("Enter");
      assert.match(
        await root.getByRole("status").innerText(),
        /Saved locally 2 times/,
      );
      await save.press("Escape");
    }
    if (id === "hover-card") {
      await root
        .getByRole("button", { name: "Use long preview", exact: true })
        .click();
      const trigger = root.getByRole("button", {
        name: "About this notebook",
        exact: true,
      });
      await trigger.focus();
      const content = page.locator('[data-slot="hover-card-content"]');
      await content.waitFor();
      const port = content.locator('[data-slot="scroll-area-viewport"]');
      await port.hover();
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(200);
      assert.ok(
        (await port.evaluate((el) => el.scrollTop)) > 0,
        "Long preview uses a real local scrollport",
      );
      assert.equal(await content.locator(".v-scroll__contour").count(), 1);
      await trigger.press("Escape");
      await root
        .getByRole("button", { name: "Read preview", exact: true })
        .press("Enter");
      const readable = root.getByRole("region", {
        name: "Readable notebook preview",
      });
      await readable.waitFor();
      assert.match(
        await readable.innerText(),
        /Keep the same meaning in light and dark/,
      );
      await root
        .getByRole("button", { name: "Hide readable preview", exact: true })
        .press("Enter");
      await readable.waitFor({ state: "hidden" });
    }
    if (id === "chart-tooltip") {
      const morning = root.getByRole("button", {
        name: "Morning",
        exact: true,
      });
      await morning.focus();
      await morning.press("ArrowRight");
      await root
        .getByRole("button", { name: "Afternoon", exact: true })
        .press("End");
      assert.match(
        await page.getByRole("tooltip").innerText(),
        /Evening.*No observation/s,
      );
      await root
        .getByRole("button", { name: "Evening", exact: true })
        .press("Escape");
      await page.getByRole("tooltip").waitFor({ state: "hidden" });
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
    "PASS overlay docs:9 discoverable presentations, focus/Escape,36 responsive/theme captures, viewport fit and configured copy",
  );
} finally {
  await browser.close();
}
