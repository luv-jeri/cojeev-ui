# Semantic Bloom verification — 2026-09-09

## Source and baseline

- SOURCE: Public ThreeUI Code panel exposed the original HTML with SHA prefix `0e48ec9ed2`. Downloaded original SHA-256 matches it; commit and license are in `capture-notes.md`.
- The standalone focused original rendered independently at 1100 × 650. Observed the centered Codex wordmark, liquid organism, temporal change and pointer-driven displacement. The native component retains the source force defaults, particle/connection alpha, and ordered blur → alpha threshold → turbulence displacement → source composite.
- Intentional native differences: Cojeev typography, themed colors, readable text, local host coordinates, fixed 60Hz seeded simulation, aggregated word activation, pause/lifecycle controls and direct gather/scatter commands. Random trajectories are not asserted pixel-identical.

## Observed native browser checks

- Desktop: rendered at normal browser width and 1440px in dark mode; no horizontal overflow. Canvas reports `data-renderer="canvas"` and active playback reports `data-moving="true"`.
- Pointer movement changed the canvas and displaced its center from x=416 to x=448 toward a right-side pointer, using source-based local attraction.
- Pause + Scatter changed canvas checksum to `3291921078`. Keyboard Enter on Gather changed it to `1930944734`; a second read remained exactly `1930944734`, confirming stillness. Palette change repainted the same paused arrangement with checksum `429139854`.
- Production export at 390 × 844: light mode, full “Meaning grows together” wordmark wraps on two lines; observed warm surface, distinct pink organic lobes, readable foreground, no clipping and no document horizontal overflow. Controls stack naturally.
- Mobile navigation contains exactly one Semantic bloom link under Typography.
- Emulated reduced motion: `moving=false`, `reduced=true`, `renderer=canvas`. Changing palette to Memory repaints the still; two reads gave checksum `2352341694` with no continuous change. Media emulation was reset afterward.
- Offscreen at the advanced controls: `moving=false` even with normal motion preference and nonzero speed.
- All 15 labelled sliders accepted keyboard End and reported the correct maximum: particles 100; radius 28; pace 2; wander 1; damping .98; cursor pull 3; cursor reach 600; word pull 3; word reach 400; connection reach 240; wordmark size 1.6; opacity 1; softness 20; texture 40; connection width 8. SVG blur and displacement attributes changed to 20 and 40. No horizontal overflow at these control values. Restore resets them.

## Checks

- Seven focused physics tests pass: safe bounds, deterministic refresh-rate independence, pointer pull, zero speed and bounded time gaps, resize/population, gather, explicit gather while speed is zero.
- Combined component API, component handoff and Bloom test run: 13 passed, 0 failed.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0 across the repository.
- `node scripts/check-example-source.mjs`: 125/125 default examples and 529 copied snippets, 0 TypeScript diagnostics.
- `npm run registry:build`: 126 registry items, including the new component and licensed engine in the shared foundation.
- Next production build: compiled successfully; TypeScript passed; 132/132 static pages generated. This Next version exports to the configured `distDir`, so the preview serves `.next-dev/bloom-build`, not the older `out` directory.

### Final shared-checkout check

After the successful full build, a final local-availability flag and live palette/contrast observer were added. Both subsequent production attempts compiled successfully but their whole-project TypeScript phase met files arriving from concurrent work: first `tests/reference-effects.test.ts` referenced an absent `reference-effect-geometry`, then `registry/cojeev/lib/reference-field.tsx` referenced an absent `reference-field-paint`. These files were not changed for Semantic Bloom. The final full-build gate is therefore blocked by that in-progress work; the earlier passing build is not presented as a passing final whole-tree build. Final component lint, generated portable imports and MIT attribution checks passed. The latest source is served by the development preview on port 4330.

## Limits

- Canvas-unavailable fallback is implemented but was not forced in the browser: the browser tool does not support the requested preload interception method. No preload or prototype override was installed.
- Browser extension errors and Grammarly-injected body attributes appeared in development. Browser inspection also intermittently timed out. Production preview navigation and mobile checks succeeded. No extension or system settings were changed.
- At the time of this focused browser verification, no Safari or touch-device hardware run, long-duration profiling, public deployment, commit or push had been performed. Publication is verified separately by the repository workflow and live documentation URL.
- Full application meaning/agent progress is intentionally not derived from this decorative simulation.
