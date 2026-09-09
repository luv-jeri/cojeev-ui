# Original material sculptures

Glass Sculpture, Flow Sculpture and Particle Sculpture are three distinct original 3D components. Their source concepts were individually inspected and their native useful cores are implemented and verified. Exact Canvas renderer, source API and visual parity are **false**. No restricted rendering code or source artwork was copied or translated. Canvas is MIT + Commons Clause; the Cojeev implementation uses original geometry, algorithms and procedural patterns with the existing MIT-licensed Three dependency.

## Per-entry result

| Source | Native component | Useful core | Deliberate limits |
| --- | --- | --- | --- |
| [Glass Object](https://canvasui.dev/docs/components/glass-object) | `GlassSculpture` | A real triangle mesh transmits and refracts an original procedural studio, with frost, volume thickness and color dispersion. | Only its own ribbons/petals/tiles backdrop; no arbitrary DOM, source photo/video, full lighting/material suite or WebGPU parity. |
| [Liquid Object](https://canvasui.dev/docs/components/liquid-object) | `FlowSculpture` | A pointer-stirred screen-space velocity field advects, distorts and separates colors from a separately rendered 3D mesh, then dissipates. | A bounded original dissipative field, not a full Navier-Stokes simulation. No source splash/ripple/grain/studio/geometry-wobble parity or HTML capture. |
| [Particle Object](https://canvasui.dev/docs/components/particle-object) | `ParticleSculpture` | Area-sampled mesh points visibly leave the surface under pointer repulsion or a pulse, then spring back. | 300–8,000 points; no source point-size variance, ambient drift, material/studio breadth or WebGPU parity. |

The [public observation receipt](receipts/material-source-observations.json) records individual rendering, pointer and control results. Those screenshots were viewed inline; no new public screenshot files were saved. Native screenshots below are separately generated evidence. Source demos did not receive a mobile, reduced-motion, context-loss or broad accessibility audit in this slice.

## API and shared geometry

All three accept `form` (bloom/seed/pebble), `tone` (sky/rose/moss/ink), `geometry`, `turn`, `pitch`, `zoom`, `speed`, `paused`, `pointerTracking`, `onGeometryError`, ordinary div props and a composed React 19 div `ref`. `onRendererChange` reports `pending`, `webgl`, `fallback` or `error` so examples can disable effects that need a working renderer. Invalid geometry has a visible error and is never silently replaced with a built-in shape.

| Component | Additional props and supported ranges |
| --- | --- |
| Glass | `refraction` 1–2.2; `frost` 0–0.8; `thickness` 0.1–3; `dispersion` 0–2; `studio` ribbons/petals/tiles. Pointer-following is opt-in. |
| Flow | `distortion` 0–2; `chromatic` 0–1; `spread` 0.035–0.3; `settle` 0.25–3; `swirl` 0–1; `pulse` changes trigger a stir while active. |
| Particle | `count` 300–8,000; `size` 1–6 CSS pixels; `strength` 0–2; `radius` 0.1–0.8 object units; `spring` 0.25–3; `damping` 0.25–2; `swirl` 0–1; `pulse` changes trigger outward velocity while active. |

Use existing `SculptureOrbit` for explicit mouse orbit, horizontal touch orbit, keyboard arrow/zoom controls and semantic buttons. Those controls remain available when ambient motion is off. The examples add native pause, material sliders, form/tone selectors, file input, status and pulse buttons. They observe the public sculpture ref and its `data-moving` activity state, so copied examples do not import a private motion hook. Flow and Particle depend on Glass's shared stage/style registry entry; no additional package is required.

The existing geometry and file adapters are unchanged. Supported local inputs remain normalized triangle geometry, self-contained uncompressed GLB 2.0 geometry, bounded filled SVG, PNG and JPEG luminance relief. Imports retain the previous valid shape on failure and can be cancelled or replaced. Limits remain 8 MiB file size, four million image pixels, 128 KiB SVG, 16,000 vertices and 20,000 triangles. External glTF references, animation, compression, asset textures/material preservation and arbitrary URL intake remain unsupported. [Exact input limits and prior loader validation](object-treatments-result.md).

## Implementation and performance boundaries

New native files are `registry/cojeev/ui/{glass,flow,particle}-sculpture.tsx`, the shared `lib/sculpture-stage.tsx` / `sculpture-renderer.tsx`, original `sculpture-flow.ts` / `sculpture-particles.ts`, `sculpture-stage-geometry.ts`, and `styles/glass-sculpture.css`. Native examples live in `components/examples/material-sculptures.tsx`.

The scene lazily initializes Three when visible. Backing dimensions are at most 2,048 per axis, one million pixels total, and DPR 1.5. The field is capped at 96 × 72 cells (80 × 60 by default); point arrays are capped at 8,000. Frames target at most 30 Hz. Pointer work is scoped to the stage and does not capture page scroll. These are resource limits, not a guaranteed frame rate on every device.

Pause, reduced motion, Motion Off, Flow Off, offscreen and hidden document states suspend GPU submissions. Quiet modes clear residual field/spring displacement; pause freezes it. Geometry-derived server/static print previews remain usable before initialization, without WebGL and after context loss. Manual orbit can update the still view. WebGL capability can recover after a context-restoration event. Fallback is a print treatment of the same geometry, not a fake glass/fluid simulation.

Allocation ownership now covers setup failures, including errors before the renderer API has been returned. Resource replacement keeps a connected canvas context while releasing its old scene; detached canvases lose their owned context. This fixed imports failing after a geometry swap. Callback refs attach and clean up correctly. Point size applies DPR once.

No batch3 sculpture helper, loader, orbit or existing print algorithm was changed.

## Native verification

- **Seven focused tests:** physics bounds, neutral field encoding, visible impulse evolution and return, deterministic surface sampling, particle stability, geometry winding/pixel budgets, SSR previews and invalid geometry.
- **15 browser rows:** each component in Chromium 1200/light, Chromium 390/dark and WebKit 390/light, plus each component with no GPU and each composed ref lifecycle. No page errors. Desktop rows exercise pause/resume, keyboard orbit and material settings, pointer input, Motion Off/Flow Off/reduced preference, offscreen suspension, simulated hidden state, SVG/GLB/non-square PNG replacement, failed-import retention, palette repaint, real WebGL loss/restoration, and unmount/remount. Mobile rows check responsive geometry/controls and keyboard parity.
- **Three direct renderer rows:** glass IOR and frost visibly change transmitted pixels; flow and particle impulses visibly change the surface; both return exactly to their starting rendered image after settling at a fixed view. Pointer response and manual orbit are independently measured. A controlled geometry-setup exception disposes the tracked geometry and releases the real WebGL context for every material.
- **Three real Chromium touch rows:** paused sculptures visibly rotate under sideways native touch, pointer capture clears, and vertical touch scrolls the page. These are browser-device emulations, not a physical phone or WebKit touch-drag certification.
- **Final example portability follow-up:** all ten copied material variants compile with zero TypeScript diagnostics. Three focused browser rows verify public activity observation, pulse activation, pause/Motion Off/Flow Off disabling and clean unmount. The 15-row full matrix preceded this example-only correction; native renderer/helpers were unchanged.
- **Forced-color follow-up:** all three GPU canvases hide and their geometry previews remain visible using the normal CSS cascade. Motion Off, Flow Off and reduced motion still stop GPU submissions; leaving forced colors restores the material. All 39 material CSS declarations parse without importance flags. [Focused results](../../../output/playwright/expansion/materials/forced-colors-audit.json).
- Isolated TypeScript: zero diagnostics. Targeted ESLint: clean.

[Browser rows](../../../output/playwright/expansion/materials/browser-audit.json), [direct renderer differences](../../../output/playwright/expansion/materials/engine-audit.json), [native touch results](../../../output/playwright/expansion/materials/touch-audit.json), [exact file hashes and checks](receipts/material-sculptures-handoff.json).

All nine responsive native screenshots were visually inspected. Representative final evidence: [glass on dark mobile](../../../output/playwright/expansion/materials/chromium-mobile-dark-glass.png), [flow on light mobile](../../../output/playwright/expansion/materials/webkit-mobile-light-flow.png), [particle on desktop](../../../output/playwright/expansion/materials/particle-desktop-final.png), [displaced particles](../../../output/playwright/expansion/materials/particle-pulse.png), [flow impulse](../../../output/playwright/expansion/materials/flow-pulse.png), [glass refraction](../../../output/playwright/expansion/materials/glass-refracted.png).

No dependency installation, production build, commit, push or publication. Root owns metadata, routes and documentation integration. The live review routes are `/docs/glass-sculpture/`, `/docs/flow-sculpture/` and `/docs/particle-sculpture/`; this result does not claim release readiness or source-equivalent completion.
