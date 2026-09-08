/** Focused local-dev review, not a production build or catalogue gate. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
const output = path.resolve(root, args.output || "output/playwright/review-selectors-lists/round-1");
fs.mkdirSync(output, { recursive: true });
const bundle = await build({ entryPoints: [path.join(root, "scripts/fixtures/review-selectors-lists.tsx")], tsconfig: path.join(root, "tsconfig.json"), bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, logLevel: "silent" });
const styles = ["base", "checkbox", "radio-group", "questionnaire", "item-adornment", "scroll-area", "select", "combobox", "multi-select", "dropdown-menu", "context-menu", "menubar", "command", "navigation-menu"].map(name => fs.readFileSync(path.join(root, `registry/sahajiv/styles/${name}.css`), "utf8")).join("\n");
const fixtureCss = `#review-list-fixture{max-width:1160px;margin:0 auto;padding:28px 24px;min-width:0}#review-list-fixture h1{font:500 32px/1.2 var(--font-display);margin-bottom:32px}#review-list-fixture h2{font:500 25px/1.2 var(--font-display);margin-bottom:20px}#review-list-fixture h3{font:600 13px/1.4 var(--font-text);margin-bottom:12px}#review-list-fixture section{margin-bottom:40px;min-width:0}.review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px;align-items:start}.review-grid>div{min-width:0}.review-grid>div>[data-slot=checkbox]{display:flex}.review-mark-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}#review-form{display:grid;gap:18px;margin-top:28px;max-width:640px}.review-adornments{display:flex;flex-wrap:wrap;gap:20px}.review-adornments>div{display:flex;align-items:center;gap:8px;min-height:44px}#review-events{display:block;overflow-wrap:anywhere}#navigation-case [data-slot=navigation-menu-content]{position:relative;min-width:0;width:100%}#navigation-case [data-slot=navigation-menu-link]{display:flex;min-height:44px}#command-case [data-slot=command]{max-width:600px}@media(max-width:600px){.review-grid{grid-template-columns:1fr;gap:24px}#review-list-fixture{padding:24px 18px}.review-mark-row{grid-template-columns:1fr 1fr}}`;
const browser = await chromium.launch();
const results = [];
const contexts = args.contexts ? args.contexts.split(",").map(value => { const [width, theme] = value.split(":"); return { width: Number(width), theme }; }) : (args.width ? [Number(args.width)] : [390, 1440]).flatMap(width => (args.theme ? [args.theme] : ["light", "dark"]).map(theme => ({ width, theme })));
try {
  for (const { width, theme } of contexts) {
    const record = { width, theme, checks: [], errors: [], consoleWarnings: [], failures: [], status: "RUNNING" };
    results.push(record);
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on("pageerror", error => record.errors.push(error.stack || error.message));
    page.on("console", message => { if (["warning", "error"].includes(message.type())) record.consoleWarnings.push(message.text()); });
    const verify = async (name, run) => { if (args.only && !args.only.split(",").some(part => name.toLowerCase().includes(part.toLowerCase()))) return; try { await run(); record.checks.push(name); } catch (error) { record.failures.push({ name, message: error.message }); } };
    const shot = async (name, locator) => { await locator.scrollIntoViewIfNeeded(); await locator.screenshot({ path: path.join(output, `${width}-${theme}-${name}.png`) }); };
    try {
      const base = args.url || "http://127.0.0.1:4320/sahajiv-ui";
      const response = await context.request.get(`${base}/docs/checkbox/`);
      const source = await response.text();
      const links = source.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || [];
      assert(links.length > 0, "Running dev site must supply its current stylesheets");
      // A same-origin isolated document keeps current CSS while avoiding Next HMR
      // replacing the fixture during another agent's concurrent source edits.
      await page.route(`${base}/review-local-fixture`, route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-mode="${theme}"><head>${links.join("")}</head><body></body></html>` }));
      await page.goto(`${base}/review-local-fixture`);
      await page.addStyleTag({ content: styles + fixtureCss });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.locator("#review-list-fixture").waitFor();
      await page.evaluate(() => { window.__reviewMode("active"); return document.fonts.ready; });
      await verify("selector sizes clamp while rows retain 44px hit areas", async () => {
        const sizes = await page.locator("[data-size-case]").evaluateAll(nodes => nodes.map(node => ({ glyph: node.querySelector('[data-slot="selector-glyph"]').getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
        assert.deepEqual(sizes.map(size => size.glyph), [20, 28, 36, 16, 64, 28]);
        assert(sizes.every(size => size.height >= 44));
      });
      await verify("controlled selectors keep pointer, keyboard and native form values", async () => {
        const check = page.locator('[data-probe="check"]');
        await check.click(); assert.equal(await check.getAttribute("aria-checked"), "true");
        assert.equal(await check.locator('[data-slot="selector-mark"]').count(), 0);
        assert.equal(await check.locator('[data-slot="selector-surface-host"]').getAttribute("data-sw"), "2.5");
        assert.equal(await page.locator("#review-form").evaluate(form => new FormData(form).get("feature")), "idea");
        await check.focus(); await page.keyboard.press("Space", { delay: 60 }); assert.equal(await check.getAttribute("aria-checked"), "false");
        await page.getByRole("radio", { name: "Radio one", exact: true }).focus(); await page.keyboard.press("ArrowDown", { delay: 60 });
        assert.equal(await page.getByRole("radio", { name: "Radio two", exact: true }).getAttribute("aria-checked"), "true");
        assert.equal(await page.locator("#review-form").evaluate(form => new FormData(form).get("rhythm")), "two");
        await page.getByText("Questionnaire two", { exact: true }).click();
        assert.equal(await page.locator("#review-form").evaluate(form => new FormData(form).get("start")), "two");
        const glyph = page.locator('[data-slot="questionnaire-option"]').last().locator('[data-slot="selector-glyph"]');
        assert.equal(await glyph.getAttribute("data-selector-indicator"), "diamond");
        assert.equal(await glyph.evaluate(node => node.getBoundingClientRect().width), 20);
        const cursors = await page.getByRole("checkbox", { name: "Managed checkbox" }).evaluate(node => getComputedStyle(node).cursor);
        assert.equal(cursors, "not-allowed");
      });
      await page.mouse.move(0, 0); await page.waitForTimeout(250);
      await shot("selectors", page.locator("#selector-section"));
      await verify("all indicator shapes render and adornment modes remove their own layers", async () => {
        for (const mark of ["auto", "dot", "check", "diamond", "flower"]) assert.equal(await page.locator(`[data-mark-case="${mark}"] [data-slot="selector-mark"]`).count(), 2);
        const shape = index => page.locator(`[data-adornment-case="${index}"] .v-item-adornment__shape`);
        const icon = index => page.locator(`[data-adornment-case="${index}"] .v-item-adornment__icon`);
        assert.equal(await shape(0).count(), 1); assert.equal(await icon(0).count(), 1);
        assert.equal(await shape(1).count(), 0); assert.equal(await icon(1).count(), 1);
        assert.equal(await shape(2).count(), 1); assert.equal(await icon(2).count(), 0);
        assert.equal(await page.locator('[data-adornment-case="3"] [data-slot="item-adornment"]').count(), 0);
        assert.equal(await page.locator('[data-adornment-case="4"] [data-slot="item-adornment"]').count(), 0);
        assert.equal(await page.locator('[data-adornment-case="5"] [data-slot="icon"]').count(), 1);
      });
      await shot("adornments", page.locator("#adornment-section"));
      const scrollProof = async (name, surface) => {
        await surface.scrollIntoViewIfNeeded();
        const viewport = surface.locator('[data-radix-scroll-area-viewport]').first();
        await viewport.waitFor();
        await page.waitForTimeout(100);
        const bounds = await viewport.evaluate(node => ({ height: node.clientHeight, scrollHeight: node.scrollHeight, width: node.clientWidth, scrollWidth: node.scrollWidth }));
        assert(bounds.height > 0 && bounds.scrollHeight > bounds.height + 20, `${name} needs real overflow: ${JSON.stringify(bounds)}`);
        assert(bounds.scrollWidth <= bounds.width + 1, `${name} horizontal overflow: ${JSON.stringify(bounds)}`);
        const disabled = surface.locator(':is([role="option"],[role="menuitem"],[role="checkbox"]):is([aria-disabled="true"],[data-disabled]:not([data-disabled="false"]))').first();
        if (await disabled.count()) {
          const cursor = await disabled.evaluate(node => ({ cursor: getComputedStyle(node).cursor, pointerEvents: getComputedStyle(node).pointerEvents }));
          assert.equal(cursor.cursor, "not-allowed"); assert.notEqual(cursor.pointerEvents, "none");
        }
        const thumb = surface.locator('[data-slot="scroll-area-thumb"]').first();
        await thumb.waitFor({ state: "visible" });
        const thumbBox = await thumb.boundingBox(), barBox = await surface.locator('[data-slot="scroll-area-scrollbar"]').first().boundingBox();
        await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + 8);
        await page.mouse.down(); await page.mouse.move(thumbBox.x + thumbBox.width / 2, barBox.y + barBox.height - 14, { steps: 6 }); await page.mouse.up();
        assert(await viewport.evaluate(node => node.scrollTop > 0), `${name} thumb must move its viewport`);
        await shot(name, surface);
      };
      await verify("Select preserves one scroll owner, custom drag, keyboard and selection", async () => {
        await page.getByRole("combobox", { name: "Review select" }).click(); const surface = page.locator('[data-slot="select-content"]').last();
        await scrollProof("select", surface);
        await surface.getByRole("option", { name: "Option 01", exact: true }).focus(); await page.keyboard.press("End", { delay: 60 }); await page.keyboard.press("Enter", { delay: 60 });
        assert.equal(await page.locator("#review-events").textContent(), "select:option-24");
      });
      await page.keyboard.press("Escape");
      await verify("Combobox preserves filtering and pointer selection through custom scroll", async () => {
        await page.getByRole("combobox", { name: "Review combobox" }).fill("option"); const surface = page.locator('[data-slot="combobox-content"]').last();
        await scrollProof("combobox", surface); await surface.getByRole("option", { name: "Option 24", exact: true }).click();
        assert.equal(await page.locator("#review-events").textContent(), "combobox:option-24");
      });
      await page.keyboard.press("Escape");
      await verify("MultiSelect exposes a draggable custom thumb and reaches last choice by keyboard", async () => {
        await page.getByRole("button", { name: "Review multiple", exact: true }).click(); const surface = page.locator('.v-multi-select__popover').last();
        await scrollProof("multi-select", surface);
        await surface.getByRole("searchbox").focus(); await page.keyboard.press("ArrowDown", { delay: 60 }); await page.keyboard.press("End", { delay: 60 }); await page.keyboard.press("Space", { delay: 60 });
        assert.equal(await surface.getByRole("checkbox", { name: "Option 24", exact: true }).getAttribute("aria-checked"), "true");
      });
      await page.keyboard.press("Escape");
      for (const name of ["dropdown", "context", "menubar"]) {
        await verify(`${name} menu keeps custom thumb, disabled cursor and End/Enter activation`, async () => {
          const trigger = page.getByRole(name === "menubar" ? "menuitem" : "button", { name: `Review ${name}`, exact: true });
          if (name === "context") { await trigger.focus(); await page.keyboard.press("Shift+F10"); } else await trigger.click();
          const slot = name === "dropdown" ? "dropdown-menu" : name === "context" ? "context-menu" : "menubar";
          const surface = page.locator(`[data-slot="${slot}-content"]`).last(); await scrollProof(name, surface);
          const first = surface.getByRole("menuitem", { name: "Option 01", exact: true }); await first.focus(); await page.keyboard.press("End", { delay: 60 }); if (name === "dropdown") await page.keyboard.press("ArrowUp", { delay: 60 });
          await page.keyboard.press("Enter", { delay: 60 }); assert.equal(await page.locator("#review-events").textContent(), `${name}:option-24`);
        });
        await page.keyboard.press("Escape");
      }
      await verify("Navigation content uses the same scrollport and keeps link activation", async () => {
        await page.getByRole("button", { name: "Review navigation", exact: true }).click(); const surface = page.locator('[data-slot="navigation-menu-content"][data-state="open"]');
        await scrollProof("navigation", surface); await surface.getByRole("link", { name: "Option 24", exact: true }).click();
        assert.equal(await page.locator("#review-events").textContent(), "navigation:option-24");
      });
      await page.keyboard.press("Escape");
      await verify("Command keeps custom thumb, keyboard selection and no-results feedback", async () => {
        const surface = page.locator('#command-case [data-slot="scroll-area"]').first(); await scrollProof("command", surface);
        const input = page.getByRole("combobox", { name: "Review commands", exact: true }); await input.fill("option-24"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
        assert.equal(await page.locator("#review-events").textContent(), "command:option-24"); await input.fill("no-such-option"); assert(await page.getByText("No matching commands", { exact: true }).isVisible()); await input.fill("");
      });
      await verify("appearance scroll geometry reflects actual content overflow", async () => {
        await page.getByRole("button", { name: "Colour and contrast", exact: true }).click();
        const surface = page.locator('.v-appearance-popover').last(); await surface.waitFor(); await page.waitForTimeout(200);
        record.appearanceGeometry = await surface.evaluate(node => {
          const viewport = node.querySelector('[data-radix-scroll-area-viewport]'), box = viewport.getBoundingClientRect(), thumb = node.querySelector('[data-slot="scroll-area-thumb"]');
          return { viewport: viewport.clientHeight, scrollHeight: viewport.scrollHeight, contentHeight: viewport.firstElementChild.getBoundingClientRect().height, thumbHeight: thumb?.getBoundingClientRect().height ?? 0, contributors: [...viewport.querySelectorAll('*')].map(child => ({ slot: child.getAttribute('data-slot'), tag: child.tagName, height: child.getBoundingClientRect().height, bottom: child.getBoundingClientRect().bottom - box.bottom })).filter(child => child.bottom > 1).slice(-10) };
        });
        if (record.appearanceGeometry.contentHeight + 20 <= record.appearanceGeometry.viewport + 1) {
          assert(record.appearanceGeometry.scrollHeight <= record.appearanceGeometry.viewport + 1, "Decorative paint must not invent overflow when content fits");
          assert.equal(record.appearanceGeometry.thumbHeight, 0, "No thumb is needed for fitting content");
        }
        await shot("appearance", surface); await page.keyboard.press("Escape");
      });
      await verify("Off, Flow Off and reduced motion preserve immediate selector state", async () => {
        for (const mode of ["off", "flow-off", "reduced"]) {
          await page.emulateMedia({ reducedMotion: mode === "reduced" ? "reduce" : "no-preference" }); await page.evaluate(mode => window.__reviewMode(mode), mode); await page.waitForTimeout(150);
          const check = page.locator('[data-probe="check"]'); await check.click(); assert.equal(await check.getAttribute("aria-checked"), "true");
          assert.equal(await check.locator("svg.v-morph").count(), 0); await check.click();
        }
      });
      await verify("appearance palette change reaches the actual selected SVG fill", async () => {
        await page.emulateMedia({ reducedMotion: "no-preference" }); await page.evaluate(() => { window.__reviewMode("active"); window.__reviewAppearance("tide"); });
        const check = page.locator('[data-probe="check"]'); await check.click(); await page.mouse.move(0, 0); await page.waitForTimeout(200);
        const paint = await check.evaluate(node => {
          const sample = document.createElement("span"); sample.style.color = "var(--v-pink)"; document.body.append(sample); const expected = getComputedStyle(sample).color; sample.remove();
          const body = node.querySelector('[data-slot="selector-surface-host"] [data-morph-body]') ?? node.querySelector('[data-slot="selector-surface"]');
          return { expected, actual: getComputedStyle(body).fill, palette: document.documentElement.dataset.palette };
        });
        assert.equal(paint.palette, "tide"); assert.equal(paint.actual, paint.expected); record.palettePaint = paint;
        await page.evaluate(() => window.__reviewAppearance("paper"));
      });
      const bounds = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert(bounds.document <= bounds.viewport + 1, `document overflow ${JSON.stringify(bounds)}`);
      record.bounds = bounds;
      assert.equal(record.errors.length, 0, record.errors.join("\n"));
      assert(!record.consoleWarnings.some(message => /conflicting.*overflow|Updating.*overflow[XY]/i.test(message)), record.consoleWarnings.join("\n"));
      record.status = record.failures.length ? "FAIL" : "PASS";
    } catch (error) { record.status = "FAIL"; record.failures.push({ name: "fixture", message: error.message }); }
    await context.close();
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2));
    console.log(`${width} ${theme}: ${record.status}, ${record.checks.length} checks, ${record.failures.length} failures`);
  }
} finally { await browser.close(); }
if (results.some(result => result.status !== "PASS")) process.exitCode = 1;
