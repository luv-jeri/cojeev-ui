/** Client-side navigation keeps every stylesheet it inserted (see scripts/build-route-styles.mjs), so a
 *  route reached again after visiting another one carries that route's sheet after its own. Each case
 *  hard-loads a route, then soft-navigates to the other route and back, and requires every component
 *  element to compute the same box, type and colour as on the hard load. Uses the static export
 *  (--serve) or BASE_URL. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const staticServer = process.argv.includes("--serve") ? await (await import("vite")).preview({
  configFile: false, base: "/cojeev-ui/", build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = (process.env.BASE_URL ?? (staticServer
  ? `http://127.0.0.1:${staticServer.httpServer.address().port}/cojeev-ui`
  : "http://127.0.0.1:4320/cojeev-ui")).replace(/\/$/, "");
const basePath = new URL(base).pathname;

// Route, the route visited in between, and elements that must exist so the case cannot pass empty:
// each pair once let the visited route's repeated shared rules override the first route's own.
const cases = [
  ["/docs/flow-sculpture/", "/", ['.v-preview__toolbar [data-slot="icon"]', '.v-sculpture-orbit-zoom > [data-slot="slider"]']],
  ["/", "/workspace/", ['[data-slot="sidebar-menu-button"] [data-slot="animated-icon"]']],
  ["/workspace/", "/", ['[data-slot="agent-chat-thread"]']],
];
const props = ["display", "width", "height", "font-size", "font-weight", "line-height", "color", "background-color", "gap",
  "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border-top-width", "border-top-color", "border-top-left-radius", "grid-template-columns"];
const measure = (page) => page.evaluate((props) => {
  const seen = {}, out = {};
  for (const el of document.querySelectorAll("[data-slot]")) {
    const key = `${el.dataset.slot}#${(seen[el.dataset.slot] = (seen[el.dataset.slot] ?? 0) + 1)}`;
    const style = getComputedStyle(el);
    out[key] = Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)]));
  }
  return out;
}, props);
const settle = async (page, route) => {
  await page.waitForURL((url) => url.pathname === `${basePath}${route}`, { timeout: 60000 });
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
};

const failures = [];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  for (const [route, via, required] of cases) {
    const name = `${route} > ${via} > Back`;
    const page = await context.newPage();
    try {
      await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 120000 });
      await settle(page, route);
      for (const selector of required) assert.ok(await page.locator(selector).count(), `${name}: ${selector} must exist`);
      const hard = await measure(page);
      const sheets = await page.evaluate(() => { window.__softNavigation = true; return document.styleSheets.length; });
      await page.evaluate((to) => window.next.router.push(to), via);
      await settle(page, via);
      await page.goBack();
      await settle(page, route);
      assert.ok(await page.evaluate(() => window.__softNavigation), `${name}: every step must stay a client-side navigation`);
      assert.ok(await page.evaluate(() => document.styleSheets.length) > sheets, `${name}: the visited route must leave its stylesheets behind`);
      const soft = await measure(page);
      const differences = Object.entries(hard).flatMap(([key, values]) => !soft[key] ? [`${key} missing`]
        : Object.entries(values).filter(([prop, value]) => soft[key][prop] !== value).map(([prop, value]) => `${key} ${prop}: ${value} -> ${soft[key][prop]}`));
      if (differences.length) failures.push(`${name}: ${differences.length} computed values differ from the hard load\n    ${differences.slice(0, 12).join("\n    ")}`);
      console.log(`${differences.length ? "FAIL" : "PASS"}: ${name} (${Object.keys(hard).length} component elements)`);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
      console.log(`FAIL: ${name}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  if (staticServer) await new Promise((resolve) => staticServer.httpServer.close(resolve));
}
assert.deepEqual(failures, [], `Route styles changed after client-side navigation:\n${failures.join("\n")}`);
