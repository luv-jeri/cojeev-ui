# Shader preview evidence

Scope: local background integration and separate wireframes. No publication or checkpoint acceptance.

Source: @shadergradient/react 2.4.20 public renderer and the two owner-supplied customize URL parameter sets. Original settings are preserved in sourcePresets; normal mode overrides only palette values and applies a translucent Cojeev CSS wash. Source comparison route: /?source-shader. This is an adapted source implementation, not a claimed pixel-exact reproduction of the customizer page. The supplied midnight URL displayed the site's default Halo editor preset during reference inspection; the URL parameters, rather than that editor state, are the source of truth.

Light: plane, supplied geometry/camera/speed, apricot #E89C75 / paper #FBF4E6 / pink #F0A4CC. Dark: waterPlane, supplied geometry/camera/speed, #606080 / #A394D1 / #20242A. Full user settings are retained in sourcePresets.

Motion: shared Cojeev motion and visibility hook drives R3F always/demand frameloop. Reduced motion, shared off, hidden document, offscreen scene and open footer switch to demand rendering. Static CSS fallback remains if WebGL or the lazy chunk fails. One renderer at DPR 1. Heavy renderer is lazy loaded.

Checks: built successfully; live IAB showed one canvas and no captured console warnings/errors. Inspected light/dark desktop and 390x844 mobile; no horizontal overflow. Theme switch updates root and shader mode; preference survives reload. Existing 40dvh footer, five feature descriptions, and closing interaction remain. Fixed dark footer-description contrast after visual inspection. Pause control changes data-moving to false. Do not treat toDataURL comparisons as visual pause evidence because the upstream canvas does not preserve its drawing buffer. Source FramePolicy supplies the render-loop boundary.

Wireframe board: agent checked six SVG sketches, both controls, no script errors or overflow at desktop and 390px; parent inspected the content map. All alternatives remain wireframes with explicitly static gradient placeholders.

Release limitations: renderer adds roughly 271KB gzip JS plus three original HDRs totalling about 4.54MB. Library catalogue publication, upstream full asset notices, production deployment and owner design acceptance are separate follow-ups.

Final build: Vite 7.3.6, success. Check-running wall time 4.61 seconds, separate from implementation, dependency setup, debugging and visual review. Build output retains client-directive and chunk-size warnings.

## Latest light preset refinement

Replaced light with the owner’s latest waterPlane: #ebedff / #f3f2f8 / #dbf8ff, grain off, position (0,1.8,0), rotation (0,0,-90), amplitude 0, density 1, frequency 5.5, speed .3, strength 3, time .2, zoomOut true. Other supplied camera/lighting parameters are unchanged. No light palette override or warm wash remains. CSS fallback uses the same pale colours. The accepted dark preset, palette and CSS overlay were compared against durable source and remain byte-for-byte unchanged.

Live desktop and 390x844 visual inspection passed with one canvas, no page warnings/errors and no mobile horizontal overflow. See light-preset-performance.json: approximately 60 fps in both short local viewport samples, zero shader draws while paused, two settling draws after reduced-motion activation and no continuous rendering. This is warm local Mac evidence, not a guarantee for physical phones or cold network loads. No rendering architecture or dependency changes were necessary.

Light refinement build passed. Check-running wall time: 2.99s, separate from editing, debugging and browser inspection.

## Full-screen coverage refinement

The upstream zoomOut=true flag overrides cDistance and sets the camera distance to 14, exposing the mesh as a floating sheet. Normal light mode now overrides zoomOut=false, positionY=0, cDistance=1.5 and enableTransition=false. This centres/crops into the same shader, without a startup dolly from the wide editor view. Colour, geometry, deformation, speed and grain remain unchanged; the original source-preset comparison route is preserved. Dark preset and palette were compared and remain unchanged.

Visually inspected desktop and mobile. Read the actual WebGL framebuffer immediately after one draw at 1266x877, 1920x800 and 390x844: zero uncovered pixels at all three sizes. Temporary draw interception restored itself after capture. These are sampled animation phases, not an exhaustive proof of every future frame. Canvas remains exactly viewport-sized at DPR 1; no larger CSS canvas, additional pixels or renderer were introduced.

Build check passed in 3.88 seconds of check-running wall time, separate from edits and visual inspection.
