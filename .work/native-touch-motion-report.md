# Bounded native-touch motion audit

Measured production revision: `456c8ee356b621b6b1cb5cb4bee6f5e7be85033f` (production tree from `f26365d`). No production or reference file changed during capture. This report covers four Chromium mobile-emulation rows at **390 × 844 CSS px**, with screenshots clipped to 390 × 600. It is not a physical-device test or a full motion matrix.

## Method and evidence

[Probe](touch-motion-probe.mjs) starts its own Vite server on 4350 and an isolated Chromium browser. Each light/dark × normal/reduced row uses four fresh contexts: source A/A and candidate B/B. Contexts use `isMobile:true`, `hasTouch:true`, DPR 1 and matching viewport metadata. All contexts verify `innerWidth=390`, coarse pointer, no fine pointer, no hover capability, one touch point, and the intended reduced-motion preference.

The fixture reuses `apps/gate/motion-fixtures.ts` group markup and specimen CSS. Source loads the complete original `vriksha.css` and `v.js`, `flow.js`, `morph.js`, `motion.js`, `alive.js`. Candidate loads the production style aggregate, `useFlowGroup`, `useMorph`, and the **public Button**. The explicit pink pebble body uses `data-morph="fill"`; it does not opt into texture overlays. No source stylesheet or source motion implementation is imported into the candidate.

Input uses `locator.tap()` for three actual tab taps and Chromium `Input.dispatchTouchEvent` touchStart/touchEnd for two held contacts. Each context records five trusted touch starts/ends, five trusted touch pointer downs/ups, five clicks and five pointer-over events. There are no synthetic DOM pointer events. This is browser-generated touch input in emulation; the CDP-held contacts permit frozen-clock sampling between down and release.

Both engines settle fonts plus 1800 ms, rewind once, start at clock 100000 and advance in steps no larger than 16 ms without reseeding. The existing source cancellation adapter passes its independent self-check. All canonical runner files remain unchanged. A virtual TSX loader error was corrected in this separate probe before the measured run; no failed bootstrap was treated as a fidelity row.

Raw evidence stays in [results.json](native-touch-motion/results.json), [summary.json](native-touch-motion/summary.json), the source cancellation receipt and PNGs beside them. There are **16 contexts, 304 sampled frames and 176 PNG captures**. Cross-side comparison covers 6,550 scalar frame fields (including labels/time/media), with **3,054 group fields** and zero group-field differences. This field count describes captured properties, not every possible CSS property.

## Exact row results

| Theme | Motion | Source A/A | Candidate B/B | Behavior checks | Cross fields | Nonzero PNG samples | Verdict |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| Light | Normal | Stable | Stable | 7/7 each context | 44 | 11/11 | Unresolved |
| Dark | Normal | Stable | Stable | 7/7 each context | 44 | 5/11 | Unresolved |
| Light | Reduced | 1 differing field | Stable | 7/7 each context | 66 | 11/11 | Source repeat unstable |
| Dark | Reduced | 1 differing field | Stable | 7/7 each context | 67 | 9/11 | Source repeat unstable |

There are zero page errors and all **112 behavior-check evaluations** pass. The seven checks cover mobile media, CSS viewport, trusted touch events, latest selected tab after interruption, reversed selection, inactive persistent hover indicator, and exactly one pill/hover/trail layer per group. Every A/A and B/B PNG comparison has zero pixels at the canonical pixelmatch threshold 0.1, including antialiasing. Some source repeats have nonzero raw pixels at threshold 0; those raw counts are retained. “Stable” here means the canonical comparator plus exact sampled fields, not byte-identical PNGs.

## What the interaction traces establish

Normal `drop` responds to touch with gather → shoot → land. The second tap interrupts the first selection and reaches item 2 at x=234 px; the reverse tap settles item 0 at x=0. Source and candidate agree on every captured selected/active attribute, flow variable, phase, layer count, and sampled layer style. Reduced motion changes directly to x=111, then x=234, then x=0 with no travelling phase. Native touch pointer-over events do not leave an active hover indicator.

The original four-row sampler checks hover opacity and variables but does not include trail `display`; its screenshots are also retained. The later narrow normal-light diagnostic records trail `display:none` in all 19 frames on both sides. Do not interpret the seven automated checks as coverage of every possible hover/trail visual property.

Under reduced motion the candidate's explicit body and Button each retain exactly one body path throughout all 19 frames and keep `transform:none`. Source bodies shrink during held contact and ripple after release. The existing [Phase 0 decision](../PHASE-0-DECISION.md) accepts **only reduced-motion body press deformation**, citing [MOTION.md §7](../reference/sahajiv-handoff-v4/docs/MOTION.md#7--what-never-moves): “Under `prefers-reduced-motion`: static bodies, no travel, loops still, durations 0.” These raw differences remain in the JSON. That decision does not waive other differences or turn unstable rows into passes.

Both reduced source repeats disagree only at the final Button `transform`: `none` versus `matrix(1, 0, 0, 1, 0, 1)`. Candidate repeats agree. The normal-light diagnostic confirms native `:active` can remain true after touchEnd on both sides. The source's CSS `:active` translate rule is a possible contributor to the reduced final field, but this raw source-repeat instability remains unresolved and is **not classified as a candidate defect**.

## Remaining differences, kept separate

1. **Known full-export echo paint conflict:** 38 fields per row are the two hidden echo paths × 19 frames. Source resolves their fill to the body's solid color through `reference/sahajiv-handoff-v4/css/components-2.css:460`; candidate retains `fill:none` in `registry/sahajiv/motion/use-morph.ts:85–86`. Both are `display:none`. These fields do not explain visible tap highlights or the normal release geometry differences. The owner has not accepted the effect-fill conflict.
2. **Normal release geometry:** each normal row has six additional fields: explicit body path at release+16 ms, explicit body viewBox/path at release+320 ms, Button viewBox/path at release+16 ms, and Button path at release+320 ms. Both source and candidate self-agree. The separate measurement diagnostic below finds a real measurement-cadence mismatch; these fields are not attributed to the echo paint conflict.
3. **Native tap highlight:** source PNGs visibly show a translucent blue rectangle after tab taps and body release; the candidate does not. Tailwind preflight (`node_modules/tailwindcss/preflight.css:28–50`) sets `-webkit-tap-highlight-color:transparent` on `html,:host`; the source full stylesheet has no such declaration. This is a separate browser paint difference, not a spurious flow hover trail.
4. **Selected-label specimen cascade:** the light source selected label is cream, while the candidate synthetic fixture label is dark. `apps/gate/motion-fixtures.ts:54` assigns `.motion-item` color in the final `motion-fixture` layer. This outranks candidate flow ink in `sahajiv-flow`, whereas the source loads `flow.css` unlayered (`reference/.../css/vriksha.css:2–3,17`), which outranks the specimen layer. Therefore this fixture color is a consumer-layer interaction; it is not evidence that public Tabs has the same defect. No target was silently recolored to hide it.

## Narrow diagnostic after the frozen run

A separate read-only diagnostic uses two more normal-light contexts, preserving the original 16-context evidence. It records computed native tap paint, item ink, `:active`, trail display, and calls to `getBoundingClientRect`. It does not alter engine behavior or production/reference files. Artifacts: [source diagnostic](native-touch-motion-diagnostic/oracle-diagnostic.json), [candidate diagnostic](native-touch-motion-diagnostic/candidate-diagnostic.json). These extra captures are diagnostic evidence, not additional A/A-qualified rows.

Exact `-webkit-tap-highlight-color` for each of `#item-0`, `#item-1`, `#item-2`, `#body`, `#press` is source **`rgba(51, 181, 229, 0.4)`**, candidate **`rgba(0, 0, 0, 0)`**. The differing ancestor rule is Tailwind's `html,:host` declaration at preflight line 50. The source has no matching author declaration. The root owner has been given the selector and values; this audit does not change the base stylesheet.

At rest the selected synthetic `#item-0` computes source `rgb(246, 239, 226)` versus candidate `rgb(14, 11, 11)`. Both have the same class, selection attributes, text and later specimen `.motion-item` color declaration. The difference is the layer precedence described above: source unlayered flow wins, candidate named flow layer loses to the later specimen layer. The diagnostic records the complete five-item color/transition state in each frame. This scope must accompany any label-color claim.

The geometry diagnostic establishes a **rectangle measurement-cadence difference**. Source `morph.js:196` refreshes its cached rectangle when stale by more than 250 ms, near the pointer, held down, or actively wobbling. Candidate `use-morph.ts:124–125` calls `measure()` every frame, including during release, and uses the live transformed rectangle to rebuild the path. The frozen time steps and sampled host transforms agree.

| Observation | Source | Candidate |
| --- | --- | --- |
| Explicit body reads after release at 103128 | Next read at 103384 | Reads every 16 ms |
| Explicit body at 103448 / release+320 ms | viewBox `-13 -13 175 136` | viewBox `-13 -13 176 136` |
| Button release pulse at 104928 | Retains the last measured ~97 px width | Measures the pulsed 92 px width immediately |
| Button at 104944 / release+16 ms | viewBox `-10 -10 117 59` | viewBox `-10 -10 114 58` |

This directly accounts for the two viewBox differences and their paired path fields (four of the six). Two path-only differences occur with equal rounded viewBoxes: explicit body release+16 ms and Button release+320 ms. Each differs in exactly one serialized coordinate by 0.01 px (out of 388 and 602 coordinates respectively). Cached rectangle history also participates in pointer-axis normalization (`morph.js:198,212`; candidate `body.ts`), but those two paths have not been numerically isolated from all timing/history effects. They remain pending a focused check after measurement cadence is aligned. They are not waived. The root's later automatic-radius fix `d8bdae2` is not present in the measured revision; this fixture's captured radius 18 remains below half its pressed height, so the observed cadence difference is separate from that fix.

## Normal-touch follow-up after corrections

Measured revision: `897fda6da174b4fecdd2b5929c87d9d0f913172a`, including cadence/radius checkpoint `f7ee7e0` and scoped native tap-highlight correction `9a9c52f`. Only the two **normal-motion** light/dark rows were rerun, using eight fresh A/A+B/B contexts, 152 frames and 88 PNGs. Reduced rows were not repeated. Raw evidence is separate: [follow-up results](native-touch-motion-normal-followup/results.json), [follow-up summary](native-touch-motion-normal-followup/summary.json).

The follow-up explicitly enables `TOUCH_AUTHORED_PAINT=1` to correct the previously identified specimen-layer interference on **both** sides. It removes exactly six foreground/background declarations: `.motion-item` color/background, the synthetic `:where(.motion-item[aria-selected="true"])` color/background, and `.motion-item.v-btn` color/background. All dimensions, typography, markup, body settings, tap sequence, clock stepping, capture positions and comparison thresholds stay the same. The original receipt is untouched. This restores the authored paint cascade rather than importing styles across sides. The complete fixture hash and measured revision are recorded in each summary.

| Theme | Source A/A | Candidate B/B | Six prior geometry fields | Other cross fields | Nonzero PNG samples | Verdict |
| --- | --- | --- | --- | ---: | ---: | --- |
| Light normal | Stable | Stable | **0 differences** | 38 hidden echo fills | 11/11 | Paint unresolved |
| Dark normal | Final native-active transform differs once | Stable | **0 differences** | 38 hidden echo fills | 2/11 | Source repeat unstable; paint unresolved |

All 56 behavioral-check evaluations pass, with zero page errors. All six former geometry fields match exactly on both themes, including the two previous 0.01 px path-coordinate differences. Every other sampled group/body field also matches across sides except the known 38 hidden echo fills. The dark source repeats disagree only at final Button `transform` (`none` versus `matrix(1,0,0,1,0,1)`), while the candidate repeats agree. This is retained as source-repeat instability, not a candidate failure. All repeat PNG comparisons still have zero canonical-threshold pixels, with raw threshold-0 differences retained.

The source and candidate now show the same blue native tap-highlight color in the release screenshots. The six geometry fields are resolved by the production correction; the fixture paint correction does not change sampled body geometry.

The follow-up is **not a pixel-parity pass**. Remaining pixel differences are in the tab-label area: light rest is 203 pixels, and dark differs in two timed selection samples (112 and 111 pixels). Source and candidate body-release PNGs now align apart from that label area. The initial selected-label layer problem is corrected, but the full source `alive.js:81–153` autonomously stamps `data-ink` onto `.v-tab` based on painted ancestors. The candidate's synthetic Group uses `useFlowGroup` and plain `.v-tab` buttons; it is not the public Tabs implementation and does not reproduce that separate source-wide ink pass. The unselected light labels visibly differ in the screenshots after removal of the fixture color override. That source-wide ink pass is a code-supported explanation to investigate, not an assertion that public Tabs has been tested and fails. No additional fixture recoloring or parity waiver was applied.

Reproduce the bounded follow-up from the worktree with Node 22 using `TOUCH_NORMAL_ONLY=1 TOUCH_AUTHORED_PAINT=1 TOUCH_PROBE_OUTPUT=.work/native-touch-motion-normal-followup node .work/touch-motion-probe.mjs` (prefix the shell invocation with `rtk proxy env`). The probe now records the current git revision automatically. Set `TOUCH_DIAGNOSTIC=1` with a distinct output directory only for a separate read-only two-context measurement trace; that is not an A/A-qualified matrix.

## Coverage limits and cleanup

This covers one horizontal three-item drop group, its interrupted/reversed taps, one explicit pebble body, and one default public Button, in both themes and both motion preferences. It does not cover the other eight characters on touch, six widths, physical iOS/Android hardware, drag, multi-touch, scrolling gestures, native OS behavior, global Off, other component states, or the full 576-row motion matrix. The separate desktop audit owns the nine-character matrix.

No production, reference, base, motion, or canonical gate files were changed. The browser and server were closed; a port-4350 listener check returned no listener. Raw differences and screenshot artifacts remain available locally.
