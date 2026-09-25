import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

/* The prepaint bootstrap writes `data-mode`, `data-palette`, `data-contrast` and the
 * inline tokens before React mounts, and it listens to `storage` so another tab's
 * change is reflected before hydration. That listener can only *re-read storage*, so
 * once the mounted application owns the same state it is a second writer with stale
 * information. The regression these cases guard is a wrong **owner**, not a wrong
 * colour: after the theme control selected a value whose `setItem` failed, the mounted
 * control still showed that value while a cross-tab palette change made the bootstrap
 * repaint the root from the stored one. The observable defect is a switch that says
 * dark on a light page.
 *
 * So the handoff is asserted from both sides, because either half alone is passable by
 * a broken implementation:
 *
 *   - **before mount** the bootstrap must still follow another tab (a fix that simply
 *     dropped the listener would otherwise pass every other case here);
 *   - **after mount** it must no longer write at all, and the mounted runtime's own
 *     subscriptions — `AppearanceProvider` for the palette, the docs theme store for
 *     the mode — must take over.
 *
 * `POLISH_URL` matches the sibling suites; the default is the configured basePath.
 */
const base = (process.env.POLISH_URL ?? process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4320/cojeev-ui").replace(/\/$/, "");
const output = process.env.CROSS_TAB_OUTPUT ?? "output/playwright/appearance-cross-tab";
await mkdir(output, { recursive: true });

/** Page-side: seed once, and (only where asked) make the *theme* key unable to persist.
 * Reads and every other key keep working, so this models a full or partitioned store
 * failing on one write rather than a blocked localStorage — the case where the control
 * legitimately keeps its choice in memory. */
function installSeed({ seed, failThemeWrites }) {
  try {
    if (seed) {
      localStorage.setItem("cojeev-appearance", JSON.stringify(seed.appearance));
      localStorage.setItem("cojeev-docs-theme", seed.theme);
    }
  } catch { /* not a blocked-storage case; a throw here would fail later and loudly */ }
  if (failThemeWrites) {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cojeev-docs-theme") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, key, value);
    };
  }
}

/** Page-side: record every value written to `data-mode`, with the provider marker at
 * that instant. A regression here can be a *transient* wrong paint — the bootstrap
 * writes the stale mode and the mounted runtime repairs it a frame later — so polling
 * the settled value is not enough; the writes themselves have to be seen. The same init
 * script runs in every tab, so the log has to be cleared per navigation before reading. */
function installModeLog() {
  const log = window.__modeWrites = [];
  /* At document-start `documentElement` can still be null, so patch it as soon as it
   * exists — the inline bootstrap is synchronous and runs in `<head>`, so this must be
   * in place before that script's own `setAttribute` calls. */
  let attempts = 0;
  (function patch() {
    const target = document.documentElement;
    if (!target) {
      if (attempts++ < 1000) requestAnimationFrame(patch);
      return;
    }
    const original = target.setAttribute.bind(target);
    Object.defineProperty(target, "setAttribute", {
      configurable: true,
      value(name, value) {
        if (name === "data-mode") log.push({ value: String(value), mounted: target.dataset.appearance ?? null, at: Math.round(performance.now()) });
        return original(name, value);
      },
    });
  })();
}

/** Page-side: clear the write log after a navigation has settled. */
const clearModeLog = page => page.evaluate(() => { window.__modeWrites.length = 0; });

/** Page-side: read the write log. */
const modeWrites = page => page.evaluate(() => window.__modeWrites.slice());

/** The observable tuple: what the root declares, and what the user's switch shows. */
const read = page => page.evaluate(() => {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return {
    mode: root.dataset.mode ?? null,
    palette: root.dataset.palette ?? null,
    contrast: root.dataset.contrast ?? null,
    mounted: root.dataset.appearance ?? null,
    storedTheme: (() => { try { return localStorage.getItem("cojeev-docs-theme"); } catch { return null; } })(),
    storedAppearance: (() => { try { return localStorage.getItem("cojeev-appearance"); } catch { return null; } })(),
    switches: [...document.querySelectorAll('[role="switch"][aria-label="Dark appearance"]')].map(node => node.getAttribute("aria-checked")),
    inlineText3: root.style.getPropertyValue("--v-text-3").trim().toUpperCase(),
    canvas: style.getPropertyValue("--v-canvas").trim().toUpperCase(),
  };
});

/** Mount the appearance page in a new tab of the given context and wait for the
 * provider's own marker, so every post-mount read is from the mounted application. */
async function openMounted(context, path = "/docs/appearance/") {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text()); });
  await page.goto(`${base}${path}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.appearance === "mounted", null, { timeout: 20000 });
  return { page, errors };
}

const browser = await chromium.launch();
const results = [];
try {
  /* 1. The reported regression. The first tab cannot persist its theme; its control
   *    keeps `dark` in memory. A palette change from a second tab must not repaint the
   *    root from the stored `light`. */
  {
    const name = "volatile-theme-survives-cross-tab-palette";
    const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installSeed, { seed: { appearance: { palette: "paper", contrast: 60 }, theme: "light" }, failThemeWrites: true });
    await context.addInitScript(installModeLog);
    const { page: a, errors } = await openMounted(context);
    const before = await read(a);
    assert.equal(before.mode, "light", `${name}: the seeded theme must paint light before the control is used`);
    assert.deepEqual(before.switches, ["false"], `${name}: the switch must start unchecked`);

    await a.getByRole("switch", { name: "Dark appearance" }).first().click();
    await a.waitForFunction(() => document.documentElement.dataset.mode === "dark");
    const chosen = await read(a);
    assert.deepEqual(chosen.switches, ["true"], `${name}: the control must show the chosen dark theme`);
    assert.equal(chosen.storedTheme, "light", `${name}: the fixture must still hold the un-persisted theme, or the case is not exercising the failure`);
    assert.equal(chosen.mode, "dark", `${name}: the chosen theme must be painted`);

    /* Only writes from here on are judged: everything before this point is mount. */
    await clearModeLog(a);
    const b = await context.newPage();
    await b.goto(`${base}/docs/appearance/`, { waitUntil: "load" });
    await b.evaluate(() => localStorage.setItem("cojeev-appearance", JSON.stringify({ palette: "tide", contrast: 33 })));
    await a.waitForFunction(() => document.documentElement.dataset.palette === "tide");
    await a.waitForTimeout(500);

    /* The regression can be transient: the bootstrap wrote the stale mode and the
     * mounted runtime repaired it a frame later, so only a settled read says nothing.
     * Every `data-mode` write while the provider is mounted is inspected instead. */
    const writes = await modeWrites(a);
    const stale = writes.filter(write => write.mounted === "mounted" && write.value === "light");
    assert.deepEqual(stale, [], `${name}: the prepaint bootstrap wrote the un-persisted stored theme after the mounted provider owned it (${JSON.stringify(stale)})`);

    const after = await read(a);
    assert.equal(after.mode, "dark", `${name}: a cross-tab palette change repainted the root from the un-persisted stored theme (mode ${after.mode})`);
    assert.deepEqual(after.switches, ["true"], `${name}: the switch and the page disagree — the bootstrap wrote after the provider owned the state`);
    assert.equal(after.storedTheme, "light", `${name}: the theme write must still be the failing one`);
    assert.deepEqual(errors, [], `${name}: the page raised hydration errors: ${errors.join(" | ")}`);
    results.push({ name, before, chosen, writes, after });
    await context.close();
  }

  /* 2. The handoff must not break the cross-tab feature it used to provide: a palette
   *    changed in another tab still reaches a mounted tab through the provider. */
  {
    const name = "cross-tab-palette-still-syncs-after-mount";
    const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installSeed, { seed: { appearance: { palette: "paper", contrast: 60 }, theme: "light" }, failThemeWrites: false });
    const { page: a, errors } = await openMounted(context);
    await a.waitForFunction(() => document.documentElement.dataset.palette === "paper");

    const b = await context.newPage();
    await b.goto(`${base}/docs/appearance/`, { waitUntil: "load" });
    await b.evaluate(() => localStorage.setItem("cojeev-appearance", JSON.stringify({ palette: "grove", contrast: 5 })));
    await a.waitForFunction(() => document.documentElement.dataset.palette === "grove");
    await a.waitForTimeout(300);

    const after = await read(a);
    assert.equal(after.palette, "grove", `${name}: the mounted provider did not pick up the other tab's palette`);
    assert.equal(after.contrast, "5", `${name}: the mounted provider did not pick up the other tab's contrast`);
    assert.equal(after.mounted, "mounted", `${name}: the provider must still be the mounted owner`);
    assert.deepEqual(errors, [], `${name}: the page raised hydration errors: ${errors.join(" | ")}`);
    results.push({ name, after });
    await context.close();
  }

  /* 3. Same handoff, the theme key: the mounted tab must still follow another tab's
   *    theme through the docs theme store, which is what made dropping the bootstrap
   *    listener safe in the first place. */
  {
    const name = "cross-tab-theme-still-syncs-after-mount";
    const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installSeed, { seed: { appearance: { palette: "paper", contrast: 60 }, theme: "light" }, failThemeWrites: false });
    const { page: a, errors } = await openMounted(context);
    assert.equal((await read(a)).mode, "light", `${name}: the seeded theme must paint light`);

    const b = await context.newPage();
    await b.goto(`${base}/docs/appearance/`, { waitUntil: "load" });
    await b.evaluate(() => localStorage.setItem("cojeev-docs-theme", "dark"));
    await a.waitForFunction(() => document.documentElement.dataset.mode === "dark");
    await a.waitForTimeout(300);

    const after = await read(a);
    assert.equal(after.mode, "dark", `${name}: the mounted tab did not follow the other tab's theme`);
    assert.deepEqual(after.switches, ["true"], `${name}: the switch must agree with the followed theme`);
    assert.deepEqual(errors, [], `${name}: the page raised hydration errors: ${errors.join(" | ")}`);
    results.push({ name, after });
    await context.close();
  }

  /* 4. The other half of the handoff: before the provider mounts the bootstrap is the
   *    only writer, and it must still follow another tab — with the bundles held, React
   *    cannot have mounted, so this is the pre-mount path by construction. */
  {
    const name = "cross-tab-palette-syncs-before-mount";
    const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installSeed, { seed: { appearance: { palette: "paper", contrast: 60 }, theme: "light" }, failThemeWrites: false });
    const page = await context.newPage();
    /* The same barrier the startup suite uses: every client bundle waits until this is
     * released, so no React can run while the assertion below reads the frame. */
    let releaseBundles, settled = false;
    const gate = new Promise(resolve => { releaseBundles = () => { if (!settled) { settled = true; resolve(); } }; });
    await page.route("**/_next/**/*.js*", async route => { await gate; await route.continue(); });

    const b = await context.newPage();
    await b.goto(`${base}/docs/appearance/`, { waitUntil: "load" });

    /* Navigate the gated tab first and stop once the document body exists: the inline
     * bootstrap is synchronous and ahead of the body, so its storage listener is
     * registered by then while the application still cannot have mounted. */
    await page.goto(`${base}/docs/appearance/`, { waitUntil: "commit" });
    await page.locator(".docs-title-row h1").waitFor();
    assert.equal((await read(page)).mounted, null, `${name}: the provider mounted before the cross-tab change, so this is not the pre-mount path`);

    await b.evaluate(() => localStorage.setItem("cojeev-appearance", JSON.stringify({ palette: "grove", contrast: 5 })));
    await page.waitForFunction(() => document.documentElement.dataset.palette === "grove", null, { timeout: 10000 });
    const preMount = await read(page);
    assert.equal(preMount.mounted, null, `${name}: the provider mounted, so this is not the pre-mount path`);
    assert.equal(preMount.palette, "grove", `${name}: the bootstrap did not follow the other tab before the provider mounted`);
    assert.equal(preMount.contrast, "5", `${name}: the bootstrap did not take the other tab's contrast`);
    releaseBundles();
    await page.waitForFunction(() => document.documentElement.dataset.appearance === "mounted", null, { timeout: 20000 });
    const mounted = await read(page);
    assert.equal(mounted.palette, "grove", `${name}: the provider disagreed with the frame the bootstrap painted`);
    assert.equal(mounted.contrast, "5", `${name}: the provider disagreed with the pre-paint contrast`);
    results.push({ name, preMount, mounted });
    await context.close();
  }

  console.log(`PASS appearance cross-tab ownership: ${results.length} cases — pre-mount sync kept, post-mount writer relinquished`);
  for (const entry of results) console.log(`  - ${entry.name}`);
} finally {
  await browser.close();
}
