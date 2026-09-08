# Glyph Sculpture bounded implementation

Read the original DESIGN.md and existing motion/shape conventions on 2026-09-08.

An independently authored CPU triangle rasterizer projects three organic parametric meshes into a bounded character grid. Depth and smooth normals control glyph density; the output is actual font glyphs on transparent Canvas 2D, not a texture or gradient. Builtin forms are seed, bloom and pebble. A deterministic server-rendered pre preserves a useful glyph sculpture without canvas.

Props: form, tone, cellSize, speed, turn, pointerTracking, paused, className/style/ordinary div attributes. Finite clamps, grid budget, capped DPR/pixel area. Shared useMotionVisibility governs motion off, flow off, system reduce, visibility and intersection. Paused rendering repaints on resize/theme/explicit props but has no animation loop or hover tilt. Hover input is passive and never captures the pointer.

Tests: numeric input and geometry bounds, distinct silhouettes/depth/light, deterministic SSR glyphs. Real browser: glyph draw calls and visible organic silhouette; controls, keyboard turn, pause, system reduced motion, motion/flow off, offscreen, hidden event, resize, pointer opt-in, theme update paused, fallback, unmount. Light/dark and 390px screenshot inspection. No broad build/install.

Canvas comparison: shares the high-level core of a shaded 3D object presented as glyphs. Canvas accepts arbitrary GLB/glTF/SVG/image assets and matches character shapes to edges; this slice has original builtin meshes, a luminance glyph ramp and bounded hover tilt/controlled turn. No imported assets, generic HTML processing/refraction, zoom, orbital drag, or upstream engine equivalence claim.
