/**
 * The hero panel's own pose, solved against the artboard.
 *
 * `INSTRUMENT.home.rotation` is the pose the five scrolling chapters share. The
 * hero previously reused it with a hand-authored yaw sweep, which reproduced the
 * panel's position but not its perspective: the slab's top edge came out at
 * -0.09 dy/dx where `01-hero.png` measures -0.23, its bottom edge tilted the
 * wrong way, and its side edges leaned right where the artboard's left edge
 * leans left. Two extra degrees of freedom — pitch and roll — are what a face
 * turned away from the camera needs, and neither was in the old expression.
 *
 * These numbers are not authored. `.work/hero-stage4/fit-panel2.mjs` projects the
 * panel's own silhouette, rasterises it, and solves pitch, yaw, roll, instrument
 * x, instrument y and scale against eight landmarks measured off the artboard's
 * panel edges (`top` at x1000/x1200, `bottom` at x1000/x1280, `left` at y300/y580,
 * `right` at y300/y540). The solution below lands those eight within 8 px each,
 * 3.76 px RMS, down from 10.4 px for the pose it replaces.
 *
 * `HERO_INSTRUMENT_POSITION` replaces the hero frame's `instrument.position` in
 * `choreography.ts`; the rotation is written by `scene-controller.ts`, which
 * interpolates from `HOME_INSTRUMENT_ROTATION` so the other chapter frames, the
 * phone camera and the fallback all keep the pose they were built around.
 */
import { INSTRUMENT } from "./canonical";

/** The resting pose every scrolling chapter is built around. */
export const HOME_INSTRUMENT_ROTATION: readonly [number, number, number] =
  INSTRUMENT.home.rotation as unknown as [number, number, number];

/**
 * The hero's solved rotation, in radians. Pitch is the whole story: -0.308
 * against the home pose's +0.05, which is what tips the slab's top away from the
 * camera and gives the panel its depth. The yaw is within 0.01 of the value the
 * old expression ended on, so the panel's turn is unchanged — only its lean.
 */
export const HERO_INSTRUMENT_ROTATION: readonly [number, number, number] = [
  -0.3083, -0.3297, -0.0096,
];

/**
 * The hero frame's instrument position. Solved with the rotation above, in the
 * instrument's own units; the scale stays at the frame's authored 0.98.
 */
export const HERO_INSTRUMENT_POSITION: readonly [number, number, number] = [
  0.4492, 0.2287, 0,
];
