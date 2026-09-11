# Seed identity revision — 11 September 2026

The owner rejected the first three-ring logo. This revision replaces it with a single asymmetric zero, used as the first character of the marketing wordmark, plus a smaller olive 3D counterpart at the closing invitation. The previous sculpture and extra collection-introduction space were removed.

## Completed evidence

- The focused visual and artifact check passed **15 checks** on the current local development preview: four widths (320,390,768,1440) in light/dark, scroll movement, reduced motion, Motion Off, Flow Off, image-failure fallback and alpha-region checks. Both flat PNG and 3D WebP have one transparent opening plus the transparent exterior. No browser errors were recorded.
- The reviewer found no visual or layout blockers. The first-zero wordmark reads as the name; the sculpture belongs to the closing invitation. At 320px all header controls and the closing text/artwork/action fit. The full accessible brand name remains intact. Quiet scrolling keeps the sculpture still.
- Desktop/mobile screenshots were inspected at `output/playwright/000h-seed/` and `output/playwright/000h-seed-check/` inside the isolated launch checkout.
- The final sculpture was rendered from the actual SVG with the existing Three.js dependency and exported as transparent PNG/WebP. It does not add a graphics engine to the website runtime. The two generated-image studies had opaque checkerboard backgrounds and were discarded.
- Eighteen source/asset files were copied into the main working copy after checking their saved baselines, and the DESIGN section was merged separately. The original navigation changes were retained. `git diff --check` passed for the owned changes.
- The existing in-app preview tab was navigated to `http://127.0.0.1:4335/cojeev-ui/` and its updated closing copy was confirmed in the visible page.

## Verification limits

Production compilation succeeded, but the subsequent type-check/export did not complete during this revision. The full build, direct export build and lint processes repeatedly stopped making progress while loading installed dependency files. They were terminated; no fresh production-export or lint pass is claimed. A probe of the separate main-checkout development server on 4320 also timed out, so it is not recorded as visual evidence. The current reviewed preview is 4335; 4336 retains the previous static export.

The source integration is complete and the design is available for the owner to judge. No public deployment or owner visual approval is claimed. The updated asset guide is [public/brand/README.md](../../public/brand/README.md).
