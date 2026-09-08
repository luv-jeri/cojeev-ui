# Living details — local review, 8 September 2026

The latest owner feedback is implemented in the development site at http://127.0.0.1:4320/sahajiv-ui/. This review contains source and documentation changes only. No production build, package installation, commit, push or publication was performed. The public registry payloads remain held for owner approval.

## Result

- Assembly keeps its curved first half. Native background and ink now blend progressively toward the real component endpoint before motion releases it. Rapid replay, theme/palette changes and quiet interruptions preserve usable paint. See `REVIEW-ASSEMBLY-COLOUR-FLOW.md` for the frame-level evidence and precise boundary.
- Profile, task panel, dock, chat, focus session and invitation remain reusable library compositions in `registry/sahajiv/ui/organism-composition.tsx`. Chat uses the native Bubble/BubbleRow/BubbleContent family with its received tail; its send arrow draws on hover/focus and acknowledges a local send. Its custom scrollbar appears only when needed.
- Real single-selection groups use shared Flow: composition chooser, dock, shape/tone choices, motion character, materials and atmosphere. The landing no longer forces local Jelly over the global character. Independent Item task rows receive native press feedback without becoming one mutually exclusive group.
- The hero has fewer foreground objects and more space. Headline, CTA and interactive specimens stop moving once their entrance finishes. Drift and depth are reserved for background decoration. FloatLayer adds `replay`, `revealDuration` and `revealDistance`; repeated viewport entrances are observable while reduced-motion content stays visible.
- ShapeArtwork is a new reusable SVG primitive. Its workbench controls shape, tone, foreground rotation, fill, cast-shadow visibility/direction and rear-outline visibility/angle. Download SVG bakes the current palette and enabled layers; Copy React snippet supplies the same configuration. See `REVIEW-SHAPE-ARTWORK.md` for API and geometry proof.
- Landing prose styles no longer overwrite composition typography and accent contrast. A checked Switch in dark mode now keeps its accent track instead of being covered by the dark resting style.
- The local catalogue and README now show 106 UI entries (66 original +40 additions). Only documentation metadata was regenerated.

## Verification

Final project typecheck and full lint passed. Focused ShapeArtwork export/geometry/escaping tests passed; the two affected documentation examples and four copied snippets compiled without diagnostics. Earlier composition, geometry, palette and depth checks remain recorded separately.

`output/playwright/living-details/review-summary.json` collects the current integration receipts:

- Chromium landing at1440,768,390 and320px: bounds, stable foreground after entrance, visible partial reveal, repeat reset, shared motion setting/native selection and reduced-motion visibility.
- WebKit at390px: the same landing checks; all six composite interactions; rapid target changes; mid-flight quiet cleanup;320px chooser bounds; Focus/Invite documentation routes.
- Workbench at1440/light and390/dark: real shape/tone selection, all three keyboard angle controls, download contents matching native layer transforms/resolved palette, real clipboard React settings, disabled-layer removal and outline-only SVG export. Bounds also checked at320px.
- Assembly colour/flow probe:112 native handoffs, maximum fill/ink channel jump0 at release;14 pointer workflows and12 quiet checkpoints. The dock's composited selected stack differs by at most one channel value. Receipt: `output/playwright/review-assembly-colour-flow/paint.json`.

Screenshots were inspected for the calmer desktop/mobile hero, workbench, native chat tails and dock. Large whole-section captures can contain offscreen reveal states; the viewport/reveal receipts distinguish that capture behavior from what is shown while scrolling. Initial diagnostic failures are retained: the final320px stationary measurement waits for the actual entrance completion rather than a fixed sleep, and quiet visibility allows the intentional translucency of decorative backgrounds.

This is a bounded review of the affected work. It is not a fresh visual audit of all106 entries, a performance benchmark, a physical iPhone test or a release approval.
