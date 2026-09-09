# Gallery and transition implementation report

Six new entries implemented in original installable React source, corresponding CSS, and explicit named example exports. Metadata is in `verification/reference-galleries.json`; all entries have `status: new`. No shared metadata, dependencies, root scripts, global CSS, or incumbent component files were edited by this task.

## Reference evidence and adaptations

Inspected actual React Bits TypeScript sources supplied in `/tmp/cojeev-reference-sources/{InfiniteSpiral,AccordionGallery,OptionWheel}.tsx`. Inspected the Remocn documentation pages and downloaded/read the three actual `registry/remocn/<id>/index.tsx` sources from https://github.com/Remocn/remocn on 2026-09-09. Upstream source was used as behavioral reference, not copied.

- **Infinite Spiral** retains wrapped helical vertical offsets, depth scaling and edge fading. Caller supplies every image and optional destination. Explicit image selection, previous/next and pause controls supplement auto motion. Hover, focus, page visibility, viewport visibility and shared stillness halt the frame loop. It does not reproduce upstream drag inertia, page-scroll driving, arbitrary camera settings or blur. Its geometry is distinct from the existing flat Orbit Images path.
- **Accordion Gallery** retains selected flex expansion, muted inactive imagery and a story card. Caller supplies images, titles, descriptions and optional destinations. Arrow keys, Home/End and native buttons select panels; inactive story content is hidden. Responsive layout stacks panels on narrow screens. It does not reproduce GSAP tilt or pointer parallax. It adds an image-gallery composition beyond the existing disclosure primitive.
- **Option Wheel** retains curved per-option positioning and distance fading around the selected center. Actual listbox/option selection uses arrows, Home/End, click/tap and explicit previous/next buttons. Pointer choices focus the listbox. No audio, wheel interception, drag or inertia is included; native page scrolling remains intact.
- **Grain Dissolve** retains outgoing blur, a fully covering pigment/grain interlude, and delayed incoming focus. SVG turbulence replaces the upstream WebGL animated shader. The real caller scenes remain single stable DOM instances.
- **Wave Wipe** uses an organic rising SVG clip edge, a pigment wave band and slight outgoing lift. This is an original live-content adaptation of the upward scene choreography; it does not reproduce the upstream animated grain wave shader.
- **Dither Dissolve** uses a deterministic 4x4 Bayer threshold repeated across a bounded 16x16 cover. It preserves the cover/hidden exchange/reveal envelope. It is intentionally a graphic ordered-dither treatment, not the upstream animated simplex WebGL shader and not the existing growing tile-mask Pixel Swap.

The transition API is `first`, `second`, `active`, optional `duration`, `paused`, and `tone`. Reversals advance from the current position. Both scene DOM instances remain mounted, and the outgoing subtree receives `inert` and `aria-hidden` immediately. Shared motion disablement, reduced motion, hidden documents, offscreen state and explicit still mode settle the selected scene immediately. There is no continuous transition work after an endpoint. Images in examples are local generated SVG data URLs using existing `signatureShapePaths`.

## Validation

- `node --import tsx --test tests/reference-galleries.test.ts`: 9 tests passed. Checks wrap and invalid selection, helical depth/vertical geometry, reversible incremental progress, exact cover endpoints, wave coverage, deterministic bounded dither, inactive interactive DOM in all six initial transition states, selected markup and empty gallery states.
- Scoped ESLint for all new TS/TSX files: passed with zero warnings.
- `npx tsc --noEmit`: passed across the current checkout.
- The geometry tests were introduced before their implementation; initial invocation failed because the new module was absent. SSR accessibility checks were added after component implementation and are not a claim of test-first coverage for every component render.
- Root owns source/registry integration, the production build and real browser checks. No browser fidelity, screenshot approval, mobile interaction or interrupted runtime transition behavior is claimed by these unit/SSR checks.

## Landing guidance

Use Accordion Gallery for component discovery after the feature demonstration. Wave Wipe can bridge one scene. Infinite Spiral, Option Wheel and the heavier dissolve textures belong in an optional playground or small secondary specimen; they should not compete with the main headline and narrative.
