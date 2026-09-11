import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const project = process.cwd();
const fixture = await mkdtemp(join(project, ".dock-browser-"));
const projectUrl = `/@fs${project}`;
await writeFile(join(fixture, "index.html"), '<div id="root"></div><script type="module" src="/main.tsx"></script>');
await writeFile(join(fixture, "main.tsx"), `
  import React from "react";
  import { createRoot } from "react-dom/client";
  import { Dock } from "${projectUrl}/registry/cojeev/ui/dock.tsx";
  import "${projectUrl}/registry/cojeev/styles/tokens.css";
  import "${projectUrl}/registry/cojeev/styles/theme.css";
  import "${projectUrl}/registry/cojeev/styles/dock.css";
  import "${projectUrl}/registry/cojeev/styles/scroll-area.css";

  const baseItems = [
    { value: "focus", label: "Focus", icon: <span>F</span> },
    { value: "paused", label: "Unavailable", icon: <span>P</span>, disabled: true },
    { value: "work", label: "A very long workspace label that must stay contained", icon: <span>W</span> },
    { value: "memory", label: "Memory", icon: <span>M</span>, badge: 4 },
    { value: "settings", label: "Settings", icon: <span>S</span> },
  ];
  function Sample({ variant, dir }) {
    const [value, setValue] = React.useState("focus");
    const [receipt, setReceipt] = React.useState("focus:0");
    const count = React.useRef(0);
    const items = React.useMemo(() => baseItems.map(item => ({ ...item, onSelect: next => setReceipt(next + ":" + (++count.current)) })), []);
    return <section id={variant} dir={dir} style={{ width: variant === "shelf" ? 260 : undefined, maxWidth: "100%" }}>
      <h2>{variant}</h2>
      <Dock items={items} variant={variant} value={value} onValueChange={setValue} itemSize={52} magnification={2} aria-label={variant + " launcher"} />
      <output role="status">{receipt}</output>
    </section>;
  }
  function App() {
    const theme = new URLSearchParams(location.search).get("theme") || "light";
    document.documentElement.dataset.mode = theme;
    return <main><Sample variant="glass"/><Sample variant="shelf" dir="rtl"/><Sample variant="rail"/></main>;
  }
  createRoot(document.getElementById("root")).render(<App/>);
`);
await writeFile(join(fixture, "fixture.css"), "");

const server = await createServer({
  root: fixture,
  plugins: [react()],
  resolve: { alias: { "@": project } },
  css: { postcss: { plugins: [] } },
  server: { host: "127.0.0.1", port: 0, strictPort: false, fs: { allow: [project, fixture] } },
  logLevel: "error",
});
await server.listen();
const base = server.resolvedUrls?.local[0];
if (!base) throw new Error("Dock fixture server did not expose a local URL");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}?theme=light`);
  await page.locator('[data-slot="dock"]').first().waitFor();

  const glassButtons = page.locator('#glass [data-part="item"]');
  await glassButtons.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "A very long workspace label that must stay contained", "horizontal roving focus skips disabled items");
  assert.ok(Number(await glassButtons.nth(2).evaluate(node => node.style.getPropertyValue("--dock-item-scale"))) > 1.7, "keyboard focus receives the same magnification emphasis");
  const glassPaint = await glassButtons.nth(2).evaluate(node => {
    const viewport = node.closest('[data-part="viewport"]').getBoundingClientRect();
    const label = node.querySelector('[data-part="label"]').getBoundingClientRect();
    const visual = node.querySelector('[data-part="visual"]').getBoundingClientRect();
    return { viewport, label, visual };
  });
  assert.ok(glassPaint.visual.top >= glassPaint.viewport.top, "2× glass icon paint stays below the clip edge");
  assert.ok(glassPaint.label.top >= glassPaint.viewport.top, "2× glass tooltip stays below the clip edge");
  await page.keyboard.press("End");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Settings");
  await page.keyboard.press("Home");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Focus");

  const shelfButtons = page.locator('#shelf [data-part="item"]');
  await shelfButtons.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Settings", "RTL reverses horizontal arrow travel");
  await shelfButtons.nth(3).focus();
  await page.waitForTimeout(250);
  const shelfPaint = await shelfButtons.nth(3).evaluate(node => {
    const viewport = node.closest('[data-part="viewport"]').getBoundingClientRect();
    const label = node.querySelector('[data-part="label"]');
    const visual = node.querySelector('[data-part="visual"]');
    return { viewport, label: label.getBoundingClientRect(), visual: visual.getBoundingClientRect(), text: label.textContent };
  });
  assert.equal(shelfPaint.text, "Memory");
  assert.ok(shelfPaint.label.width >= 46, "focused tooltip paints its complete label, not a one-character sliver");
  assert.ok(shelfPaint.label.left >= shelfPaint.viewport.left && shelfPaint.label.right <= shelfPaint.viewport.right, "focused tooltip stays inside the scroller");
  assert.ok(shelfPaint.visual.left >= shelfPaint.viewport.left && shelfPaint.visual.right <= shelfPaint.viewport.right, "magnified focused icon is centered away from clipped edges");
  assert.ok(shelfPaint.visual.top >= shelfPaint.viewport.top, "2× shelf icon paint stays below the clip edge");
  assert.ok(shelfPaint.label.top >= shelfPaint.viewport.top, "2× shelf tooltip stays below the clip edge");

  const outsideRelease = await shelfButtons.nth(3).evaluate(memory => {
    const dock = memory.closest('[data-slot="dock"]');
    const viewport = dock.querySelector('[data-part="viewport"]');
    viewport.scrollTo({ left: 0 });
    const first = dock.querySelector('button[data-dock-index="0"]');
    first.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "mouse" }));
    first.focus();
    document.body.tabIndex = -1;
    document.body.focus();
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "mouse" }));
    const viewportCenter = viewport.getBoundingClientRect().left + viewport.getBoundingClientRect().width / 2;
    const before = Math.abs(memory.getBoundingClientRect().left + memory.getBoundingClientRect().width / 2 - viewportCenter);
    memory.focus();
    const after = Math.abs(memory.getBoundingClientRect().left + memory.getBoundingClientRect().width / 2 - viewportCenter);
    return { before, after, direction:getComputedStyle(viewport).direction, scroll:viewport.scrollLeft, width:viewport.clientWidth, content:viewport.scrollWidth };
  });
  assert.ok(outsideRelease.before > 20, "regression begins with Memory away from the viewport center");
  assert.ok(outsideRelease.after < 3, `outside release clears pointer modality so later non-pointer focus recenters: ${JSON.stringify(outsideRelease)}`);

  const railButtons = page.locator('#rail [data-part="item"]');
  await railButtons.nth(0).focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "A very long workspace label that must stay contained", "vertical rail uses up/down roving focus");
  await page.waitForFunction(() => {
    const visual = document.querySelector('#rail button[aria-label^="A very long"] [data-part="visual"]');
    return visual && new DOMMatrixReadOnly(getComputedStyle(visual).transform).a > 1.05;
  });
  const railGeometry = await railButtons.evaluateAll(nodes => nodes.map(node => {
    const visual = node.querySelector('[data-part="visual"]');
    const matrix = new DOMMatrixReadOnly(getComputedStyle(visual).transform);
    const box = visual.getBoundingClientRect();
    return { scale: matrix.a, top: box.top, bottom: box.bottom };
  }));
  assert.ok(railGeometry[2].scale > 1 && railGeometry[2].scale <= 1.12, "rail focus is emphasized without full bar magnification");
  assert.ok(railGeometry[2].top >= railGeometry[1].bottom, "focused rail item keeps clear of the preceding row");
  assert.ok(railGeometry[3].top >= railGeometry[2].bottom, "focused rail item keeps clear of the following row");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator('#rail [role="status"]').textContent(), "work:1", "selection invokes both the controlled change and item action");
  assert.equal(await railButtons.nth(2).getAttribute("aria-pressed"), "true");

  const target = glassButtons.nth(2);
  const box = await target.boundingBox();
  if (!box) throw new Error("Pointer target was not laid out");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const pointerScales = await glassButtons.evaluateAll(nodes => nodes.map(node => Number(node.style.getPropertyValue("--dock-item-scale"))));
  assert.ok(pointerScales[2] > 1.7, "pointer proximity magnifies the nearest item");
  assert.ok(pointerScales[3] > 1 && pointerScales[3] < pointerScales[2], "a neighboring item responds smoothly by distance");
  assert.equal(pointerScales[1], 1, "disabled items stay still");

  await page.evaluate(() => { document.documentElement.dataset.flow = "off"; });
  assert.equal(await target.locator('[data-part="visual"]').evaluate(node => getComputedStyle(node).transform), "none", "shared Flow Off suppresses magnification");
  await page.evaluate(() => { delete document.documentElement.dataset.flow; });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await target.focus();
  await page.waitForFunction(() => document.querySelector('#glass [data-slot="dock"]')?.getAttribute("data-motion") === "off");
  assert.equal(await target.locator('[data-part="visual"]').evaluate(node => getComputedStyle(node).transform), "none", "reduced motion removes transforms");
  assert.deepEqual(errors, [], "browser interaction produces no runtime exceptions");
  await page.close();

  await mkdir(join(project, "output/playwright/dock"), { recursive: true });
  for (const width of [1200, 360]) for (const theme of ["light", "dark"]) {
    const visual = await browser.newPage({ viewport: { width, height: width === 360 ? 1200 : 950 } });
    await visual.goto(`${base}?theme=${theme}`);
    await visual.locator('[data-slot="dock"]').first().waitFor();
    await visual.evaluate(() => document.fonts.ready);
    assert.ok(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${theme} page stays within the viewport`);
    for (const dock of await visual.locator('[data-slot="dock"]').all()) {
      assert.ok(await dock.evaluate(node => node.scrollWidth <= Math.max(node.clientWidth, innerWidth)), `${width}px ${theme} dock remains bounded`);
    }
    await visual.screenshot({ path: join(project, `output/playwright/dock/${width}-${theme}.png`), fullPage: true });
    await visual.close();
  }

  const touch = await browser.newContext({ viewport: { width: 360, height: 900 }, hasTouch: true, isMobile: true });
  const touchPage = await touch.newPage();
  await touchPage.goto(`${base}?theme=light`);
  const touchLabel = touchPage.locator('#glass [data-part="label"]').first();
  assert.equal(await touchLabel.evaluate(node => getComputedStyle(node).opacity), "1", "coarse pointers receive visible labels without hover");
  assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "touch layout stays viewport-bound");
  await touch.close();

  console.log("PASS: Dock pointer distance, keyboard/RTL/disabled roving focus, real callbacks, reduced/shared motion, touch labels, and batched 1200/360 light/dark bounds.");
} finally {
  await browser.close();
  await server.close();
  await rm(fixture, { recursive: true, force: true });
}
