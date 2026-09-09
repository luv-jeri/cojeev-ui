# Partial morph-family baseline capture

**Stopped at the owner’s request: 39/60 comparisons complete — 8 PASS, 31 FAIL, 0 self-unstable rows.** The remaining 21 comparisons were not completed. The owner changed the goal to production refinement and requested stopping repeated known-source failures. These are historical baseline verdicts; no result has been waived or rewritten as a pass.

Measured revision: `e29d0f665c09d8bb5a685237a2e91cfa970c6901`. The SHA256 lock of 1106 input files was unchanged when stopped (combined digest `e0157383dec529c9731158878817d3bbde85747da541305c09c52863a8dd2cdc`). Port 4350 and the owned Chromium browser were closed. This run changed no production, reference, or gate files.

## Scope and protocol

Five scenarios were selected at 360, 390, 768, 1024, 1440 and 1920 px, light/dark. `full-export-effects` loads the entire unchanged original `vriksha.css`; `blob-effects`, `blob-reduced`, `categories` and `morph-off` retain the canonical engine-isolation fonts/tokens/base/alive/flow stack. Candidate hooks and production styles load independently. This distinction is intentional and material to the findings.

Each completed comparison loads source A/A and candidate B/B in fresh isolated Chromium contexts: fonts plus 1800 ms settle, seed 42, one rewind, frozen clock 100000, steps at most 16 ms. Each context records 13 states: rest, five reach samples, inside, press, release, cards-enabled, tier-change, resize, and theme change. Seven PNG samples use pixelmatch threshold 0.1 with antialiasing included; zero differing pixels and exact sampled-field equality are required. Raw threshold-0 pixels and repeat evidence remain retained. The source cancellation adapter self-check passed.

The 39 completed comparisons represent 156 complete contexts, 2,028 sampled frames and 1,092 PNG captures. No completed row had a page error or self-instability. The raw runner recorded 18 browser-closed ERROR rows while SIGINT shut it down, then exited 130; three further rows were never recorded. Those 21 entries have no valid comparison and are labeled not measured below. The raw errors are retained in the artifact rather than mistaken for product defects.

## Findings

- **Blob effects:** all six light rows pass. All six dark rows have zero sampled-field differences but three failing PNGs, confined to `#cat-skeleton::after`. At 360 dark the nonzero bounds are inside `[24,299,40,335]`, press `[44,298,85,337]`, release `[97,298,123,337]`. Engine-isolation source omits the complete-entry dark shimmer override at `reference/cojeev-handoff-v4/css/components-2.css:985`, whereas production retains it in `registry/cojeev/styles/skeleton.css:11`. This is a stylesheet-scope difference; these rows are not evidence of a new geometry bug. Their FAIL verdicts remain.
- **Full-export effects:** all twelve rows fail with exactly 147 fill fields and seven pixel samples. Every differing field is an SVG path fill. Source `components-2.css:460` overrides echo, sheen, grain and animated color fills. No geometry difference was found. The full original entry was preserved; no paint shim was inserted. This was owner-pending during the captured baseline and is now historical evidence for the newly authorized refinement goal.
- **Reduced blob:** all twelve rows are stable but fail with 76 fields and four pixel samples. Thirteen differences are a genuine candidate spinner issue present from rest: both sides author `--mfill:#F5B8DB`, but source computes `rgb(245,184,219)` while candidate substitutes the first animation color `rgb(233,162,195)`. Source `morph.js:229` updates color only outside reduced motion; candidate writes the first color at static time zero. This is separate from the previously approved reduced-motion body-press exception. The other 63 differences concern body transform, path, echo/overlay paths, dots and viewBox from the press frame onward; their raw trace is retained without broadening that exception.
- **Categories:** 360 light and 390 light pass; 360 dark has zero field differences and the same three isolated Skeleton shimmer samples. Remaining category widths/themes were not completed.
- **Morph Off:** none of its twelve comparisons completed in this run. Earlier Off findings are not relabeled as fresh width coverage.

The parent assigned a separate production fix for reduced spinner fill and robust Motion Off after this receipt. That implementation and its focused validation are not part of this baseline capture.

## Per-row coverage

| Scenario | Width | Theme | Result | Source self | Candidate self | Fields | Pixel samples |
| --- | ---: | --- | --- | --- | --- | ---: | ---: |
| blob-effects | 360 | light | PASS | True | True | 0 | 0 |
| blob-effects | 360 | dark | FAIL | True | True | 0 | 3 |
| blob-effects | 390 | light | PASS | True | True | 0 | 0 |
| blob-effects | 390 | dark | FAIL | True | True | 0 | 3 |
| blob-effects | 768 | light | PASS | True | True | 0 | 0 |
| blob-effects | 768 | dark | FAIL | True | True | 0 | 3 |
| blob-effects | 1024 | light | PASS | True | True | 0 | 0 |
| blob-effects | 1024 | dark | FAIL | True | True | 0 | 3 |
| blob-effects | 1440 | light | PASS | True | True | 0 | 0 |
| blob-effects | 1440 | dark | FAIL | True | True | 0 | 3 |
| blob-effects | 1920 | light | PASS | True | True | 0 | 0 |
| blob-effects | 1920 | dark | FAIL | True | True | 0 | 3 |
| full-export-effects | 360 | light | FAIL | True | True | 147 | 7 |
| full-export-effects | 360 | dark | FAIL | True | True | 147 | 7 |
| full-export-effects | 390 | light | FAIL | True | True | 147 | 7 |
| full-export-effects | 390 | dark | FAIL | True | True | 147 | 7 |
| full-export-effects | 768 | light | FAIL | True | True | 147 | 7 |
| full-export-effects | 768 | dark | FAIL | True | True | 147 | 7 |
| full-export-effects | 1024 | light | FAIL | True | True | 147 | 7 |
| full-export-effects | 1024 | dark | FAIL | True | True | 147 | 7 |
| full-export-effects | 1440 | light | FAIL | True | True | 147 | 7 |
| full-export-effects | 1440 | dark | FAIL | True | True | 147 | 7 |
| full-export-effects | 1920 | light | FAIL | True | True | 147 | 7 |
| full-export-effects | 1920 | dark | FAIL | True | True | 147 | 7 |
| blob-reduced | 360 | light | FAIL | True | True | 76 | 4 |
| blob-reduced | 360 | dark | FAIL | True | True | 76 | 4 |
| blob-reduced | 390 | light | FAIL | True | True | 76 | 4 |
| blob-reduced | 390 | dark | FAIL | True | True | 76 | 4 |
| blob-reduced | 768 | light | FAIL | True | True | 76 | 4 |
| blob-reduced | 768 | dark | FAIL | True | True | 76 | 4 |
| blob-reduced | 1024 | light | FAIL | True | True | 76 | 4 |
| blob-reduced | 1024 | dark | FAIL | True | True | 76 | 4 |
| blob-reduced | 1440 | light | FAIL | True | True | 76 | 4 |
| blob-reduced | 1440 | dark | FAIL | True | True | 76 | 4 |
| blob-reduced | 1920 | light | FAIL | True | True | 76 | 4 |
| blob-reduced | 1920 | dark | FAIL | True | True | 76 | 4 |
| categories | 360 | light | PASS | True | True | 0 | 0 |
| categories | 360 | dark | FAIL | True | True | 0 | 3 |
| categories | 390 | light | PASS | True | True | 0 | 0 |
| categories | 390 | dark | Not measured — owner stop | — | — | — | — |
| categories | 768 | light | Not measured — owner stop | — | — | — | — |
| categories | 768 | dark | Not measured — owner stop | — | — | — | — |
| categories | 1024 | light | Not measured — owner stop | — | — | — | — |
| categories | 1024 | dark | Not measured — owner stop | — | — | — | — |
| categories | 1440 | light | Not measured — owner stop | — | — | — | — |
| categories | 1440 | dark | Not measured — owner stop | — | — | — | — |
| categories | 1920 | light | Not measured — owner stop | — | — | — | — |
| categories | 1920 | dark | Not measured — owner stop | — | — | — | — |
| morph-off | 360 | light | Not measured — owner stop | — | — | — | — |
| morph-off | 360 | dark | Not measured — owner stop | — | — | — | — |
| morph-off | 390 | light | Not measured — owner stop | — | — | — | — |
| morph-off | 390 | dark | Not measured — owner stop | — | — | — | — |
| morph-off | 768 | light | Not measured — owner stop | — | — | — | — |
| morph-off | 768 | dark | Not measured — owner stop | — | — | — | — |
| morph-off | 1024 | light | Not measured — owner stop | — | — | — | — |
| morph-off | 1024 | dark | Not measured — owner stop | — | — | — | — |
| morph-off | 1440 | light | Not measured — owner stop | — | — | — | — |
| morph-off | 1440 | dark | Not measured — owner stop | — | — | — | — |
| morph-off | 1920 | light | Not measured — owner stop | — | — | — | — |
| morph-off | 1920 | dark | Not measured — owner stop | — | — | — | — |

## Evidence

- Raw results and all captured PNGs: `artifacts/gate-motion-morph-60/`. The raw results retain the shutdown errors.
- Machine receipt: `.work/morph-family-60-receipt.json`; original input file lock: `.work/morph-family-60-lock.json`.
- Command: `rtk proxy env MOTION_CASES=blob-effects,full-export-effects,blob-reduced,categories,morph-off MOTION_GATE_PORT=4350 MOTION_GATE_OUTPUT=artifacts/gate-motion-morph-60 MOTION_GATE_REPORT=GATE-MOTION-MORPH-60.md node scripts/gate-motion.mjs` (Node 22).

This partial result does not close the full 576-row shared-motion matrix, component isolation coverage, or physical/native-touch coverage. The independent bounded native-touch report remains separate.
