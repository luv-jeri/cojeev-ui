# Morph radius retention and geometry cadence

2026-09-08. Scoped production change: `registry/sahajiv/motion/use-morph.ts`, based on main `d8bdae2`. Public hook/clock signatures, paint policy and Off policy are unchanged.

The automatic finite CSS radius now belongs to the host's decoration lifetime. Internal class/aria/state retunes rebuild the SVG without recapturing the smaller responsive radius. A genuinely removed/disabled decoration or disposed host clears that capture; an explicit `data-r` still wins. Source evidence: original `morph.js:288–298` skips already tagged hosts and retains its captured `data-r` through their state changes.

The frame loop now measures all registered hosts before stepping/writing any body. A host reads its bounding rectangle only when the cache is invalid or older than250ms, the cached pointer is within `tier.R + 40`, the press target is active, the lobe exceeds .02, or jiggle is active. Sizing occurs when rounded dimensions change. This restores the source's cached pressure axis during release instead of measuring the shrinking/recovering transformed host on every frame. Source evidence: `morph.js:196–198` performs separate premeasure and frame passes; line146 updates mesh geometry only through size. ResizeObserver invalidates changed geometry (`morph.js:135–138`); existing shared resize/scroll listeners now invalidate the cache before waking the scoped engine. Rewind invalidates the rectangle/timestamp as in source line49. No synthetic rectangle or path data is used.

## Focused verification

- Actual original ToggleGroup isolation and production candidate, fresh1920×900 reduced-motion contexts, fonts ready +1800ms settle, resize360×900, native first-circle click, pointer moved away. Source/source/candidate/candidate trajectories agree exactly in full SVG path, viewBox, dimensions, CSS radius, aria-pressed and one-body count. At1920 and after360 resize and click, the path starts `M20.00`; aria-pressed changes true→false. Explicit `data-r=7` yields `M7.00`. Separate fresh360 source/candidate hosts begin `M16.00`, proving a new host captures the new radius. Zero runtime errors. Probe: `.work/morph-radius-probe.mjs`; complete records: `artifacts/gate-morph-radius/results.json`.
- Existing `lifecycle` and `media-change` cases at390/light: both PASS in two fresh candidate contexts each. These check StrictMode ownership, retained host/focus, layer repair, last-winner cancellation, unmount/remount, zero owned observers/listeners after unmount, outside-DOM isolation, clock release and a live reduced-motion change during press. Results: `artifacts/gate-morph-cadence-lifecycle/results.json`; report: `GATE-MORPH-CADENCE-LIFECYCLE.md`.
- Scoped TypeScript over registry plus the gate candidate, ESLint for use-morph.ts and `git diff --check`: PASS.

```sh
rtk proxy node .work/morph-radius-probe.mjs
rtk proxy env MOTION_CASES=lifecycle,media-change MOTION_WIDTHS=390 MOTION_MODES=light MOTION_GATE_PORT=4347 MOTION_GATE_OUTPUT=artifacts/gate-morph-cadence-lifecycle MOTION_GATE_REPORT=GATE-MORPH-CADENCE-LIFECYCLE.md node scripts/gate-motion.mjs
rtk proxy npx tsc -p .work/card-badge-tsconfig.json --noEmit
rtk proxy npx eslint registry/sahajiv/motion/use-morph.ts
```

## Native-touch handoff

The composed owner established the release discrepancy with actual rectangle-call traces: source retains the last pressed rectangle until stale, while the previous port read every16ms. Four of six geometry fields were explained by premature resize; two additional path-only fields differ by one .01px serialized coordinate and remain subject to exact recheck. The implementation above is ready for that owner's normal-only light/dark AA/BB follow-up. This checkpoint does not yet claim those six native-touch deltas are closed. No nine-character travelling-selection repeat is needed: that fixture owns Flow and contains no Morph bodies.


## Native-touch follow-up received

The composed owner completed the normal-only light/dark follow-up at integrated revision `897fda6`: all six previously measured geometry differences are now exact in both themes, including the two single-coordinate .01px cases. Candidate repeats agree exactly. Source light repeats agree; source dark retains its separate final native `:active` transform instability. The remaining source/candidate field differences are the 38 previously identified hidden-echo fill values, with fixture/authored label paint accounting for remaining pixels. These are not waived by the geometry result, and this does not claim a complete native-touch visual PASS. Evidence: `.worktrees/composed/.work/native-touch-motion-normal-followup/results.json` (relative to the main checkout). No further Morph source changes were requested from that touch audit.
