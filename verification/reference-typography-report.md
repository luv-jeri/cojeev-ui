# Reference typography implementation report

Scope: 14 requested references audited against the active dirty checkout. Nine new components; four references reuse existing components; Text Pressure is a variant of Variable Proximity. No dependency installation, shared registry edits, staging, commits or unrelated file changes were performed by this task.

## Duplicate audit and source observations

| Reference | Decision | Existing coverage and source observation |
|---|---|---|
| [Typography Vortex](https://threeui.com/text-animation/typography-vortex) | new | Concentric bitmap rings, pointer dissolution and click suction in ThreeUI TypographyVortexRenderer. SVG glyph rings retain the vortex and pointer lens; dust is bounded and suction recenters the rings rather than reproducing the upstream bitmap renderer. |
| [Text Loop](https://www.reactbits.dev/text-animations/text-loop) | reused → `text-ribbon` | React Bits TextLoop measures an SVG path and repeats text over it. Already implemented by TextRibbon shapes and measurement; no new alias component. |
| [Particle Text](https://www.reactbits.dev/text-animations/particle-text) | new | React Bits ParticleText samples canvas alpha, gathers points and adds local pointer repulsion. Canvas sampling is capped by stage size and sample step. DOM text stays in the accessibility tree; fallback is visible during stillness. |
| [Warp Text](https://www.reactbits.dev/text-animations/warp-text) | new | React Bits WarpText warps a raster text texture using fragment-shader FBM. Uses SVG fractal-noise displacement over actual wrapping DOM text rather than WebGL FBM; no exact shader-fidelity claim. |
| [Split Text](https://www.reactbits.dev/text-animations/split-text) | reused → `text-reveal` | React Bits SplitText uses GSAP split units and scroll-triggered entrance. Existing TextReveal already supplies grapheme, word and measured line splits and multiple reveal treatments. |
| [Circular Text](https://www.reactbits.dev/text-animations/circular-text) | reused → `text-ribbon` | React Bits CircularText positions glyphs in a circle and animates rotation with hover speed changes. TextRibbon circle provides the same readable circular travel and hover controls. It travels text on a measured circle rather than manually placing equal-width glyphs. |
| [Text Pressure](https://www.reactbits.dev/text-animations/text-pressure) | variant → `variable-proximity` | React Bits TextPressure interpolates per-letter wght, wdth and optional ital axes from pointer distance. Consolidated into VariableProximity pressure variant. Uses only shipped Bricolage axes wght 200–800 and wdth 75–100; no Roboto import or simulated italic. |
| [Curved Loop](https://www.reactbits.dev/text-animations/curved-loop) | reused → `text-ribbon` | React Bits CurvedLoop uses measured textPath offsets and drag velocity. Existing TextRibbon arch, curvature, drag inertia, arrows and Home already cover the mechanism. |
| [Falling Text](https://www.reactbits.dev/text-animations/falling-text) | new | React Bits FallingText creates Matter.js word bodies, walls, gravity and pointer constraints. Original bounded rectangle physics, at most 80 words, finite 4.2-second settling. No word dragging or full rigid-body rotational solver. |
| [Scroll Reveal](https://www.reactbits.dev/text-animations/scroll-reveal) | new | React Bits ScrollReveal scrubs rotation, opacity and blur using GSAP ScrollTrigger. Native scroll listener scoped to the selected target, or controlled 0–1 progress. Existing TextReveal is a one-shot entrance and does not cover this mechanism. |
| [Variable Proximity](https://www.reactbits.dev/text-animations/variable-proximity) | new | React Bits VariableProximity parses variable axes and interpolates them by per-letter distance. Local event-driven interpolation of supported Bricolage wght and wdth axes; does not accept arbitrary fonts or axis strings. |
| [Word Stream](https://remocn.dev/docs/typography/word-stream) | new | Remocn WordStream schedules pipe-separated phrases, per-word reveals, entry drift and accelerated exit. Native finite clock with wrapping phrases. The original is a Remotion frame sequence and assumes one unwrapped video line. WordRelay alone lacks this horizontal stream mechanism. |
| [Caret Swap](https://remocn.dev/docs/typography/caret-swap) | new | Remocn CaretSwap expands right-to-left, collapses, then accelerates typing into replacement text. Native finite clock, full measured footprint and stable accessible target. Existing WritingCaret only blinks and does not implement the phrase exchange. |
| [Zoom Words](https://remocn.dev/docs/typography/zoom-words) | new | Remocn ZoomWords reveals an enlarged line while the camera follows its write head. Measures real DOM word widths rather than estimated character widths; still mode restores the complete wrapping sentence. |

Semantic Bloom is **not** Typography Vortex. `docs/semantic-bloom.md` explicitly attributes the former to ThreeUI `/text-animation/semantic-bloom`. Its implementation draws liquid particles/joins around DOM words; the vortex reference creates nested rotating glyph rings with dissolution and suction. Glyph Sculpture and Particle Sculpture sample 3D surfaces, not text glyph alpha masks. Word Relay exchanges phrases vertically, not horizontal narrative tracking. Writing Caret is a decorative blink, not phrase consumption and typing.

## External source evidence

- React Bits: inspected actual TypeScript source under `https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/ts-default/TextAnimations/<Name>/<Name>.tsx` for TextLoop, ParticleText, WarpText, SplitText, CircularText, TextPressure, CurvedLoop, FallingText, ScrollReveal, VariableProximity.
- ThreeUI: inspected `https://github.com/MengTo/threeui/blob/main/src/shaders/typography-vortex/typographyVortexRenderer.ts` and the component boundary.
- Remocn: inspected the live Word Stream, Caret Swap and Zoom Words documentation and downloadable registry source at `https://remocn.dev/r/<id>.json`. Their original animation clock comes from Remotion video frames.
- Local reference downloads were kept under `/tmp`; implementation is original code, not copied upstream source. This report claims mechanism-level adaptation, not pixel fidelity or live-browser comparison against the upstream demos.

## Delivered API and integration

New named exports: `TypographyVortex`, `ParticleText`, `WarpText`, `VariableProximity`, `FallingText`, `ScrollReveal`, `WordStream`, `CaretSwap`, `ZoomWords`. Each lives at its corresponding `registry/cojeev/ui/<id>.tsx` with matching CSS. Shared unique helpers: `registry/cojeev/lib/reference-text-math.ts` and `reference-text-motion.ts`.

All nine stages expose `data-slot`, `data-size`, and `data-running`; finite scenes additionally expose `data-state`. The shared motion visibility hook gates hidden tabs, reduced motion, global motion/flow off, offscreen stages and per-component pause. The clock cancels requestAnimationFrame on interruption and caps time deltas. Variable Proximity schedules only local pointer-event paints. Scroll Reveal listens only while active and supports an explicit controlled `progress` value.

`components/examples/reference-typography.tsx` exports all 14 PascalCase Example functions. Reused-reference examples directly compose TextRibbon/TextReveal and do not install new aliases. Pause/Replay controls use the existing Button; Vortex has a separate finite Gather rings control; Scroll Reveal has native-scroll and controlled-range variants.

Metadata: `verification/reference-typography.json` contains all 14 mappings and landing guidance. Root owns catalog, registry, CSS imports, dependency closure, build, and browser acceptance.

## Landing recommendations

Use existing Text Reveal / Split Text once for the hero. Use Scroll Reveal for the narrative with conservative blur. If a ribbon is desired, choose one Text Ribbon treatment: loop band, circle seal, or draggable arch. Do not stack multiple marquee treatments. Reserve particles, vortex, pressure, warp, falling words, word streams, caret swaps and zoom tracking for optional specimens or occasional secondary scenes. Every entry has explicit placement guidance in the metadata.

## Verification

- `node --import tsx --test tests/reference-typography.test.ts`: **7/7 passed**. Covers grapheme segmentation, finite/clamped values, caret readable endpoints and grapheme-safe typing, falling-body bounds after suspension, scroll reveal endpoints, all-nine server-rendered readable still states, and pressure axis bounds.
- Initial focused run failed because the new math module did not yet exist; the implemented contract tests then passed. SSR assertions were added after component implementation as regression verification.
- `npx tsc --noEmit --incremental false`: **passed** before the final small pointer-coordinate/theme fixes. Root is running final integration typecheck.
- No standalone browser acceptance claimed by this subtask. Root owns real desktop/mobile rendering, pointer and keyboard controls, quiet settings, theme behavior and generated registry payload checks.

## Honest implementation limits

- Vortex uses vector glyph rings and bounded dust dots. The pointer lens dissolves locally; Gather rings performs a finite center contraction. It does not recreate all bitmap-stray/dust physics in ThreeUI.
- Warp Text uses SVG fractal-noise displacement of wrapping DOM text rather than the upstream WebGL FBM shader. Safari rendering must be verified during browser acceptance.
- Particle Text samples the shipped font, wraps phrases, caps sample surface and sample density, and preserves DOM text. The active pointer-ready stage draws continuously until paused/offscreen; the user has adjacent pause controls. Theme changes rebuild its ink.
- Falling Text has real gravity, wall bounds and rectangle collisions, finite 4.2-second settling and an 80-word animation limit. It does not implement drag constraints, rotation or a complete rigid-body solver. Very crowded stages require visual acceptance.
- Variable Proximity supports the actual shipped Bricolage wght 200–800 and wdth 75–100 axes. It intentionally does not load a foreign font, arbitrary font axes or synthetic italics. Touch retains a readable still specimen and page scrolling.
- Finite Remocn-inspired scenes use native requestAnimationFrame time. Pausing exposes complete readable text; resuming continues the bounded scene. Zoom Words intentionally clips its enlarged moving line, with complete content available semantically and visibly in still mode.
- The reference-facing TextRibbon/TextReveal examples inherit the existing primitives’ lifecycle and keyboard contracts. No duplicate component aliases remain.
