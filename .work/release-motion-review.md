# Bounded effects and optional Three release review

Reviewed checkpoint `429a49a`: `AnimatedNumber`, `TextReveal`, `use-motion-visibility`, `ShapeScene`, their corresponding styles, registry builder dependency treatment and generated entries. Scope was concrete lifecycle/SSR/Off/user-visible defects, not a broad style or source-fidelity audit.

## Concrete findings and confirmation

1. **AnimatedNumber forwarded ref was discarded.** Native span props accepted a ref, but the internal host ref overwrote it. Real Chromium rendered the component while the supplied ref stayed null. Root fixed ref composition in `900cc9e`; focused confirmation resolves the external ref to the rendered element (`animated-number.tsx:52`).
2. **TextReveal duration zero still staggered hidden words.** Setting `duration={0}` created zero-duration animations with backward fill and 28–420 ms delays; later words computed opacity zero during those delays. Root's `900cc9e` exits before scheduling animations when normalized milliseconds are zero (`text-reveal.tsx:28`). Confirmation observed zero animations and all words visible.
3. **AnimatedNumber represented an invalid reading as zero.** `value={NaN}` displayed `0`. Root's `900cc9e` renders an em dash by default with an optional fallback (`animated-number.tsx:13,24,31`). Confirmation observed `—`.

Proof and confirmation used isolated Playwright Chromium and an in-memory esbuild bundle importing the actual main source components. No production/reference files or shared server processes were changed. Raw receipts: `.work/effects-release-review-proof.json` and `.work/effects-release-review-confirmation.json`. The latter explicitly records revision `900cc9e`.

## Bounded source review with no additional concrete finding

`use-motion-visibility.ts:5–29` uses a static server snapshot, subscribes to live reduced-motion/visibility/settings changes, and disconnects its observer/listeners. AnimatedNumber cancels its scheduled frame and presents the current value while quiet. TextReveal cancels its active word animations when the effect is cleaned up, leaving readable underlying text. No additional concrete bug was established in these paths during this review.

`shape-scene.tsx:57–218` gates initialization on intersection, lazily imports Three, stops frame requests when hidden/offscreen, keeps quiet mode static, and disposes geometries/materials/shadow maps/renderer/context on teardown or fallback. Its initial render is a deterministic authored static composition. This is a bounded source lifecycle review; it is not proof of every GPU/browser context-loss scenario or physical mobile behavior.

The generated ShapeScene registry item declares Three and its type package only for the optional entry; base, AnimatedNumber, and TextReveal do not pull Three. ShapeScene imports Three dynamically after it becomes visible. No additional dependency-treatment issue found.

No production changes were made for this read-only review. The separately authorized Card/Bubble CSS correction has its own report.
