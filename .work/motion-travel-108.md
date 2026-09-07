# Nine-character travelling-selection matrix

Date: 2026-09-08. Scope: the shared production `useFlowGroup` engine and its owned travelling-selection styles, nine characters × six widths × two themes. The original 390px/light-only receipts do not establish this expanded matrix.

## Result

**All 108 unique cases have exact passing receipts.** The initial three-partition matrix produced 106 PASS and two HARNESS_UNSTABLE rows. After a minimal source-clock probe explained the admission race, exactly those two rows passed one sequential recheck with unchanged source, production code, harness and comparator. Initial results remain preserved.

Each width cell is Light / Dark. An asterisk marks the two cases established by that targeted recheck. PASS means exact computed state, zero differing decoded pixels, and stable independent source/source and candidate/candidate repeats.

| Character | 360 | 390 | 768 | 1024 | 1440 | 1920 |
| --- | --- | --- | --- | --- | --- | --- |
| Glide | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Stretch | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Jelly | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Comet | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Drop | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Rubber | PASS / PASS | PASS / PASS | PASS* / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Pebble | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Ripple | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS | PASS / PASS |
| Halo | PASS / PASS | PASS / PASS | PASS* / PASS | PASS / PASS | PASS / PASS | PASS / PASS |

The final unique receipts contain 3,132 recorded cross-state comparisons and 972 cross-image pairs. The initial matrix and two rechecks required 440 independent loads total. No runtime errors or candidate self disagreements occurred.

Raw diagnostics: the two initial source repeats had 4,205 total threshold-zero raw differing pixels and PNG byte disagreements, despite zero pixels under the shared comparator. Their computed-opacity differences correctly prevented a pass. Every final selected receipt has exact raw pixels and byte-stable self repeats as well as zero comparator pixels. All initial cross-state and cross-pixel comparisons were exact.

The post-run 1,104-file fingerprint matches the pre-run SHA-256 exactly. All browser processes have ended; ports 4325/4347/4348 are free.

## Retained instability and minimal proof

Initial Rubber/768/light and Halo/768/light disagree only in source hover-layer opacity at recorded frames 1–8: the first load is 0, while the second is 1 and then fades through .914594 to .197597. Candidate repeats are exact. These remain HARNESS_UNSTABLE in the original partition reports; they were not converted to passes by accepting a style difference.

Source `v.js:83–84` discovers, pauses and assigns an origin to CSS animations only on a V.clock call. Source `flow.js:199–206` starts the hover opacity change on pointerover; `flow.css:104` gives it the .16s `--t-flow-fade-sm` token (`tokens.css:165`). The gate synchronizes pointerdown/up but first clocks a hover transition after a native-frame settling gap. If the transition completes in wall time before that clock call, the clock cannot discover it. This explains the observed admission race under the concurrent run.

`.work/probe-hover-clock.mjs` uses the literal source clock, complete original flow CSS/tokens, a native pointerover and an identical minimal DOM. The sole changed variable is wall time before the first clock call. With no delay, the source yields ghost opacity 0 and remains 0 after pointerdown. With 250ms delay, it yields opacity 1, then exactly .914594 at 15ms after pointerdown—the measured unstable value. Results are retained in `.work/hover-clock-probe.json` and `artifacts/gate-motion-hover-clock-probe.json`. This is a demonstrated clock-instrumentation limitation, not a measured production motion regression.

The two affected cases were run once sequentially with the unchanged full parity protocol in `artifacts/gate-motion-travel-recheck/results.json` and `GATE-MOTION-TRAVEL-RECHECK.md`: both source/candidate repeats stable, no errors, exact state, zero raw/comparator pixels. The source and harness files were not edited. The hover clock-admission race remains a documented harness limitation under delayed scheduling; the targeted passing receipts do not claim that future concurrent runs can never expose it.

## Frozen run

All partitions started from `54b9f4af973e7988f34e5cb4c9517058b64db13a`, which merges the behavior-verdict correction `456c8ee356b621b6b1cb5cb4bee6f5e7be85033f`. That correction does not alter source/candidate parity capture. No production or parity-harness changes were made for this run.

The pre-run fingerprint covers 1,104 files across `registry/sahajiv`, `apps/gate`, the complete immutable handoff directory, and `scripts/gate-motion*.mjs`: SHA-256 `207a5ce7bd61a350b8130cfa1a2d01470a4a50bb7a11223799f29d1702535c13`. The identical post-run fingerprint is recorded in the compact result index.

| Partition | Port | Characters | Expected rows | Artifacts | Runner report |
| --- | ---: | --- | ---: | --- | --- |
| A | 4325 | Glide, Stretch, Jelly | 36 | `artifacts/gate-motion-travel-a` | `GATE-MOTION-TRAVEL-A.md` |
| B | 4347 | Comet, Drop, Rubber | 36 | `artifacts/gate-motion-travel-b` | `GATE-MOTION-TRAVEL-B.md` |
| C | 4348 | Pebble, Ripple, Halo | 36 | `artifacts/gate-motion-travel-c` | `GATE-MOTION-TRAVEL-C.md` |

Each partition runs in an independent browser process. Within each comparison, source/source/candidate/candidate loads remain sequential and use independent fresh contexts. Widths: 360, 390, 768, 1024, 1440, 1920. Themes: light and dark. The group fixture has three selectable targets with varied widths and viewport-dependent spacing. Native hover/click events change the same authored selection attributes on both sides; the candidate owns its group through the production hook.

## Exact verification scope

The source loads original `v.js`, `flow.js`, `morph.js`, `motion.js`, `alive.js`, fonts, tokens, base, alive and flow styles. This is the existing engine-required stylesheet scope, not the complete component export cascade. Candidate engine or paint code is never injected into the oracle. Identical fixture CSS provides only specimen geometry/context.

Every load waits for fonts and 1800ms of real settling, rewinds without reseeding, freezes at 100000ms, and advances at most 16ms per step. It samples immediately before/at/after source-token-derived phase deadlines. Two native frames settle pending DOM/style work before sampling. Pointer and selection events synchronize the frozen clock.

Every row records 29 states and nine screenshots per load. States cover rest; pointer ghost; the selection flight and token-derived phase boundaries; a longer hop; interrupted reverse; settled reverse; same-target replacement; and group hover-off. Comparisons include generated geometry variables, active markers, layer counts, phase classes, transforms, paint, timing, origins and root settings. This does not assert that every continuously rendered frame or every component composition was sampled.

Computed records must agree exactly. Source self, candidate self and cross-image comparisons all use pixelmatch threshold .1 with anti-alias pixels included, requiring zero differing pixels. Raw PNG byte equality and threshold-zero raw pixel counts remain separate diagnostics.

The existing, documented source clock adapter is retained: only frozen timer object handles with numeric `at` and function `fn` are cancelled by replacing their callback; native timer IDs delegate to native clearTimeout. Each runner independently passed the literal-source probe: live cancellation emits `[]`, original frozen cancellation emits `["superseded phase"]`, adapted frozen cancellation emits `[]`. Source `flow.js:79–82` returns frozen object handles and line155 passes them to native clearTimeout, unlike its clearTimer helper. This adapter corrects the frozen-clock mock mismatch without editing source files or changing production cancellation behavior.

## Reproduction

From `.worktrees/motion`, run these in three independent processes:

```sh
rtk proxy env MOTION_CASES=travel-glide,travel-stretch,travel-jelly MOTION_GATE_PORT=4325 MOTION_GATE_OUTPUT=artifacts/gate-motion-travel-a MOTION_GATE_REPORT=GATE-MOTION-TRAVEL-A.md node scripts/gate-motion.mjs
rtk proxy env MOTION_CASES=travel-comet,travel-drop,travel-rubber MOTION_GATE_PORT=4347 MOTION_GATE_OUTPUT=artifacts/gate-motion-travel-b MOTION_GATE_REPORT=GATE-MOTION-TRAVEL-B.md node scripts/gate-motion.mjs
rtk proxy env MOTION_CASES=travel-pebble,travel-ripple,travel-halo MOTION_GATE_PORT=4348 MOTION_GATE_OUTPUT=artifacts/gate-motion-travel-c MOTION_GATE_REPORT=GATE-MOTION-TRAVEL-C.md node scripts/gate-motion.mjs
```

The compact `.work/travel-108-results.json` indexes all 108 initial comparisons and both rechecks, preserving the initial verdicts and linking each complete partition `results.json`. Full source/candidate frame records, repeated-load screenshots and source cancellation probes are preserved in the artifact directories above.

## Remaining boundary

This matrix closes only the nine-character travelling-selection subset. It does not close the full shared-role trajectories, other group shapes, effects, native touch behavior, all component interaction states, or continuous live animation smoothness. No roles, blob-conflict or already-completed candidate behavior checks were repeated here. Full-cascade effects discrepancies remain open and separate. Prior bounded real-pointer frame-rate receipts remain their own evidence.

Targeted recheck command (after all initial partitions ended):

```sh
rtk proxy env MOTION_CASES=travel-rubber,travel-halo MOTION_WIDTHS=768 MOTION_MODES=light MOTION_GATE_PORT=4325 MOTION_GATE_OUTPUT=artifacts/gate-motion-travel-recheck MOTION_GATE_REPORT=GATE-MOTION-TRAVEL-RECHECK.md node scripts/gate-motion.mjs
rtk proxy node .work/probe-hover-clock.mjs
```
