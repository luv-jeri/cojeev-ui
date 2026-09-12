import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// Run against the *built consumer*, not the library's documentation renderer.
const base = process.env.INSTALLED_URL ?? "http://127.0.0.1:63525";
const output = "artifacts/release/installed-runtime";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const checks = [], errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole("button", { name: "Add schedule", exact: true }).click();
  assert.match(await page.locator('[data-specimen="button"]').innerText(), /Schedules added: 1/);
  const checkbox = page.getByRole("checkbox", { name: "Keep installation note" });
  await checkbox.click();
  assert.equal(await checkbox.getAttribute("aria-checked"), "true");
  await checkbox.press("Space");
  assert.equal(await checkbox.getAttribute("aria-checked"), "false");
  const toggle = page.getByRole("switch", { name: "Installed rocker switch" });
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-checked"), "true");
  const slider = page.getByRole("slider", { name: "Installed rubber slider" });
  const value = Number(await slider.getAttribute("aria-valuenow"));
  await slider.focus();
  await slider.press("ArrowRight");
  assert.ok(Number(await slider.getAttribute("aria-valuenow")) > value);
  checks.push("Installed button, flower checkbox, rocker switch and rubber slider respond to pointer/keyboard");
  const trigger = page.getByRole("button", { name: "What was installed?" });
  await trigger.click();
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  await page.getByRole("button", { name: "Open details", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Installation details" });
  await dialog.waitFor();
  await page.keyboard.press("Tab");
  assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Open installed drawer", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Installed drawer" });
  await drawer.waitFor();
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Copy code", exact: true }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /const installed = true/);
  checks.push("Installed accordion, dialog focus/Escape, motion drawer and clipboard work outside docs");
  const editor = page.locator('[data-slot="bento-builder"]'), board = editor.locator(".v-bento-builder__board");
  for (const mode of ["Classic", "Interlock"]) {
    await editor.getByRole("button", { name: mode, exact: true }).click();
    const grip = editor.getByRole("button", { name: "Resize bottom seam", exact: true });
    await grip.scrollIntoViewIfNeeded();
    const box = await board.boundingBox(), handle = await grip.boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(handle.x + handle.width / 2 + i % 2 * .2, box.y + box.height * .66 + i % 2 * .2);
      await page.waitForTimeout(20);
      assert.ok(Math.abs((await board.boundingBox()).height - box.height) < 1);
      assert.equal(await board.locator("[data-bento-tile]").first().evaluate(el => el.style.gridRow), "1 / span 3");
    }
    await page.mouse.up();
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(await board.locator("[data-bento-tile]").first().evaluate(el => el.style.gridRow), "1 / span 2");
  }
  checks.push("Installed Classic/Interlock Bento resize has a fixed canvas, no stationary-pointer cell oscillation and working Undo");
  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption(theme);
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme} has no document overflow`);
    await page.screenshot({ path: `${output}/${width}-${theme}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.focus();
  await toggle.press("Space");
  assert.equal(await toggle.getAttribute("aria-checked"), "false");
  assert.deepEqual(errors, []);
  checks.push("390/1440 light/dark bounds and reduced-motion switch operation; no runtime errors");
  await writeFile(`${output}/results.json`, JSON.stringify({ base, checks, errors, status: "PASS", checkedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks }));
} finally {
  await browser.close();
}
