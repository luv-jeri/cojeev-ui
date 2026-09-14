# 000h by Cojeev — Seed identity

The mark is an open seed: one asymmetric zero, with an opening shaped by hand. In the homepage wordmark it becomes the first character of **000h**, followed by `00h`. This keeps the name and symbol together without adding another badge to the navigation. The same symbol works alone in the favicon and documentation seal.

The September 11 revision replaces the rejected diagonal chain of three rings. The smaller olive sculpture sits beside the closing invitation: “Small beginnings. Good possibilities.” The component showcase keeps its full width and its simpler introduction.

## Assets

| File | Purpose |
| --- | --- |
| `000h-mark.svg` | Primary ink vector symbol |
| `000h-mark-inverse.svg` | Paper-coloured symbol for dark surfaces |
| `000h-mark-pink.svg` | Optional pink accent variant |
| `000h-mark.png` | Transparent 768 × 768 symbol |
| `000h-wordmark.png` | Transparent 308 × 113 name and attribution |
| `000h-sculpture.png` | Transparent 1024 × 1024 olive 3D render |
| `000h-sculpture.webp` | 640 × 640 website render, 22,908 bytes |

## Use

Keep the shape and its one opening intact. Use ink `#27292d` on paper `#f8f6f1`, or paper on a dark surface. Olive `#9AAB63` belongs to the dimensional counterpart; pink remains the library’s interaction accent. Keep at least one opening’s width of clear space around a standalone symbol.

The symbol replaces the first zero when used in the custom wordmark. Do not place it before the complete `000h` wordmark in the same lockup, which adds an unintended fourth zero. The separate documentation seal is an application icon beside a textual name.

Use a 24 px square or larger in regular UI. The 16 px favicon is a compact exception. The accessible home-link name remains “000h by Cojeev home” when the visual attribution is hidden on narrow screens.

The sculpture enters once and moves a little with scroll, without an idle loop or pointer interaction. Reduced motion, Motion Off and Flow Off leave it visible and still. The website uses a small rendered image and loads no new 3D engine for this decoration.

## Reproducible source

`lib/brand.ts` owns the geometry. `BrandMark` renders it directly.

With the supported Node version and project dependencies installed:

- `node --import tsx scripts/generate-brand-assets.ts` regenerates the SVG variants and favicon.
- `node scripts/generate-brand-sculpture.mjs` builds an actual beveled 3D mesh from that SVG, lights it in olive, and exports transparent PNG/WebP files. Three.js and Playwright are existing project dependencies, used only during asset creation.
- `node --import tsx scripts/generate-share-image.tsx` regenerates the social preview and wordmark PNG with the existing Bricolage Grotesque and DM Sans fonts.

The final sculpture is rendered from geometry, not a generated-image cutout. Image-generator studies were discarded because their checkerboard backgrounds were opaque. Their geometry and textures are not used in the final asset.

## Originality and review limits

This contour was drawn for the project. The direction was selected after comparing growing-stamp, flower, spiral and single-seed studies at large and small sizes. O-shaped marks are a common identity motif; no exclusive ownership or exhaustive trademark clearance is claimed. The earlier repeated-ring comparison concerned the rejected version and does not certify this revision.

The revised page was independently reviewed for composition, 320 px fit, accessible naming and quiet motion. This is a new design for the owner to judge, not a claim of owner visual approval.
