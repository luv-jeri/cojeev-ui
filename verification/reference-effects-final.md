# Reference collection: completed local implementation

41 requested references map to 37 distinct component APIs: 35 new entries plus the existing Text Ribbon and Text Reveal. Six reference mappings are reused or consolidated. The catalog now contains 160 UI entries.

## Duplicate decisions

Text Loop, Circular Text and Curved Loop reuse Text Ribbon. Split Text reuses Text Reveal. Text Pressure is Variable Proximity's pressure variant. Clip Path is Image Masking's clip method. Existing Sheet/Dialog primitives provide the semantics beneath Motion Drawer and Linear Modal; the compositions add the missing drag-dismiss and shared-layout behavior.

## Verification

- 82/82 Chromium reference cases: every requested reference at 1440 light and 390 dark/touch, with meaningful controls, paint changes, bounds and dynamic reduced motion.
- Focused WebKit checks passed for SVG typography/tiles and the production dither, portal, modal, image-mask and clip paths.
- 164 unit tests passed. Full ESLint (zero warnings), TypeScript, generated registry and production export passed (170 static pages).
- All 160 default examples and 728 documented variant/size snippets compile independently with installed import paths.
-Fresh shadcn consumer: 160 entries installed, imported, built and loaded; dependency closure and 148 exact CSS files passed. This also exercises selected incumbent consumer interactions; per-reference new behavior was checked in the documentation browser gate.
- Independent reviews completed for the original 28 new entries and latest 7 additions. Material findings were corrected and confirmed with focused regressions.

Browser receipt: `verification/reference-browser-results.json`. Regression receipt: `verification/reference-regressions.json`. Consumer receipt: `verification/reference-consumer-receipt.json`. Screenshots: `output/playwright/reference-effects*`. Fresh consumer: `/tmp/cojeev-reference-consumer-20260909`.

## Landing recommendation

Use existing Text Reveal for the main headline, Scroll Reveal for the narrative, Scroll Expand for the product demonstration, and Accordion Gallery for discovery. Use one Wave Wipe if the story needs a scene bridge. Article Headings suits notes or changelog sections. Portal Field can serve as the one restrained hero background. Keep Swarm Cursor, dense particles, falling words, infinite spirals and textured dissolves in an optional playground with pause controls. Motion Drawer and Linear Modal should support real navigation and component detail; image masks can carry editorial artwork. Support links must lead to a real caller destination.

The effects are original Cojeev adaptations, with renderer/interaction differences from their references documented per implementation report. The local Swarm Cursor is repaired and verified; no upstream website was modified. No publication, commit or push was performed. A type-only annotation repair in the existing reporting XHR wrapper was needed to clear the production build.

## Every reference

| Reference | Component / variant | Category | Decision | Browser |
|---|---|---|---|---|
| [Typography Vortex](https://threeui.com/text-animation/typography-vortex) | typography-vortex | Typography | New | desktop + mobile pass |
| [Text Loop](https://www.reactbits.dev/text-animations/text-loop) | text-ribbon / loop | Typography | Reused / consolidated | desktop + mobile pass |
| [Particle Text](https://www.reactbits.dev/text-animations/particle-text) | particle-text | Typography | New | desktop + mobile pass |
| [Warp Text](https://www.reactbits.dev/text-animations/warp-text) | warp-text | Typography | New | desktop + mobile pass |
| [Split Text](https://www.reactbits.dev/text-animations/split-text) | text-reveal | Typography | Reused / consolidated | desktop + mobile pass |
| [Circular Text](https://www.reactbits.dev/text-animations/circular-text) | text-ribbon / circle | Typography | Reused / consolidated | desktop + mobile pass |
| [Text Pressure](https://www.reactbits.dev/text-animations/text-pressure) | variable-proximity / pressure | Typography | Reused / consolidated | desktop + mobile pass |
| [Curved Loop](https://www.reactbits.dev/text-animations/curved-loop) | text-ribbon / arch | Typography | Reused / consolidated | desktop + mobile pass |
| [Falling Text](https://www.reactbits.dev/text-animations/falling-text) | falling-text | Typography | New | desktop + mobile pass |
| [Scroll Reveal](https://www.reactbits.dev/text-animations/scroll-reveal) | scroll-reveal | Typography | New | desktop + mobile pass |
| [Variable Proximity](https://www.reactbits.dev/text-animations/variable-proximity) | variable-proximity | Typography | New | desktop + mobile pass |
| [Word Stream](https://remocn.dev/docs/typography/word-stream) | word-stream | Typography | New | desktop + mobile pass |
| [Caret Swap](https://remocn.dev/docs/typography/caret-swap) | caret-swap | Typography | New | desktop + mobile pass |
| [Zoom Words](https://remocn.dev/docs/typography/zoom-words) | zoom-words | Typography | New | desktop + mobile pass |
| [Scroll Expand](https://www.reactbits.dev/animations/scroll-expand) | scroll-expand | Effects | New | desktop + mobile pass |
| [Ripple Distortion](https://www.reactbits.dev/animations/ripple-distortion) | ripple-distortion | Effects | New | desktop + mobile pass |
| [Elastic Mesh](https://www.reactbits.dev/animations/elastic-mesh) | elastic-mesh | Effects | New | desktop + mobile pass |
| [Swarm Cursor](https://www.reactbits.dev/animations/swarm-cursor) | swarm-cursor | Effects | New | desktop + mobile pass |
| [Pixel Swap](https://www.reactbits.dev/animations/pixel-swap) | pixel-swap | Effects | New | desktop + mobile pass |
| [Orbit Images](https://www.reactbits.dev/animations/orbit-images) | orbit-images | Creative | New | desktop + mobile pass |
| [Target Cursor](https://www.reactbits.dev/animations/target-cursor) | target-cursor | Effects | New | desktop + mobile pass |
| [Magic Rings](https://www.reactbits.dev/animations/magic-rings) | magic-rings | Backgrounds | New | desktop + mobile pass |
| [Ghost Cursor](https://www.reactbits.dev/animations/ghost-cursor) | ghost-cursor | Effects | New | desktop + mobile pass |
| [Click Spark](https://www.reactbits.dev/animations/click-spark) | click-spark | Effects | New | desktop + mobile pass |
| [Strands](https://www.reactbits.dev/animations/strands) | strands | Backgrounds | New | desktop + mobile pass |
| [Image Trail](https://www.reactbits.dev/animations/image-trail) | image-trail | Effects | New | desktop + mobile pass |
| [Meta Balls](https://www.reactbits.dev/animations/meta-balls) | meta-balls | Backgrounds | New | desktop + mobile pass |
| [Infinite Spiral](https://www.reactbits.dev/components/infinite-spiral) | infinite-spiral | Creative | New | desktop + mobile pass |
| [Accordion Gallery](https://www.reactbits.dev/components/accordion-gallery) | accordion-gallery | Creative | New | desktop + mobile pass |
| [Option Wheel](https://www.reactbits.dev/components/option-wheel) | option-wheel | Forms | New | desktop + mobile pass |
| [Grain Dissolve](https://remocn.dev/docs/transitions/grain-dissolve) | grain-dissolve | Effects | New | desktop + mobile pass |
| [Wave Wipe](https://remocn.dev/docs/transitions/wave-wipe) | wave-wipe | Effects | New | desktop + mobile pass |
| [Dither Dissolve](https://remocn.dev/docs/transitions/dither-dissolve) | dither-dissolve | Effects | New | desktop + mobile pass |
| [Portal Field](https://threeui.com/backgrounds/portal-field) | portal-field | Backgrounds | New | desktop + mobile pass |
| [Article Headings](https://threeui.com/text-animation/article-headings) | article-headings | Typography | New | desktop + mobile pass |
| [Motion Drawer](https://www.ui-layouts.com/components/motion-drawer) | motion-drawer | Layout | New | desktop + mobile pass |
| [Linear Modal](https://www.ui-layouts.com/components/linear-modal) | linear-modal | Layout | New | desktop + mobile pass |
| [Image Masking](https://www.ui-layouts.com/components/image-masking) | image-masking | Creative | New | desktop + mobile pass |
| [Clip Path](https://www.ui-layouts.com/components/clip-path) | image-masking / clip | Creative | Reused / consolidated | desktop + mobile pass |
| [Buy Me Coffee](https://www.ui-layouts.com/components/buy-me-coffee) | buy-me-coffee | Actions | New | desktop + mobile pass |
| [Swapy](https://www.ui-layouts.com/components/swapy) | swapy | Layout | New | desktop + mobile pass |
