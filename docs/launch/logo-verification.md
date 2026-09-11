# 000h logo verification — 10 September 2026

> The owner rejected this first visual direction. It was replaced on 11 September by the Seed identity; see [the current brand guide](../../public/brand/README.md). The checks below describe the historical three-ring version.

The logo and landing integration are implemented locally. No public deployment was made as part of this change.

## Delivered

The primary identity is a custom flat vector: one organic contour with three diagonal oval openings. Marketing navigation, the documentation brand, the light/dark favicon and the social preview use the same geometry. A matching matte pink 3D render appears beside the component collection, using the shared FloatLayer entrance and scroll motion.

Assets and the preliminary similarity-check limits are documented in [the brand guide](../../public/brand/README.md). The website loads the 640 × 640 WebP, 35,732 bytes, rather than the full-resolution PNG. No new browser graphics engine or dependency was added.

## Evidence

- Production build, TypeScript and static export passed in the isolated launch checkout. TypeScript also passed in the main working copy after integration.
- Focused lint passed for the owned source. A repeated main-checkout lint process stopped making progress while reading an installed dependency and was terminated; the integrated documentation source then passed through the isolated checkout's working lint installation. The remaining integrated source was byte-identical to the already linted files.
- Focused logo browser/artifact verification passed **15 checks** against the production export: four widths (320, 390, 768 and 1440) in both themes; scroll depth; reduced motion, Motion Off and Flow Off; image-failure fallback; and alpha-region checks on the flat PNG and 3D WebP. Both images contain the exterior transparent area and exactly three separate transparent openings.
- The existing landing browser suite passed all six journey groups after the logo integration: responsive cards, live previews and drawer focus return, clipboard installation, mobile maker navigation, getting-started/privacy routes and reduced-motion drawer access. No browser errors were recorded.
- An independent reviewer found a narrow-phone header overflow. The correction preserves 44 px theme, colour and menu targets, switches Colours to its labelled icon on small screens, and hides only the visual attribution below 361 px. The full brand remains the accessible home-link name. The reviewer confirmed that the 320 px menu fits inside the page padding, opens, and reaches Components, and that the dark documentation mark has ink on its pink seal.
- Flat artwork and the 3D render were visually inspected on the actual light/dark desktop/mobile landing page. The sculpture has no pointer target, idle animation or moving text. It remains visible and still in quiet modes.
- The current main-checkout documentation brand passed fresh browser checks and visual inspection at desktop light/dark and mobile dark, with no browser errors. Its current navigation changes were retained.

The isolated evidence is under `.worktrees/000h-launch/output/playwright/000h-logo/` and `output/playwright/000h-launch/`. Original-source documentation captures are under `output/playwright/000h-logo-integrated/`. The baseline hashes, focused check script and integration receipt are retained in `.worktrees/000h-launch/.superpowers/000h-logo/`.

## Integration boundaries

Nineteen owned files were copied after confirming their original baselines or absence. Documentation source, its CSS and `DESIGN.md` received small targeted edits; simultaneous navigation work was preserved. Generated registry artifacts were not copied from the isolated snapshot. The snapshot commit is not a publication branch and must not be pushed wholesale.

The similarity comparison was a preliminary visual search, not exhaustive name or trademark clearance. The 3D asset is a rendered image, not an interactive model file.
