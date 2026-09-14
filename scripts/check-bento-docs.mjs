import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.BENTO_PLAYWRIGHT ?? "playwright");
const base = process.env.BENTO_DOCS_BASE ?? "http://127.0.0.1:4320/cojeev-ui";
const output = "output/playwright/bento-docs";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) for (const mode of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(mode => localStorage.setItem("cojeev-docs-theme", mode), mode);
    assert.equal((await page.goto(`${base}/docs/bento-grid/`, { waitUntil: "domcontentloaded" })).status(), 200);
    await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
    const editor = page.locator('.docs-playground [data-slot="bento-builder"]');
    await editor.getByRole("button", { name: "Dashboard", exact: true }).click();
    assert.equal(await editor.getByRole("button", { name: "Dashboard", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await editor.count(), 1, "Comparison specimens must not repeat the whole editor");
    await editor.getByRole("button", { name: "Interlock", exact: true }).click();
    assert.equal(await editor.locator('[data-slot="bento-grid"]').getAttribute("data-variant"), "interlock");
    await page.getByRole("combobox", { name: "Example approach", exact: true }).click();
    await page.getByRole("option", { name: "Interlock", exact: true }).click();
    await page.getByRole("combobox", { name: "Example approach", exact: true }).click();
    await page.getByRole("option", { name: "Classic", exact: true }).click();
    assert.equal(await editor.locator('[data-slot="bento-grid"]').getAttribute("data-variant"), "classic", "Outer docs approach updates the existing editor");
    assert.equal(await editor.getByRole("button", { name: "Dashboard", exact: true }).getAttribute("aria-pressed"), "true", "Treatment changes preserve the authored template");
    await editor.getByRole("button", { name: "Interlock", exact: true }).click();
    assert.equal(await editor.locator('[data-bento-tile]').count(), 6);
    const pathsBefore = await editor.locator('.v-bento__paint path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
    await editor.getByRole('button', { name: 'Reshape edges', exact: true }).click();
    assert.equal(pathsBefore.length, 6, 'Each tile has interlocking paint');
      await page.waitForFunction(before => {
        const paths = [...document.querySelectorAll('.docs-playground .v-bento__paint path')].map(node => node.getAttribute('d'));
        return JSON.stringify(paths) !== JSON.stringify(before);
      }, pathsBefore);
    const board = editor.locator(".v-bento-builder__board");
    const viewport = editor.locator('[data-slot="scroll-area-viewport"]');
    assert.ok((await viewport.boundingBox()).height >= (await board.boundingBox()).height - 2, "Editor canvas is not vertically clipped in real docs");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No page-wide horizontal overflow");
    await editor.screenshot({ path: `${output}/${width}-${mode}-editor.png` });
    await page.locator('.docs-specimen-section').screenshot({ path: `${output}/${width}-${mode}-treatments.png` });
    assert.deepEqual(errors, [], "No browser runtime errors");
    await page.close();
  }
  const page = await browser.newPage();
  for (const id of ["bento-builder", "aspect-ratio"]) {
    assert.equal((await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" })).status(), 200);
    await page.getByRole("heading", { level: 1 }).waitFor();
  }
  console.log("PASS: full Bento docs, one editor, working treatments, unclipped canvas, desktop/mobile light/dark, runtime and AspectRatio compatibility.");
} finally { await browser.close(); }
