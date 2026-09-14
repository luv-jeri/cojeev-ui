import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: "reduce",
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const change = async (name) => {
    await page
      .getByRole("combobox", { name: "Example approach", exact: true })
      .click();
    await page.getByRole("option", { name, exact: true }).click();
  };
  const visit = async (id) => {
    await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelector(".report-launcher")?.disabled === false,
    );
    return page.locator(".docs-playground [data-example-role=interactive]");
  };
  let root = await visit("dialog");
  await change("Editor");
  const open = () =>
    root.getByRole("button", { name: "Open note", exact: true }).click();
  await open();
  let modal = page.getByRole("dialog");
  await modal
    .getByRole("textbox", { name: "Note name", exact: true })
    .fill("Not saved");
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  await modal.waitFor({ state: "hidden" });
  assert.match(
    await root.getByRole("status").innerText(),
    /Current name: Room for good ideas/,
  );
  await open();
  assert.equal(
    await modal.getByRole("textbox", { name: "Note name" }).inputValue(),
    "Room for good ideas",
  );
  await modal.getByRole("textbox", { name: "Note name" }).fill("A better name");
  await modal.getByRole("button", { name: "Save name", exact: true }).click();
  await modal.waitFor({ state: "hidden" });
  await change("Exhibit");
  await open();
  assert.equal(
    await modal
      .getByRole("heading", { name: "A better name", exact: true })
      .count(),
    1,
  );
  await modal
    .getByRole("button", { name: "Keep this note", exact: true })
    .click();
  await modal.waitFor({ state: "hidden" });
  await change("Confirmation");
  assert.match(
    await root.getByRole("status").innerText(),
    /Kept in this sample collection.*A better name/,
  );
  root = await visit("linear-modal");
  await change("Gallery");
  const third = root.getByRole("button", {
    name: "Read The space between",
    exact: true,
  });
  await third.scrollIntoViewIfNeeded();
  await third.click();
  modal = page.getByRole("dialog", { name: "The space between", exact: true });
  await modal.waitFor();
  const viewport = modal.locator("[data-slot=scroll-area-viewport]");
  const vb = await viewport.boundingBox(),
    title = await modal
      .getByRole("heading", { name: "The space between", exact: true })
      .boundingBox();
  assert.ok(
    title.y >= vb.y && title.y + title.height <= vb.y + vb.height,
    "Desktop detail actually shows the title, not only an image",
  );
  const keep = modal.getByRole("button", {
    name: "Keep this study",
    exact: true,
  });
  const kb = await keep.boundingBox();
  assert.ok(
    kb.y + kb.height <= vb.y + vb.height,
    "Desktop action visible with content",
  );
  await keep.click();
  await modal.press("Escape");
  await modal.waitFor({ state: "hidden" });
  assert.equal(await third.evaluate((e) => document.activeElement === e), true);
  await change("Card");
  assert.match(await root.getByRole("status").innerText(), /1 study kept/);
  await root
    .getByRole("button", { name: "Read Room for good ideas", exact: true })
    .click();
  modal = page.getByRole("dialog", {
    name: "Room for good ideas",
    exact: true,
  });
  await modal
    .getByRole("button", { name: "Keep this study", exact: true })
    .click();
  await modal.press("Escape");
  await modal.waitFor({ state: "hidden" });
  await change("Centered");
  assert.match(await root.getByRole("status").innerText(), /2 studies kept/);
  await root
    .getByRole("button", { name: "Read Room for good ideas", exact: true })
    .click();
  await modal
    .getByRole("button", { name: "Remove study", exact: true })
    .click();
  await modal.press("Escape");
  await modal.waitFor({ state: "hidden" });
  assert.match(await root.getByRole("status").innerText(), /1 study kept/);
  assert.deepEqual(errors, []);
  console.log(
    "PASS Actual dialog cancel/save/cross-view continuity and Gallery third-card focus/save plus visible full Linear detail",
  );
} finally {
  await browser.close();
}
