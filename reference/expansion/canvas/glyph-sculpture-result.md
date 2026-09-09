# Glyph Sculpture result

Implemented on 2026-09-08 from high-level public behavior and the original Cojeev DESIGN.md. All rendering math and geometry in this slice are independently authored. No new dependency, external model, texture, copied shader, build, install, commit, push, or publication. Root owns registry, guide, global CSS and example index integration.

## Delivered files and API

- `registry/cojeev/ui/glyph-sculpture.tsx`: `GlyphSculpture`, `GlyphSculptureProps`, `GlyphForm`, `GlyphTone`.
- `registry/cojeev/lib/glyph-sculpture.ts`: organic parametric geometry, depth-tested triangle rasterizer, finite options and grid sizing, deterministic glyph text.
- `registry/cojeev/styles/glyph-sculpture.css`: intrinsic responsive sizing, theme ink, transparent canvas and still glyph fallback.
- `components/examples/glyph-sculpture.tsx`: `GlyphSculptureExample`; variants default/bloom, seed, pebble. Only native Card, Button, ToggleGroup, Label, Slider, Switch and Typography controls.
- `tests/glyph-sculpture.test.ts`: finite budgets, distinct true 3D shading and deterministic server-rendered fallback.

| Prop | Default | Contract |
| --- | --- | --- |
| `form` | `bloom` | `bloom`, `seed`, `pebble`; original organic geometry |
| `tone` | `rose` | `ink`, `rose`, `moss`, `sky`; palette mixed with theme ink |
| `cellSize` | 10 | CSS pixels, clamped 7–20; grows automatically to respect grid budget |
| `speed` | 1 | Clamped 0–3; zero still |
| `turn` | 0 | Explicit degrees -180–180; works when paused or reduced motion |
| `pointerTracking` | false | Passive hover tilt within the sculpture bounds; does not capture input |
| `paused` | false | Freezes idle motion and pointer response |

Ordinary div attributes/className/style are supported; children/ref are excluded. Component is decorative (`aria-hidden`, `inert`, `pointer-events:none`). Put meaningful copy beside the art on a solid native surface. Native turn controls provide a deliberate keyboard route; decorative hover tracking is optional.

The CPU mesh is 64 by 32 segments, projected into at most 140 by 90 glyph cells. A smooth normal and depth buffer control real font glyphs, with transparent space around the silhouette. It does not paint a generic gradient or use a static bitmap as the live object. The renderer runs at most 30 frames per second with DPR capped at two and a 1.5 million backing-pixel budget. It observes shared `useMotionVisibility`, document visibility, resize and appearance changes. Paused explicit prop/theme/resize changes repaint once. Cleanup cancels frames, removes all registered listeners/observers, and releases the canvas backing store. Canvas loss events reveal the still field and restoration requests a fresh frame; actual hardware context loss was not tested.

## Focused verification

Three unit/SSR tests pass via `node --import tsx --test tests/glyph-sculpture.test.ts`. Targeted ESLint passes for the helper, component, example and tests. No broad production build was run. Root performs source extraction/type/registry checks.

[24 browser assertions](receipts/glyph-lifecycle-results.json) pass in a StrictMode Vite fixture: actual `fillText` calls using nine distinct non-space characters, changing idle bitmap, inert decoration, pause with exact stable draw counts, keyboard turn and character-size changes while paused, all three forms, live ink/theme repaint, system reduce, Motion Off, Flow Off, offscreen stop/resume, simulated hidden document, 390px bounds, capped DPR, unmount and remount. [Harness](receipts/glyph-lifecycle-code.txt), [output](receipts/glyph-lifecycle-output.txt).

[Pointer checks](receipts/glyph-pointer-results.json) use identical deterministic draw timestamps with native pointer events: opposite pointer positions produce identical glyph bitmaps when tracking is off; enabling tracking produces different sculpture orientations. This isolates the pointer effect from idle rocking. The prior 24 checks use normal real browser animation timing.

The no-canvas test replaced `getContext("2d")` with null before mounting: renderer=fallback, visible nonempty glyph pre, 1364 trimmed characters, no 390px page overflow. [Fallback screenshot](receipts/glyph-fallback-mobile.png).

The live integrated route `http://127.0.0.1:4320/cojeev-ui/docs/glyph-sculpture/` renders `canvas2d`. A fresh reload had zero console errors, with 390px scrollWidth/clientWidth both 390. Concurrent AnimatedIcon edits had caused transient HMR dependency-array warnings before the reload; none returned on fresh load. The Next development portal is present normally and its presence was not treated as an error. The integrated dark check switched root appearance tokens and fired the appearance event; the native example theme fixture separately proves paused repaint.

Inspected screenshots:

- [Desktop light bloom](receipts/glyph-initial-light.png), [seed](receipts/glyph-seed-light.png), [pebble](receipts/glyph-pebble-light.png).
- [Desktop dark](receipts/glyph-desktop-dark.png), [mobile light](receipts/glyph-mobile-light.png), [mobile dark](receipts/glyph-mobile-dark.png).
- [No-canvas mobile](receipts/glyph-fallback-mobile.png), [pointer orientation](receipts/glyph-pointer-right.png).
- [Integrated docs desktop](receipts/glyph-docs-desktop.png), [integrated mobile light](receipts/glyph-docs-mobile-light.png), [integrated mobile dark](receipts/glyph-docs-mobile-dark.png).

Limitations: natural OS backgrounding remains unverified; document visibility was exercised through an explicitly simulated visibility event. No actual Canvas2D hardware context loss or cross-browser matrix was run. The fallback is a fixed-resolution original glyph field; cell size affects the live renderer only.

## Public-core comparison

Canvas ASCII Object was individually rendered and interacted with: actual asset glyphs, orbit drag, and Digits selection. Glyph Sculpture implements the original shaded-3D-to-glyph core using builtin organic meshes and a density ramp. It does not implement arbitrary model/SVG/image intake, measured glyph-shape edge matching, Canvas studio materials, orbit dragging, zoom, or HTML refraction. The source coverage row stays partial and `verifiedEquivalent:false`. Canvas source is restricted by MIT + Commons Clause; none was ported into production.
