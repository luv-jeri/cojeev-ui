# Morph attachment layout fix

The mobile Motion settings trigger briefly expanded the document after closing its panel. The cause was shared morph attachment, not WebKit animation timing: the hook prepended an SVG before setting its absolute position. Its browser-default 300px intrinsic width plus the button’s 8px flex gap inflated a 112.4375px control to 420.4375px during measurement. The resulting 440px padded SVG remained until the next size correction, and the finite landing transform magnified it.

`registry/sahajiv/motion/use-morph.ts` now positions its newly created SVG absolutely before inserting it. It remains outside the host’s layout from its first measurement. Geometry cadence, two-pass measurement, automatic radius retention, paint, press behavior and CSS overflow rules are unchanged.

## Focused evidence

- Browser: Playwright WebKit, iPhone 13 emulation, 390×844, light, touch, motion enabled. This is Safari-engine evidence, not a physical iPhone claim.
- Actual Button docs: Preview Code → Preview, Motion settings, all nine characters, Activity, Off → On, close. Before: eight false 420.4375px measurements; document width 641px on the first close-animation frame (696px on the preceding open-panel frame). After: no false wide measurement; every one of 94 sampled frames stayed at 390px.
- Actual docs 1440→390 resize: initial sample records the 1440px state; all 91 subsequent mobile frames stayed at 390px.
- Before receipt: `.work/webkit-overflow-before.json`, captured from the live docs server with the pre-fix hook. After/resize: `.work/webkit-overflow-after.json`, `.work/webkit-overflow-resize.json`, worktree 5c6ac71 plus this three-line change. Main’s concurrent panel wrapping correction is independent of the demonstrated intrinsic-width defect.
- Probe: `.work/probe-webkit-morph-overflow.mjs` (requires docs dev on 4356; optional `MORPH_PROBE_URL`). It uses native taps and frame sampling, retains all samples, and asserts close/resize bounds and absence of the false intrinsic measurement.
- Focused registry TypeScript (`npx tsc --noEmit -p .work/tsconfig-multi-select.json`) and `git diff --check`: PASS.

Interactive delivery owns the two final integrated WebKit journeys, including Browse→Getting started. No broad gate repeated here.

The local docs dev server also warned about missing optional Three.js imports in this worktree’s stale dependency install; the Button/Motion route loaded and the measured native journey completed. This receipt does not claim a complete docs build or 3D validation.
