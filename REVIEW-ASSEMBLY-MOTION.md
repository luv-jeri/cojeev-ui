# Assembly choreography correction

The profile appearance remains unchanged. This work owns motion and studio controls only; composition layout/data and stage-height changes belong to the composition stream.

## Behavior

One Motion progress driver coordinates each persistent native root's position, width, height, rotation, contour and content reveal. Travel lasts 1.35 seconds by default, follows a bounded curved path and includes a small initial shape compression. The existing per-part delay produces a staggered gather. Labels begin appearing during the final third of travel; roots remain inert and hidden from accessibility until their native arrival completes. Root opacity stays intact throughout.

Each new transition reads current Motion values, so replay and rapid selection interrupt from the current geometry. A single clip MotionValue remains bound through travel, release and quiet interruptions. All old writers stop before the value is cleared; queued callbacks are guarded against writing after cancellation. The effect does not restart when consumer callback identity changes.

The Replay hold is 1.55 seconds to allow the slower scatter to become visible before gathering again. With six choices the toolbar deliberately becomes a three-column, two-row group below 480px; Arrow keys, Home and End use the current catalogue count.

## API

Existing AssemblyPart props remain compatible. Added optional fields:

- `curve?: number`: curved travel strength, clamped to 0–1; default `.65`.
- `onProgress?: (progress: number) => void`: normalized travel progress for consumer coordination.

- `transitionKey?: string`: explicit composition identity for reused parts with otherwise identical geometry. The composition supplies its existing target key.

Existing `duration`, `delay`, `from`, `fromContour`, `release` and `onRest` remain the integration points. No new component ID or dependency is introduced.

## Files and proof

- [assembly-part.tsx](registry/sahajiv/ui/assembly-part.tsx)
- [assembly-part.css](registry/sahajiv/styles/assembly-part.css)
- [organism-assembly.tsx](registry/sahajiv/ui/organism-assembly.tsx)
- [organism-assembly.css](registry/sahajiv/styles/organism-assembly.css)
- [check-assembly-transition.mjs](scripts/check-assembly-transition.mjs)

Owned-source ESLint passes. The earlier focused quiet correction passed 24 Chromium samples at390px in light/dark, including rapid Profile→Replay→Chat and delayed observations after Off/reduced. The inherited ScrollArea inset shadow was removed only in the local chat composition and verified as no shadow/zero border before its source ownership transferred.

The new choreography probe checks partial content reveal while inert, curved native geometry and the same quiet interruption sequence without taking screenshots. It uses the existing local dev server and writes `output/playwright/review-assembly-redesign/transition-interruption.json`.

```sh
rtk proxy node scripts/check-assembly-transition.mjs
```

The initial probe encountered a temporary integration compile failure while new composition exports were being written; no animation claim is based on that run. Final choreography confirmation now passes; root's bounded visual review is tracked separately. No build, registry generation, installation or publication occurred.

## Final focused confirmation

The final Chromium probe passed at390px in light and dark: curved native travel, gradual content opacity while inert, guarded label entry during rapid switching, and24 immediate/delayed Off/reduced samples. Released parts retain no clip or assembly rotation. The result is in `output/playwright/review-assembly-redesign/transition-interruption.json`.

The probe exposed and corrected a retained inline rotation during a reduced-motion interruption. Assembly rotation now uses a separate CSS `rotate` property driven by a custom Motion value and applied only during travel; native `transform` remains available to the control. A focused native-feedback confirmation recorded empty clipping, computed rotation `none`, a changed native SVG contour and native press scale `0.987067, 0.993533` on the released Follow button (`native-feedback.json` beside the transition receipt).

Travel entry is prepared in layout phase by updating its native content-reveal flag before paint. Gradual visual reveal stays separate from accessibility/inert release. No React state-in-effect suppression is used. The final owned-source ESLint check and scoped TypeScript import-graph check both pass.
