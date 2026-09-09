# Semantic Bloom

## Design and implementation plan

The first version follows the user's requested close adaptation: retain the ThreeUI particle organism, cursor attraction, text attraction, liquid joins and roaming movement. Apply Cojeev's warm paper, precise ink, Bricolage Grotesque and paired accent colors. Keep the original source and runnable baseline in `reference/semantic-bloom`.

1. Preserve the public MIT source and verify the standalone focused baseline. Source SHA-256 matches the live source panel.
2. Add a deterministic, fixed-step particle engine in `registry/cojeev/lib/bloom-engine.ts`; test attraction, bounded input, pause, repeatability and refresh-rate independence.
3. Add `registry/cojeev/ui/semantic-bloom.tsx` and its CSS. The React boundary owns local coordinates, observers, text, unique SVG filter IDs, accessible stillness and disposal. Retain the source force defaults and filter pipeline.
4. Add a library example with text, palette, pause/replay, gather/scatter and advanced physics/edge controls. Register in the catalog, source manifest and CSS imports; generate installable payloads.
5. Run focused tests, typecheck, lint and example-source checks. Inspect the real desktop/mobile, light/dark and reduced-motion demo, pointer and keyboard controls; record limits honestly.

No new runtime dependency is needed. The component ships through the Cojeev registry with its engine, styles, example, documentation and attribution.

## Scope

One reusable component, three palette presets (signature, memory, together), with one consistent motion engine. A cosmetic ink tone is also available. These presets do not imply a connected agent, real progress, memory retrieval or task completion.

## Use in the application

```tsx
import { SemanticBloom } from "@/registry/cojeev/ui/semantic-bloom";

<SemanticBloom text="Cojeev" tone="signature" />
<SemanticBloom text="Ideas find each other" tone="together"
  physics={{ particleCount: 60, speed: 0.8, pointerAttraction: 1.2 }}
  softness={10} edgeTexture={16} />
```

The library imports `registry/cojeev/styles/semantic-bloom.css` alongside shared tokens. For an external app, use the generated `public/r/semantic-bloom.json` registry entry, which includes the component, engine, styles and shared foundation dependency.

All 15 numeric controls are available in the live example's “Tune the motion and edges” disclosure. `controlsRef` exposes `gather()`, `scatter()` and `reset()`. A paused or quiet Gather settles immediately, including when speed is zero.

## Extension directions

Future application integrations can connect gather/scatter and pause to real lifecycle events, replace text with explicit task labels, or use `onWordActive` for optional highlights. A future progress API must accept actual application progress; it must not infer completion from decorative particles. An agent network could expose accessible node selection separately from the canvas. Keep the close-adaptation preset as a stable comparison point when exploring those variations.

## Attribution

Adapted from [ThreeUI Semantic Bloom](https://threeui.com/text-animation/semantic-bloom), [MengTo/threeui](https://github.com/MengTo/threeui/tree/68802d5428071ada5c20db8094b1649e6bb770ed/src/shaders/semantic-bloom), MIT, copyright 2026 Meng To. The license accompanies the reference and the copied engine so installed components retain it.

## Fidelity

Source-based native adaptation, not a pixel-identical replay. The original source uses random per-display-frame updates and an iframe. This version uses seeded fixed 60Hz simulation, native React, container coordinates, theme tokens, readable foregrounds, aggregated word activation and lifecycle suspension. The source's unused viscosity and repel settings are not exposed as nonfunctional controls.

## Verification

See `reference/semantic-bloom/qa-report.md` for observed browser checks, commands and explicit limits.
