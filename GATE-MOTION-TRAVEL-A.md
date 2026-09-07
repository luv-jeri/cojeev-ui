# Shared motion gate

Full manifest: **48 scenarios × 6 viewports × 2 themes = 576 rows**. This run selected **36 rows** and completed **36: 36 PASS, 0 unresolved**. A bounded run does not close the full matrix or any of the 542 base-component isolation rows.

Run with `node scripts/gate-motion.mjs` after `npm ci`. It starts its own Vite server on port4325, uses production hooks and styles in the candidate, and loads unchanged reference scripts independently. `MOTION_CASES`, `MOTION_WIDTHS`, `MOTION_MODES`, and `MOTION_GATE_PORT` select a diagnostic subset; `MOTION_FAIL_FAST=1` stops at the first unresolved row. Any unresolved row makes the command exit nonzero. Coordinate browser ownership with the main gate.

Each parity row uses sequential source/source/candidate/candidate loads. Both sides wait for fonts.ready and1800ms of real settling, retain html[data-seed="42"], rewind morph without reseeding, then freeze at100000ms before interaction. Pending DOM/resize/style work settles across two native frames before each sample. Identical absolute clock steps advance at most16ms at a time, including samples immediately before/at/after token-derived phase deadlines. Input events synchronize the current frozen time so a fresh release animation cannot advance on wall time before the next recorded sample.

Exact serialized geometry, generated variables, phase flags and computed paint/timing must agree. Decoded screenshot comparison uses the existing gate comparator: pixelmatch threshold0.1, includeAA=true, with zero differing pixels required. Self and cross comparisons use that same comparator. Encoded PNG hashes and threshold0 raw pixel counts remain diagnostics. Source MOTION.md:74–76 explicitly excludes subpixel rasterization from its byte-identical geometry contract.

The only source timer adapter intercepts clearTimeout(object) when the object has numeric at and function fn. It replaces that callback with a no-op; all native timer IDs delegate unchanged. Original flow.js:79–82 returns object handles under its frozen clock, but line155 passes them to clearTimeout rather than clearTimer. The literal-source probe records native cancellation [], original frozen ["superseded phase"], and adapted frozen []. It runs before the gate and writes source-cancellation-probe.json. This repairs the reference clock mock; it does not change the source files or production cancellation semantics.

The `blob-effects` family isolates the original engine-required token/base/alive/flow styles and original JS so sheen/grain/color attributes can be judged independently. `full-export-effects` loads the complete original vriksha.css entry, including legacy aliases, shapes, patterns and composites. The September 8 follow-up reproduced the full-entry conflict: components-2.css:460 and483 override SVG path fills, including echo, sheen, grain and data-colors. Original morph.js:53,107 and its color painting specify the intended attributes; ADJUSTER.md:35 documents working textures/colors. The owner has been asked whether exported appearance or documented effects should define this baseline. No difference is accepted while that answer is pending, and no fill shim or copied candidate paint is inserted into the oracle.

Role fixtures are wired to the full original vriksha.css entry; the retained bounded diagnostic used the component-cascade subset described above and original alive.js, supplying the creature renderer omitted from isolation loader pages. Source and candidate SMIL timelines are explicitly paused and stepped because V.clock owns Web Animations only. The combined morph+release/surface role trajectory remains unresolved: its self checks expose transform-dependent geometry/raster timing, and source hidden echo paint differs under the full cascade. See effects-and-roles.json from the bounded diagnostic. It is not counted as a role fidelity pass.

Behavior rows run twice in fresh candidate contexts. Runtime errors and disagreement between repeated checks block a pass; both check arrays are retained. These are candidate behavior assertions, not source-versus-candidate paint comparisons. They exercise StrictMode, host/focus retention, React child replacement, latest-winner cancellation, cleanup of generated DOM, zero remaining owned observers/shared listeners after the last unmount, remount, clock release, storage/root/group synchronization, authored-profile retention, subtree Off/re-enable and a live reduced-motion change during press/flight. Visibility behavior uses a simulated document.hidden event; it does not claim native background-tab throttling coverage. Adjuster rows exercise export/import, the spinner14% conversion, atomic visible errors, category preservation, reset isolation and narrow bounds.

Remaining: the full six-width/light-dark matrix; stable combined shared-role parity for all nine characters; a native touch-media trajectory; source nested-group marker cleanup (the source parent removes a nested group’s active marker while candidate preserves nearest-group ownership); complete cross-surface keyboard activation-origin coverage; and integrated all66 component/registry-install validation owned by the main task. Fixture availability is not verification.

Selected cases: travel-glide, travel-stretch, travel-jelly. Widths: 360, 390, 768, 1024, 1440, 1920. Themes: light, dark.

| Scenario | Width | Theme | Verdict | Source self | Candidate self | Cross fields | Nonzero pixel samples |
| --- | ---: | --- | --- | --- | --- | ---: | ---: |
| travel-glide | 360 | light | PASS | true | true | 0 | 0 |
| travel-glide | 360 | dark | PASS | true | true | 0 | 0 |
| travel-glide | 390 | light | PASS | true | true | 0 | 0 |
| travel-glide | 390 | dark | PASS | true | true | 0 | 0 |
| travel-glide | 768 | light | PASS | true | true | 0 | 0 |
| travel-glide | 768 | dark | PASS | true | true | 0 | 0 |
| travel-glide | 1024 | light | PASS | true | true | 0 | 0 |
| travel-glide | 1024 | dark | PASS | true | true | 0 | 0 |
| travel-glide | 1440 | light | PASS | true | true | 0 | 0 |
| travel-glide | 1440 | dark | PASS | true | true | 0 | 0 |
| travel-glide | 1920 | light | PASS | true | true | 0 | 0 |
| travel-glide | 1920 | dark | PASS | true | true | 0 | 0 |
| travel-stretch | 360 | light | PASS | true | true | 0 | 0 |
| travel-stretch | 360 | dark | PASS | true | true | 0 | 0 |
| travel-stretch | 390 | light | PASS | true | true | 0 | 0 |
| travel-stretch | 390 | dark | PASS | true | true | 0 | 0 |
| travel-stretch | 768 | light | PASS | true | true | 0 | 0 |
| travel-stretch | 768 | dark | PASS | true | true | 0 | 0 |
| travel-stretch | 1024 | light | PASS | true | true | 0 | 0 |
| travel-stretch | 1024 | dark | PASS | true | true | 0 | 0 |
| travel-stretch | 1440 | light | PASS | true | true | 0 | 0 |
| travel-stretch | 1440 | dark | PASS | true | true | 0 | 0 |
| travel-stretch | 1920 | light | PASS | true | true | 0 | 0 |
| travel-stretch | 1920 | dark | PASS | true | true | 0 | 0 |
| travel-jelly | 360 | light | PASS | true | true | 0 | 0 |
| travel-jelly | 360 | dark | PASS | true | true | 0 | 0 |
| travel-jelly | 390 | light | PASS | true | true | 0 | 0 |
| travel-jelly | 390 | dark | PASS | true | true | 0 | 0 |
| travel-jelly | 768 | light | PASS | true | true | 0 | 0 |
| travel-jelly | 768 | dark | PASS | true | true | 0 | 0 |
| travel-jelly | 1024 | light | PASS | true | true | 0 | 0 |
| travel-jelly | 1024 | dark | PASS | true | true | 0 | 0 |
| travel-jelly | 1440 | light | PASS | true | true | 0 | 0 |
| travel-jelly | 1440 | dark | PASS | true | true | 0 | 0 |
| travel-jelly | 1920 | light | PASS | true | true | 0 | 0 |
| travel-jelly | 1920 | dark | PASS | true | true | 0 | 0 |

The raw results and PNGs are in artifacts/gate-motion-travel-a in the worktree where the command ran. MOTION_GATE_OUTPUT and MOTION_GATE_REPORT select distinct artifact destinations for bounded checks. All public production hook signatures remain unchanged.
