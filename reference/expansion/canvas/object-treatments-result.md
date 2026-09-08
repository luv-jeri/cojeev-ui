# Original object print treatments

Updated 2026-09-08. This extends the [initial Glyph Sculpture slice](glyph-sculpture-result.md) with practical geometry intake, reusable orbit controls, and two additional print treatments. All implementation math and rendering here are independently authored. Canvas UI remains a behavior reference; its restricted renderer code and demo assets are not redistributed or ported.

## Per-source result

| Canonical source | Public inspection in this slice | SahaJiv implementation | Coverage judgment |
| --- | --- | --- | --- |
| [ASCII Object](https://canvasui.dev/docs/components/ascii-object) | The live duck consisted of glyphs. Dragging changed its visible face; Full → Digits changed the character repertoire. Public options/docs were read. | `GlyphSculpture` uses actual triangle depth and shaded normals, three character sets, directional contour marks, fitted custom geometry and `SculptureOrbit`. | Partial original adaptation. Geometry intake, orbit and zoom now work. Measured glyph-template matching remains unimplemented; directional contour marks are a simpler algorithm. |
| [Dithered Object](https://canvasui.dev/docs/components/dithered-object) | The live duck used shaded dots. Bayer → Halftone changed the print pattern; dragging exposed its opposite face. Other public options were read, not all exercised. | `DitherSculpture`: ordered Bayer thresholds, clustered halftone, Floyd-style error diffusion, and deterministic stipple share the actual depth-tested 3D surface. | Useful core verified. Original algorithms reproduce the useful geometry-to-print role; source API, studio materials, renderer and exact visual parity are not claimed. |
| [Ink Object](https://canvasui.dev/docs/components/ink-object) | The live duck used light-dependent ink lines. Line spacing 8 → 9 and angle 0 → 1 visibly changed marks; dragging exposed a different face. Other options were read, not all exercised. | `InkSculpture`: hatch, crosshatch and contour treatments use surface depth, shaded normals, line spacing, angle, density and depth relief. | Useful core verified. The native implementation has three original line treatments; full source bleed/grain/studio controls and exact visual parity are not claimed. |

The three live references were individually inspected through the native browser and their screenshots were viewed inline. This turn did not save new reference screenshot files; observations are recorded in `receipts/object-treatments-handoff.json`. Earlier ASCII screenshots remain in `receipts/ascii-object-*.png`. No new detailed engine inspection is claimed, and the inventory's engine-inspection count remains three.

## Native APIs

The native files are under `registry/sahajiv/`:

- `ui/glyph-sculpture.tsx`: `GlyphSculpture`, common `SculptureSurface`, and geometry/import helper exports.
- `ui/dither-sculpture.tsx`: `DitherSculpture` and `DitherPattern`.
- `ui/ink-sculpture.tsx`: `InkSculpture` and `InkTreatment`.
- `ui/sculpture-orbit.tsx`: `SculptureOrbit`, `SculptureView`, `normalizeSculptureView`.
- `lib/sculpture-geometry.ts`: validated immutable geometry and sampled pixel relief.
- `lib/sculpture-loaders.tsx`: local file intake. The `.tsx` location deliberately lets the registry dependency scanner include the optional Three SVG dependency when the object component is installed.
- `lib/sculpture-raster.ts`: shared 3D projection, depth, normal lighting, adaptive sampling, glyphs and print algorithms.
- `styles/glyph-sculpture.css` and `styles/sculpture-orbit.css`: native surfaces, themed print, errors, fallback and orbit controls. Dither and Ink obtain the shared surface CSS through their Glyph Sculpture registry dependency.

Common props: `form="bloom" | "seed" | "pebble"`, `tone="rose" | "ink" | "moss" | "sky"`, immutable `geometry`, `turn` (−180…180°), `pitch` (−80…80°), `zoom` (0.6…1.15), `speed` (0…3), `pointerTracking=false`, `paused=false`, and `onGeometryError`. Root div attributes and sizing styles are accepted. Invalid geometry exposes a visible status instead of silently substituting a built-in shape.

`GlyphSculpture` adds `cellSize` (7…20 px), `glyphSet="density" | "digits" | "letters"`, and `edgeMatching=true`. Edge matching means directional contour-gradient marks in the density set; it does not mean measured font-template matching.

`DitherSculpture` adds `pattern="ordered" | "halftone" | "diffusion" | "stipple"`, `grainSize` (1.5…9 px), and `density` (0.5…1.6).

`InkSculpture` adds `treatment="hatch" | "crosshatch" | "contour"`, `markSize` (4…16), `density` (0.5…1.6), `angle` (−180…180°), and `relief` (0…1). Contour uses depth rings; angle and relief apply to hatch/crosshatch only. The example disables those controls for contour.

`SculptureOrbit` accepts controlled `value` or uncontrolled `defaultValue`, `onValueChange`, `disabled`, `label`, and render-prop children receiving `{ turn, pitch, zoom, interacting }`. It has native turn/tilt/reset buttons and a zoom slider. Arrow keys rotate; Shift increases the step; `+` / `−` zoom and Home resets. Mouse dragging rotates two axes. Horizontal touch turns the object while vertical touch remains page scrolling. Use `paused={paused || interacting}` on the child to let direct manipulation take priority over ambient rotation.

## Supported local geometry

`SculptureGeometryInput` supplies positions and optional triangle indices/normals as array-like numeric data. Intake validates finite values and index bounds, copies caller data, recenters and fits a unit sphere, and computes normals if omitted. Limits are 16,000 vertices and 20,000 triangles. The public geometry value should be treated as immutable; replace it to update the sculpture.

`loadSculptureFile(blob, { signal })` sniffs a local Blob. It never fetches URLs or decoder assets. Supported exact formats:

| Format | Supported useful subset | Limits and explicit exclusions |
| --- | --- | --- |
| GLB 2.0 | One embedded binary buffer; Float32 positions, unsigned indices, triangle primitives, multiple mesh nodes, matrix/TRS transforms and interleaved attributes. Recomputed normals and native ink replace original materials. | Under 8 MiB, metadata at most 1 MiB, 32 meshes, 128 nodes and the shared geometry caps. Rejects external image/buffer URIs, required extensions/compression, sparse/normalized accessors, skinning, morph targets and non-triangle primitives. No `.gltf` sidecars, Draco or model animation. |
| SVG | Closed filled paths and simple shape elements become shallow extrusions through Three's SVG loader and extrusion utility. | Under 128 KB, 64 elements/shapes, at most 6,000 path-command tokens and roughly 1,300 sampled contour points. No text/images/masks/references/scripts. Contour complexity is checked before extrusion allocation. |
| PNG/JPEG | Alpha-aware luminance relief, fitted to the original image aspect ratio. | Under 8 MiB and four million source pixels; sampled canvas at most 144×144 and geometry grid at most 72×72. Dimensions are checked before decode, bitmap and scratch canvas released afterward. No WebP/GIF/AVIF or retained image texture/material. |

`sculptureFromGLB`, browser-only `sculptureFromSVG`, `sculptureFromPixels`, and `sculptureGeometry` are also exported separately. SVG and file imports accept an abort signal. Examples abort stale/replaced/unmounted jobs and retain the last successful sculpture on import failure. Synchronous bounded geometry work cannot be interrupted midway through one JavaScript task.

## Rendering and interaction contract

All three treatments share actual projected triangles, z-buffer coverage and smooth normal lighting. The print is not a static image or a generic shader painted inside a mask. Native Canvas 2D is used, without HTML-in-canvas, WebGPU or required GPU support. The default seed/bloom/pebble meshes and fixture assets are original.

The frame rate is capped at about 30 fps, backing surfaces at 1.5 million pixels/DPR 2/2,048 pixels per dimension, and raster grids at 280×220. Estimated triangle-cell work over 350,000 visits triggers coarser sampling before rasterization, then a bounded upsample. This keeps repeated overlapping geometry from making per-frame work proportional to an unbounded projected area. It trades fine print detail for responsiveness under heavy overdraw; `data-sampling="adaptive"` exposes that state.

The surfaces use native palette tokens. Their ink is mixed toward readable foreground; they are decorative, inert and hidden from accessibility APIs, while native controls stay semantic. SSR and no-canvas fallbacks contain the same geometry rendered as glyph text or a compact SVG print. Invalid geometry is visible and announced. Context-loss listeners switch to the fallback and attempt a redraw on restoration; actual hardware context loss was not exercised.

Ambient updates stop for reduced motion, Motion Off, Flow Off, pause, offscreen and hidden states. Explicit orbit/size/pattern changes still repaint a still frame. Resize/theme changes repaint, unmount removes observers/listeners and cancels work. Orbit clears captured gestures on pointer cancellation, lost capture, blur, hidden document and disable. Re-enabling after disable-mid-drag does not revive an old interaction.

## Validation evidence

All checks below were local development checks. No dependency install, production build, commit, push or publication was performed.

- **10 focused tests passed**: `tests/glyph-sculpture.test.ts` and `tests/sculpture-objects.test.ts`. Geometry boundaries, distinct 3D forms and print variants, normals/occlusion, GLB transforms and rejections, pixel relief, no-canvas SSR, explicit invalid geometry and adaptive overdraw are covered.
- **Targeted lint passed** on all owned helpers, UI, examples and tests. **Isolated TypeScript: zero diagnostics** using the project options and owned entry points (`.work/canvas-objects/typecheck.mjs`). Shared catalogue verification is owned by the parent integration task.
- **233 native browser checks passed**, stored in `output/playwright/expansion/objects/results.json`. Chromium at 1,200 px/light and 390 px/dark and WebKit at 390 px/light cover all three treatments, control updates, keyboard orbit/zoom, idle/quiet behavior, offscreen resume, simulated hidden state, unmount, import error preservation, no-canvas fallback, canvas bounds and document overflow. Source files were imported in desktop Chromium and mobile WebKit. Image aspect checks include 100×50, 200×100 and 50×100; SVG checks include preflight complexity and cancellation.
- **Four additional native Chromium touch checks passed**, stored in `output/playwright/expansion/objects/touch-native-results.json`: horizontal drag rotated 70.18°, touch release cleared interaction, vertical drag scrolled the page 113 px without rotation, and no page errors occurred. This used real CDP touch input at 390 px, not a physical phone. WebKit touch dragging was not exercised.
- **Three targeted SVG browser checks passed** after making the pre-extrusion cap conservative for holes: a shape with multiple holes imports, excessive sampled contours reject before extrusion, and pre-aborted requests reject. Stored in `output/playwright/expansion/objects/svg-budget-results.json`. The earlier 233-check matrix was not unnecessarily rerun for this narrower limit change.
- An earlier synthetic touch diagnostic in `touch-results.json` failed because fake DOM pointer events cannot acquire native pointer capture. The real input check supersedes that harness. No product fix or false pass was inferred from the synthetic diagnostic.
- Diagnostic heavy-overdraw measurements were 8.9 ms for 2,000 repeated triangles and 25.8 ms for 20,000 at a 420×360 requested frame on this machine after adaptive sampling. These are single local measurements, not a cross-device performance guarantee.

Inspected screenshots include `chromium-desktop-dither-halftone.png`, `chromium-desktop-ink-hatch.png`, `chromium-mobile-ink-crosshatch.png` and `webkit-mobile-original-flower.svg.png` under `output/playwright/expansion/objects/`. They show readable native controls, actual geometry-derived marks and mobile wrapping. Remaining variant and fallback screenshots are in the same folder.

Four example exports live in `components/examples/glyph-sculpture.tsx`: `GlyphSculptureExample`, `DitherSculptureExample`, `InkSculptureExample`, `SculptureOrbitExample`. Their controls use the library's Card, Typography, Button, Icon, Input, NativeSelect, Slider and Switch. No source demo asset is reused. The parent integration task registered the entries and examples; this object slice does not claim installability or public release verification.

Source hashes, exact per-row judgments, public observation notes and verification pointers are recorded in `receipts/object-treatments-handoff.json`.
