# Original shader fields implementation plan

Goal: build Pigment Field and Contour Field as original, theme-aware decorative backgrounds with a shared bounded WebGL lifecycle.

The authorized design is two ordinary React client components, one original shader renderer, scoped CSS, and focused examples. Pigment uses independently authored overlapping flowing color densities; Contour uses independently authored smooth height bands. No Canvas UI engine, shader, wrapper, or demo assets are copied or ported. WebGL1 is sufficient for these original simple fragment effects; no experimental HTML capture or new package is needed.

Alternatives considered: CSS-only fields would not provide the intended continuously shaded material; a simulation engine adds framebuffer cost and lifecycle complexity unnecessary for decorative fields. The selected one-pass shader provides the intended atmosphere with a static CSS fallback and modest resource usage.

Owned paths are the seven new production/example/test files specified by the parent plus these reference files. Root owns registry metadata, CSS entry imports, example indexing, and app registration. No existing shared files, dependencies, production builds, commits, or publication.

- [x] Write and run failing numeric/fallback tests: finite speed and intensity, zero preserved, capped output pixel count and DPR, decorative SSR surface without meaningful child content.
- [x] Implement one-pass original programs and renderer: compile/link errors retain fallback; resize/DPR budget; clean scheduling and resource release; context loss stops work and restoration recreates GPU state.
- [x] Connect both components through shared `useMotionVisibility`, native theme tokens, appearance events, explicit `paused`, speed and intensity. Pause, off, hidden, and offscreen stop frame work. Theme/size changes can paint one still frame while visible.
- [x] Add scoped CSS still artwork, root-relative canvas, inert/aria-hidden decoration, and no pointer interception. Add self-contained examples with functional pause, speed and tone controls.
- [x] Verify focused tests and TypeScript, then render both programs with the existing Vite/Playwright tools. Exercise pause/resume, reduced motion, offscreen, theme change, context loss/restoration, unavailable WebGL, and desktop/mobile screenshots.
- [x] Report exact APIs, verification receipts, and root integration notes. Do not claim registration or full upstream library implementation.
