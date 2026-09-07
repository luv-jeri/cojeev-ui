# ShapeScene delivery

Implemented an optional real WebGL sculpture in the existing SahaJiv visual family: the authored four-point star, clover, heart, and crescent, rounded extrusion, pink/olive/blue/yellow materials, quiet floating movement, and a warm photographic backdrop. Geometry comes from the actual published Shape SVG data; no external models, images, textures, shaders, or borrowed animation skins are used. The current `lib/shape-data.ts` has 11 exported silhouettes; this release intentionally supports four recognizable names.

## Owned files and integration

- `registry/sahajiv/ui/shape-scene.tsx`: exports `ShapeScene`, `ShapeSceneProps`, and `SceneShape`.
- `registry/sahajiv/styles/shape-scene.css`: all rules scoped to `data-slot=shape-scene` and owned parts, in `sahajiv-components`.
- `components/examples/creative.tsx`: exports `ShapeSceneExample`; one actual sculpture, a Pause/Animate action, and a palette selector. Root can import/extract the single example function as usual.
- Exact locally installed versions: **three 0.185.1**, **@types/three 0.185.4**. Neither package.json nor package-lock.json was modified or staged. Root must add these dependencies and include both in this optional registry entry so TypeScript consumers can resolve the source's type import. No Three dependency belongs in the base registry entry.
- Root-owned work remaining: register `shape-scene`, category `3D` (or `Creative / 3D`), include its CSS sidecar, import the example, add its guide, regenerate registry JSON, and verify the integrated public install. No builder, manifest, index, or docs-shell file was edited here.
- Suggested metadata: title **Shape Scene**; description **A tactile 3D composition made from SahaJiv shapes, with a static fallback and motion preferences built in.** The example includes its own palette/action controls; do not expose unrelated size or variant selectors.

## Public API

```tsx
<ShapeScene
  palette="sahajiv"
  shapes={["star-4", "blob-4", "heart", "crescent"]}
  density="balanced"
  interactive
  animate
  aria-label="A playful arrangement of sculpted shapes"
/>
```

`palette` is `sahajiv | warm | cool` (default `sahajiv`). `shapes` is a readonly array of `star-4 | blob-4 | heart | crescent`; the chosen names cycle through the placements, and an empty array uses the defaults. `density` is `sparse | balanced | full`, rendering 3, 4, or 6 pieces. Both `interactive` and `animate` default to true. Native div props, className, style, and ref are supported. The scene is a named image by default; decorative usage can pass `aria-hidden`. Its aspect ratio reserves layout before JavaScript, with a square mobile composition and a 4:3 desktop composition. It does not displace neighboring content while loading or moving.

`animate=false` stops ambient movement while keeping bounded pointer tilt available. `interactive=false` removes pointer tilt. Global motion Off or OS reduced motion stops both. Touch pointer movement is ignored so page scrolling remains free. The example action labels are **Pause sculpture** and **Animate sculpture**; the palette select has label **Palette** and choices SahaJiv, Warm, Cool.

## Loading and lifecycle

Three.js, SVGLoader, and BufferGeometryUtils are dynamic imports from the optional scene entry. Initialization starts when the scene enters the viewport. The server output contains the real authored Shape composition; it stays visible until the first actual onscreen WebGL frame. A WebGL2 creation failure, context loss, or module/geometry failure retains that composition and displays **3D is unavailable. Showing the static composition.** The root image also exposes that description accessibly.

The renderer caps device pixel ratio at 1.5 and shadow resolution at 1024. It pauses offscreen and when the document is hidden. A still scene schedules no ongoing animation frame; pointer movement requests frames only until elapsed-time damping settles. Off/reduced changes update the existing renderer without creating another context. ResizeObserver updates camera and canvas to preserve the composition inside its container. Unmount cancels frames, disconnects observers, removes listeners, disposes geometries/materials/shadow targets/renderer, releases the WebGL context, and removes the canvas. Late asynchronous imports check disposal before allocating a renderer.

## Focused evidence

Test-first failure was the missing ShapeScene surface. Final `.work/verify-shape-scene.mjs` run: **13 checks PASS in 10.391s**, zero browser page errors. The committed JSON contains timestamps and each assertion. The initial cleanup test was corrected to inspect the detached WebGL context's actual `isContextLost()` state; DOM event bubbling cannot observe a loss event after the canvas has been removed.

- SSR produces four actual Shape masks and no canvas.
- Chromium WebGL draws real geometry; canvas pixels contain nonblank shaded colors.
- DPR cap at 1.5 confirmed with deviceScaleFactor 2.
- Global Off and OS reduced motion stop ongoing draws; Off also prevents pointer frames.
- Offscreen and document-hidden scenes stop draws.
- Animate=false plus interactive=false schedules no continuing frames.
- A still interactive scene responds to pointer movement, then returns to zero ongoing draws.
- Mobile 360 and desktop 1440 captures show all four silhouettes without page overflow; both images were visually inspected.
- Unmount deletes real GPU resources, leaves the actual contexts lost, removes the canvas, and stops drawing.
- A denied WebGL context shows the real Shape fallback and explicit status.
- Focused TypeScript check over all registry sources plus the new example: PASS. ESLint for both new TSX files: zero warnings/errors.

Captures are retained locally at `artifacts/shape-scene/shape-scene-360.png` and `shape-scene-1440.png`. This is a bounded functional/visual check in headless Chromium using SwiftShader, not a hardware GPU benchmark or physical iPhone/Safari claim. No full fidelity matrix was run. The integrated stranger install/build remains root's release gate.

## Guide suggestions and source references

Explain that this is an optional visual composition, not a general scene graph or model viewer. Demonstrate pause, palette, custom shape order, and a still decorative hero. Keep the default next to generous type and simple controls rather than animating page layout. Mention that users without WebGL still receive the authored static artwork, that motion preferences take priority, and that installing this one entry adds Three.js. Avoid unsupported claims about WebGL1: the current renderer requires WebGL2.

Visual reference reviewed: `/Users/sanjaykumar/Documents/Codex/2026-09-05/please-check-this-https-www-behance/outputs/intelly-design-handoff/reference/contact-01.jpg`. It informed the tactile arrangement and warm pastel materials; no pixels or assets were imported.

Primary API references:
- [Three.js ExtrudeGeometry](https://threejs.org/docs/pages/ExtrudeGeometry.html): exact path extrusion and bevel settings.
- [Three.js SVGLoader](https://threejs.org/docs/pages/SVGLoader.html): parse authored SVG paths into geometry shapes.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): WebGL2, pixel ratio, disposal and context release.
- [Rendering on demand](https://threejs.org/manual/en/rendering-on-demand.html): request frames only while something changes.
- [Cleanup](https://threejs.org/manual/en/cleanup.html): explicit geometry/material/GPU cleanup.
