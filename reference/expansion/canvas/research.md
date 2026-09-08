# Canvas UI reference research

Captured 2026-09-08. Repository pinned to [`8aec65707b298a227472c117b892b5695955216c`](https://github.com/DavidHDev/canvas-ui/commit/8aec65707b298a227472c117b892b5695955216c), committed 2026-09-04. The initial snapshot was an inventory and three detailed engine inspections, with one desktop rendering sample. Later sections record seven public rendered samples and separately verified original object treatments. This is not a full source component-quality audit.

## Decision and license boundary

**Use the visual ideas to design independent SahaJiv implementations. Do not copy or port these components into the MIT library.** The actual license is **MIT + Commons Clause License Condition v1.0**, with an explicit restriction on selling, sublicensing, or redistributing the components themselves, including bundles and ports. This is more restrictive than the README's shorthand about selling the library. It permits use within applications/websites/products subject to notices, but does not provide a basis for distributing these components as an MIT component library. The source receipts here retain upstream evidence and are not MIT production implementation. [Pinned license](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/LICENSE.md), [local license receipt](receipts/upstream/LICENSE.md).

The object demos also carry separate asset terms: the Duck model is attributed to Sony Computer Entertainment and the SCEA Shared Source License; the Bolt asset uses the repository's restrictive license. Do not inherit these demo assets into SahaJiv. [Pinned asset notice](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/public/assets/models/LICENSE.md).

## Completeness and source access

There are **35 canonical components**, all GPU visual effects: **29 effects over HTML content and 6 object effects**. Counts agree across the [live catalog](https://canvasui.dev/components), [canonical catalog data](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/data/components.ts), [registry definitions](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/registry.ts), and 35 component page paths in the complete, nontruncated [Git tree receipt](receipts/github-tree.json). There is no separate shader category to add: the component catalog itself is the shader/effect collection.

Every canonical entry has a WebGL engine, a WebGPU engine, and five framework wrappers. Vanilla uses the engine directly. That yields **420 generated registry variants**: 35 × 2 renderers × 6 framework flavors. The tree establishes all source-file paths; all **35 React WebGL registry endpoints were fetched and their returned source and dependency metadata parsed successfully**. Other HTTP variants were not individually requested. [Registry-generation source](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/registry.ts), [35 endpoint receipts](receipts/registry-probes.json).

The exact names and stable IDs are in [inventory.json](inventory.json). Its `inspectionStatus` is `source-inspected` only for Liquid, Ripple, and Particle Object. ASCII Object, Dithered Object and Ink Object now have `rendered` status after individual public documentation/demo inspection; other entries remain `discovered` despite verified source availability. Detailed engine inspection and public rendered inspection are separate evidence.

| Evidence | Count |
| --- | ---: |
| Canonical entries discovered | 35 |
| React WebGL registry source retrieved | 35 |
| WebGL/WebGPU engine files verified in pinned tree | 35 / 35 |
| Detailed source samples | 3 |
| Desktop page and pointer rendering sampled | 4 |
| Full interaction/accessibility/mobile audits | 0 |

## Dependencies and platform requirements

The six `*-object` effects require `three` and the development type package `@types/three`. The 29 HTML effects declare no external WebGL runtime package. Every WebGPU build adds `vgpu` and development dependency `@webgpu/types`. Registry generation also adds the framework runtime for Solid or Preact. These are the effect dependencies; the docs site's Next.js, Tailwind, Motion, Base UI, and other packages are not a requirement of every effect. [Pinned registry definitions](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/registry.ts), [package manifest](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/package.json).

Full HTML refraction depends on the experimental HTML-in-canvas APIs (`drawElementImage`, `requestPaint`, `layoutsubtree`). The site uses a domain-bound origin trial; its capability does not automatically apply to a SahaJiv domain. Ordinary HTML or partial overlays provide different fallback experiences depending on the effect. Keep support claims per capability rather than using one broad browser-supported flag. Object effects do not require HTML-in-canvas. WebGPU support also requires an available adapter; browser version alone is insufficient. [Installation](https://canvasui.dev/docs/installation), [rendering guide](https://canvasui.dev/docs/rendering), [Liquid capability probe](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/LiquidVanilla.ts#L315).

**Verified distribution caveat:** 20 of the 35 React WebGL registry responses contain `../rect-cache`, while each response contains only its component file and no registry dependency supplying that utility. Liquid's returned `components/canvasui/Liquid.tsx` is a concrete example. This means the fetched item is not self-contained as delivered; no consumer install/build was run in this research task. Record the missing dependency instead of blindly importing the advertised standalone source. [Liquid endpoint](https://canvasui.dev/r/liquid-react.json), [saved response](receipts/liquid-react.json), [all affected entries](receipts/registry-probes.json), [source utility](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/rect-cache.ts).

## Three source inspections

### Liquid: pointer-driven fluid field

Liquid separates simulation resolution from the displayed dye texture, uses multiple render targets for velocity/dye/pressure, and updates GPU state outside React. Pointer movement creates localized impulses. Its public controls include trail persistence, force, curl, color, distortion, and resolution. React initializes the engine once, sends live option updates, and destroys it on unmount. The decorative output canvas is hidden from accessibility APIs and ignores pointer hit testing, while content remains the interaction target. [Engine](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/LiquidVanilla.ts), [React wrapper](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/Liquid.tsx).

Useful architectural ideas are separate simulation/display quality budgets, dirty content texture uploads, capped pixel density, passive pointer listeners, bounds cached on resize/scroll, and a loop that sleeps after its visual energy decays. An IntersectionObserver suspends rendering offscreen. Reduced motion blocks new pointer/programmatic impulses, but changing the preference does not immediately clear existing simulated motion: it can settle until the current loop sleeps. An original SahaJiv implementation should choose an explicit freeze/reset policy. [Lifecycle section](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/LiquidVanilla.ts#L797).

Creation checks WebGL context availability and float render-target support. Destruction releases targets, textures, shaders, programs, buffer, observers, media listener, pointer listeners, and the paint callback. Neither the inspected raw WebGL engine nor its wrapper installs an explicit context-lost/context-restored recovery path. WebGPU initializes asynchronously and catches initialization failure, but its sampled component source contains no explicit `device.lost` recovery handling; dependency internals were not audited. These are reasons to design recovery into SahaJiv's shared infrastructure. [WebGL creation](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/LiquidVanilla.ts#L326), [cleanup](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/LiquidVanilla.ts#L954), [WebGPU initialization](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Liquid/LiquidWebGPU.ts#L849).

### Ripple: bounded event effects

Ripple represents each disturbance as position, age, and strength, caps the active wave collection, and retires disturbances after their travel or decay limit. Click/hover/ambient modes reuse the same renderer. Its idle path stops when there are no disturbances or dirty content, with IntersectionObserver wakeup and capped frame delta. This suggests a reusable event-effect scheduler distinct from continuously moving backgrounds. [Source](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Ripple/RippleVanilla.ts#L299).

Reduced motion blocks new disturbances and clears the active collection when the preference changes. Cleanup explicitly releases the GL objects, listeners, paint callback, and observers. As with Liquid, the raw engine has an initial lost-context check but no explicit context restoration handler. An original component can expose a deliberate programmatic trigger for keyboard activation while keeping decoration out of hit testing; the sampled engine listens to pointer events and does not establish keyboard parity by itself. [Lifecycle](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Ripple/RippleVanilla.ts#L370), [wrapper](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/Ripple/Ripple.tsx).

### Particle Object: asset lifecycle and spring response

Particle Object accepts models and raster/vector images, detects formats from bytes, samples an asset into points, and lets pointer forces displace particles from home positions. It uses spring return and frame-time-aware damping. Three.js supplies rendering, camera/orbit controls, model loading, and Draco support. A Draco decoder URL is an additional conditional network dependency; the default points to Google's CDN. [Options and imports](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObjectVanilla.ts#L1), [particle update](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObjectVanilla.ts#L833).

A monotonically increasing load token prevents a stale async load from replacing a newer asset, including disposal of a stale parsed scene. There are load/error callbacks, but the fetch itself is not aborted. Cleanup disposes controls, model geometry/materials/textures, particle material, decoder, renderer, observers, and listeners. An original implementation should add AbortController, bounded asset/particle budgets, and visible loading/failure states with a local fallback. [Asset loading](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObjectVanilla.ts#L663), [cleanup](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObjectVanilla.ts#L1029).

Reduced motion disables the pointer push and idle motion; the WebGL render loop still runs while visible. WebGPU adds an explicit document visibility listener in addition to intersection visibility. The React wrapper renders a canvas with `touchAction: none`, without a semantic label/fallback prop or visible asset error treatment. Meaningful object content therefore needs an accessible presentation contract in SahaJiv; decorative scenes should be identified as decoration. Three.js may perform internal context recovery, which this task did not inspect or exercise. [WebGL animation](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObjectVanilla.ts#L938), [WebGPU visibility](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObjectWebGPU.ts#L1059), [React wrapper](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/lib/ParticleObject/ParticleObject.tsx).

## Original shared infrastructure recommendations

These are SahaJiv design recommendations inferred from the observations, not upstream code to transplant:

1. Keep semantic content available in ordinary DOM. Mount an optional decorative canvas with `aria-hidden` and no pointer hit testing; expose an explicit semantic mode only for meaningful object viewers.
2. Unify document visibility, viewport intersection, reduced motion, SahaJiv motion/flow settings, and a user pause control. An idle effect should draw once and stop. Clearing or freezing immediately on reduced motion should be intentional.
3. Model renderer states as idle, initializing, ready, paused, unavailable, lost, and disposed. Stop submissions on context/device loss, show the fallback, and rebuild resources or report failure after restoration. Do not treat a successful context creation as continuing health.
4. Allocate within an explicit pixel/particle/framebuffer budget. Cap DPR and frame delta; avoid per-pointer layout reads; update texture/uniform data only when dirty. Separate user-facing intensity from expensive simulation quality.
5. Make engine cleanup idempotent. Track and release listeners, observers, frame requests, buffers, programs, textures, decoder resources, and outstanding asset requests. Reject stale completions after unmount or asset replacement.
6. Resolve theme tokens into effect uniforms at the boundary. Carry light/dark palette, contrast, spacing, radius, motion intensity, and seed through one SahaJiv API. Avoid hiding low-level rendering setup in a component demo flow.
7. Verify source/registry closure as part of component delivery: every relative import must be included or declared. Preserve a still, readable fallback when a shader cannot compile, an adapter is unavailable, or rendering is disabled.

The existing [`useMotionVisibility`](../../../registry/sahajiv/motion/use-motion-visibility.ts), motion settings, and [`ShapeScene`](../../../registry/sahajiv/ui/shape-scene.tsx) are the local starting points to inspect before adding parallel lifecycle systems.

## Overlap with the existing 106 SahaJiv entries

The active root `registry.json` has 107 items including the `sahajiv` base-style item, hence **106 component entries**. This was checked in the dirty active checkout at HEAD `a50d2d4a538d13c1e808cc94344f48a6fb58686b`; the inventory records its content hash and all IDs. The generated `public/r/registry.json` still has 90 components plus its base item, so it is not the authoritative expansion count for this task.

| Existing entries | Canvas idea family | What would actually be new |
| --- | --- | --- |
| `ambient-background`, `depth-background` | Mist, fluid, falling marks, sparks, analog grain | Optional GPU rendering/material treatment, not a second generic background API |
| `shape-scene`, `shape`, `shape-artwork` | All six object effects | Asset intake plus material/particle presentation modes; existing scene already uses Three.js |
| `text-reveal` | Character and particle reveal effects | Character/surface treatment beyond the current rise/fade word reveal |
| `scroll-organism` | Bend, Laser, Particle Scroll | Distortion/disassembly media treatment driven by scroll |
| `float-layer`, `organism-assembly` | Tile lift, hex surfaces, separation | Shader/material layer with bounded interaction, not duplicate assembly orchestration |
| `bubble` | Canvas Bubble | **Name collision only:** existing SahaJiv Bubble is chat UI; use a distinct original name |

These are conceptual neighbors, not equivalence claims. The inspected neighbor implementations use different DOM/SVG/Three.js approaches. Per-entry overlap hints in the inventory are for consolidation planning and still require design judgment.

## Rendered evidence and limits

Liquid's official page was opened in an isolated headed Playwright browser at a 1200 × 889 CSS-pixel viewport. HTML-in-canvas was available; reduced motion was off. A pointer pass across the image produced visible blue fluid and distortion. The output canvas had `aria-hidden=true` and `pointer-events:none`. The page and pointer screenshots were inspected, and the browser was closed afterward. [Rest screenshot](receipts/liquid-rest.png), [pointer screenshot](receipts/liquid-pointer.png), [browser observation receipt](receipts/browser-observations.json).

Console output included four errors from Cloudflare Turnstile iframe scripts and one first-party unused-preload warning. This is not a clean-console certification. There was no mobile, keyboard, reduced-motion runtime, unsupported-browser, context-loss, WebGPU, or repeated-mount validation. Ripple and Particle Object have source evidence only. No package install, production edit, application build, commit, push, or publication was performed.

## Receipt map

- `inventory.json`: 35 exact names, stable IDs, categories, source and registry URLs, license evidence, dependencies, source file hashes, and inspection states.
- `receipts/github-commit.json`, `github-tree.json`: immutable source pin and complete path census.
- `receipts/components.html`, `components.headers.txt`: live official catalog capture.
- `receipts/registry-probes.json`: all 35 returned React WebGL item identities, source hashes, declared dependencies, and relative imports.
- `receipts/upstream/`, `source-downloads.json`: pinned license/catalog/registry/sample sources with retrieval timestamps and SHA-256 hashes. These are restricted reference material.
- `receipts/liquid-react.json`: concrete registry response supporting the missing local-utility finding.
- `receipts/liquid-*.png`, `browser-observations.json`, `.playwright-cli/`: the one rendered sample and its capture logs.

## Original SahaJiv field batch

After the research snapshot, an authorized implementation batch added `PigmentField` and `ContourField` with independently authored one-pass analytic shaders. They are decorative color-density/topographic backgrounds and shared renderer infrastructure. **They do not reproduce Canvas Liquid's pointer fluid simulation or HTML distortion, Ripple's content refraction, or any of the 35 canonical source entries. All source coverage rows remain pending implementation/equivalence assessment.** See [implementation result](implementation-result.md) for APIs and separate verification evidence.

## ASCII Object: public behavior and an original glyph sculpture

On 2026-09-08, the pinned documentation and demo options for ASCII Object were inspected, then the official page was rendered in headed Chromium. The duck was visibly constructed from glyphs; dragging changed its 3D orientation, and selecting Digits visibly replaced its character repertoire. The public contract also supports externally supplied models and flat artwork, edge-sensitive glyph selection, scene colors and camera controls. No restricted engine code or model asset was copied or ported for this slice. [Pinned documentation](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/app/(shell)/docs/components/ascii-object/page.tsx), [demo options](https://github.com/DavidHDev/canvas-ui/blob/8aec65707b298a227472c117b892b5695955216c/src/demos/ascii-object-demo.tsx), [official page](https://canvasui.dev/docs/components/ascii-object).

[Initial glyph render](receipts/ascii-object-reference.png), [orbit result](receipts/ascii-object-orbit.png), and [Digits selection](receipts/ascii-object-digits.png) are individual rendered receipts. The official page produced Cloudflare challenge iframe errors and preload warnings, so this is not a clean-console claim. Inspection does not establish reduced-motion or fallback quality upstream. The inventory now has 35 discovered entries, three detailed engine source inspections, and two rendered entries. ASCII Object has public documentation/demo inspection, not a fourth engine inspection.

The new original `GlyphSculpture` shares the core idea of a three-dimensional shaded object represented by characters. It generates its own seed, bloom, and pebble meshes, projects triangles into a bounded depth buffer, and draws a luminance-based glyph ramp with native Canvas 2D. CSS theme tokens, shared stillness settings, a keyboard-controlled turn prop, and a server-rendered glyph fallback make it a SahaJiv decorative component. That initial slice loaded no external assets or dependencies. The object extension below adds bounded local file intake and the existing Three SVG utility dependency.

**The initial slice was partial.** Geometry intake and orbit/zoom are completed in the later extension below. Measured glyph-template matching, full source format/studio/material options and exact visual parity remain outside the native implementation. The source row remains partial and is not verified equivalent. The MIT + Commons Clause restrictions still prevent copying or porting Canvas component source into this MIT library.

See [Glyph Sculpture result](glyph-sculpture-result.md) for the exact API, original implementation files, individual lifecycle evidence, screenshots, and limitations.

## Object print extension: geometry, dither and ink

The later object slice inspected ASCII Object, Dithered Object and Ink Object individually in the live public browser. ASCII changed Full → Digits, Dither changed Bayer → Halftone, and Ink changed line spacing and angle; pointer dragging changed each rendered object. These are public behavior observations, not three additional detailed engine inspections. Counts are now 35 discovered, three detailed engine inspections and four individually rendered/pointer-operated entries.

`GlyphSculpture` now accepts validated triangle geometry and bounded local self-contained GLB / filled SVG / PNG / JPEG imports. `DitherSculpture` and `InkSculpture` share its original projection, normal lighting and depth infrastructure. `SculptureOrbit` supplies mouse drag, horizontal touch, native buttons, keyboard rotation and zoom. Resource limits, visible import errors, SSR/no-canvas fallback and native stillness rules are part of the common implementation.

Dither and Ink are verified original useful-core adaptations, with exact source/API/material parity explicitly false. ASCII remains partial because native directional contour marks do not measure glyph templates against source edges. There is no asset material preservation, external URL/glTF-sidecar loading, compressed or animated model support, source studio reproduction or restricted engine reuse. The native files use original geometry, Canvas 2D and theme ink; local SVG extrusion uses the existing Three utility.

The final native evidence is 10 focused unit/SSR tests, zero isolated TypeScript diagnostics, targeted lint, 233 native Chromium/WebKit checks and four real Chromium touch checks. Browser results include imports, fallback, disabled-drag interruption, keyboard orbit in quiet modes, mobile layout and lifecycle suspension. The source demos themselves did not receive mobile, quiet-mode, context-loss or accessibility audits. [Exact result and supported inputs](object-treatments-result.md), [handoff receipt](receipts/object-treatments-handoff.json).

## Glass, liquid and particle objects: original material sculptures

Glass Object, Liquid Object and Particle Object were each inspected through the live official documentation and rendered demo. Glass visibly transmitted its moving backdrop; drag changed its orientation and raising Frost softened the transmission. Liquid Object displaced a shaded object through a pointer-driven screen-space field, with visible color splitting; its optional geometric wobble was a separate control. Particle Object displaced points away from a sampled surface and returned them after pointer departure. Specific Frost, Distortion and Spring controls were also keyboard-operated. This brings the public rendered/pointer count to **seven**; detailed engine inspection remains **three**. No additional restricted renderer source was read, copied or translated in this slice. [Per-entry observations](receipts/material-source-observations.json).

The native useful cores are `GlassSculpture`, `FlowSculpture` and `ParticleSculpture`. Glass uses Three's physical transmission on a real mesh against original procedural ribbons, petals or tiles. Flow uses an original, bounded velocity field to distort a separate native scene render; it is not a geometry-wobble stand-in. Particle uses original area-weighted sampling and damped springs, so points actually leave and return to the mesh. All three accept the previously validated local geometry/file formats and share existing accessible `SculptureOrbit` controls. No source model, texture, photo or shader was reused.

The native evidence includes seven focused unit/SSR tests, zero isolated TypeScript diagnostics, targeted lint, 15 native browser rows across Chromium desktop/light, Chromium mobile/dark and WebKit mobile/light plus individual no-GPU and ref lifecycles, three direct renderer image-difference rows and three real Chromium touch rows. The renderer checks distinguish visible field/point motion from mere animation flags, and prove exact return to the quiet image with a fixed view. Context-loss tests used the real WebGL test extension; hidden-document tests were simulated. These do not establish physical iPhone testing or source equivalence. [Exact result, APIs and limits](material-sculptures-result.md), [native receipt](receipts/material-sculptures-handoff.json).

Glass refracts its own procedural studio, not arbitrary surrounding DOM. Flow's dissipative advection is an original bounded approximation, not source fluid-solver parity. Particle has a native 8,000-point cap and omits source drift/variance/studio breadth. The three entries are verified original useful-core adaptations with exact equivalence explicitly false. No package installation, production build, commit, push or publication was performed for this slice.
