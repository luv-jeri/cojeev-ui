# Remaining shared-group matrix

2026-09-08. This run covers the remaining 19 shared Flow group scenarios × six widths × two themes = 228 initial comparisons. It excludes the completed nine-character travel and candidate-only behavior subsets. Production/harness sources stay frozen throughout the initial run.

## Result

**209 PASS, 18 FAIL, 1 HARNESS_UNSTABLE; all 228 requested rows completed once.** No production, reference or gate source changed during the run. No case was relabeled, ignored or rerun. The post-run 1,104-file fingerprint exactly matches the pre-run fingerprint.

The three runners have ended (A exit 0, B/C exit 1 for retained nonpassing rows). Each cell below is light / dark; P = PASS, F = FAIL, U = HARNESS_UNSTABLE.

| Scenario | 360 | 390 | 768 | 1024 | 1440 | 1920 |
| --- | --- | --- | --- | --- | --- | --- |
| vertical-stretch | P / P | P / P | P / P | P / P | P / P | P / P |
| vertical-jelly | P / P | P / P | P / P | P / P | P / P | P / P |
| vertical-rubber | P / P | P / P | P / P | P / P | P / P | P / P |
| vertical-pebble | P / P | P / P | P / P | P / P | P / P | P / P |
| group-bar | P / P | P / P | P / P | P / P | P / P | P / P |
| group-radio | P / P | P / P | P / P | P / P | P / P | P / P |
| group-menu | P / P | P / P | P / P | P / P | P / P | P / P |
| group-fields | P / P | P / P | P / P | P / P | P / P | P / P |
| group-stepper | P / P | P / P | P / P | P / P | P / P | P / P |
| group-carousel | P / P | P / P | P / P | P / P | P / P | P / P |
| group-nested | F / F | F / F | F / F | F / F | F / F | F / F |
| group-checkboxes | P / P | P / P | P / P | P / P | P / P | P / P |
| group-no-active | P / P | P / P | P / P | P / P | P / P | P / P |
| group-hidden | P / P | P / P | P / P | P / P | P / P | P / P |
| speed-strength | P / P | U / P | P / P | P / P | P / P | P / P |
| hover-off | P / P | P / P | P / P | P / P | P / P | P / P |
| pinned-character | P / P | P / P | P / P | P / P | P / P | P / P |
| flow-off | P / P | P / P | P / P | P / P | P / P | P / P |
| flow-reduced | F / P | F / P | F / P | F / P | F / P | F / P |

This run retained 912 independent loads, 6,624 cross-state frame pairs and 2,064 cross-image pairs, plus both self comparisons. There were no page errors in any recorded load.

## Deduplicated findings

1. **Nested ownership: 12 FAIL.** Every width/theme has the same 27 missing source `nested-item-0` active-marker fields. Original `reference/sahajiv-handoff-v4/js/flow.js:143` removes every descendant marker when placing the parent, despite the nearest-group item filter at line 93. Production `registry/sahajiv/motion/flow.ts:96–99` removes only markers owned by that group. At visible light-theme widths, the source child label stays dark on its dark pill; candidate label remains cream. All other recorded group geometry/timing is exact. This is a confirmed source defect and an intentional production departure retained from the earlier implementation; the new owner direction now permits fixing source defects.

2. **Reduced labels: 6 light-theme FAIL.** Each has zero recorded group field differences and 203 differing pixels at one selection screenshot: the candidate text color is mid-transition while source text is final. Source `css/base.css:36` forces reduced duration to zero with importance. The synthetic candidate `apps/gate/motion-styles.css:8` imports Flow unlayered, overriding the layered accessibility reset in `styles/base.css:28–29`; the label transition is in `styles/flow-press.css:100`. Actual docs/installed-consumer CSS uses a different, ordered layer cascade. Therefore this result is a harness-scope discrepancy, not yet a confirmed production defect. It will be checked against real Tabs APIs in the next production polish task; no production correction was made solely to satisfy this fixture.

3. **Speed-strength 390 light: 1 HARNESS_UNSTABLE.** Source A/A is exact; candidate B/B differs in 56 hover transform/origin fields over frames 1–14. All nine candidate self images and all source/candidate fields/images are exact. One repeat admitted hover geometry at the origin; the other admitted the completed target at x=111. This is consistent with the known first-clock-admission race (the speed-scaled geometry duration is shorter than the opacity duration), but this specific cause was not probed further. The owner explicitly redirected effort to production polish, so no additional clock probe or recheck was run. This meaningful computed disagreement remains U.

**No new shared-engine production defect is established by this matrix beyond the already known source nested-marker departure.** The reduced-label discrepancy and repeat instability remain scoped as above; no all-green claim is made.

## Frozen scope

Revision `57e85a9f3b5ce58cd58ca6a4b515f24b94b6739b` includes the verified Morph cadence/radius fix and main tap-highlight baseline `9a9c52f`. The pre-run fingerprint of 1,104 files across registry, gate, reference and motion scripts is SHA-256 `c2c39345c1454ece4e30c10eeb5b91cf724df0a314137a6f6c8b8bfeed032afd`; post-run verification is recorded with the final results.

| Partition | Port | Scenarios | Expected rows |
| --- | ---: | --- | ---: |
| A | 4325 | vertical-stretch, vertical-jelly, vertical-rubber, vertical-pebble, group-bar, group-radio | 72 |
| B | 4347 | group-menu, group-fields, group-stepper, group-carousel, group-nested, group-checkboxes | 72 |
| C | 4348 | group-no-active, group-hidden, speed-strength, hover-off, pinned-character, flow-off, flow-reduced | 84 |

Widths: 360, 390, 768, 1024, 1440, 1920. Themes: light and dark. Each partition has its own browser process, server, artifact directory and report. Within every comparison, source/source/candidate/candidate loads remain sequential in independent contexts.

The oracle loads unchanged source JS plus original engine-required fonts/tokens/base/alive/flow styles. This deliberately keeps the same shared-engine scope as the completed travelling-selection matrix; it is not the full component-export cascade. Candidate groups own the production useFlowGroup hook. Identical fixture geometry is applied on both sides. No source fill shim, fabricated measured rectangle, preset body path or native-control replacement is added.

Every side waits for fonts and 1800 ms real settling, rewinds without reseeding and freezes at 100000 ms. Steps advance at most 16 ms and sample around token-derived phase deadlines. Native pointer/focus interactions exercise selection, a longer hop, interrupted reverse, settlement, replacement and hover-off. Hidden groups add a reveal measurement. Computed variables, active markers, phase flags, layer structure, paint and timing must match exactly. Source self, candidate self and cross screenshots all use the same pixelmatch comparator (threshold .1, includeAA:true, zero differing pixels). Raw bytes and threshold-zero pixels remain diagnostics; neither can override a meaningful computed discrepancy.

The original source frozen-timer object cancellation shim remains documented and independently probed by each runner. Meaningful self disagreement stays HARNESS_UNSTABLE, even when screenshots match. The earlier literal-clock admission reproduction remains in `.work/probe-hover-clock.mjs` and `.work/hover-clock-probe.json`; no new source clock probe or recheck was run for this matrix after the owner changed the priority to production polish. Known source nested-group marker removal remains a reported difference pending owner decision, never a waived result or a production change during this run.

## Reproduction and receipts

```sh
rtk proxy env MOTION_CASES=vertical-stretch,vertical-jelly,vertical-rubber,vertical-pebble,group-bar,group-radio MOTION_GATE_PORT=4325 MOTION_GATE_OUTPUT=artifacts/gate-motion-groups-a MOTION_GATE_REPORT=GATE-MOTION-GROUPS-A.md node scripts/gate-motion.mjs
rtk proxy env MOTION_CASES=group-menu,group-fields,group-stepper,group-carousel,group-nested,group-checkboxes MOTION_GATE_PORT=4347 MOTION_GATE_OUTPUT=artifacts/gate-motion-groups-b MOTION_GATE_REPORT=GATE-MOTION-GROUPS-B.md node scripts/gate-motion.mjs
rtk proxy env MOTION_CASES=group-no-active,group-hidden,speed-strength,hover-off,pinned-character,flow-off,flow-reduced MOTION_GATE_PORT=4348 MOTION_GATE_OUTPUT=artifacts/gate-motion-groups-c MOTION_GATE_REPORT=GATE-MOTION-GROUPS-C.md node scripts/gate-motion.mjs
```

Each artifact directory retains its original `results.json`, full recorded states, all source/candidate screenshots and source cancellation probe. The three GATE reports retain every raw row. `.work/group-228-results.json` indexes all initial comparisons without relabeling failures or unstable rows.

This matrix does not resolve pending full-cascade paint policy, Motion Off policy, combined shared-role trajectories or live continuous animation smoothness. The `flow-off` case is the existing selection-character Off setting and is measured as such; it does not authorize a change to Morph Off policy.
