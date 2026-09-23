import assert from "node:assert/strict";
import test from "node:test";
import { appearanceTokens, defaultAppearance, normalizeAppearance, palettes } from "../registry/cojeev/lib/appearance-tokens";
import { appearanceBootstrapScript, prepaintCssRules } from "../app/prepaint/appearance";

/* `AppearanceProvider` applies palette and contrast tokens from JavaScript, which
 * cannot run before first paint. Two layers cover it, and these assertions keep both
 * honest:
 *
 *  - `appearanceBootstrapScript`, the inline script the layout runs before any bundle,
 *    embeds the runtime module itself and calls its `normalizeAppearance()` and
 *    `appearanceTokens()`. It is therefore exact for every value the runtime accepts,
 *    including a stored contrast between the slider's stops.
 *  - `prepaintCssRules`, inlined as a <style> block, is the no-JavaScript fallback:
 *    every palette/mode at the default contrast, plus one rule per slider stop.
 *
 * They compare against `appearanceTokens()` itself rather than a second copy of the
 * values, so an edit that is not regenerated fails here instead of shipping a wrong
 * first frame.
 */

type TokenMap = Record<string, string>;

/** The contrast slider's own stops: min 0, max 100, step 5 in
 * `AppearanceControls`. A stored value the slider cannot produce is applied by the
 * mounted provider, not pre-painted. */
const CONTRAST_STOPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 65, 70, 75, 80, 85, 90, 95, 100];

/** Declarations whose value is resolved by the browser (`var()`, `color-mix()`).
 * These are compared as written, exactly like hex values: the stylesheet, the
 * bootstrap and the runtime all emit the same string, so the browser resolves them to
 * the same colour. They were previously filtered *out* of the comparison, which meant
 * the four aliases below (`--card`, `--popover`, `--accent-foreground`,
 * `--destructive`) and every `color-mix()` tone were never checked at all. */
const EXPRESSION_VALUE = /var\(|color-mix\(/;
const expressionValues = (tokens: TokenMap) => Object.entries(tokens).filter(([, value]) => EXPRESSION_VALUE.test(value));

/** Number of expression-valued declarations in the runtime's own output at the
 * default contrast. The comparison below must include them; if a future edit turns the
 * aliases above into literals this floor fails loudly rather than silently narrowing
 * the assertion back to the hex-only subset. */
const EXPECTED_EXPRESSION_TOKENS = expressionValues(runtimeDefaults()).length;

function runtimeDefaults(): TokenMap {
  return appearanceTokens({ palette: "tide", contrast: defaultAppearance.contrast }, "light") as TokenMap;
}

const RULE = /^:root\[data-palette="([^"]+)"\]\[data-mode="([^"]+)"\](?:\[data-contrast="(\d+)"\])?\{(.*)\}$/;

type Rule = { palette: string; mode: string; contrast: number | null; tokens: TokenMap };

function parseRule(line: string): Rule {
  const match = RULE.exec(line);
  assert.ok(match, `unrecognised pre-paint rule: ${line.slice(0, 80)}`);
  const [, palette, mode, contrast, body] = match;
  return {
    palette, mode, contrast: contrast === undefined ? null : Number(contrast),
    tokens: Object.fromEntries(body.split(";").filter(Boolean).map(declaration => {
      const at = declaration.indexOf(":");
      return [declaration.slice(0, at), declaration.slice(at + 1)];
    })),
  };
}

const rules = prepaintCssRules.split("\n").map(parseRule);
const baseRules = rules.filter(rule => rule.contrast === null);
const stopRules = rules.filter(rule => rule.contrast !== null);
const baseFor = (palette: string, mode: string) => baseRules.find(rule => rule.palette === palette && rule.mode === mode);
const stopFor = (palette: string, mode: string, contrast: number) => stopRules.find(rule => rule.palette === palette && rule.mode === mode && rule.contrast === contrast);

/** `appearanceTokens()` runs an 18-step bisection per ink token, so it is memoised
 * for the ~18k lookups these assertions make; the cache is a test-speed device only
 * and every value still comes from the runtime generator. */
const runtimeCache = new Map<string, TokenMap>();
function runtimeTokens(palette: string, mode: "light" | "dark", contrast: number): TokenMap {
  const key = `${palette}/${mode}/${contrast}`;
  let tokens = runtimeCache.get(key);
  if (!tokens) { tokens = appearanceTokens({ palette, contrast } as Parameters<typeof appearanceTokens>[0], mode) as TokenMap; runtimeCache.set(key, tokens); }
  return tokens;
}

test("pre-paint CSS declares every palette and mode at the default contrast", () => {
  for (const { id } of palettes) for (const mode of ["light", "dark"] as const) {
    const rule = baseFor(id, mode);
    assert.ok(rule, `${id}/${mode} base rule missing`);
    assert.deepEqual(Object.keys(rule.tokens).sort(), Object.keys(runtimeTokens(id, mode, defaultAppearance.contrast)).sort(), `${id}/${mode} base token set differs`);
  }
  assert.equal(baseRules.length, palettes.length * 2, "exactly one base rule per palette and mode");
});

test("pre-paint base values match the runtime token generator", () => {
  /* Every token, including the `var()`/`color-mix()` ones. Both sides are the same
   * source of truth, so a strict comparison is honest — and it is the only place the
   * expression-valued declarations are checked at all. */
  let checkedExpressions = 0;
  for (const { id } of palettes) for (const mode of ["light", "dark"] as const) {
    const fromCss = baseFor(id, mode)!.tokens;
    const fromRuntime = runtimeTokens(id, mode, defaultAppearance.contrast);
    const mismatched = Object.entries(fromRuntime)
      .filter(([name, value]) => fromCss[name] !== value)
      .map(([name, value]) => `${name}: css=${fromCss[name]} runtime=${value}`);
    assert.deepEqual(mismatched, [], `${id}/${mode} pre-paint values drifted from appearanceTokens()`);
    checkedExpressions += expressionValues(fromRuntime).length;
  }
  assert.ok(checkedExpressions >= EXPECTED_EXPRESSION_TOKENS * palettes.length * 2, `the comparison skipped expression-valued declarations (saw ${checkedExpressions})`);
});

test("every slider stop paints exactly what the runtime computes", () => {
  /* The effective value of a token is the base rule unless a stop rule overrides it.
   * Comparing the merged result — for every token, not just the ones that move —
   * asserts both directions: the overrides are right, and a token that changes with
   * contrast is not silently left behind. Expression-valued declarations are compared
   * as written, not filtered. */
  let checkedExpressions = 0;
  for (const { id } of palettes) for (const mode of ["light", "dark"] as const) {
    const base = baseFor(id, mode)!.tokens;
    for (const contrast of CONTRAST_STOPS) {
      const effective = { ...base, ...stopFor(id, mode, contrast)?.tokens };
      const runtime = runtimeTokens(id, mode, contrast);
      const mismatched = Object.entries(runtime)
        .filter(([name, value]) => effective[name] !== value)
        .map(([name, value]) => `${name}: css=${effective[name]} runtime=${value}`);
      assert.deepEqual(mismatched, [], `${id}/${mode}/${contrast} pre-paint values drifted from appearanceTokens()`);
      checkedExpressions += expressionValues(runtime).length;
    }
  }
  assert.ok(checkedExpressions >= EXPECTED_EXPRESSION_TOKENS * palettes.length * 2 * CONTRAST_STOPS.length, `the comparison skipped expression-valued declarations (saw ${checkedExpressions})`);
});

test("a palette whose tokens do not move with contrast gets no stop rules", () => {
  /* Paper is the frozen handoff design system: every stop would be a byte-identical
   * duplicate of the base rule, so none is emitted. */
  const paper = palettes.find(palette => palette.id === "paper")!;
  assert.ok(paper.tokens, "paper must keep literal handoff tokens");
  for (const mode of ["light", "dark"] as const) {
    const atDefault = appearanceTokens({ palette: "paper", contrast: defaultAppearance.contrast }, mode);
    for (const contrast of [0, 25, 50, 75, 100]) {
      assert.deepEqual(appearanceTokens({ palette: "paper", contrast }, mode), atDefault, `paper/${mode} moved at contrast ${contrast}`);
    }
    assert.equal(stopRules.filter(rule => rule.palette === "paper" && rule.mode === mode).length, 0, `paper/${mode} should not project contrast stops`);
  }
});

test("stop rules carry only the names that move at a projected stop", () => {
  /* Scope, stated accurately: this is a **stop-level** assertion. The stylesheet is
   * only required to be exact at the stops it projects (the bootstrap covers every
   * other accepted value), so a value that exists strictly between two stops is not
   * this test's business. The previous comment claimed between-stop coverage that the
   * loop never performed. */
  for (const { id } of palettes) for (const mode of ["light", "dark"] as const) {
    const base = runtimeTokens(id, mode, defaultAppearance.contrast);
    const moved = new Set(Object.keys(base).filter(name => CONTRAST_STOPS.some(contrast => runtimeTokens(id, mode, contrast)[name] !== base[name])));
    for (const contrast of CONTRAST_STOPS) {
      const rule = stopFor(id, mode, contrast);
      if (!moved.size) { assert.equal(rule, undefined, `${id}/${mode}/${contrast} should have no stop rule`); continue; }
      const expectedNames = [...moved].filter(name => runtimeTokens(id, mode, contrast)[name] !== base[name]);
      if (!expectedNames.length) { assert.equal(rule, undefined, `${id}/${mode}/${contrast} equals the base rule`); continue; }
      assert.ok(rule, `${id}/${mode}/${contrast} stop rule missing`);
      assert.deepEqual(Object.keys(rule.tokens).sort(), expectedNames.sort(), `${id}/${mode}/${contrast} stop rule carries the wrong names`);
    }
  }
});

/* The bootstrap half. The served script is the artifact under test — it is executed
 * against a fake DOM and a real storage read, never a re-imported copy of its pieces.
 * It embeds a minified bundle of `registry/cojeev/lib/appearance-tokens.ts` and calls
 * that bundle's `normalizeAppearance()`/`appearanceTokens()`, so the storage contract
 * and the token math have exactly one implementation. These tests assert the outcome
 * (the attributes and inline tokens a page would really get) rather than the shape of
 * the bundle, so minification cannot make them vacuous. */
type BootstrapRun = {
  attributes: Record<string, string>;
  inline: Record<string, string>;
  errors: unknown[];
  /** Fire the `storage` listeners the bootstrap registered, as another tab would.
   * `write` re-reads storage, so the shared `entries` object can be mutated to model
   * what the other tab stored before publishing. */
  publish: (key: string) => void;
  /** The handoff the mounted provider calls; absent only if the bootstrap threw. */
  release: (() => void) | undefined;
  /** The mutable store the bootstrap reads. */
  entries: Record<string, string>;
};

function runBootstrap(options: { stored?: unknown; raw?: string; theme?: string; systemDark?: boolean; blocked?: boolean; hasStore?: boolean } = {}): BootstrapRun {
  const attributes: Record<string, string> = {};
  const inline: Record<string, string> = {};
  const errors: unknown[] = [];
  const listeners = new Map<string, ((event: { key: string | null }) => void)[]>();
  const root = {
    setAttribute: (name: string, value: string) => { attributes[name] = value; },
    style: {
      setProperty: (name: string, value: string) => { inline[name] = value; },
      removeProperty: (name: string) => { delete inline[name]; },
    },
  };
  const entries: Record<string, string> = {};
  if (options.raw !== undefined) entries["cojeev-appearance"] = options.raw;
  else if (options.stored !== undefined && options.stored !== null) entries["cojeev-appearance"] = typeof options.stored === "string" ? options.stored : JSON.stringify(options.stored);
  if (options.theme !== undefined) entries["cojeev-docs-theme"] = options.theme;
  const storage = { getItem: (key: string) => (key in entries ? entries[key] : null) };
  const window: Record<string, unknown> = {
    get localStorage() {
      if (options.blocked) throw new DOMException("Blocked", "SecurityError");
      if (options.hasStore === false) return undefined;
      return storage;
    },
    matchMedia: () => ({ matches: Boolean(options.systemDark) }),
    addEventListener: (type: string, listener: (event: { key: string | null }) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type: string, listener: (event: { key: string | null }) => void) => {
      listeners.set(type, (listeners.get(type) ?? []).filter(entry => entry !== listener));
    },
  };
  const document = { documentElement: root };
  try {
    // The exact string the layout inlines, so a bundle that fails to execute is caught.
    new Function("window", "document", appearanceBootstrapScript)(window, document);
  } catch (error) { errors.push(error); }
  return {
    attributes, inline, errors,
    publish: key => { for (const listener of listeners.get("storage") ?? []) listener({ key }); },
    release: window.__cojeevPrepaintRelease as (() => void) | undefined,
    entries,
  };
}

/* Every input that has ever been stored, plus the malformed shapes the runtime
 * rejects. */
const STORED_APPEARANCE: unknown[] = [
  undefined, null, "", "{}", "{not json", "[]", "42", '"tide"', "true",
  {}, { palette: "tide" }, { contrast: 0 }, { palette: "tide", contrast: 0 },
  { palette: "paper", contrast: 33 }, { palette: "graphite", contrast: 100 },
  { palette: "neon", contrast: 60 }, { palette: 42, contrast: "high" },
  { palette: "tide", contrast: "0" }, { palette: "tide", contrast: "100" },
  { palette: "tide", contrast: null }, { palette: "tide", contrast: true },
  { palette: "tide", contrast: false }, { palette: "tide", contrast: [] },
  { palette: "tide", contrast: {} }, { palette: "tide", contrast: Number.NaN },
  { palette: "tide", contrast: Number.POSITIVE_INFINITY }, { palette: "grove", contrast: -10 },
  { palette: "grove", contrast: 140 }, { palette: "orchid", contrast: 60.5 },
  { palette: null, contrast: 0 }, { palette: "clay", contrast: 0, extra: true },
];

test("the bootstrap writes the same attributes as the runtime normalizes", () => {
  for (const stored of STORED_APPEARANCE) {
    for (const systemDark of [false, true]) {
      const run = runBootstrap({ stored, systemDark });
      assert.deepEqual(run.errors, [], `the bootstrap threw for ${JSON.stringify(stored)}`);
      const runtime = normalizeAppearance(stored === undefined ? null : stored);
      assert.deepEqual(
        { palette: run.attributes["data-palette"], contrast: run.attributes["data-contrast"] },
        { palette: runtime.palette, contrast: String(runtime.contrast) },
        `bootstrap disagreed with normalizeAppearance for ${JSON.stringify(stored)}`,
      );
      assert.equal(run.attributes["data-mode"], systemDark ? "dark" : "light", `mode for ${JSON.stringify(stored)}`);
    }
  }
});

test("the bootstrap hands cross-tab writes to the mounted provider and then stops", () => {
  /* The regression this guards is not a wrong colour but a wrong owner: the prepaint
   * listener could only re-read storage, so after the mounted control selected a theme
   * whose `setItem` failed, a cross-tab palette change made the bootstrap repaint
   * `data-mode` from the stale stored theme while the switch still showed the chosen
   * one. It must therefore still serve cross-tab changes *before* React mounts, and
   * stop writing entirely once it has handed over. */
  const run = runBootstrap({ stored: { palette: "tide", contrast: 33 }, theme: "light" });
  assert.deepEqual(run.errors, [], "the bootstrap threw while setting up");
  assert.deepEqual(run.attributes, { "data-mode": "light", "data-palette": "tide", "data-contrast": "33" }, "the pre-mount frame is the stored appearance");

  // Another tab changes the palette while React is still not mounted: the bootstrap
  // is the only writer, so it must follow.
  run.entries["cojeev-appearance"] = JSON.stringify({ palette: "grove", contrast: 33 });
  run.publish("cojeev-appearance");
  assert.equal(run.attributes["data-palette"], "grove", "before the handoff the bootstrap follows another tab");
  assert.equal(typeof run.release, "function", "the bootstrap must expose the handoff the provider calls");
  run.release!();
  const handedOver = JSON.parse(JSON.stringify(run.attributes)) as Record<string, string>;
  const handedOverTokens = JSON.parse(JSON.stringify(run.inline)) as Record<string, string>;

  // The same event after the handoff: the mounted runtime's own subscriptions own it.
  run.publish("cojeev-appearance");
  assert.deepEqual(run.attributes, handedOver, "after the handoff the bootstrap must not rewrite the root attributes");
  assert.deepEqual(run.inline, handedOverTokens, "after the handoff the bootstrap must not rewrite the inline tokens");
});

test("the bootstrap resolves the mode exactly like the runtime's storage rule", () => {
  const themes: { stored?: string; systemDark: boolean; expected: "light" | "dark" }[] = [
    { systemDark: false, expected: "light" }, { systemDark: true, expected: "dark" },
    { stored: "light", systemDark: true, expected: "light" }, { stored: "dark", systemDark: false, expected: "dark" },
    { stored: "solarized", systemDark: false, expected: "light" }, { stored: "solarized", systemDark: true, expected: "dark" },
    { stored: "", systemDark: true, expected: "dark" },
  ];
  for (const { stored, systemDark, expected } of themes) {
    assert.equal(runBootstrap({ theme: stored, systemDark }).attributes["data-mode"], expected, `mode for ${JSON.stringify(stored)} / system ${systemDark}`);
  }
});

test("the bootstrap pre-paints the runtime's exact tokens for every valid stored contrast", () => {
  /* The finding this test exists for: the projection carries a rule per slider stop,
   * and a stored contrast between stops is still accepted by `normalizeAppearance`.
   * The bootstrap is what covers it, synchronously, from the runtime's own function —
   * so this compares against `appearanceTokens()` directly for every stored value the
   * runtime accepts, not only at the stops the stylesheet projects. */
  const betweenStops = [1, 2, 7, 13, 33, 49, 67, 97, 99];
  const contrasts = [...CONTRAST_STOPS, ...betweenStops];
  for (const { id } of palettes) for (const mode of ["light", "dark"] as const) for (const contrast of contrasts) {
    const run = runBootstrap({ stored: { palette: id, contrast }, theme: mode });
    assert.deepEqual(run.errors, [], `${id}/${mode}/${contrast}: the bootstrap threw`);
    assert.equal(run.attributes["data-contrast"], String(contrast), `${id}/${mode} did not keep the stored contrast`);
    const runtime = runtimeTokens(id, mode, contrast);
    const mismatched = Object.entries(runtime).filter(([name, value]) => run.inline[name] !== value).map(([name, value]) => `${name}: bootstrap=${run.inline[name]} runtime=${value}`);
    assert.deepEqual(mismatched, [], `${id}/${mode}/${contrast}: the pre-paint tokens the bootstrap writes are not the runtime's`);
  }
});

test("an unreadable, absent or blocked store falls back to the system preference and the defaults", () => {
  for (const systemDark of [false, true]) {
    for (const options of [{ blocked: true }, { hasStore: false }, {}]) {
      const run = runBootstrap({ ...options, systemDark });
      assert.deepEqual(run.errors, [], `the bootstrap threw with ${JSON.stringify(options)}`);
      assert.deepEqual(
        { mode: run.attributes["data-mode"], palette: run.attributes["data-palette"], contrast: run.attributes["data-contrast"] },
        { mode: systemDark ? "dark" : "light", palette: "paper", contrast: "60" },
      );
    }
  }
});

test("running the whole bootstrap script writes the attributes and the runtime's tokens", () => {
  /* The bug this guards actually shipped once: the stringified state function
   * referenced a module constant that does not exist in the page, the `ReferenceError`
   * was swallowed by its own `catch`, and the palette silently never resolved.
   * Executing the served script against a fake DOM catches that; nothing else did. */
  for (const [stored, systemDark, expected] of [
    [{ palette: "tide", contrast: 0 }, false, { "data-mode": "light", "data-palette": "tide", "data-contrast": "0" }],
    [{ palette: "tide", contrast: 100 }, true, { "data-mode": "dark", "data-palette": "tide", "data-contrast": "100" }],
    [{ palette: "tide", contrast: "0" }, false, { "data-mode": "light", "data-palette": "tide", "data-contrast": "60" }],
    [null, true, { "data-mode": "dark", "data-palette": "paper", "data-contrast": "60" }],
  ] as const) {
    const run = runBootstrap({ stored, systemDark });
    assert.deepEqual(run.errors, [], `the bootstrap threw for ${JSON.stringify(stored)}`);
    assert.deepEqual(run.attributes, expected, `bootstrap attributes for ${JSON.stringify(stored)} / system ${systemDark}`);
    assert.ok(Object.keys(run.inline).length > 0, "the bootstrap wrote no inline tokens");
  }
});

test("the accessible dark muted ink stays in the source and in the pre-paint frame", () => {
  const paper = palettes.find(palette => palette.id === "paper")!;
  assert.equal(paper.tokens!.dark["--v-text-3"], "#90897F");
  assert.equal(baseFor("paper", "dark")!.tokens["--v-text-3"], "#90897F");
  assert.equal(appearanceTokens({ palette: "paper", contrast: 60 }, "dark")["--v-text-3"], "#90897F");
});
