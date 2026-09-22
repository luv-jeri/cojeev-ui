# Hero aperture — inputs and regeneration

Everything needed to re-derive `components/landing/assembly/aperture-profile.ts`,
plus what is known to be wrong with the result. The generated profile is checked
in; the bulky intermediates are not.

## What is here

| File | Role |
| --- | --- |
| `measured.mjs` | The pixel tables read off the reference artboard, and `atY` for sampling them. These are the measurements; nothing below re-measures the PNG. |
| `frame.mjs` | The production camera and the aperture's production transform, the pixel ray, and `pixelToLocal` — the ray/plane intersection that maps a traced pixel into the aperture's local space. |
| `generate-profile.mjs` | Walks the measured contours, casts each station onto the outer contour, solves each station's trace depth against the floor plane, and writes `aperture-profile.ts`. |

Reference artboard: `.work/deepseek-handoff-2026-09-23/artboards/01-hero.png`
(1536x1024). Scratch captures and diagnostics live in `.work/hero-aperture/`;
both `.work/` trees are gitignored and are not part of the deliverable.

## Regenerate

```sh
node components/landing/assembly/aperture/generate-profile.mjs          # writes the profile
node components/landing/assembly/aperture/generate-profile.mjs --verbose
npm run test:aperture                                                  # geometry + crossing checks
```

`generate-profile.mjs` prints the acceptance numbers it checks, aborts on any of
them, and is the only writer of `aperture-profile.ts`. Do not hand-edit that file.

## How the profile is derived

The camera and the object transform are the production ones — `CHAPTERS[0]`
camera `[0.55, 0.26, 4.2]` / target `[-0.42, -0.06, 0]` / fov 35, aperture
position `[0.85, 0.52, -0.7]`, rotation `[0, -0.12, -0.11]`, scale `1.62` — so
the silhouette lands on the artboard through the real pipeline rather than
through a scratch camera.

1. The visible band's outer silhouette is traced pixel by pixel: the left leg's
   outer and inner edges, the right leg's inner edge, the hole bottom, and the
   lower cream base that joins the legs beneath the source plate.
2. Each station pairs one inner point with one outer point. The outer point is
   found by casting the station's ray from the inner contour and taking the
   first hit on the outer silhouette, so the rendered edge cannot drift from the
   measurement.
3. Both contours are converted to the object's local space by intersecting each
   traced pixel's view ray with a local `z = const` plane.

The crown of the arch and the right leg's outer edge are above or outside the
frame; they are authored, not measured. Anything that stays off-frame renders
identically whatever width it is given, so those are authored at `inner + 240`
to keep the rule shared between the crown's right half and the right leg.

## The base, and why the depth is per station

Traced on one plane, the base's outer edge lands 0.16 to 0.31 *below* the hero
floor plane (`INSTRUMENT.floor.y = -1.02`) and the opaque floor then renders in
front of it: the whole lower base disappears and the band appears to end in two
separate feet. That was the visible defect, and it was not a missing surface.

A traced pixel cannot be moved on screen by sliding it along its own view ray, so
each station is instead traced on the plane where its outer edge reaches the
floor, and `APERTURE_DEPTH` carries that per-station offset into the mesh. The
silhouette stays pixel-exact and the ground contact lands in the floor plane,
where a contact shadow can find it. Stations already above the floor get depth 0
and are untouched.

## Known defects — do not describe this as clean

1. **The band crosses itself at both feet.** The corrected triangle-triangle
   predicate in `../aperture-intersections.ts` finds 115 non-adjacent crossing
   pairs, all in the two foot spans (spans 169-173 and 7-9). The inner contour
   has no authored stations between the right end of the hole bottom
   `(1319, 832)` and the right leg's inner edge `(1356, 800)`, so the walk spans
   that turn with a few very long cross-sections (up to 265 px) that rotate
   fast, and the ruled surface between them folds through itself. The fix is to
   author inner stations through each foot; it has not been done. The previous
   verifier reported "0 crossings" for *any* input, so this was invisible.
2. **The traced edges sit about 13 px outside the rendered bevel.** The trace is
   taken at the section's extreme (`z = ±halfDepth`) while the rounded edge
   reaches the silhouette one bevel radius inside it. It is a systematic offset on
   every edge, it is why the base measures 3-5 px high rather than 0, and it is
   left alone deliberately: correcting it moves every surface that currently
   passes.
3. **The base's silhouette is 3-5 px high across x 880-1320** against
   `BASE_LOWER`, and the extreme bottom-right corner (x > 1480) is 20-30 px short
   of the measured table — where the measurement itself may be reading the
   floor's reflection rather than the band.

## Verified

- Closed manifold, consistent winding, Euler characteristic 0 (`npm run test:aperture`).
- No degenerate triangles; finite, non-degenerate per-station UVs.
- Base's lower edge within 3-5 px of the reference across x 880-1320, with the
  floor present, measured from a real 1536x1024 capture.
- 78 stations resting on the floor plane; nothing below it.
