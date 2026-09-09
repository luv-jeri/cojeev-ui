# Additional reference implementation report

Two requested references were compared with the active library before implementation. Both add missing mechanisms; no duplicate public aliases were created.

| Reference | Existing comparison | Decision |
|---|---|---|
| [Portal Field](https://threeui.com/backgrounds/portal-field) | Magic Rings paints crisp expanding circular arcs. Contour Field paints topographic bands. Neither has a warped annular distance field with narrow luminous core and broad chromatic fringe. | New `PortalField` background. |
| [Article Headings](https://threeui.com/text-animation/article-headings) | Text Reveal animates entrance opacity/position; Word Relay exchanges phrases. Neither implements a left-to-right decode frontier, noisy band and sparse noisy tail. | New `ArticleHeadings` typography component. |

## Source observations

Read the root-fetched source files `/tmp/cojeev-reference-sources/ArticleHeadings.tsx`, `articleHeadingDecode.ts`, `PortalFieldCollection.tsx`, and `portal-field.html` in full for the relevant mechanism sections.

The portal source uses a warped signed-distance arc, exponential core/fringe glow, pointer offset and an inner wash in a Three.js fragment shader. The collection also offers four other backgrounds; this task implements the requested portal variant, not that unrelated collection. The source page's authentication form, foreign fonts, labels and navigation were not copied.

Article Headings composes numbered semantic h2 rows and a text-node decoder that reveals an eased prefix, scrambles a bounded band, lightly perturbs the tail and restores original text on cleanup. The new component keeps its canonical heading text intact for accessibility and limits all animated substitutions to aria-hidden glyph slots.

## Delivered files and APIs

- `registry/cojeev/ui/portal-field.tsx` and `registry/cojeev/styles/portal-field.css`
- `registry/cojeev/ui/article-headings.tsx` and `registry/cojeev/styles/article-headings.css`
- `registry/cojeev/lib/reference-additions-math.ts`
- `registry/cojeev/lib/reference-additions-portal.ts`
- `components/examples/reference-additions.tsx`
- `tests/reference-additions.test.ts`
- `verification/reference-additions.json`

The metadata contains two `status: new` rows, usage/accessibility arrays, source observations, landing recommendations and complete component API tables. The examples expose `PortalFieldExample({variant,size})` and `ArticleHeadingsExample({variant,size})` with existing Button controls. Both components compose caller refs through the root-owned `useReferenceRef` helper.

`PortalField` accepts real children, balanced/warm/cool tones, speed, intensity, distortion, pause, pointer response and size. It renders an original WebGL annular-distance shader with analytic domain warping and exponential glow, not an image or crisp-ring approximation. The existing `shaderResolution` caps the drawing buffer to at most two million pixels and 4096 per edge. The renderer owns its GPU resources, one animation frame, resize/theme observers and context loss/restoration. It allocates on visibility, suspends offscreen/hidden/quiet, and freezes when paused. The deterministic organic SVG fallback is present on the server and when WebGL is unavailable or lost; fallback coordinates use fixed precision to avoid server/browser trig serialization mismatches.

`ArticleHeadings` accepts stable article items with title/meta/href, section label, semantic heading level, duration, stagger, noise-band options, pause, replay key, size and completion callback. Individual grapheme slots reserve the exact original width. The full canonical title is always available to assistive technology; noise is never announced. Decoding is finite, paint-limited to 25Hz, and stops/restores on interruption. A replay key explicitly starts another sequence; merely resuming a canceled heading does not unexpectedly replay it. Total row staggering is capped at 1200ms. More than 80 rows and titles over 1000 graphemes remain static rather than adding unbounded animation work.

## Validation

- Initial tests failed because the new helper module did not yet exist.
- `node --import tsx --test tests/reference-additions.test.ts`: **5/5 passed**. Tests cover grapheme/whitespace preservation, deterministic but changing noise, finite timing/input bounds, repeatable genuinely distorted fallback paths, exact semantic heading markup and deterministic server fallback with readable caller content.
- Targeted ESLint across the six new TS/TSX files: **passed**, including the final caller-ref composition.
- Workspace typecheck found only a concurrent `motion-drawer.tsx` Button size error; no addition-specific errors were reported. Root owns the final global integration/typecheck.
- Browser acceptance is explicitly root-owned and not claimed by this subtask. Recommended observations: WebGL status reaches `webgl`, halo moves then freezes on pause, theme changes repaint, context loss shows fallback, heading Replay visibly scrambles before exact resolution, cancel restores all titles, links retain keyboard focus, and mobile widths remain bounded.

## Landing use and limits

Portal Field can support one invitation or hero scene at low intensity, with readable content above the field. Skip it if another ambient background already owns that scene. Article Headings fits an optional editorial/field-notes section near the end of the landing page; keep the chosen hero headline effect separate.

These are mechanism-level Cojeev adaptations, not pixel-identical reproductions. The portal uses an original analytic warp rather than the upstream simplex-noise function; it retains the defining warped annular glow. The decoder is seeded/deterministic and grapheme-safe rather than using Math.random on UTF-16 text nodes. No dependency installation, shared file edit, registry mutation, staging, commit or extra subagent was performed by this subtask.
