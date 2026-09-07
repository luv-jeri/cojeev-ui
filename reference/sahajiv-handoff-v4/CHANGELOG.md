# CHANGELOG.md — SahaJiv Design System handoffs

Every rename, removed modifier or changed token between handoffs is recorded here. The `.v-*` class API is frozen from v1 on:
same root classes, same modifier names, same state attributes. Additions are listed; nothing was renamed or removed in v1.

## v4 — 2026-09-07 (seed made independent of engine-injected nodes)

Against v3 the engine change is one function in `js/morph.js`; `docs/MOTION.md` §5 is the only doc change. Nothing in css/, tokens or the class API.

### Fixed
- **`entries/input-group/demo.html` not reproducible under `V.seed`.** A body's seed is `FNV-1a(domPath + '#' + seed)`, and `domPath` counted every previous element sibling — including nodes the engines inject themselves: `flow.js` prepends three `.v-glide__*` layers into any container holding ≥ 2 field items (this demo's grid: three `.v-igroup` + one `label.v-input`), and `morph.js` prepends its own `svg.v-morph` into each host (here the `.v-btn` / `.v-badge` / `.v-ibtn` bodies sit inside `.v-igroup` bodies). Whether a seed was hashed before or after those prepends depended on IntersectionObserver and drain timing, so the same seed produced different bodies across loads. `domKey` now skips `svg.v-morph`, `#v-morph-defs` and the three glide layers; the path is a function of the authored document only. Seeds on pages without injected siblings are unchanged.
- MOTION.md §5: which pages carry `data-seed` (every entry demo and isolation page; `catalog/index.html` does not) and the seed → rewind → clock order for a pixel comparison.

## v3 — 2026-09-07 (reduced-motion guards restored; four v2 differences resolved)

### Regressions from v2, fixed
- **Reduced motion.** v2 had dropped the `!important` on `base.css`'s `prefers-reduced-motion` block (the audit only ran light and dark), so `--t-flow-*` durations leaked through under reduced motion in 36 entries. Restored; MOTION.md §6 records why it is structural. Reduced motion is now a permanent third condition in both audit fixtures (the media blocks are forced on in the CSSOM).
- **a. Dashed badges / buttons painted twice** (`.v-badge.-dashed.v-morph-live`, `[data-morph="stroke"]`): v1 was right — the DOM border is transparent because the SVG stroke body draws the dashed edge. The v2 audit missed it because morph bodies build lazily (only the 12 in view were live). `!important` restored on both rules.
- **c. Dark control surfaces** (`.v-check.-block`, `.v-radio.-block` and the dark surface list): v1 (`--v-beige-2` #2A2621) is intended; the dark override needs `!important` to beat the layered `!important` on the light rule. Restored.
- **d. `.v-md__detail` radius**: v2's `!important` on the base `0 24px 24px 24px` (added by the v2 restore pass) outranked the ≤720 container variant that rounds all four corners. Removed; v1 value (24px) is back.

### Confirmed as intended (v2 value stands)
- **b. `.v-iradio:has(input:checked)` background in dark**: transparent on the label is intended. The pictographic radio is a travelling-selection well — `flow.css` makes the active item transparent and paints the fill on the sibling `.v-glide__pill>i` (`var(--sel-bg)`), which moves between items. v1's dark `!important` painted pink under the moving well (a double paint that also made dark disagree with light, where the label was already transparent). Compare the pill, not the label.

### Counts
- Raw hex outside tokens.css: 0. The eight legacy-alias values became tokens (`--legacy-*`, evidence I) and `--hue-deep` in the danger alert became `--danger-deep`. `!important`: 105 across css/ (base 6, components 3, components-2 62, alive 23, patterns 4, flow 7) — every one in LINT.md's table. The word no longer appears in a vriksha.css comment.

## v2 — 2026-09-07 (CSS debt, populated data surfaces, inner gates)

### Contract
- Class API unchanged: no renames, no removed modifiers, no changed token values. Visual output verified identical to v1 element by element (`fixtures/regress-v1.html`: 0 computed-style changes in light and dark across all 4 866 catalog demo elements).

### Tokens (added; none changed)
- Fixed inks that the component sheets painted as raw hex and that deliberately do not follow the mode switch: `--ink-fixed #111111`, `--cream-fixed #F6EFE2`, `--mask-ink #000000`, `--unavail-ink #6E6A63`, `--alert-ink #3E3A34`, `--btn-disabled-ink #4A453D`, `--nav-group-ink #8E8674`, `--muted-foreground-ink #2E2A24`, `--muted-foreground-tinted #4A443C` (all evidence I). 153 raw hex occurrences in components.css, components-2.css, patterns.css, alive.css, composites.css → tokens (`--v-on-accent`, `--v-pink`, `--v-brand`, `--destructive-foreground` where the value already existed as a constant token).
- Raw hex remaining outside tokens.css: 0 (LINT.md; data-URI masks excepted).

### !important
- 131 → 97 across css/ (components-2 85→62, alive 26→21, patterns 7→4, components 7→1, base 6→2, flow 7). Method and the full survivor table with a reason per rule: LINT.md. Two audit fixtures ship: `fixtures/imp-audit.html` (per-declaration necessity in the live CSSOM) and `fixtures/regress-v1.html` (element-by-element comparison against the previous handoff's sheets).

### Isolation pages
- Data surfaces carry their fixture rows as static markup (`tools/gen-static.js` reads RUNS and MEM from `catalog/demo-behaviour.js` at build time): `isolation/data-table/*` shows rows 1–4 of 9 with the pager at 1 of 3; `isolation/memory/*` shows all 6 entries grouped by agent. The root carries `data-static-fixture`.
- Every block inside a page carries its own `data-gate="<id>/<variant>/<size>/<state>"` (id resolved from the block's root class; inner blocks that are not a catalog root use their block class as the variant, e.g. `typography/v-hero/default/rest`). Whole-demo pages are therefore comparable part by part.

### Data
- `data/registry.json`: `category` is never null — `"none"` marks a static element that never receives a morph body; the `$description` says so.
- `MANIFEST.json`: `checks.everyLoadResolves` (every @import / src / stylesheet href resolves inside the zip) and `checks.deadLinks` (`<a href>` targets outside the zip, e.g. fixture pages) replace the single mis-computed flag.

### Docs
- `readme.md` describes only the shipping system; the Grove/SahaJiv kit notes moved to `_archive/legacy-grove/ARCHIVE.md`.

## v1 — 2026-09-07 (first machine-checkable handoff)

### Contract
- Class API: **no renames, no removed modifiers.** `data-part` (root · trigger · content · item · indicator · thumb · track · viewport …) is applied at runtime from `catalog/spec.js` alongside the existing classes; `data-state` (open|closed · checked|unchecked|indeterminate · on|off · active|inactive) mirrors aria/DOM truth. Neither replaces a class or an aria attribute.
- New data: `data/registry.json`, `data/port-map.json`, `data/tokens.json` (DTCG), `data/motion.json`. New docs: `MOTION.md`, `ADJUSTER.md`, `STATE-MATRIX.md` (regenerated), `LINT.md`, per-entry `entries/<id>/contract.md`. Isolation pages under `isolation/<id>/` (660 files; `-WxH` suffix for larger canvases).

### Tokens (added; none changed or removed)
- `--glide-bg` now a literal `#1A1714` (dark `#0C0B0A`) instead of `var(--v-ink)`; `--glide-fg` `#F6EFE2` — the travelling lozenge is a constant in both themes, as flow.css always painted it. `--v-on-accent #111111`, `--rail-sel`, `--rail-hover`.
- Travelling-selection timing: `--t-flow-*` (glide, stretch, jelly, comet, drop, rubber, pebble, ripple, halo; `-h`, `-land`, phase beats, hover, radius, fade, still, land-hold), `--e-flow-*` curves, `--t-skel`, `--t-skel-sheen`, `--t-pulse`.
- ui.js delays: `--t-tooltip 220ms` (the code's real value; the api string said 250), `--t-hovercard 300ms`, `--t-toast 5000ms`, `--t-focus-settle 120ms`.
- Motion tokens re-tagged `@kind motion` (were `other`); z-index tokens `@kind z`.

### Stylesheets
- `vriksha.css`: every sheet except `flow.css` now sits in the cascade layer `vriksha`; flow.css is unlayered, so 21 `!important` declarations were removed (7 guards remain, inventoried in LINT.md). `alive.css` master/detail selected row lost its two `!important`.
- `flow.css`: raw hex → tokens; every literal duration/easing → `--t-flow-*` / `--e-flow-*`.
- `shapes.css`: regenerated with path-only data URIs (91 KB → 4 KB).
- `fonts.css`: DM Sans self-hosted (`assets/fonts/DMSans-VF.ttf`, OFL); the Google Fonts @import is gone. Nothing loads from the network.
- `components-2.css`: checkbox is one pebble silhouette in both states (was rounded square unchecked / blob checked); tick keyframes squash and settle.

### Engines
- `morph.js`: seeded PRNG (`data-seed` / `V.seed`), `VMorph.clock(t)`, `VMorph.rewind()`; the only `Math.random()` is now the unseeded fallback.
- `flow.js`: reads durations/easings from tokens; phase timers and debounce run on `V.clock(t)` when engaged; `VFlow.clock`.
- `v.js`: `V.seed`, `V.clock` (also scrubs CSS animations), `V.timing`, `data-state` mirror, `data-part` applier, sprites from `assets/sprites.js` (no fetch on file://).
- `ui.js`: delays read from tokens.

### Documentation corrections
- AGENT-PROMPT.md no longer says `data-morph` is retired or quotes unenforced caps; MOTION.md §3 records the real integrator and caps.

### Not shipped
- `react/` and `components/vriksha/` are excluded from the handoff (dead output for the port).
