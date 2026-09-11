import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    process.env.BENTO_DOCS_URL ??
      "http://127.0.0.1:4321/cojeev-ui/docs/bento-grid/",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(
    () => document.querySelector(".report-launcher")?.disabled === false,
  );
  const editor = page.locator(
    '[data-example-role="interactive"] [data-slot="bento-builder"]',
  );
  const feedback = page.locator('[data-slot="bento-edit-feedback"]');
  await mkdir("output/playwright/bento", { recursive: true });
  for (const mode of ["Classic", "Interlock"]) {
    await page
      .getByRole("button", { name: "Reset example", exact: true })
      .click();
    await editor.getByRole("button", { name: mode, exact: true }).click();
    const handle = editor.getByRole("button", {
      name: "Resize right seam",
      exact: true,
    });
    await handle.scrollIntoViewIfNeeded();
    const control = await handle.boundingBox();
    const canvas = await editor
      .locator(".v-bento-builder__board")
      .boundingBox();
    const readLayout = () =>
      editor.locator("[data-bento-tile]").evaluateAll((tiles) =>
        tiles.map((tile) => ({
          id: tile.dataset.bentoTile,
          columns: tile.style.gridColumn,
          rows: tile.style.gridRow,
        })),
      );
    const before = await readLayout();
    await page.mouse.move(
      control.x + control.width / 2,
      control.y + control.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      canvas.x + canvas.width,
      control.y + control.height / 2,
    );
    assert.match(await feedback.innerText(), /one cell/i);
    assert.equal(
      await feedback.evaluate((el) => getComputedStyle(el).pointerEvents),
      "none",
    );
    await page.mouse.up();
    assert.deepEqual(await readLayout(), before);
    assert.doesNotMatch(
      await editor.getByRole("status").innerText(),
      /seam moved/i,
    );
    assert.match(await feedback.innerText(), /one cell/i);
    await page.screenshot({
      path: `output/playwright/bento/docs-blocked-${mode.toLowerCase()}.png`,
    });
    await page.keyboard.press("Escape");
    assert.equal(await feedback.count(), 0);
  }
  assert.deepEqual(
    errors,
    [],
    "Bento docs interactions produce no browser errors",
  );
  console.log(
    "PASS live Bento docs: Classic/Interlock blocked drag, preserved layout, accurate release, Escape, pointer-transparent feedback, no browser errors",
  );
} finally {
  await browser.close();
}
