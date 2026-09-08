# DepthBackground and FloatLayer

New reusable primitives for the September 8 landing redesign. Only these source files and their focused test/report were added; no shared motion, settings, theme, catalog, landing or package files changed here.

## Mount APIs

```tsx
<section style={{ position: "relative", isolation: "isolate" }}>
  <DepthBackground variant="pollen" density={1} intensity={1} seed="hero" />
  <div style={{ position: "relative" }}>
    <FloatLayer depth={48} drift={5} delay={0.1}>
      <YourContent />
    </FloatLayer>
  </div>
</section>
```

`DepthBackground` is decoration-only, with no children. It fills a positioned parent by default. `className`, `style`, native div props and ref are supported; its root is always `aria-hidden`, inert and non-interactive. In a standalone specimen, set its position and height explicitly.

| Prop | Contract |
| --- | --- |
| `variant` | `pollen` (default), `contour`, `orbital` |
| `density` | Relative count; default 1, bounded .35–2 |
| `intensity` | Motion strength; default 1, bounded 0–2. Zero preserves still artwork |
| `seed` | Number or string; default `sahajiv`. Identical inputs yield identical server/client geometry |

Pollen has small authored seed silhouettes with different sizes and focus at three depths. Contour has large asymmetric, nested topographic drawings. Orbital has four small structured line motifs with satellites, ellipses, ticks and rounded intersections. All use the existing pink, olive, blue and yellow roles. The reading centre is cleared through seeded placement rather than a gradient cover. No gradient clouds, downloaded artwork or WebGL context is used.

The scene uses real CSS perspective with z planes of -340px, -70px and +145px. Size, blur, opacity, displacement and movement speed reinforce those planes. Nearby pointer repulsion and native-scroll displacement act on the individual pieces. Default piece counts are 42 pollen, 24 orbital and 4 contour; maximums are 84, 48 and 7. Even minimum contour density keeps all three planes.

`FloatLayer` supports `depth` (total scroll travel in px; default 32, bounded -180–180), `delay` (seconds; default 0, bounded 0–1), `drift` (px; default 6, bounded 0–24), `asChild`, native Motion div props and an HTMLElement ref. Negative depth reverses the movement. Set drift to zero for entrance and parallax without an idle float. It renders a div by default; `asChild` merges onto one ref-capable native child.

The entrance uses the shared enter easing and defaults to 950ms. `revealDuration` (0.2–2 seconds), `revealDistance` (0–80px) and `replay` are configurable. It reveals once by default; `replay` resets the entrance when leaving the viewport. The landing uses this for visible scroll reveals while setting foreground depth/drift to zero. Server markup stays readable; hydration prepares the entrance. Movement uses individual `translate` plus custom variables, leaving the child's transform and scale intact. Shared Presence offsets and Card lift offsets are composed on the same root. A consumer that already owns its own inline `translate` should use the default wrapper, giving each movement a separate element. Native handlers and refs continue through Slot.

## Motion and verification hooks

Both components read the shared choreography and visibility policy. Reduced motion, Motion Off and Flow Off preserve a meaningful, visible still state. Offscreen and hidden-document effects stop their phase animation, pointer listeners and active scroll-value subscription. Motion keeps its passive native scroll observer mounted; no decorative frames run while paused. Native scrolling is untouched. There is no React render loop per frame. Movement values and bounded loops are handled by Motion and the existing tracked clock.

- DepthBackground: `data-slot="depth-background"`, `data-variant`, `data-active`, `data-quiet`; each piece has `data-depth-layer="far" | "middle" | "near"`.
- FloatLayer: `data-float-layer`, `data-float-depth`, `data-reveal="waiting" | "entering" | "shown"`, `data-active`, `data-quiet`. `data-float-depth` avoids overwriting Card's own `data-depth`.

The FloatLayer reveal state changes directly on the owned native root during its lifecycle; it does not trigger frame-by-frame React updates.

## Checks and integration boundary

Three focused tests pass: stable seeded bounded geometry with three planes and a clear reading centre; deterministic decorative SSR semantics; and readable FloatLayer SSR with native asChild button identity and authored transform preserved.

```sh
rtk proxy node --import tsx --test tests/depth-background.test.ts
```

Scoped ESLint passed. The Impeccable detector returned no findings. Root owns the canonical TypeScript check, CSS imports, registry/catalog/examples and the batched landing visual/runtime review. This report does not claim a browser performance benchmark or completed visual approval. No build, dependency install, registry payload generation, publishing, commit or push was run.

Files:

- `registry/sahajiv/ui/depth-background.tsx`
- `registry/sahajiv/styles/depth-background.css`
- `registry/sahajiv/ui/float-layer.tsx`
- `registry/sahajiv/styles/float-layer.css`
- `tests/depth-background.test.ts`
- `REVIEW-DEPTH-LAYERS.md`
