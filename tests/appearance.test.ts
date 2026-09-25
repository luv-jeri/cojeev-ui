import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { appearanceTokens, contrastRatio, normalizeAppearance, palettes, type PaletteName } from "../registry/cojeev/lib/appearance-tokens";

/* `paper` reproduces the supplied design system, so it ships literal handoff
 * tokens instead of deriving them. That changes two invariants, and both are
 * asserted explicitly below rather than by relaxing a threshold:
 *
 *   1. Handoff values are fixed — the contrast control must not move them. Any
 *      drift would desync first paint (tokens.css) from post-hydration values and
 *      reintroduce the warm-to-cool flash.
 *   2. `--v-paper` is a LIGHT surface in both modes: the design system pairs it
 *      with `--v-on-accent`/`--v-ink` (#111111), e.g. `components-2.css:1032`
 *      `.v-acc summary>.v-icon:first-child`. So the dark-mode inks are not meant
 *      to be read on it. Asserting `--v-text` on `--v-paper` in dark mode would
 *      demand one ink that clears both #171512 and #FBF4E6, which is impossible:
 *      pure white scores 18.22:1 on the former and 1.09:1 on the latter.
 */
const isLiteral = (palette: (typeof palettes)[number]) => Boolean(palette.tokens);

test("Paper's literal runtime tokens match CSS before hydration in both modes", () => {
  const css = postcss.parse(readFileSync("registry/cojeev/styles/tokens.css", "utf8"));
  const paper = palettes.find(p => p.id === "paper")!;
  for (const mode of ["light", "dark"] as const) {
    const values = new Map<string, string>();
    css.walkRules(rule => {
      if (rule.parent?.type !== "root") return;
      if (rule.selector !== ":root" && !(mode === "dark" && rule.selector === ':root[data-mode="dark"]')) return;
      rule.walkDecls(decl => { values.set(decl.prop, decl.value); });
    });
    for (const [token, value] of Object.entries(paper.tokens![mode])) {
      assert.equal(values.get(token), value, `${mode} ${token}: CSS must match runtime`);
    }
  }
});

/** Surfaces each ink is actually read on: the mode's own surfaces, plus the
 * light `paper`/`cream` surfaces only where the mode's ink is dark. */
function readableSurfaces(palette: (typeof palettes)[number], mode: "light" | "dark") {
  const t = appearanceTokens({ palette: palette.id, contrast: 60 }, mode);
  return ["--v-canvas", "--v-beige", ...(mode === "light" ? ["--v-paper"] : [])]
    .map(name => [name, t[name]] as const);
}

test("all palettes retain readable role pairs at every contrast level in both modes", () => {
  for (const palette of palettes) for (const mode of ["light", "dark"] as const) for (const contrast of [0, 25, 50, 75, 100]) {
    const t = appearanceTokens({ palette: palette.id, contrast }, mode);
    const surfaces = readableSurfaces(palette, mode);
    for (const [, bg] of surfaces) {
      for (const ink of ["--v-text", "--v-text-2"]) assert.ok(contrastRatio(t[ink], bg) >= 4.5, `${palette.id}/${mode}/${contrast} ${ink} on ${bg}`);
      // Muted ink must clear the palette's declared contrast floor.
      assert.ok(contrastRatio(t["--v-text-3"], bg) >= palette.mutedInkContrast, `${palette.id}/${mode}/${contrast} --v-text-3 on ${bg}`);
      assert.ok(contrastRatio(t["--v-edge"], bg) >= 3, `${palette.id}/${mode} control edge on ${bg}`);
    }
    assert.ok(contrastRatio(t["--sel-ink"], t["--sel-bg"]) >= 4.5, `${palette.id}/${mode} selection ink`);
    for (const state of ["ok", "warn", "danger", "info", "pending"]) assert.ok(contrastRatio(t[`--status-${state}-ink`], t[`--status-${state}-bg`]) >= 4.5, `${palette.id}/${mode} ${state}`);
    for (const accent of palette.accents) assert.ok(contrastRatio(t["--v-on-accent"], accent) >= 4.5, `${palette.id}/${mode} on-accent on ${accent}`);
  }
});

test("contrast strengthens secondary text without filtering or changing the accent palette", () => {
  for (const palette of palettes) {
    if (isLiteral(palette)) continue; // covered by the invariance test below
    for (const mode of ["light", "dark"] as const) {
      const low = appearanceTokens({ palette: palette.id, contrast: 0 }, mode), high = appearanceTokens({ palette: palette.id, contrast: 100 }, mode);
      assert.ok(contrastRatio(high["--v-text-2"], high["--v-paper"]) > contrastRatio(low["--v-text-2"], low["--v-paper"]), `${palette.id}/${mode} secondary text must strengthen`);
      assert.equal(low["--v-pink"], high["--v-pink"]);
      assert.equal(low["--v-paper"], high["--v-paper"]);
    }
  }
});

test("the handoff palette ignores the contrast control so first paint and hydration agree", () => {
  const paper = palettes.find(p => p.id === "paper")!;
  assert.ok(isLiteral(paper), "paper must carry literal handoff tokens");
  for (const mode of ["light", "dark"] as const) {
    const low = appearanceTokens({ palette: "paper", contrast: 0 }, mode);
    const high = appearanceTokens({ palette: "paper", contrast: 100 }, mode);
    assert.deepEqual(high, low, `paper/${mode} must be identical at every contrast level`);
  }
});

test("the handoff palette's dark muted ink is raised to meet WCAG AA", () => {
  /* The handoff ships `--v-text-3: #6E675E` for dark mode, which is 3.27:1 on its
   * canvas and 2.94:1 on its beige — below AA for normal text, while its own light
   * mode passes at 5.37:1. We raise it to #90897F, a minimal step toward the
   * handoff's own dark primary text that clears AA on both dark surfaces. This test
   * pins the deviation so a future sync from the reference cannot silently
   * reintroduce the sub-AA value. */
  const handoffDarkMuted = "#6E675E";
  const dark = appearanceTokens({ palette: "paper", contrast: 60 }, "dark");
  assert.notEqual(dark["--v-text-3"], handoffDarkMuted, "the sub-AA handoff value must not be used verbatim");
  for (const surface of ["--v-canvas", "--v-beige"]) {
    assert.ok(contrastRatio(dark["--v-text-3"], dark[surface]) >= 4.5, `dark --v-text-3 on ${surface} must clear AA`);
    // The handoff value itself must still be the thing being corrected, not a different token.
    assert.ok(contrastRatio(handoffDarkMuted, dark[surface]) < 4.5, `${surface}: the handoff value is expected to be sub-AA`);
  }
  // The correction must stay in the handoff's own warm family: no new hue introduced.
  assert.equal(dark["--v-text-3"], "#90897F");
});

test("the handoff palette reproduces the supplied design system values", () => {
  const light = appearanceTokens({ palette: "paper", contrast: 60 }, "light");
  const dark = appearanceTokens({ palette: "paper", contrast: 60 }, "dark");
  // Spot-check the values that B-001/B-018 were about: these are what first paint renders.
  assert.equal(light["--v-canvas"], "#FBF4E6");
  assert.equal(light["--v-paper"], "#FBF4E6");
  assert.equal(light["--v-ink"], "#111111");
  assert.equal(light["--v-text"], "#0E0B0B");
  assert.equal(light["--v-border"], "#D9D2C4");
  assert.equal(dark["--v-canvas"], "#171512");
  assert.equal(dark["--v-text"], "#F6EFE2");
  assert.equal(dark["--v-ink"], "#FBF4E6");
  // `--v-paper` stays the light cream surface in both modes, by design.
  assert.equal(dark["--v-paper"], "#FBF4E6");
});

test("stored or controlled preferences are validated", () => {
  assert.deepEqual(normalizeAppearance({ palette: "unknown", contrast: NaN }), { palette: "paper", contrast: 60 });
  assert.equal(normalizeAppearance({ contrast: -100 }).contrast, 0);
  assert.equal(normalizeAppearance({ contrast: 1000 }).contrast, 100);
  assert.deepEqual(normalizeAppearance(null), { palette: "paper", contrast: 60 });
});

test("buy-me-coffee's ink stays readable on --v-paper in every palette and mode", () => {
  // The card paints `--v-paper`, which is NOT a constant: `paper` is always-light,
  // but the other five palettes flip paper to a dark surface in dark mode. A fixed
  // dark ink is unreadable on those five (measured 1.23-1.36:1); the ordinary mode
  // tokens are equally wrong on paper/dark, where `--v-ink` IS the paper colour
  // (both #FBF4E6, 1.00:1). Five tokens do clear AA on paper everywhere; the other
  // four (`--btn-disabled-ink`, `--v-olive-ink`, `--v-brand`, `--unavail-ink`) are
  // excluded on MEANING, not contrast -- an advisory card needs an advisory role.
  // buy-me-coffee.css binds `--alert-ink` (unprefixed): only some tone families get a
  // `--v-` alias, and `--v-alert-ink` is never defined at runtime.
  // Regression guard for a fix that was itself wrong the first time.
  for (const { id } of palettes) {
    for (const mode of ["light", "dark"] as const) {
      const tokens = appearanceTokens({ palette: id, contrast: 60 }, mode);
      const paper = tokens["--v-paper"];
      const ink = tokens["--alert-ink"];
      assert.ok(paper && ink, `${id}/${mode}: expected both --v-paper and --alert-ink`);
      const ratio = contrastRatio(ink, paper);
      assert.ok(
        ratio >= 4.5,
        `${id}/${mode}: buy-me-coffee ink ${ink} on paper ${paper} is ${ratio.toFixed(2)}:1, below AA`,
      );
    }
  }
});

test("the obvious mode tokens fail on --v-paper, which is why buy-me-coffee needs a different role", () => {
  // Documents WHY the component binds a specific token rather than the obvious one:
  // the candidates a reader would reach for all fail somewhere.
  const paper = (id: PaletteName, mode: "light" | "dark") => appearanceTokens({ palette: id, contrast: 60 }, mode)["--v-paper"];
  const failsSomewhere = (key: string) =>
    palettes.some(({ id }) => (["light", "dark"] as const).some(mode => contrastRatio(appearanceTokens({ palette: id, contrast: 60 }, mode)[key], paper(id, mode)) < 4.5));
  assert.ok(failsSomewhere("--v-ink"), "--v-ink is expected to fail on at least one palette: paper/dark, where it equals the paper");
  assert.ok(failsSomewhere("--v-text"), "--v-text is expected to fail on at least one palette");
  assert.ok(failsSomewhere("--v-text-2"), "--v-text-2 is expected to fail on at least one palette");
  assert.ok(!failsSomewhere("--alert-ink"), "--alert-ink must stay AA on the paper surface in every palette and mode");

  // `--alert-ink` is NOT the only token that clears AA here, and claiming otherwise
  // would be false. These are the others, with their worst ratio across the 12
  // combinations. They are excluded on MEANING, not on contrast -- `--v-brand` is an
  // accent, `--btn-disabled-ink` and `--unavail-ink` mean disabled/unavailable, and
  // `--v-olive-ink` is a decorative tone. A card asking for coffee support is an
  // advisory role, so `--alert-ink` is the only one whose meaning fits.
  const others = ["--v-brand", "--btn-disabled-ink", "--unavail-ink", "--v-olive-ink"];
  for (const key of others) {
    assert.ok(!failsSomewhere(key),
      `${key} was assumed to be a weaker candidate; if it now fails somewhere, revisit the choice of --alert-ink`);
  }
});

test("buy-me-coffee.css actually binds its ink to the token the tests above prove is safe", () => {
  // The two tests above only prove `--alert-ink` is a SAFE CHOICE. On their own they
  // would still pass if the stylesheet reverted to a broken ink, so the binding itself
  // has to be asserted. Reads the shipped stylesheet, not a copy.
  const css = readFileSync("registry/cojeev/styles/buy-me-coffee.css", "utf8");
  const declarations = [...css.matchAll(/--coffee-ink:\s*var\((--[a-z0-9-]+)\)/g)].map(m => m[1]);
  assert.ok(declarations.length > 0, "buy-me-coffee.css must define --coffee-ink from a token");
  for (const token of declarations) {
    assert.equal(token, "--alert-ink",
      `buy-me-coffee.css binds its ink to ${token}; it must bind --alert-ink, the advisory role that clears AA on --v-paper in all 12 palette/mode combinations`);
  }
  // The mode tokens are the trap this guards: `--v-alert-ink` is never defined at
  // runtime (only some tone families get a `--v-` alias), so binding to it silently
  // leaves the card at its inherited colour -- the original bug.
  assert.ok(!/var\(--v-alert-ink\)/.test(css), "--v-alert-ink is undefined at runtime; the alias does not exist for this role");
  assert.ok(!/var\(--v-ink\)|var\(--v-text-2\)/.test(css),
    "buy-me-coffee.css must not paint its copy with mode tokens: the card paints --v-paper, which flips between palettes");
  // Whatever the stylesheet binds, it must be a role that actually exists in the token set.
  for (const token of declarations) {
    assert.ok(appearanceTokens({ palette: "paper", contrast: 60 }, "light")[token] !== undefined,
      `${token} is not produced by appearanceTokens(), so the card would inherit instead of painting`);
  }
});
