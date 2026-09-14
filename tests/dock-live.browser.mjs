import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 960 } });
  await page.addInitScript(() => localStorage.setItem("cojeev-docs-theme", "light"));
  await page.goto(`${base}/docs/dock/`, { waitUntil: "domcontentloaded" });
  const specimen = page.locator('.docs-specimen[data-example="dock"][data-variant="default"]').first();
  const dock = specimen.getByRole("navigation", { name: "Cojeev workspace", exact: true });
  await dock.waitFor();
  await page.waitForFunction(() => document.querySelector('.report-launcher')?.disabled === false);
  await dock.evaluate(node => {
    const viewport = node.querySelector('[data-part="viewport"]');
    const record = event => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      const memory = node.querySelector('button[aria-label="Memory"]');
      const bounds = memory?.getBoundingClientRect();
      globalThis.__dockEvents ??= [];
      globalThis.__dockEvents.push({
        type: event.type,
        target: target?.getAttribute("aria-label") ?? null,
        scrollLeft: viewport.scrollLeft,
        memoryLeft: bounds?.left,
        memoryRight: bounds?.right,
      });
    };
    for (const type of ["pointerdown", "focusin", "scroll", "pointerup", "click"]) node.addEventListener(type, record, true);
  });

  await dock.getByRole("button", { name: "Work", exact: true }).click();
  await specimen.getByRole("heading", { name: "Work", exact: true }).waitFor();
  let memoryActivated = true;
  try {
    await dock.getByRole("button", { name: "Memory", exact: true }).click({ timeout: 4000 });
    await specimen.getByRole("heading", { name: "Memory", exact: true }).waitFor({ timeout: 2000 });
  } catch {
    memoryActivated = false;
  }
  const evidence = await dock.evaluate(node => ({
    events: globalThis.__dockEvents,
    scrollLeft: node.querySelector('[data-part="viewport"]').scrollLeft,
    active: node.querySelector('button[aria-pressed="true"]')?.getAttribute("aria-label"),
  }));
  console.log(JSON.stringify(evidence, null, 2));
  assert.equal(memoryActivated, true, "Work then Memory remains two reliable native button activations at 390px");

  const shelf = page.locator('.docs-specimen[data-example="dock"][data-variant="shelf"]').first();
  const shelfBounds = await shelf.evaluate(node => {
    const example = node.querySelector('[data-example="dock"]');
    const frame = example.firstElementChild;
    const content = example.querySelector('[aria-label="Open workspace"]');
    const dockViewport = example.querySelector('[data-slot="dock"] [data-part="viewport"]');
    const bounds = element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    };
    return { frame: bounds(frame), content: bounds(content), dockViewport: bounds(dockViewport) };
  });
  assert.ok(shelfBounds.content.left >= shelfBounds.frame.left && shelfBounds.content.right <= shelfBounds.frame.right, "shelf content region paints inside its frame");
  assert.ok(shelfBounds.dockViewport.left >= shelfBounds.frame.left && shelfBounds.dockViewport.right <= shelfBounds.frame.right, "only the Dock viewport owns horizontal overflow");
} finally {
  await browser.close();
}
