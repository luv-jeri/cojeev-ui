import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

/* Appearance preferences must be *painted*, not applied after the fact — both the
 * palette and the contrast. The failure this guards is invisible to a settled
 * screenshot: the page ends up the right colours either way. So every case holds
 * the client bundles at the network, asserts the pre-paint values, then samples
 * `--v-text`, `--v-text-3`, `--v-border` and `data-contrast` on every animation
 * frame through hydration and asserts the observed *set* is exactly one value each.
 *
 * Three guards exist because an earlier version of this file passed without
 * proving anything:
 *   1. the provider must be mounted (`data-appearance="mounted"` is written only by
 *      the provider, never by the layout bootstrap) before any post-hydration value
 *      is read — replacing the client bundles with empty JavaScript must fail;
 *   2. storage is seeded **once**, before the first navigation, so a reload proves
 *      the application persisted its own preference instead of replaying the fixture;
 *   3. one case changes the contrast through the real control, asserts what was
 *      written to storage, then reloads unseeded.
 *
 * The expected values are written out literally on purpose. Reading them from
 * `appearanceTokens()` would make the test agree with a palette or contrast
 * regression.
 */
const base = (process.env.POLISH_URL ?? process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4320/cojeev-ui").replace(/\/$/, "");
const output = process.env.APPEARANCE_OUTPUT ?? "output/playwright/appearance-first-paint";
await mkdir(output, { recursive: true });

const CANVAS = {
  paper: { light: "#FBF4E6", dark: "#171512" },
  tide: { light: "#F1F6F9", dark: "#101B24" },
  grove: { light: "#F4F6ED", dark: "#141C15" },
  clay: { light: "#FBF3EB", dark: "#211814" },
  orchid: { light: "#F7F3FA", dark: "#1B1521" },
  graphite: { light: "#F4F5F6", dark: "#111418" },
};
/* The contrast-varying tokens, at the stops the slider can produce. 60 is the
 * runtime default and is identical to what the base rule paints. */
const INK = {
  tide: {
    light: {
      0: { text: "#40434A", text3: "#636770", border: "#C6CFD6" },
      /* Between the slider's stops: only the bootstrap can paint this one. */
      33: { text: "#2F3338", text3: "#585C65", border: "#B5BDC4" },
      60: { text: "#24262B", text3: "#51555D", border: "#A9B1B8" },
      100: { text: "#111417", text3: "#484C53", border: "#9BA3A9" },
    },
    dark: {
      60: { text: "#FFFFFF", text3: "#B4B9BE", border: "#465964" },
      100: { text: "#FFFFFF", text3: "#C3C6CA", border: "#51636E" },
    },
  },
  grove: {
    light: { 5: { text: "#3D4147", text3: "#61656E", border: "#C7CCBF" } },
    dark: { 100: { text: "#FFFFFF", text3: "#C7CACE", border: "#5B685D" } },
  },
  orchid: {
    light: { 60: { text: "#212328", text3: "#4F525A", border: "#B3ADBA" } },
  },
  clay: {
    dark: { 60: { text: "#FBFCFC", text3: "#B0B4B9", border: "#5E524B" } },
  },
  graphite: {
    light: { 60: { text: "#24262B", text3: "#51555D", border: "#AEB0B3" } },
  },
  /* Paper carries the handoff's literal tokens, so contrast cannot move it. Any
   * contrast stop must paint exactly these. */
  paper: {
    light: { 60: { text: "#0E0B0B", text3: "#68645E", border: "#D9D2C4" }, 33: { text: "#0E0B0B", text3: "#68645E", border: "#D9D2C4" } },
    dark: { 60: { text: "#F6EFE2", text3: "#90897F", border: "#3A352E" } },
  },
};

/* The contrast thumb, not the slider root: Radix puts `aria-valuenow` on the thumb.
 * It only exists for a derived palette — Paper has no effective contrast control. */
const SLIDER_THUMB = '[data-slot="slider-thumb"]';
/* Marks that the fixture has been written, so the init script seeds one context
 * exactly once and never overwrites what the application later persists. */
const SEED_FLAG = "w01-seed-applied";

/* Each case states what the *normalized* preference is, field by field: a malformed
 * value falls back to the default for its own field only, so a bad contrast still
 * paints the stored palette and vice versa. `contrast` defaults to 60. */
const cases = [
  { name: "fresh-start-light", mode: "light", system: "light" },
  { name: "fresh-start-system-dark", mode: "dark", system: "dark" },
  { name: "saved-tide-light", palette: "tide", contrast: 60, mode: "light", system: "light", persist: true },
  { name: "saved-tide-light-contrast-0", palette: "tide", contrast: 0, mode: "light", system: "dark" },
  /* A derived palette at a contrast the slider **cannot** produce. `normalizeAppearance`
   * keeps `33` — it does not snap it to a stop — so the pre-paint frame must paint the
   * runtime's 33 ink, not the 30/35 ink and not the default. This is the case whose
   * absence let the earlier "fixed" claim stand. */
  { name: "saved-tide-light-contrast-33", palette: "tide", contrast: 33, mode: "light", system: "dark" },
  { name: "saved-tide-dark-contrast-100", palette: "tide", contrast: 100, mode: "dark", system: "light" },
  { name: "saved-grove-light-contrast-5", palette: "grove", contrast: 5, mode: "light", system: "light" },
  { name: "saved-grove-dark-contrast-100", palette: "grove", contrast: 100, mode: "dark", system: "dark" },
  { name: "saved-orchid-light", palette: "orchid", contrast: 60, mode: "light", system: "light" },
  { name: "saved-clay-dark", palette: "clay", contrast: 60, mode: "dark", system: "dark" },
  { name: "saved-graphite-light", palette: "graphite", contrast: 60, mode: "light", system: "light" },
  /* Paper's tokens are literal, so its paint is the same at any contrast — but the
   * reported `data-contrast` is the stored number, because the bootstrap and the
   * runtime both keep a valid value rather than snapping it to the default. */
  { name: "paper-ignores-stored-contrast", palette: "paper", contrast: 33, mode: "light", system: "light" },
  /* Malformed stored values: the bootstrap and the runtime must normalize each field
   * identically, which is what these cases exist to catch. */
  { name: "malformed-json", raw: "{not json", mode: "light", system: "light" },
  { name: "unknown-palette", raw: JSON.stringify({ palette: "neon", contrast: 60 }), mode: "light", system: "light" },
  { name: "malformed-contrast-string", raw: JSON.stringify({ palette: "tide", contrast: "0" }), palette: "tide", mode: "light", system: "light" },
  { name: "malformed-contrast-null", raw: JSON.stringify({ palette: "tide", contrast: null }), palette: "tide", mode: "light", system: "light" },
  { name: "malformed-contrast-boolean", raw: JSON.stringify({ palette: "tide", contrast: true }), palette: "tide", mode: "light", system: "light" },
  { name: "out-of-range-contrast", raw: JSON.stringify({ palette: "tide", contrast: 1000 }), palette: "tide", contrast: 100, mode: "light", system: "light" },
  { name: "wrong-types", raw: JSON.stringify({ palette: 42, contrast: "high" }), mode: "light", system: "light" },
  { name: "empty-object", raw: "{}", mode: "light", system: "light" },
  /* An unusable stored theme must fall through to the system preference, not to light.
   * `mode: null` stores nothing; `storeMode` puts a value the runtime rejects there. */
  { name: "invalid-theme", mode: null, system: "dark", storeMode: "solarized" },
  { name: "blocked-storage", blocked: true, mode: "dark", system: "dark" },
];

/** Turn an `appearanceTokens()` colour into the `rgb(r, g, b)` a computed style
 * reports. Hex only — the theme's ink tokens are all hex, and a `var()`/`color-mix()`
 * value would fail loudly here rather than compare unequal for the wrong reason. */
const toRgb = hex => {
  assert.match(hex, /^#[0-9A-F]{6}$/i, `ink expectation must be a hex colour, saw ${hex}`);
  return `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
};

/** Exact pre-paint values for a stored preference. Every numeric contrast the suite
 * stores is a slider stop, so the projection must be exact for all of them. */
function expected(palette, mode, contrast) {
  const canvas = CANVAS[palette][mode].toUpperCase();
  const ink = INK[palette]?.[mode]?.[contrast];
  assert.ok(ink, `no literal ink fixture for ${palette}/${mode}/${contrast}`);
  return { palette, mode, contrast, canvas, ink, rgb: { text: toRgb(ink.text), text3: toRgb(ink.text3), border: toRgb(ink.border) } };
}

/** Runs in the page: computed ink values, the provider's inline tokens, the root
 * attributes, and the two rendered consumers of those tokens. */
function readAppearance() {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return {
    palette: root.dataset.palette ?? null,
    mode: root.dataset.mode ?? null,
    contrast: root.dataset.contrast ?? null,
    mounted: root.dataset.appearance ?? null,
    canvas: style.getPropertyValue("--v-canvas").trim().toUpperCase(),
    tokens: {
      text: style.getPropertyValue("--v-text").trim().toUpperCase(),
      text3: style.getPropertyValue("--v-text-3").trim().toUpperCase(),
      border: style.getPropertyValue("--v-border").trim().toUpperCase(),
    },
    inline: {
      text: root.style.getPropertyValue("--v-text").trim().toUpperCase(),
      text3: root.style.getPropertyValue("--v-text-3").trim().toUpperCase(),
      border: root.style.getPropertyValue("--v-border").trim().toUpperCase(),
    },
    rendered: {
      heading: getComputedStyle(document.querySelector(".docs-title-row h1")).color,
      panelBorder: getComputedStyle(document.querySelector(".v-appearance__sample")).borderTopColor,
    },
  };
}

/** Page-side, called with `page.evaluate`. Installs the frame sampler and (when it
 * is given a seed) writes storage exactly **once per context** — the guard flag makes
 * the init script a no-op on every later navigation, so a reload observes what the
 * application persisted instead of replaying the fixture. */
function installSampler(seed) {
  if (seed) {
    if (seed.blocked) Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("Blocked", "SecurityError"); } });
    else {
      try {
        if (!localStorage.getItem(seed.flag)) {
          if (seed.raw !== undefined) localStorage.setItem("cojeev-appearance", seed.raw);
          else if (seed.palette) localStorage.setItem("cojeev-appearance", JSON.stringify({ palette: seed.palette, contrast: seed.contrast }));
          else localStorage.removeItem("cojeev-appearance");
          if (seed.storeMode !== undefined) localStorage.setItem("cojeev-docs-theme", seed.storeMode);
          else if (seed.mode === null || seed.mode === undefined) localStorage.removeItem("cojeev-docs-theme");
          else localStorage.setItem("cojeev-docs-theme", seed.mode);
          localStorage.setItem(seed.flag, "1");
        }
      } catch { /* blocked storage is one of the cases under test */ }
    }
  }
  window.appearanceFrames = [];
  window.appearanceHydration = { unmounted: 0, mounted: 0 };
  function sample() {
    if (document.body && document.querySelector(".docs-title-row h1")) {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      window.appearanceFrames.push([
        root.dataset.palette ?? null,
        root.dataset.contrast ?? null,
        style.getPropertyValue("--v-text").trim().toUpperCase(),
        style.getPropertyValue("--v-text-3").trim().toUpperCase(),
        style.getPropertyValue("--v-border").trim().toUpperCase(),
      ]);
      /* The provider's own marker. Frames before it are the pre-paint paint; frames
       * after it are the mounted provider. Both must exist, which is what makes the
       * "test passed without React mounting" failure impossible. */
      if (root.dataset.appearance === "mounted") window.appearanceHydration.mounted += 1;
      else window.appearanceHydration.unmounted += 1;
    }
    window.appearanceFrame = requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
}

const unique = (frames, index) => [...new Set(frames.map(frame => frame[index]))];

/** Every frame must show exactly the stored appearance — palette, contrast and the
 * three ink tokens. A single wrong frame is the defect this suite exists for. */
function assertStableFrames(name, frames, want, label) {
  assert.ok(frames.length >= 2, `${name}: ${label} sampled ${frames.length} frames — the page never painted`);
  assert.deepEqual(unique(frames, 0), [want.palette], `${name}: ${label} declared another palette (saw ${JSON.stringify(unique(frames, 0))})`);
  assert.deepEqual(unique(frames, 1), [String(want.contrast)], `${name}: ${label} painted another contrast (saw ${JSON.stringify(unique(frames, 1))})`);
  for (const [index, key] of [[2, "text"], [3, "text3"], [4, "border"]]) {
    assert.deepEqual(unique(frames, index), [want.ink[key].toUpperCase()], `${name}: ${label} painted another --v-${key === "text" ? "text" : key === "text3" ? "text-3" : "border"} (saw ${JSON.stringify(unique(frames, index))})`);
  }
}

const browser = await chromium.launch();
const ran = [];
try {
  /* `APPEARANCE_ONLY` narrows the run while iterating; the default set is what the
   * final `assert.deepEqual(ran, ...)` below proves executed. */
  const only = process.env.APPEARANCE_ONLY ?? "";
  for (const item of cases.filter(item => item.name.includes(only))) {
    const { name, system } = item;
    ran.push(name);
    const want = expected(item.palette ?? "paper", item.mode ?? (system === "dark" ? "dark" : "light"), item.contrast ?? 60);
    const context = await browser.newContext({ colorScheme: system, viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installSampler, { flag: SEED_FLAG, raw: item.raw, palette: item.palette, contrast: item.contrast, mode: item.mode, storeMode: item.storeMode, blocked: item.blocked });

    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text()); });

    /* One gate per navigation, held in a single mutable slot. Releasing settles the
     * gate and leaves the slot open (an already-resolved promise) rather than making the
     * holder wait for a gate that will never be armed again — that would hang `load`.
     * The next navigation arms a new gate, and *that* is what puts the persistence
     * reload back behind the barrier instead of leaking through the first release. */
    let gateSlot = Promise.resolve();
    const armBundles = () => {
      let release, settled = false;
      gateSlot = new Promise(resolve => { release = () => { if (!settled) { settled = true; resolve(); } }; });
      return () => { release(); gateSlot = Promise.resolve(); };
    };
    /* Requests the browser made for a client bundle. Gating them at the network is what
     * keeps the pre-paint sample pre-hydration. */
    const bundlesArrived = new Set();
    const gate = async route => {
      bundlesArrived.add(route.request().url());
      await gateSlot;
      await route.continue();
    };
    await page.route("**/_next/**/*.js*", gate);

    /* Page-side proof that React has not executed. The request count cannot show this —
     * the browser still *requests* the gated bundles while they wait — so the client
     * runtime is spied directly: `react-dom` installs its devtools hook on `window`, and
     * nothing else in these pages sets that property. With the barrier armed the spy
     * stays at zero until the bundles are released; if hydration ever wins the race, the
     * pre-paint read is rejected instead of being reported as one. */
    await page.addInitScript(() => {
      const spy = window.__reactSpy = { installs: 0, hydrations: 0 };
      let hook;
      Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
        configurable: true,
        get() { return hook; },
        set(value) { spy.installs += 1; hook = value; },
      });
      if (hook && typeof hook.on === "function") { try { hook.on("commit", () => { spy.hydrations += 1; }); } catch { /* a foreign hook is not our concern */ } }
    });

    /** Snapshot the client-execution spy. The init script re-creates it on every
     * navigation, so this always starts at zero for the navigation being inspected. */
    const readSpy = () => page.evaluate(() => ({ mounted: document.documentElement.dataset.appearance ?? null, installs: window.__reactSpy.installs }));

    /** Reject a "pre-paint" sample that is really a post-hydration one. Two reads
     * bracket the sample: none before it, and none appearing while it was taken. */
    const assertNotHydrated = async (label, beforeSpy) => {
      const after = await readSpy();
      assert.equal(beforeSpy.mounted, null, `${name}: ${label} — the provider was already mounted before the frame was read`);
      assert.equal(beforeSpy.installs, 0, `${name}: ${label} — React had already executed before the frame was read`);
      assert.equal(after.mounted, null, `${name}: ${label} — the provider mounted while the frame was being read`);
      assert.equal(after.installs, 0, `${name}: ${label} — React executed while the frame was being read`);
    };

    let before;
    const release = armBundles();
    try {
      const response = await page.goto(`${base}/docs/appearance/`, { waitUntil: "commit" });
      assert.equal(response.status(), 200, `${name}: route responds`);
      await page.locator(".docs-title-row h1").waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const spyBefore = await readSpy();
      before = await page.evaluate(readAppearance);
      await assertNotHydrated("the pre-paint frame was read after hydration", spyBefore);
      assert.equal(before.palette, want.palette, `${name}: palette before React downloads`);
      assert.equal(before.mode, want.mode, `${name}: mode before React downloads`);
      /* Every case resolves to a contrast the runtime accepts. The stylesheet only
       * projects the slider's stops, so for a between-stop value this is the
       * bootstrap's work — exactly the case that used to flash. */
      assert.equal(before.contrast, String(want.contrast), `${name}: contrast before React downloads`);
      assert.equal(before.canvas, want.canvas, `${name}: canvas before React downloads`);
      assert.deepEqual(before.tokens, want.ink, `${name}: pre-paint ink before React downloads`);
      assert.equal(before.rendered.heading, want.rgb.text, `${name}: the rendered heading is painted at the stored contrast`);
      assert.equal(before.rendered.panelBorder, want.rgb.border, `${name}: the rendered panel edge is painted at the stored contrast`);
      await page.screenshot({ path: `${output}/${name}-pre-hydration.png` });
    } finally { release(); }

    /* Prove the provider mounted rather than trusting a timeout: the marker and the
     * inline tokens are written only by its layout effect. With the client bundles
     * replaced by empty JavaScript this never appears and the case fails here. */
    await page.waitForFunction(() => document.documentElement.dataset.appearance === "mounted", null, { timeout: 20000 })
      .catch(() => assert.fail(`${name}: the appearance provider never mounted`));
    await page.waitForLoadState("load");
    await page.waitForTimeout(1700); // Covers the ~1.2–1.4s hydration reveal the earlier defect showed at.
    const after = await page.evaluate(readAppearance);
    assert.deepEqual(after.inline, want.ink, `${name}: the mounted provider wrote the same ink as the pre-paint frame`);
    assert.equal(after.rendered.heading, want.rgb.text, `${name}: heading still painted at the stored contrast after hydration`);
    assert.equal(after.rendered.panelBorder, want.rgb.border, `${name}: panel edge still painted at the stored contrast after hydration`);

    /* Snapshot every frame seen so far — pre-paint, hydration and settled — before
     * the reload resets the log. */
    let frames = await page.evaluate(() => { cancelAnimationFrame(window.appearanceFrame); return window.appearanceFrames; });
    const hydration = await page.evaluate(() => window.appearanceHydration);
    assert.ok(hydration.unmounted > 0, `${name}: the page painted before the provider mounted (saw ${hydration.unmounted} pre-mount frames)`);
    assert.ok(hydration.mounted > 0, `${name}: the provider mounted and kept painting (saw ${hydration.mounted} post-mount frames)`);
    assertStableFrames(name, frames, { ...want, contrast: want.contrast }, "through hydration");
    assert.deepEqual([...new Set(frames.map(frame => frame[0]))], [want.palette], `${name}: palette never changed after the first frame`);
    await page.screenshot({ path: `${output}/${name}-settled.png` });

    if (item.persist) {
      /* A real control change, then a reload with no init script writing storage:
       * the reload can only be right if the application persisted it. */
      const controls = page.locator('[data-example="appearance"] [data-slot="appearance-controls"]').first();
      await controls.waitFor();
      const slider = controls.locator(SLIDER_THUMB).first();
      await slider.waitFor();
      assert.equal(await slider.getAttribute("aria-valuenow"), String(want.contrast), `${name}: the slider starts at the stored contrast`);
      await slider.focus();
      await slider.press("Home");
      await page.waitForFunction(() => document.documentElement.dataset.contrast === "0");
      const stored = await page.evaluate(() => localStorage.getItem("cojeev-appearance"));
      assert.deepEqual(JSON.parse(stored), { palette: want.palette, contrast: 0 }, `${name}: the control wrote its value to storage`);
      const changed = expected(want.palette, want.mode, 0);
      const painted = await page.evaluate(readAppearance);
      assert.deepEqual(painted.tokens, changed.ink, `${name}: the control repaints the ink tokens`);
      assert.equal(painted.rendered.heading, changed.rgb.text, `${name}: the control repaints the rendered heading`);
      assert.equal(painted.rendered.panelBorder, changed.rgb.border, `${name}: the control repaints the rendered panel edge`);
      await page.screenshot({ path: `${output}/${name}-control-change.png` });

      /* Re-arm the barrier before the reload. Without this the reload's bundles were
       * still gated only by the first navigation's already-resolved promise, so
       * `reloadBefore` could be read after hydration — a correct implementation could
       * fail, and a wrong one could pass while inspecting the mounted state. */
      const reloadRelease = armBundles();
      try {
        await page.reload({ waitUntil: "commit" });
        await page.locator(".docs-title-row h1").waitFor();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const reloadSpyBefore = await readSpy();
        const reloadBefore = await page.evaluate(readAppearance);
        await assertNotHydrated("the reloaded pre-paint frame was read after hydration", reloadSpyBefore);
        assert.equal(reloadBefore.contrast, "0", `${name}: the reloaded pre-paint frame is the contrast the control chose, not the fixture`);
        assert.deepEqual(reloadBefore.tokens, changed.ink, `${name}: the reloaded pre-paint frame is the ink the control chose, not the fixture`);
      } finally { reloadRelease(); }
      await page.waitForFunction(() => document.documentElement.dataset.appearance === "mounted", null, { timeout: 20000 })
        .catch(() => assert.fail(`${name}: the appearance provider never mounted after reload`));
      await page.waitForLoadState("load");
      await page.waitForTimeout(1700);
      frames = await page.evaluate(() => { cancelAnimationFrame(window.appearanceFrame); return window.appearanceFrames; });
      const reloadHydration = await page.evaluate(() => window.appearanceHydration);
      assert.ok(reloadHydration.unmounted > 0, `${name}: the reload painted before the provider mounted (saw ${reloadHydration.unmounted} pre-mount frames)`);
      assert.ok(reloadHydration.mounted > 0, `${name}: the provider mounted after the reload (saw ${reloadHydration.mounted} post-mount frames)`);
      assertStableFrames(name, frames, { ...changed, contrast: 0 }, "across the unseeded reload");
    }

    assert.deepEqual(errors, [], `${name}: no client or hydration errors`);
    await context.close();
    console.log(`PASS ${name}: pre-paint, hydration${item.persist ? ", control change and unseeded reload" : ""} all ${want.palette}/${want.mode}/${want.contrast}`);
  }
  assert.deepEqual(ran, cases.filter(item => item.name.includes(only)).map(item => item.name), "every declared case ran, in order");
  console.log(`PASS appearance first paint: ${ran.length} startup cases, palette and contrast stable from the first frame`);
} finally {
  await browser.close();
}
