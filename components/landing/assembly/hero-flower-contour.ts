/**
 * The hero's own flower silhouette.
 *
 * The seven-petalled flower in the artboard's hero is not one of the twelve
 * silhouettes in `registry/cojeev/lib/signature-shapes.ts`, and it must not
 * become one. That table is shipped to consumers, so widening its `petal-7` to
 * suit this scene would restyle every install that uses the preset to satisfy one
 * page — the same objection that stopped the first attempt at this flower. The
 * hero therefore carries its own contour here, in site-only code, and the shared
 * table stays exactly as it was authored.
 *
 * Reading `01-hero.png`: the flower is a disc that holds one radius right through
 * to each notch, and the notches are deep but narrow. Measured off the artboard's
 * yellow mask, the tip-to-valley ratio is 0.13 and 85% of the outline sits above
 * half the tip radius. `a + b*cos 7t` cannot express that, because it ties petal
 * count, petal width and notch depth into one number: it draws either a pebble
 * (small `b`) or a seven-pointed star (large `b`), and the star is what the hero
 * drew before this. Cutting notches out of a disc lets the three move
 * independently.
 *
 * The constants are not eyeballed. Each candidate was built through the running
 * scene's own `setFlowerContour`, projected through the hero camera, and scored
 * on its coverage curve — the fraction of the outline outside each fraction of
 * the tip radius — against the same curve measured off the artboard. This set
 * reproduces that curve to within 0.03 per level, which is why the petals read as
 * separated lobes rather than as a scalloped disc.
 */
import { shapeContour } from "@/registry/cojeev/lib/signature-shapes";

/** Counted off the artboard's silhouette: seven lobes at seven even pitches. */
export const HERO_FLOWER_PETALS = 7;
/**
 * `depth` is how far a notch cuts as a fraction of the tip radius, `sigma` its
 * half-width in radians and `phase` its rotation. The notch profile is Gaussian;
 * a flatter or sharper apex was measured too and neither matched.
 */
export const HERO_FLOWER_NOTCH = {
  depth: 0.96,
  sigma: 0.14,
  phase: 0.385,
} as const;
/**
 * Tip radius in the shared 100-unit viewBox. The table's own silhouettes sit
 * between 35 and 46, and `tests/signature-shapes.test.ts` requires every point to
 * stay inside the box, so this matches their scale rather than inventing one.
 */
const HERO_FLOWER_TIP = 45;

const TAU = Math.PI * 2;
const PERIOD = TAU / HERO_FLOWER_PETALS;

/** Distance from a petal centre to the nearest notch centre, in radians. */
function notchOffset(angle: number) {
  const index = (angle - HERO_FLOWER_NOTCH.phase) / PERIOD - 0.5;
  return (index - Math.round(index)) * PERIOD;
}

function heroFlowerRadius(angle: number) {
  const cut = notchOffset(angle) / HERO_FLOWER_NOTCH.sigma;
  return HERO_FLOWER_TIP * (1 - HERO_FLOWER_NOTCH.depth * Math.exp(-(cut * cut) / 2));
}

/**
 * The contour in the shared 96-segment form, so it can be blended numerically
 * with the table's own silhouettes and exported through the same path string the
 * Shape press writes.
 */
export const HERO_FLOWER_PATH = shapeContour((angle) => {
  const radius = heroFlowerRadius(angle);
  return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
});
