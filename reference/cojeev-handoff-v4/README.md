# Cojeev Design System — handoff v4 (2026-09-07)

Open `catalog/index.html` from the filesystem; nothing loads from the network. Start with `docs/AGENT-PROMPT.md`, then `docs/MOTION.md` and `docs/ADJUSTER.md`.
Machine-readable: `data/registry.json` (index of every entry, its variants, sizes, states and files), `data/port-map.json` (class contract), `data/tokens.json` (DTCG), `data/motion.json`.
Per entry: `entries/<id>/contract.md` + `demo.html`; `isolation/<id>/<variant>-<size>-<state>[-dark][-WxH].html` with `data-gate` and `data-canvas` on the root (`-WxH` instead of `@WxH`: see LINT.md).
Extra files beyond the agreed structure, each required by an `@import` or `src` (rule 1): `css/legacy-aliases.css` (imported by vriksha.css), `js/alive.js` (loaded by the catalog), `assets/sprites.js` (icons + shapes as a script so file:// pages need no fetch), `fonts/*-OFL.txt` (licences).
Reproducibility: `<html data-seed="42">` or `V.seed(42)`; `V.clock(t)` steps every animation (docs/MOTION.md §5).

v2: CSS debt paid (LINT.md), data surfaces populated with static fixture rows, inner `data-gate` on every block inside a page, registry categories never null, MANIFEST flags split into `everyLoadResolves` / `deadLinks`. See CHANGELOG.md.

v3: reduced-motion guards restored (0s durations under prefers-reduced-motion, base.css), the four v2 differences resolved (CHANGELOG.md), reduced motion added as the third audit condition, raw hex outside tokens.css 0 including legacy-aliases.css.

v4: the seeded DOM-path hash in `js/morph.js` no longer counts nodes the engines inject (`svg.v-morph`, `#v-morph-defs`, `.v-glide__*`), so a body's seed is a function of the authored document only and `entries/input-group/demo.html` is reproducible under `V.seed` like every other page (CHANGELOG.md). MOTION.md §5 records which pages carry `data-seed` and the seed → rewind → clock order.
