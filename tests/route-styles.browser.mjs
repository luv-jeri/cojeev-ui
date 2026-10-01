/** Client-side navigation keeps every stylesheet it inserted (see scripts/build-route-styles.mjs), so a
 *  route reached again after visiting another one carries that route's sheet after its own. Each case
 *  hard-loads a route, then soft-navigates to the other route and back, and requires every component
 *  element to compute the same box, type and colour as on the hard load. Uses the static export
 *  (--serve) or BASE_URL. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const staticServer = process.argv.includes("--serve") ? await (await import("vite")).preview({
  configFile: false, base: "/ui/", build: { outDir: "out" },
  preview: { host: "127.0.0.1", port: 0, strictPort: true },
}) : null;
const base = (process.env.BASE_URL ?? (staticServer
  ? `http://127.0.0.1:${staticServer.httpServer.address().port}/ui`
  : "http://127.0.0.1:4320/ui")).replace(/\/$/, "");
const basePath = new URL(base).pathname;

// Route, the route visited in between, and elements that must exist so the case cannot pass empty:
// each pair once let the visited route's repeated shared rules override the first route's own, or
// left the docs page sheet restyling the theme control the first route shares with the docs.
const cases = [
  ["/docs/flow-sculpture/", "/", ['.v-preview__toolbar [data-slot="icon"]', '.v-sculpture-orbit-zoom > [data-slot="slider"]']],
  ["/", "/workspace/", ['[data-slot="sidebar-menu-button"] [data-slot="animated-icon"]']],
  ["/workspace/", "/", ['[data-slot="agent-chat-thread"]']],
  ["/workspace/", "/docs/button/", ['.docs-theme > [data-slot="label"]', '.docs-theme > .v-appearance-trigger']],
  ["/", "/docs/button/", ['.docs-theme > [data-slot="label"]']],
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
const countChanges = (from, to) => [...new Set([...Object.keys(from), ...Object.keys(to)])]
  .filter((slot) => from[slot] !== to[slot]).map((slot) => `${slot} ${from[slot] ?? 0} -> ${to[slot] ?? 0}`);
const sampleCounts = (sample) => Object.keys(sample).reduce((counts, key) => {
  const slot = key.slice(0, key.lastIndexOf("#"));
  counts[slot] = (counts[slot] ?? 0) + 1;
  return counts;
}, {});
// Elements per slot, and the renderers in view still deciding between WebGL and their fallback. measure() numbers
// elements per slot, so one element mounting late shifts every later key. A flow sculpture, for one, swaps its
// "Static shape preview" status for a "Motion is resting" note only once three.js has loaded and compiled: seconds
// after a hard load on a software-WebGL runner, yet at once after Back. Renderers out of view never start, so this
// leaves them out with the sculpture stage's IntersectionObserver test (threshold 0.1). shape-scene starts at
// threshold 0, so one only 0–10% in view is not waited for; that can reintroduce the flake, never hide a difference.
const pageState = () => new Promise((resolve) => {
  const counts = {}, targets = [...document.querySelectorAll('[data-renderer="pending"]')], seen = new Map();
  for (const el of document.querySelectorAll("[data-slot]")) counts[el.dataset.slot] = (counts[el.dataset.slot] ?? 0) + 1;
  if (!targets.length) return resolve({ counts, pending: [] });
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) seen.set(entry.target, entry.isIntersecting);
    if (seen.size < targets.length) return;
    observer.disconnect();
    resolve({ counts, pending: targets.filter((el) => seen.get(el)).map((el) => el.dataset.slot) });
  }, { threshold: 0.1 });
  for (const el of targets) observer.observe(el);
});
// Returns once no renderer in view is pending and the element counts have held for 1s. A page still changing
// after 60s fails here, naming what kept it changing, instead of being compared mid-change.
const settle = async (page, route) => {
  await page.waitForURL((url) => url.pathname === `${basePath}${route}`, { timeout: 60000 });
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  let state = await page.evaluate(pageState), changes = [], since = Date.now();
  for (const deadline = since + 60000; state.pending.length || Date.now() - since < 1000;) {
    if (Date.now() > deadline) throw new Error(`${route} did not settle within 60s: ${state.pending.length
      ? `${state.pending.join(", ")} still pending in view` : `component elements still changing (${changes.join(", ")})`}`);
    await page.waitForTimeout(250);
    const next = await page.evaluate(pageState), changed = countChanges(state.counts, next.counts);
    if (changed.length) [changes, since] = [changed, Date.now()];
    state = next;
  }
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
      // An element present only after Back adds no hard-load key, so element counts are compared on their own.
      const changed = countChanges(sampleCounts(hard), sampleCounts(soft));
      if (changed.length || differences.length) failures.push(`${name}: ${changed.length ? `component elements differ from the hard load (${changed.join(", ")}); ` : ""}${differences.length} computed values differ from the hard load\n    ${differences.slice(0, 12).join("\n    ")}`);
      console.log(`${changed.length || differences.length ? "FAIL" : "PASS"}: ${name} (${Object.keys(hard).length} component elements)`);
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
