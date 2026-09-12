import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const output = "output/playwright/calendar-modes";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  await page.goto(`${base}/docs/calendar/`, { waitUntil: "domcontentloaded" });
  const preview = page
    .locator('.docs-playground [data-slot="preview"]')
    .first();
  const example = preview.locator('[data-example-role="interactive"]');
  await example.locator(".v-morph-live").first().waitFor();
  const cal = example.locator('[data-slot="calendar"]');
  await cal.scrollIntoViewIfNeeded();
  assert.equal(
    await cal.locator('[data-slot="calendar-selection"]').count(),
    1,
    "single selection has a calendar-owned moving paint layer",
  );
  assert.equal(
    await cal.locator(".v-glide__pill").count(),
    0,
    "calendar does not also paint a generic one-selection Flow pill",
  );
  const choose = async (mode) => {
    await preview.getByRole("combobox", { name: "Example approach" }).click();
    await page.getByRole("option", { name: mode, exact: true }).click();
  };
  const date = (root, iso) =>
    root.locator(
      `[data-slot="calendar-day"][data-date="${iso}"]:not([data-outside])`,
    );
  const selected = () => cal.locator('[data-state="active"]');
  const firstPaint = await cal
    .locator('[data-slot="calendar-selection"]')
    .boundingBox();
  const firstContour = await cal
    .locator('[data-slot="calendar-selection"]')
    .evaluate((node) => getComputedStyle(node).borderRadius);
  await date(cal, "2026-09-18").click();
  await page.waitForTimeout(400);
  const nextPaint = await cal
    .locator('[data-slot="calendar-selection"]')
    .boundingBox();
  const nextContour = await cal
    .locator('[data-slot="calendar-selection"]')
    .evaluate((node) => getComputedStyle(node).borderRadius);
  assert.notEqual(
    nextContour,
    firstContour,
    "selected paint morphs its contour, not only its position",
  );
  assert.ok(
    Math.abs(nextPaint.x - firstPaint.x) > 5 ||
      Math.abs(nextPaint.y - firstPaint.y) > 5,
    "single selected paint moves with selected day",
  );
  assert.equal(
    await date(cal, "2026-09-18").evaluate((e) => e === document.activeElement),
    true,
    "date selection keeps day focus",
  );
  assert.match(await example.getByRole("status").innerText(), /Studio review/);
  assert.equal(await date(cal, "2026-09-20").isDisabled(), true);
  await date(cal, "2026-09-18").press("ArrowRight");
  assert.equal(
    await date(cal, "2026-09-19").evaluate((e) => e === document.activeElement),
    true,
  );
  await date(cal, "2026-09-19").press("PageDown");
  await cal
    .locator('[data-slot="calendar-caption"]')
    .filter({ hasText: "October" })
    .waitFor();
  await cal.getByRole("button", { name: "Previous month" }).click();
  await choose("Range");
  await example.getByRole("button", { name: "Clear selection" }).click();
  await date(cal, "2026-09-29").click();
  assert.equal(
    await date(cal, "2026-09-29").getAttribute("data-state"),
    "active",
    "open range marks its selected start day",
  );
  await cal.getByRole("button", { name: "Next month" }).click();
  await date(cal, "2026-10-03").click();
  assert.match(
    await example.getByRole("status").innerText(),
    /29 Sept? 2026.*3 Oct 2026/,
  );
  assert.equal(
    await cal.locator("[data-range-middle]").count(),
    2,
    "October 1–2 continue the cross-month range",
  );
  assert.equal(await cal.locator(".v-glide__pill").count(), 0);
  await choose("Multiple");
  // Modes keep DayPicker's month navigation; return to the fixed initial month.
  if (
    (await cal.locator('[data-slot="calendar-caption"]').innerText()).includes(
      "October",
    )
  )
    await cal.getByRole("button", { name: "Previous month" }).click();
  await date(cal, "2026-09-16").click();
  assert.equal(await selected().count(), 4);
  await date(cal, "2026-09-17").click();
  assert.equal(await selected().count(), 5);
  await date(cal, "2026-09-18").click();
  assert.equal(
    await selected().count(),
    1,
    "native maximum starts a new set when exceeded",
  );
  await date(cal, "2026-09-16").click();
  assert.equal(await selected().count(), 2);
  await date(cal, "2026-09-18").click();
  assert.equal(await selected().count(), 1);
  assert.equal(
    await cal.locator('[data-slot="calendar-selection"]').count(),
    1,
    "every remaining selected day keeps local paint",
  );
  await date(cal, "2026-09-08").click();
  await date(cal, "2026-09-24").click();
  assert.equal(
    await cal.locator('[data-slot="calendar-selection"]').count(),
    3,
  );
  await choose("Range");
  await example.getByRole("button", { name: "Clear selection" }).click();
  await date(cal, "2026-09-22").click();
  await date(cal, "2026-09-25").click();
  for (const width of [390, 1280])
    for (const theme of ["light", "dark"])
      for (const mode of ["Single", "Range", "Multiple"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await choose(mode);
        await cal.scrollIntoViewIfNeeded();
        await example.screenshot({
          path: `${output}/calendar-${mode.toLowerCase()}-${width}-${theme}.png`,
        });
        assert.ok(
          await cal.evaluate((e) => {
            const r = e.getBoundingClientRect();
            return [...e.querySelectorAll("button")].every((button) => {
              const b = button.getBoundingClientRect();
              return b.left >= r.left - 1 && b.right <= r.right + 1;
            });
          }),
          "calendar controls stay inside their width (decorative SVG padding excluded)",
        );
      }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await choose("Single");
  await date(cal, "2026-09-15").click();
  assert.equal(
    await cal.locator('[data-slot="calendar-selection"]').count(),
    1,
    "quiet mode retains selected paint",
  );
  assert.equal(
    await cal.evaluate((e) =>
      parseFloat(getComputedStyle(e).getPropertyValue("--v-calendar-duration")),
    ),
    0,
  );

  await page.goto(`${base}/docs/date-picker/`, {
    waitUntil: "domcontentloaded",
  });
  await example.locator(".v-morph-live").first().waitFor();
  const trigger = example.locator('[data-slot="date-picker-trigger"]');
  const popup = page.locator('[data-slot="date-picker-content"]');
  await trigger.click();
  await date(popup, "2026-09-12").click();
  await popup.waitFor({ state: "hidden" });
  assert.match(await trigger.innerText(), /12 Sept? 2026/);
  assert.equal(
    await trigger.evaluate((e) => e === document.activeElement),
    true,
  );
  await trigger.click();
  await popup.getByRole("button", { name: "Clear dates" }).click();
  await popup.waitFor({ state: "hidden" });
  assert.match(await example.getByRole("status").innerText(), /No appointment/);
  await choose("Range");
  await trigger.click();
  await date(popup, "2026-09-29").click();
  assert.equal(
    await popup.isVisible(),
    true,
    "range remains open with only start",
  );
  await popup.getByRole("button", { name: "Next month" }).click();
  await date(popup, "2026-10-03").click();
  await popup.waitFor({ state: "hidden" });
  assert.match(await trigger.innerText(), /29 Sept? 2026.*3 Oct 2026/);
  await choose("Multiple");
  await trigger.click();
  await date(popup, "2026-09-08").click();
  await date(popup, "2026-09-15").click();
  assert.equal(await popup.isVisible(), true);
  await date(popup, "2026-09-08").click();
  assert.equal(await popup.locator('[data-state="active"]').count(), 1);
  await popup.getByRole("button", { name: "Done", exact: true }).click();
  await popup.waitFor({ state: "hidden" });
  assert.match(await trigger.innerText(), /1 day selected/);
  assert.equal(
    await trigger.evaluate((e) => e === document.activeElement),
    true,
  );
  await trigger.click();
  await page.keyboard.press("Escape");
  await popup.waitFor({ state: "hidden" });
  assert.equal(
    await trigger.evaluate((e) => e === document.activeElement),
    true,
  );
  for (const width of [390, 1280])
    for (const theme of ["light", "dark"])
      for (const mode of ["Single", "Range", "Multiple"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.mode = theme),
          theme,
        );
        await choose(mode);
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await popup.waitFor();
        await popup.screenshot({
          path: `${output}/date-picker-${mode.toLowerCase()}-${width}-${theme}.png`,
        });
        const box = await popup.boundingBox();
        assert.ok(
          box.x >= -1 && box.x + box.width <= width + 1,
          "picker remains inside viewport",
        );
        assert.equal(
          await popup.locator('[data-slot="scroll-area"]').count(),
          1,
          "popup uses the shared scroll owner",
        );
        await page.keyboard.press("Escape");
        await popup.waitFor({ state: "hidden" });
      }
  console.log(
    "PASS all three calendar/picker modes; cross-month ranges, multiple max/toggle, disabled dates, keyboard navigation, quiet paint, Clear/Done/Escape/focus; 24 real-docs screenshots",
  );
} finally {
  await browser.close();
}
