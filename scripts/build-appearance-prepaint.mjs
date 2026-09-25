/**
 * Generate the pre-paint palette stylesheet and the storage bootstrap.
 *
 * `AppearanceProvider` computes palette tokens in JavaScript, so before this
 * existed the browser painted the handoff (Paper) canvas from `tokens.css` and
 * only swapped to a saved non-Paper palette or a saved contrast after hydration —
 * a measured ~800 ms of the wrong colour on every reload.
 *
 * Two layers cover the first paint, and both come from `appearanceTokens()`:
 *
 *  1. **The inlined bootstrap** (always runs, before any bundle) normalizes the
 *     stored appearance with the runtime's own `normalizeAppearance()` and writes
 *     the provider's exact token set as inline custom properties. It is exact for
 *     *every* value the runtime accepts — including a stored contrast between the
 *     slider's stops, which is a legitimate stored value (`normalizeAppearance`
 *     keeps it; it does not quantise). This is the layer that makes first paint
 *     match the mount commit for all valid inputs.
 *  2. **The generated stylesheet** is the no-JavaScript fallback: every palette and
 *     mode at the default contrast, plus one rule per slider stop. Contrast is a
 *     continuous input, and its values are far too granular to project as CSS for
 *     nothing — a rule per integer contrast is ~558 KB raw / ~62 KB gzip against
 *     ~16 KB raw / ~5 KB gzip for the bootstrap that makes them unnecessary. The
 *     stops are still projected because they are what a JS-disabled browser can
 *     produce from the UI's own control, and because they keep the default
 *     (first-visit) frame right without running anything.
 *
 * Both layers read the palette definitions, which stay the only source of truth:
 * the stylesheet is a projection of `appearanceTokens()`, and the bootstrap *is*
 * that function, bundled from the same module.
 *
 * Run: node --import tsx scripts/build-appearance-prepaint.mjs
 * Check for drift: node scripts/build-appearance-prepaint.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { appearanceTokens, defaultAppearance, palettes } from "../registry/cojeev/lib/appearance-tokens.ts";

/* Deliberately NOT under `registry/`: scripts/build-registry.mjs ships every
 * `registry/cojeev/lib/*.ts` file to consumers, and this projection only exists so
 * the docs layout can paint before hydration. Keeping it in the docs tree leaves
 * the published install payload unchanged. */
const output = "app/prepaint/appearance.ts";
const tokensModule = "registry/cojeev/lib/appearance-tokens.ts";
const MODES = ["light", "dark"];
/** The contrast stops the stylesheet projects. Must stay equal to the contrast
 * slider's `step` (see `AppearanceControls` in `registry/cojeev/ui/appearance.tsx`:
 * min 0, max 100, step 5). This is a *fallback* resolution only — the bootstrap
 * covers every other valid value exactly — but the browser suite asserts values at
 * a multiple of this step, so a mismatch fails there too. */
const CONTRAST_STEP = 5;
/** Every value the slider can produce: 0, 5, … 100. `60` is the runtime default,
 * so a first visit with no stored appearance paints exactly like the mounted
 * provider without depending on a stored value at all. */
const CONTRAST_STOPS = Array.from({ length: 100 / CONTRAST_STEP + 1 }, (_, index) => index * CONTRAST_STEP);
const KNOWN_PALETTES = palettes.map(({ id }) => id);
/** The hook the mounted `AppearanceProvider` calls to take ownership of the root
 * attributes and inline tokens. The provider names it in a comment; keep the two in
 * step, and see `assertBootstrapIsUsable()`. */
const PREPAINT_RELEASE_HOOK = "__cojeevPrepaintRelease";

/** The tokens the runtime actually writes, taken from the token generator itself.
 * `tokens.css` also declares a few extras that `appearanceTokens()` never emits
 * (`--v-pink-deep` and friends); projecting only the runtime's own key set keeps
 * the inlined CSS byte-for-byte comparable with the mounted state. */
const TOKEN_NAMES = Object.keys(appearanceTokens({ palette: palettes[0].id, contrast: defaultAppearance.contrast }, "light"));

function tokenValues(paletteId, mode, contrast) {
  const tokens = appearanceTokens({ palette: paletteId, contrast }, mode);
  return Object.fromEntries(TOKEN_NAMES.map(name => [name, tokens[name]]));
}

/** Base rules: every runtime token at the default contrast, one per palette/mode.
 * These are what a page with no stored appearance (or no JavaScript at all) paints. */
export function prepaintBaseRules() {
  return palettes.flatMap(({ id }) => MODES.map(mode =>
    `:root[data-palette="${id}"][data-mode="${mode}"]{${Object.entries(tokenValues(id, mode, defaultAppearance.contrast)).map(([name, value]) => `${name}:${value}`).join(";")}}`));
}

/** Per-stop overrides for the names contrast actually moves. A palette with literal
 * tokens (`paper`) moves nothing at any contrast, so it gets no stop rules at all;
 * a stop whose values equal the base rule is skipped for the same reason. */
export function prepaintContrastRules() {
  const lines = [];
  for (const { id } of palettes) for (const mode of MODES) {
    const base = tokenValues(id, mode, defaultAppearance.contrast);
    for (const contrast of CONTRAST_STOPS) {
      if (contrast === defaultAppearance.contrast) continue;
      const changed = Object.entries(tokenValues(id, mode, contrast)).filter(([name, value]) => base[name] !== value);
      if (!changed.length) continue;
      lines.push(`:root[data-palette="${id}"][data-mode="${mode}"][data-contrast="${contrast}"]{${changed.map(([name, value]) => `${name}:${value}`).join(";")}}`);
    }
  }
  return lines;
}

/** Base first, stops after it: an element can match both, and the stop rule wins on
 * specificity (0,4,0) versus (0,3,0) — not on source order. `tokens.css`'s dark
 * block is (0,2,0), so both outrank it without `!important`. */
export function prepaintCss() {
  return [...prepaintBaseRules(), ...prepaintContrastRules()].join("\n");
}

const RULE = /^:root\[data-palette="([^"]+)"\]\[data-mode="([^"]+)"\](?:\[data-contrast="([^"]+)"\])?\{(.*)\}$/;

/** Parse the stylesheet the layout will actually inline. The guard below must judge
 * the emitted text, not the functions that produced it — a guard that re-derives the
 * expected values by calling the same generator it is checking cannot fail, which is
 * exactly what the first version of this file did. */
function parseRules(css) {
  return css.split("\n").map(line => {
    const match = RULE.exec(line);
    if (!match) throw new Error(`unrecognised pre-paint rule: ${line.slice(0, 80)}`);
    const [, palette, mode, contrast, body] = match;
    const tokens = {};
    for (const declaration of body.split(";").filter(Boolean)) {
      const at = declaration.indexOf(":");
      const name = declaration.slice(0, at), value = declaration.slice(at + 1);
      if (name in tokens) throw new Error(`${palette}/${mode}/${contrast}: ${name} declared twice in one rule`);
      tokens[name] = value;
    }
    return { palette, mode, contrast: contrast === undefined ? null : contrast, tokens };
  });
}

/** Reconstruct the effective value of every token at one stored contrast from the
 * **emitted CSS alone**: start from the base rule for that palette/mode and merge the
 * stop rule the cascade would apply. `tokens.css` cannot interfere — both selectors
 * outrank its `:root[data-mode="dark"]` — so this is the value a real browser
 * computes for the tokens the stylesheet supplies. */
function effectiveFromCss(rules, palette, mode, contrast) {
  const base = rules.find(rule => rule.palette === palette && rule.mode === mode && rule.contrast === null);
  if (!base) throw new Error(`${palette}/${mode}: no base rule in the emitted stylesheet`);
  const override = rules.find(rule => rule.palette === palette && rule.mode === mode && rule.contrast === String(contrast));
  return { ...base.tokens, ...(override?.tokens ?? {}) };
}

/** Fails generation rather than shipping a pre-paint frame that is silently wrong.
 *
 * Two separate contracts are checked against the **emitted text**:
 *
 *  - `default-contrast` (fires on `--check` too, because the generated artifact is
 *    inlined in every docs page): every token the CSS supplies must equal the runtime
 *    at that stored value. A wrinkle in the projection, a dropped longhand or a
 *    stale generated file fails here.
 *  - `every-integer-contrast`: for each integer 0…100 the effective CSS value must
 *    equal the runtime **unless** the bootstrap's synchronous computation replaces
 *    it. The bootstrap runs `appearanceTokens()` on the same normalized settings, so
 *    a mismatch is acceptable only when the value is supplied by that layer instead.
 *    The distinction is checked because it is the whole reason the stops are allowed
 *    to be a partial projection: `covered` means the CSS is authoritative, anything
 *    else must be reproducible by the runtime itself.
 *
 * This is the guard the previous version only appeared to be: it compared
 * `appearanceTokens()` at the stops with `tokenValues()` at those same stops, and the
 * latter just calls the former, so it could never fail. It also never looked at the
 * emitted CSS at all, which is what the comments claimed it validated. */
function assertProjectionIsFaithful() {
  const css = prepaintCss();
  const rules = parseRules(css);
  const atDefault = [defaultAppearance.contrast];
  const integers = Array.from({ length: 101 }, (_, index) => index);

  for (const { id } of palettes) for (const mode of MODES) {
    for (const contrast of atDefault) {
      const effective = effectiveFromCss(rules, id, mode, contrast);
      const runtime = tokenValues(id, mode, contrast);
      for (const name of TOKEN_NAMES) {
        if (effective[name] !== runtime[name]) throw new Error(`${id}/${mode}/${contrast} ${name}: emitted CSS has ${effective[name]}, runtime computes ${runtime[name]}`);
      }
    }
  }

  for (const { id } of palettes) for (const mode of MODES) {
    const base = tokenValues(id, mode, defaultAppearance.contrast);
    for (const contrast of integers) {
      const effective = effectiveFromCss(rules, id, mode, contrast);
      const runtime = tokenValues(id, mode, contrast);
      const covered = new Set(TOKEN_NAMES.filter(name => effective[name] !== base[name]));
      for (const name of covered) {
        /* The bootstrap computes `appearanceTokens()` itself for the stored value, so
         * a value the CSS does not carry is supplied exactly. Only a value the CSS
         * *claims* (differs from the base rule) has to be right. */
        if (effective[name] !== runtime[name]) throw new Error(`${id}/${mode}/${contrast} ${name}: emitted CSS has ${effective[name]}, runtime computes ${runtime[name]}`);
      }
    }
  }

  for (const palette of KNOWN_PALETTES) for (const mode of MODES) {
    const stops = rules.filter(rule => rule.palette === palette && rule.mode === mode && rule.contrast !== null).map(rule => Number(rule.contrast));
    const declared = CONTRAST_STOPS.filter(stop => stop !== defaultAppearance.contrast);
    const unexpected = stops.filter(stop => !declared.includes(stop));
    if (unexpected.length) throw new Error(`${palette}/${mode}: emitted stop rules for ${unexpected.join(",")} which is not a declared contrast stop`);
  }
}

/** The pre-paint bootstrap: `AppearanceProvider`'s first paint, moved in front of the
 * bundles.
 *
 * It is *not* a mirror of the runtime. The runtime module is transpiled and inlined
 * whole by `tokensRuntimeSource()`, and this wrapper calls its exported
 * `normalizeAppearance()` and `appearanceTokens()` — so the storage contract, the
 * palette table and the token computation are the runtime's own code rather than a
 * second copy that a unit test has to keep honest. A stored contrast of 33 (a valid
 * value `normalizeAppearance` keeps) therefore pre-paints exactly what the mount
 * commit will write.
 *
 * Inline custom properties are used, exactly as the provider uses them, so the layer
 * that wins does not depend on the stylesheet's specificity: the CSS projection stays
 * the no-JavaScript fallback and the value the provider still writes on mount is the
 * one already on screen.
 *
 * Ownership is handed over on mount. The script exposes `__cojeevPrepaintRelease()`,
 * which `AppearanceProvider`'s layout effect calls; afterwards `write()` is inert and
 * the storage listener is removed, because the mounted runtime already subscribes to
 * both storage keys. A cross-tab change before that point is still synchronized here.
 *
 * No closure: the wrapper is stringified into the page, so everything it needs comes
 * from the bundled module or from `window`/`document`. */
function bootstrapSource() {
  return `(function(){"use strict";` +
    /* `return ${…};` is appended inside the nested function, so its completion value
     * is the module's exports object; a bare `var` would not escape that scope. */
    `var api=(function(){${tokensRuntimeSource()}})()||{};` +
    `var running=false,released=false,release=null;` +
    `function dark(){try{return !!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){return false}}` +
    `function state(){var mode=dark()?"dark":"light",saved=null;try{var store=window.localStorage;` +
    `var stored=store?store.getItem("cojeev-docs-theme"):null;if(stored==="light"||stored==="dark")mode=stored;` +
    `var raw=store?store.getItem("cojeev-appearance"):null;saved=raw?JSON.parse(raw):null}catch(e){saved=null}` +
    `var settings=api.normalizeAppearance(saved);return{mode:mode,palette:settings.palette,contrast:settings.contrast}}` +
    `function write(){if(running||released)return;running=true;try{var s=state(),root=document.documentElement;` +
    `root.setAttribute("data-mode",s.mode);root.setAttribute("data-palette",s.palette);root.setAttribute("data-contrast",String(s.contrast));` +
    `var tokens=api.appearanceTokens({palette:s.palette,contrast:s.contrast},s.mode);` +
    `for(var name in tokens)root.style.setProperty(name,tokens[name])}finally{running=false}}` +
    `write();` +
    /* Before React mounts, this script is the only writer, so a stored theme or
     * palette change from another tab is synchronized here. The mounted runtime owns
     * both afterwards: `AppearanceProvider` subscribes to `cojeev-appearance` and the
     * docs theme subscription re-reads `cojeev-docs-theme`, so a bubble-phase storage
     * event still reaches them after this listener is gone. Keeping this listener
     * alive past the mount was a regression: `state()` can only re-read storage, and
     * after a failed persist it therefore overwrote the in-memory theme the mounted
     * control still shows (`data-mode="light"` with the switch checked dark). */
    `release=function(){released=true;try{window.removeEventListener("storage",write)}catch(e){}};` +
    `try{window.addEventListener("storage",function(event){if(event.key==="cojeev-appearance"||event.key==="cojeev-docs-theme"||event.key===null)write()});window.${PREPAINT_RELEASE_HOOK}=release}catch(e){}` +
    `})()`;
}

/** The runtime's token module as browser JavaScript: bundled and minified from the
 * single source of truth rather than retyped. The IIFE's value is returned explicitly
 * (`return __cojeevAppearance`) instead of relying on `globalName`'s own binding,
 * which minification can rewrite to an internal name; the assignment is appended in
 * the same scope as the `var` it reads. */
function tokensRuntimeSource() {
  const bundle = buildSync({
    entryPoints: [path.join(path.dirname(fileURLToPath(import.meta.url)), "..", tokensModule)],
    bundle: true, write: false, format: "iife", globalName: "__cojeevAppearance",
    target: "es2019", minify: true, legalComments: "none",
  }).outputFiles[0].text;
  return `${bundle};return __cojeevAppearance;`;
}

/** Guards the two mistakes this generator has actually shipped.
 *
 *  - a free identifier inside the stringified bootstrap (`appearanceState` once
 *    referenced a module constant; its own `catch` swallowed the `ReferenceError`
 *    and the palette silently never resolved);
 *  - a bundle that keeps a module-scope import or a `require`, which cannot resolve
 *    in an inline classic script and would throw before the palette is written.
 *
 * Syntax errors are caught by parsing the result with `new Function`, which is the
 * same parser the page will use. */
function assertBootstrapIsUsable() {
  const source = bootstrapSource();
  for (const name of ["KNOWN_PALETTES", "TOKEN_NAMES", "CONTRAST_STOPS", "appearanceState"]) {
    if (new RegExp(`\\b${name}\\b`).test(source)) throw new Error(`the bootstrap references ${name} from generator scope; it must take it from the bundled module`);
  }
  if (/\brequire\s*\(/.test(source)) throw new Error("the bootstrap bundle contains require(); it cannot resolve in an inline classic script");
  if (/^\s*(import|export)\s/m.test(source)) throw new Error("the bootstrap bundle still contains ESM syntax; it must be transpiled to an IIFE");
  if (source.includes("</script")) throw new Error("the bootstrap contains a literal </script sequence and would terminate its own <script> element early");
  /* The provider releases this writer on mount by calling the hook below. If the
   * hook ever disappeared the regression returns silently — the provider's optional
   * call would be a no-op — so its presence is a generation contract, not a detail. */
  if (!source.includes(`window.${PREPAINT_RELEASE_HOOK}=release`)) throw new Error(`the bootstrap never exposes ${PREPAINT_RELEASE_HOOK}; the mounted provider could not take ownership and would stay raced by this writer`);
  try { new Function(source); } catch (error) { throw new Error(`the bootstrap is not valid JavaScript: ${error.message}`); }
  for (const [name, expected] of [["normalizeAppearance", "function"], ["appearanceTokens", "function"]]) {
    if (!new RegExp(`(^|[^\\w.])${name}\\b`).test(source)) throw new Error(`the bootstrap never calls ${name}(); it would not paint the runtime's values`);
    void expected;
  }
}

export function appearanceBootstrapScript() {
  return bootstrapSource();
}

function render() {
  return `/* GENERATED by scripts/build-appearance-prepaint.mjs — do not edit by hand.
 *
 * The pre-paint stylesheet. The docs layout inlines \`prepaintCssRules\` as a <style>
 * block and runs \`appearanceBootstrapScript\` before any bundle.
 *
 * \`prepaintCssRules\` is the **no-JavaScript fallback**: every runtime token at the
 * default contrast per palette/mode, plus one rule per contrast slider stop (0…100 by
 * ${CONTRAST_STEP}) under \`[data-contrast]\`, carrying only the names that move.
 *
 * \`appearanceBootstrapScript\` is what covers a real saved preference, and it is exact
 * for every value \`normalizeAppearance()\` accepts — including a contrast between two
 * stops. It embeds a transpiled copy of
 * \`registry/cojeev/lib/appearance-tokens.ts\` and calls that module's own
 * \`normalizeAppearance()\` and \`appearanceTokens()\`, so there is no second
 * implementation of the storage contract or the token math to keep in sync.
 *
 * Regenerate with: npm run appearance:prepaint
 * Drift is asserted by tests/appearance-prepaint.test.ts.
 */
export const prepaintCssRules: string = ${JSON.stringify(prepaintCss())};

/** The inline pre-paint bootstrap. Runs before any bundle: normalizes the stored
 * appearance with the runtime's own function and writes the runtime's own token set
 * as inline custom properties on the root, exactly as \`AppearanceProvider\` does on
 * mount. It also owns cross-tab synchronization until the provider mounts and calls
 * the \`__cojeevPrepaintRelease()\` it exposes. */
export const appearanceBootstrapScript: string = ${JSON.stringify(bootstrapSource())};
`;
}

const args = new Set(process.argv.slice(2));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, output);
assertProjectionIsFaithful();
assertBootstrapIsUsable();
const next = render();

if (args.has("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== next) {
    console.error(`${output} is stale — run: node --import tsx scripts/build-appearance-prepaint.mjs`);
    process.exitCode = 1;
  } else {
    console.log(`${output} is current (${palettes.length} palettes x ${MODES.length} modes x ${CONTRAST_STOPS.length} contrast stops)`);
  }
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, next);
  console.log(`wrote ${output} (${palettes.length} palettes x ${MODES.length} modes x ${CONTRAST_STOPS.length} contrast stops, ${next.length} bytes)`);
}
