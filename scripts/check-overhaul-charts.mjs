import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
const base = args.url ?? "http://127.0.0.1:4320/cojeev-ui";
const output = args.output ?? "output/playwright/overhaul-charts/docs";
fs.mkdirSync(output, { recursive: true });
const variants = { "area-chart": ["linear", "step", "stacked"], "bar-chart": ["grouped", "stacked", "horizontal"], "line-chart": ["linear", "smooth", "step"], "pie-chart": ["pie", "donut"], "radar-chart": ["polygon", "rounded", "grid"], "radial-chart": ["full", "semicircle"], "chart-tooltip": ["default"] };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function eventually(check, message, timeout = 5000) { const end = Date.now() + timeout; while (Date.now() < end) { if (await check()) return; await wait(75); } throw new Error(message); }
const browser = await chromium.launch({ headless: true });
const results = { started: new Date().toISOString(), url: base, scope: "All seven entries and all declared variants at 390/dark and 1440/light; motion on; interactive state checks", cases: [] };
try {
  for (const [width, theme] of [[390, "dark"], [1440, "light"]]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    await context.addInitScript(theme => localStorage.setItem("cojeev-docs-theme", theme), theme);
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    for (const [id, choices] of Object.entries(variants)) for (const variant of choices) {
      if (args.ids && !args.ids.split(",").includes(id)) continue;
      const record = { id, variant, width, theme, errors: [] }; results.cases.push(record);
      const errorHandler = error => record.errors.push(error.message); page.on("pageerror", errorHandler);
      const consoleHandler = message => { if (message.type() === "error") record.errors.push(message.text()); }; page.on("console", consoleHandler);
      try {
        const response = await page.goto(`${base}/docs/${id}/`, { waitUntil: "domcontentloaded", timeout: 60000 }); assert.equal(response.status(), 200);
        await page.locator('[data-slot="preview"] [data-slot="tabs-list"][data-flow-owned]').first().waitFor({ state: "attached", timeout: 30000 });
        const choice = page.locator(".docs-playground-controls").getByLabel("Variant", { exact: true });
        if (variant !== "default") {
          if (await choice.count()) {
            const available = await choice.locator("option").evaluateAll(items => items.map(item => item.value));
            assert(available.includes(variant) || variant === choices[0] && available.includes("default"), `Missing variant control: ${variant}`);
            await choice.selectOption(available.includes(variant) ? variant : "default");
          } else assert.equal(choices.length, 1, "Variant selector missing");
        }
        const root = page.locator(`[data-example="${id}"]`); await root.waitFor();
        assert.equal(await root.count(), 1, "Exactly one selected example is mounted");
        const tooltip = root.getByRole("tooltip");
        if (id === "chart-tooltip") {
          const morning = root.getByRole("button", { name: "Morning", exact: true });
          await morning.hover(); await tooltip.waitFor(); assert((await tooltip.innerText()).includes("Morning"));
          const afternoon = root.getByRole("button", { name: "Afternoon", exact: true }); await afternoon.focus();
          await eventually(async () => (await tooltip.innerText()).includes("Afternoon"), "Keyboard focus changes tooltip content");
          await root.screenshot({ path: path.join(output, `${id}-${width}-${theme}.png`) });
          await afternoon.press("Escape"); await tooltip.waitFor({ state: "hidden" });
          record.detail = "Pointer hover, keyboard focus/value change, Escape dismissal";
        } else {
          const svg = root.locator('[data-slot="chart-svg"]'); await svg.waitFor();
          await eventually(async () => (await root.locator('[data-slot="chart-mark"]').count()) > 0, "Nonempty dataset renders actual chart marks");
          await wait(450);
          const geometry = await svg.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight, paths: [...el.querySelectorAll("path")].map(item => item.getAttribute("d") ?? ""), marks: [...el.querySelectorAll('[data-slot="chart-mark"]')].map(item => { const box = item.getBBox(); return { width: box.width, height: box.height }; }) }));
          assert(geometry.width > 100 && geometry.height > 100, "Chart has real dimensions");
          assert(geometry.paths.every(value => !/NaN|Infinity|undefined/.test(value)), "All paths have finite geometry");
          assert(geometry.marks.some(item => item.width > 1 && item.height > 1), "A placeholder cannot pass as a rendered chart");
          await root.screenshot({ path: path.join(output, `${id}-${variant}-${width}-${theme}.png`) });
          await svg.focus(); await tooltip.waitFor(); const first = await tooltip.innerText(); await svg.press("ArrowRight");
          await eventually(async () => (await tooltip.innerText()) !== first, "Arrow key changes inspected observation");
          await wait(220);
          const tip = await tooltip.boundingBox(), plot = await root.locator('[data-slot="chart-plot"]').boundingBox();
          assert(tip.x >= plot.x - 2 && tip.x + tip.width <= plot.x + plot.width + 2, "Tooltip remains horizontally bounded");
          assert(tip.y >= plot.y - 2 && tip.y + tip.height <= plot.y + plot.height + 2, "Tooltip remains vertically bounded");
          await svg.press("Escape"); await tooltip.waitFor({ state: "hidden" });
          const box = await svg.boundingBox();
          if (id === "pie-chart" || id === "radial-chart") {
            const radius = Math.min(box.width / 2 - 16, variant === "semicircle" ? 150 : 124) - (id === "radial-chart" ? 8 : 20);
            const centerY = box.y + box.height * (variant === "semicircle" ? .7 : .5);
            const angle = variant === "semicircle" ? -Math.PI * .75 : -Math.PI / 3;
            await page.mouse.move(box.x + box.width / 2 + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
          } else await page.mouse.move(box.x + box.width * .48, box.y + box.height * .42);
          await tooltip.waitFor(); await wait(220);
          const pointerTip = await tooltip.boundingBox(); assert(pointerTip.x >= plot.x - 2 && pointerTip.x + pointerTip.width <= plot.x + plot.width + 2 && pointerTip.y >= plot.y - 2 && pointerTip.y + pointerTip.height <= plot.y + plot.height + 2, "Pointer tooltip remains bounded");
          await root.screenshot({ path: path.join(output, `${id}-${variant}-tooltip-${width}-${theme}.png`) });
          const legend = root.locator(".v-chart-legend").getByRole("button").first();
          const before = await root.locator('[data-slot="chart-mark"]').count(); await legend.click();
          assert.equal(await legend.getAttribute("aria-pressed"), "false");
          await eventually(async () => (await root.locator('[data-slot="chart-mark"]').count()) < before, "Hiding a legend entry removes its series or slice");
          const show = root.getByRole("button", { name: "Show data", exact: true }); await show.click();
          const table = root.locator('[data-slot="chart-data-table"]'); await table.waitFor(); assert((await table.boundingBox()).height > 30, "Visible data table is expanded");
          if (variant === choices[0]) {
            await legend.click();
            const state = root.getByLabel("Sample data", { exact: true });
            await state.selectOption("updated"); await eventually(async () => (await root.innerText()).includes("Next week loaded"), "Updated dataset receipt appears");
            await state.selectOption("zero"); await svg.waitFor();
            assert.equal(await root.locator('path[d*="NaN"],path[d*="Infinity"]').count(), 0);
            await state.selectOption("missing"); await svg.waitFor();
            await state.selectOption("empty"); await root.getByText("No observations to plot.", { exact: true }).waitFor();
          }
          record.detail = "Actual geometry, pointer and arrow-key tooltip, bounded tooltip, Escape, series removal and visible table; default also exercises updated/zero/missing/empty";
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No document horizontal overflow");
        assert.deepEqual(record.errors, []); record.status = "pass";
      } catch (error) { record.status = "failed"; record.error = error.message; await page.screenshot({ path: path.join(output, `${id}-${variant}-${width}-failure.png`) }).catch(() => {}); }
      finally { page.off("pageerror", errorHandler); page.off("console", consoleHandler); fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2)); }
      console.log(JSON.stringify({ id, variant, width, theme, status: record.status, error: record.error }));
    }
    await context.close();
  }
} finally { results.ended = new Date().toISOString(); fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2)); await browser.close(); }
if (results.cases.some(item => item.status !== "pass")) process.exitCode = 1;
