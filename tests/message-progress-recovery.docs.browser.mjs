import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui",
  output = "output/playwright/message-progress-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: "reduce",
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const [id, names] of [
    ["alert", ["Note", "Banner", "Dispatch"]],
    ["progress", ["Inline", "Report", "Milestones"]],
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
    if (id === "alert") {
      for (const tone of ["Default", "Info", "Ok", "Warn", "Danger", "Pink"]) {
        await choose("message status", tone);
        assert.equal(
          await root.locator('[data-slot="alert"]').getAttribute("data-tone"),
          tone.toLowerCase(),
        );
      }
      await choose("message status", "Info");
      await root
        .getByRole("button", { name: "Review notes", exact: true })
        .click();
      await root.getByRole("region", { name: "Local notes" }).waitFor();
      for (const name of names) {
        await choose("approach", name);
        assert.equal(
          await root.getByRole("region", { name: "Local notes" }).isVisible(),
          true,
        );
      }
      const dismiss = root.getByRole("button", {
        name: "Dismiss alert",
        exact: true,
      });
      const box = await dismiss.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
      await dismiss.click();
      const restore = root.getByRole("button", { name: "Show alert again" });
      await restore.waitFor();
      assert.equal(
        await restore.evaluate((el) => el === document.activeElement),
        true,
      );
      await restore.press("Enter");
      await root
        .getByText("Your workspace is ready", { exact: true })
        .waitFor();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const stamp = root.locator('[data-slot="alert-icon"]');
      await stamp.scrollIntoViewIfNeeded();
      await stamp.locator("svg.v-morph").waitFor({ state: "attached" });
      const stampBox = await stamp.boundingBox();
      await page.mouse.move(stampBox.x + 2, stampBox.y + stampBox.height / 2);
      const contours = await stamp.evaluate(async (el) => {
        const poses = [];
        for (let i = 0; i < 12; i++) {
          await new Promise(requestAnimationFrame);
          poses.push(el.querySelector("svg.v-morph path")?.getAttribute("d"));
        }
        return poses;
      });
      assert.ok(
        new Set(contours).size > 1,
        "The message stamp has a real contour response",
      );
      assert.deepEqual(
        await stamp.boundingBox(),
        stampBox,
        "Only stamp paint moves",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
    } else {
      const meter = root.getByRole("progressbar", {
        name: "Example progress",
        exact: true,
      });
      assert.equal(
        await root.getByRole("progressbar").count(),
        1,
        "One task, one primary measured amount",
      );
      await root.getByRole("button", { name: "Increase", exact: true }).click();
      assert.equal(await meter.getAttribute("aria-valuenow"), "55");
      for (const shape of ["Organic", "Line", "Segmented", "Orbit"]) {
        await choose("track shape", shape);
        assert.equal(
          await meter.getAttribute("data-appearance"),
          shape.toLowerCase(),
        );
        assert.equal(await meter.getAttribute("aria-valuenow"), "55");
      }
      await choose("track surface", "Cream");
      assert.match(await meter.getAttribute("class"), /-cream/);
      for (const name of names) {
        await choose("approach", name);
        assert.equal(await meter.getAttribute("aria-valuenow"), "55");
      }
      await root
        .getByRole("button", { name: "Make unavailable", exact: true })
        .click();
      assert.equal(await meter.getAttribute("aria-valuenow"), null);
      assert.equal(
        await root
          .getByRole("button", { name: "Increase", exact: true })
          .isDisabled(),
        true,
      );
      await root
        .getByRole("button", { name: "Restore measurement", exact: true })
        .click();
      assert.equal(await meter.getAttribute("aria-valuenow"), "55");
      await root.getByRole("button", { name: "Complete", exact: true }).click();
      assert.equal(await meter.getAttribute("aria-valuenow"), "100");
      await root.getByRole("button", { name: "Reset", exact: true }).click();
      assert.equal(await meter.getAttribute("aria-valuenow"), "0");
      await root.getByRole("button", { name: "Increase", exact: true }).click();
      await choose("track shape", "Auto");
      await choose("track surface", "Default");
      await choose("approach", "Inline");
      await root.scrollIntoViewIfNeeded();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const paint = await root.evaluate(async (el) => {
        el.querySelectorAll("button").forEach((button) => {
          if (button.textContent === "Increase") button.click();
        });
        const frames = [];
        for (let i = 0; i < 16; i++) {
          await new Promise(requestAnimationFrame);
          frames.push(el.querySelector(".v-progress__fill")?.getAttribute("d"));
        }
        return frames;
      });
      assert.ok(
        new Set(paint).size > 1,
        "Measured progress animates its actual contour",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (let i = 0; i < 4; i++)
        await root
          .getByRole("button", { name: "Increase", exact: true })
          .click();
    }
    await page.addStyleTag({
      content: ".report-launcher,nextjs-portal{visibility:hidden!important}",
    });
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
          await page.waitForTimeout(100);
          assert.equal(
            await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            true,
            `${id} stays bounded`,
          );
          if (id === "progress") {
            const shape = root.locator('[data-slot="progress"]');
            if ((await shape.getAttribute("data-appearance")) === "segmented") {
              const geometry = await shape.evaluate((el) => {
                const svg = el.querySelector("svg");
                const segment = svg.querySelector(".v-progress__track");
                return {
                  svgHeight: svg.getBoundingClientRect().height,
                  segmentHeight: segment.getBoundingClientRect().height,
                  viewWidth: svg.viewBox.baseVal.width,
                  boxWidth: svg.getBoundingClientRect().width,
                };
              });
              assert.ok(
                geometry.segmentHeight >= geometry.svgHeight * 0.6,
                "Segments use the measured height, not a stale tiny placeholder",
              );
              assert.ok(
                Math.abs(geometry.viewWidth - geometry.boxWidth) < 1,
                "Paint coordinates follow the real viewport width",
              );
            }
          }
          await root.screenshot({
            path: `${output}/${id}-${name.toLowerCase()}-${width}-${mode}.png`,
          });
        }
      await page.setViewportSize({ width: 1280, height: 1050 });
    }
    await page
      .getByRole("button", { name: "Copy code", exact: true })
      .first()
      .click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(copied, new RegExp(`variant="${names.at(-1).toLowerCase()}"`));
    assert.match(
      copied,
      id === "alert" ? /alertTone="info"/ : /progressAppearance="auto"/,
    );
  }
  console.log(
    "PASS Alert/Progress docs: distinct compositions, retained statuses/track choices, local actions and focus, 0/100/unknown values, 24 responsive theme captures and configured copy",
  );
} finally {
  await browser.close();
}
