# LINT.md — adherence audit of css/ (generated 2026-09-07)

Rule set: no raw hex outside tokens.css (data-URI masks excepted), no `!important` except a documented guard, every `var(--x)`
declared. Counts are for the whole file; tokens.css legitimately holds the hex values.

| file | raw hex (declarations, data-URI masks excluded) | !important (declarations) |
|---|---|---|
| css/tokens.css | 127 | 0 |
| css/fonts.css | 0 | 0 |
| css/legacy-aliases.css | 0 | 0 |
| css/base.css | 0 | 6 (7 incl. comments) |
| css/shapes.css | 0 | 0 |
| css/components.css | 0 | 4 |
| css/components-2.css | 0 | 62 |
| css/patterns.css | 0 | 2 (4 incl. comments) |
| css/composites.css | 0 | 0 |
| css/alive.css | 0 | 20 (22 incl. comments) |
| css/flow.css | 0 | 7 |
| css/vriksha.css | 0 | 0 |

## !important — every survivor, with the guard it protects
Method (v3): every important declaration was dropped one at a time in the live CSSOM of the full catalog and the computed styles of all
demo elements compared before/after under three conditions — light, dark, and reduced motion (the prefers-reduced-motion blocks forced on
in the CSSOM) — with pseudo-state rules tested with their pseudo-class removed (`fixtures/imp-audit.html`); then the edited sheets were
compared against the previous handoff's sheets element by element under the same three conditions (`fixtures/regress-check.html`).
Lesson recorded from v2: the static audit cannot see states it does not create — reduced motion, lazily built morph bodies — so those
guards are kept on principle and listed here with that reason. flow.css is loaded outside the `vriksha` cascade layer, so its paint rules need none.

| file | selector | properties | why it stays |
|---|---|---|---|
| css/base.css | `[hidden]` | display | hidden must win over any display rule (audit: 240 elements change without it) |
| css/base.css | `.v-sr` | position | screen-reader-only positioning must win (audit: layout changes without it) |
| css/base.css | `*,*::before,*::after` | animation-duration, animation-iteration-count, transition-duration, scroll-behavior | reduced-motion guard: must beat every transition/animation declaration whatever its specificity |
| css/components.css | `.v-badge.-dashed.v-morph-live,.v-badge.-test.v-morph-live` | border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components.css | `[data-morph="stroke"],[data-morph="both"]` | box-shadow, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components.css | `.v-spinner,.v-spin` | animation | reduced-motion guard: must beat every transition/animation declaration whatever its specificity |
| css/components-2.css | `.v-label,.v-help,.v-caps,.v-meta,.v-prov,.v-marker,.v-prose,.v-prose *,.v-quest,.v-quest__…` | box-shadow, border | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:checked,.v-check input:indeterminate` | border-color, background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-radio input:checked` | border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-otp input` | border, background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-otp input:focus` | border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-sliderwrap input[type=range]` | border, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:disabled,.v-radio input:disabled` | border-color, background | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:disabled,.v-radio input:disabled` | border-color, background | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:disabled:checked,.v-radio input:disabled:checked` | background, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-scroll.-ink,.v-scroll.-ink.v-morph-live` | background | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `:root[data-mode="dark"] .v-check input,:root[data-mode="dark"] .v-radio input` | border-color, background, box-shadow | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/components-2.css | `:root[data-mode="dark"] .v-check input:checked,:root[data-mode="dark"] .v-check input:inde…` | border-color, background | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/components-2.css | `.v-otp input` | border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-radio input:checked` | background, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-radio.-block` | background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-radio.-block:has(input:checked)` | background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input` | border-radius, border, background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:active` | border-radius | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:checked,.v-check input:indeterminate` | background, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check.-block` | background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check.-block:has(input:checked)` | background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:checked` | background-image, background-size, background-position, background-repeat | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:indeterminate` | background-image, background-size, background-position, background-repeat | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:disabled:checked` | background-color, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-check input:disabled:checked` | background-image, background-color, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-field.-error .v-input,.v-field[data-invalid] .v-input,.v-input.-error,.v-input[aria-inv…` | box-shadow, background | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-field.-error .v-input:focus-within,.v-input.-error:focus-within,.v-input[aria-invalid="…` | box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-radio input:checked,.v-iradio input:checked,.v-quest__opt input:checked` | background, border-color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/components-2.css | `.v-toggle.-circle[aria-pressed="true"]:not([data-glide-active])` | background, color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/patterns.css | `.v-dockpanel` | padding-bottom | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/patterns.css | `.v-md__detail` | margin-top | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-pulse.-paused,.v-pulse.-paused *,.v-pulse.-paused .seed,.v-pulse.-paused .core,.v-skel.…` | animation-play-state | paused-loop guard (catalog authoring): a state the static audit cannot reach |
| css/alive.css | `.v-md__detail` | background, box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-md__head .v-disk.-lg` | background | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-md__detail` | border-radius | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-md__detail` | border-radius | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-cal__month` | background, color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-seg .v-btn` | box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `:root[data-mode="dark"] .v-check input,:root[data-mode="dark"] .v-radio input,:root[data-m…` | border-color, background | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/alive.css | `:root[data-mode="dark"] .v-check input:checked,:root[data-mode="dark"] .v-check input:inde…` | background, border-color | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/alive.css | `:root[data-mode="dark"] .v-check.-block:has(input:checked),:root[data-mode="dark"] .v-radi…` | background | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/alive.css | `:root[data-mode="dark"] .v-scroll.-ink` | background | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/alive.css | `:root[data-mode="dark"] .v-utility,:root[data-mode="dark"] .v-seg,:root[data-mode="dark"] …` | background | dark-mode override of a control paint: the static audit showed the checked tick / radio dot / ink scroll pane regress without it (kept as a group) |
| css/alive.css | `.v-cal__month` | background, color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-cal__nav .v-ibtn,.v-cal__nav .v-ibtn.-sm,.v-cal__head .v-cal__nav .v-ibtn` | box-shadow | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/alive.css | `.v-nav__item[aria-current="page"],.v-nav__item[aria-current="page"] .v-icon` | color | needed: dropping it changes computed styles in the catalog (fixtures/imp-audit.html + fixtures/regress-v1.html, light and dark) |
| css/flow.css | `.v-glide.-still>.v-glide__pill,.v-glide.-still>.v-glide__hover,.v-glide.-still>.v-glide__t…` | transition | flow guard: first-paint / off state must beat the per-character transitions in the same file |
| css/flow.css | `.v-glide[data-flow-kind="bar"]>.v-glide__pill>i,.v-glide[data-flow-kind="bar"]>.v-glide__p…` | animation | flow guard: an underline bar never plays the landing keyframes, which outrank it by specificity |
| css/flow.css | `.v-glide[data-flow-v="off"]>.v-glide__pill>i` | animation | flow guard: first-paint / off state must beat the per-character transitions in the same file |
| css/flow.css | `.v-glide>.v-glide__pill,.v-glide>.v-glide__hover,.v-glide>.v-glide__trail` | transition | reduced-motion guard: must beat every transition/animation declaration whatever its specificity |
| css/flow.css | `.v-glide>*>i,.v-glide>*>i::after` | animation | reduced-motion guard: must beat every transition/animation declaration whatever its specificity |
| css/flow.css | `:root[data-flow="off"] [data-flow-in],:root[data-flow="off"] [data-flow-land],[data-flow="…` | animation | reduced-motion guard: must beat every transition/animation declaration whatever its specificity |
| css/flow.css | `[data-flow-in],[data-flow-land]` | animation | reduced-motion guard: must beat every transition/animation declaration whatever its specificity |

## Raw hex outside tokens.css (pre-existing; not touched in this pass)
| where | values |
|---|---|


## var() references with no declaration in css/ (must be supplied by the host page or are set from JS)
- `--p` — css/components.css, css/components-2.css, css/patterns.css, css/composites.css
- `--ar` — css/components-2.css
- `--h` — css/components-2.css, css/patterns.css, css/composites.css
- `--split` — css/components-2.css
- `--i` — css/components-2.css, css/alive.css
- `--slot-start` — css/patterns.css
- `--minute` — css/patterns.css
- `--dur` — css/patterns.css
- `--start` — css/patterns.css
- `--lv` — css/composites.css
- `--cols` — css/composites.css
- `--glide-r` — css/flow.css
- `--glide-w` — css/flow.css
- `--glide-h` — css/flow.css
- `--glide-o` — css/flow.css
- `--glide-x` — css/flow.css
- `--glide-y` — css/flow.css
- `--hov-w` — css/flow.css
- `--hov-h` — css/flow.css
- `--hov-r` — css/flow.css
- `--hov-o` — css/flow.css
- `--flow-hover` — css/flow.css
- `--hov-x` — css/flow.css
- `--hov-y` — css/flow.css
- `--flow-speed` — css/flow.css
- `--glide-d` — css/flow.css
- `--flow-intensity` — css/flow.css
- `--glide-ripple` — css/flow.css
- `--flow-ox` — css/flow.css
- `--flow-oy` — css/flow.css

## Known deviations
- Isolation file names use `-WxH` instead of `@WxH` for larger canvases: `@` is not a legal filename character in the project store. `data-canvas` on the root carries the same value.
- components-2.css carries most of the library's `!important` (control boundary restatements) and raw hex (`#111` ink-on-accent). Tokenising them is a separate pass; it is recorded here, not hidden.
