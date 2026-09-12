import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.POLISH_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const out = "output/playwright/bento-resize-stability";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  await page.goto(base + "/docs/bento-grid/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const editor = page.locator(
      "[data-example-role=interactive] [data-slot=bento-builder]",
    ),
    board = editor.locator(".v-bento-builder__board");
  const traces = [];
  for (const mode of ["Classic", "Interlock"]) {
    await page
      .getByRole("button", { name: "Reset example", exact: true })
      .click();
    await editor.getByRole("button", { name: mode, exact: true }).click();
    const handle = editor.getByRole("button", {
      name: "Resize bottom seam",
      exact: true,
    });
    await handle.scrollIntoViewIfNeeded();
    const hb = await handle.boundingBox(),
      bb = await board.boundingBox();
    const target = { x: hb.x + hb.width / 2, y: bb.y + bb.height * 0.66 };
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    const frames = [];
    for (let i = 0; i < 14; i++) {
      await page.mouse.move(target.x + (i % 2) * 0.2, target.y + (i % 2) * 0.2);
      await page.waitForTimeout(20);
      frames.push(
        await board.evaluate((e) => {
          const tile = e.querySelector("[data-bento-tile]"),
            grip = e.querySelector("[data-side=bottom]");
          return {
            h: e.getBoundingClientRect().height,
            row: tile.style.gridRow,
            tileBottom: tile.getBoundingClientRect().bottom,
            gripY:
              grip.getBoundingClientRect().top +
              grip.getBoundingClientRect().height / 2,
          };
        }),
      );
    }
    traces.push({ mode, before: bb.height, frames });
    await writeFile(out + "/frames.json", JSON.stringify(traces, null, 2));
    await board.screenshot({ path: `${out}/${mode.toLowerCase()}-held.png` });
    assert.ok(
      frames.every((f) => Math.abs(f.h - bb.height) < 1),
      `${mode}: resizing one tile must not resize the coordinate canvas: ${JSON.stringify(frames.map((f) => [f.h, f.row]))}`,
    );
    assert.deepEqual(
      [...new Set(frames.map((f) => f.row))],
      ["1 / span 3"],
      `${mode}: a nearly stationary pointer must not alternate between cells`,
    );
    assert.ok(
      frames.every((f) => Math.abs(f.tileBottom - f.gripY) <= 6),
      `${mode}: grip follows the visible seam while held`,
    );
    await page.mouse.up();
    assert.equal(
      await editor
        .locator("[data-bento-tile]")
        .first()
        .evaluate((e) => e.style.gridRow),
      "1 / span 3",
    );
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(
      await editor
        .locator("[data-bento-tile]")
        .first()
        .evaluate((e) => e.style.gridRow),
      "1 / span 2",
    );
  }
  console.log(
    "PASS Classic/Interlock stationary-pointer resize: fixed canvas, no cell oscillation, grip tracks live edge, release and Undo",
  );
} finally {
  await browser.close();
}
