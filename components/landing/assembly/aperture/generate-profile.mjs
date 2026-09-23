/**
 * Build the hero aperture profile from artboards/01-hero.png.
 *
 * ONE coordinate convention, stated once: the profile is authored in the
 * aperture object's LOCAL space, exactly like every other part of the assembly.
 * Traced artboard pixels are converted by intersecting their view ray with the
 * aperture's own local z = +q / z = -q planes and taking the result through
 * `apertureObject().worldToLocal`. The object therefore keeps the production
 * transform untouched (position + rotation + scale, as applied by
 * scene-controller.ts); nothing is compensated and no rotation is forced to
 * zero. No scratch camera is used at all.
 *
 * THE BAND IS A CLOSED RING. The reference is a sculpted horseshoe: the crown
 * leaves the top of the frame and the two legs are joined by a continuous
 * curved base that passes beneath the source plate. The previous pass treated
 * the opening as an open horseshoe and capped it at two feet below the last
 * trustworthy scanline, which left the visible black gap where the artboard has
 * a cream base. The base is measured here like every other edge, and the walk
 * closes, so the solid is a ring with no end caps at all.
 *
 * How the two contours are obtained:
 *   - INNER is measured end to end — `LEFT_INNER` up the left leg, the authored
 *     (off-frame) crown intrados, `RIGHT_INNER` down the right leg, and
 *     `HOLE_BOTTOM` back along the bottom of the opening to where the walk
 *     started;
 *   - OUTER is the measured silhouette where it is on-frame — `LEFT_OUTER`,
 *     `BASE_LOWER` — plus authored off-frame arcs for the crown extrados and
 *     the right leg, whose outer edge is entirely outside the frame.
 *
 * The correspondence between them is a perpendicular: each inner point is
 * paired with the point where its outward normal meets the outer contour. That
 * is what a swept band actually is, and because the paired point is *on* the
 * traced outer contour, the rendered silhouette cannot drift from the
 * measurement. (An earlier pass offset the inner edge by a scalar width, which
 * put the outer edge up to ~110 px right of the measured one through the left
 * shoulder and folded where the traced inner edge kinks. Intersecting with the
 * traced contour removes both failure modes: the outer point is a traced point
 * by construction.)
 *
 * Silhouette mapping, derived from which faces this camera can see:
 *   - the outer silhouette is the FRONT face's outer edge, so it is traced onto
 *     the local z = +q plane;
 *   - the inner silhouette is the BACK face's inner edge (the camera sits to
 *     the right of the left leg, so the inner wall is visible), so it is traced
 *     onto z = -q.
 * The cross-section is symmetric about those two, which is what makes the solid
 * close.
 *
 * usage: node components/landing/assembly/aperture/generate-profile.mjs
 */
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import {
  heroCamera,
  apertureObject,
  pixelRay,
  pixelToLocal,
  intersectPlane,
  W,
  H,
  HALF_DEPTH,
  BEVEL,
} from './frame.mjs';
import {
  LEFT_INNER,
  LEFT_OUTER,
  RIGHT_INNER,
  HOLE_BOTTOM,
  BASE_LOWER,
  atY,
} from './measured.mjs';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const OUT_TS = path.join(ROOT, 'components/landing/assembly/aperture-profile.ts');
const OUT_JSON = path.join(ROOT, '.work/hero-aperture/trace.json');

const camera = heroCamera();
const aperture = apertureObject();

/* ---------------------------------------------------------------- ray sanity */
{
  let worst = 0;
  for (let sx = 0; sx <= W; sx += 64)
    for (let sy = 0; sy <= H; sy += 64) {
      const { correct, analytic } = pixelRay(camera, sx, sy);
      worst = Math.max(worst, correct.distanceTo(analytic));
    }
  console.log(
    `ray cross-check: max |unproject - analytic| direction delta = ${worst.toExponential(3)}`,
  );
}

/* ------------------------------------------------------------ inner contour */
/**
 * Walked once around the ring, screen pixels, y down:
 *   left leg upward -> crown -> right leg downward -> bottom of the opening
 *   back to the left foot, where the walk closes.
 *
 * Walking that way makes the outward normal of a clockwise loop simply
 * `(ty, -tx)` for the forward tangent `(tx, ty)` — no per-point sign guesswork.
 */
const LEG_Y = [];
for (let y = 0; y <= 800; y += 32) LEG_Y.push(y);

/** Authored crown intrados: above the frame, so unmeasurable. */
const CROWN = [
  [1215, -75],
  [1300, -155],
  [1400, -195],
  [1500, -175],
  [1580, -115],
  [1640, -20],
  [1668, 100],
  [1665, 230],
  [1630, 330],
];
/** Authored crown extrados: a perpendicular offset of the intrados. */
const CROWN_WIDTH = [200, 205, 209, 213, 217, 220, 223, 226, 230];
/**
 * Index in CROWN from which the extrados is taken horizontally rather than
 * perpendicular to the intrados — the point where the intrados has turned far
 * enough down that a horizontal cut is the cross-section again.
 */
const CROWN_HORIZONTAL_FROM = 5;

const INNER_PX = [];
/** parallel to INNER_PX: where the point came from, and the horizontal outward */
const KIND = [];
let CROWN_OFFSET = 0;
for (const y of [...LEG_Y].reverse()) {
  INNER_PX.push([atY(LEFT_INNER, y), y]);
  KIND.push({ part: 'leftLeg', y });
}
CROWN_OFFSET = INNER_PX.length;
for (const [x, y] of CROWN) {
  INNER_PX.push([x, y]);
  KIND.push({ part: 'crown', y });
}
for (let y = 416; y <= 832; y += 32) {
  INNER_PX.push([atY(RIGHT_INNER, y), y]);
  KIND.push({ part: 'rightLeg', y });
}
/**
 * The opening's bottom, walked right to left back to the left foot.
 *
 * Two cuts here, and both of them cost the band its feet:
 *   - the measured corner `(1300, 842)` used to be dropped by `x < 1300`, and
 *   - `(1319, 832)` is the right leg's own last inner point, so it is skipped to
 *     avoid a zero-length segment.
 * Without `(1300, 842)` the walk chained `(1319, 832)` straight to `(1280, 849)`
 * and turned about 90 degrees in a single station, which folds the swept surface
 * through itself. `x >= 1000` stays: below that the opening's left wall is
 * already carried by `LEFT_INNER`, and re-adding it would double it back.
 */
const HOLE_BOTTOM_FROM = 1000;
for (const [x, y] of [...HOLE_BOTTOM].reverse()) {
  if (x < HOLE_BOTTOM_FROM) continue;
  if (x === 1319 && y === 832) continue;
  INNER_PX.push([x, y]);
  KIND.push({ part: 'base', y });
}

/**
 * How much of the cross-section direction comes from the band's centreline
 * normal rather than from a plain horizontal cut.
 *
 * A horizontal cut IS the cross-section while the band runs vertically — that
 * is what makes the measured `LEFT_WIDTH` table meaningful, and it is the
 * pairing the legs and crown already render correctly. It stops being the
 * cross-section where the band turns under into the base, and there the
 * cross-section is the centreline's normal. The weight ramps between the two
 * across the feet, and at y = 576 and y = 640 the two directions already agree
 * to within a couple of degrees, so the ramp introduces no visible seam.
 */
function horizontalWeight({ part, y }, index) {
  if (part === 'base') return 1;
  if (part === 'crown') return index >= CROWN_OFFSET + CROWN_HORIZONTAL_FROM ? 0 : 1;
  if (part === 'leftLeg') return Math.min(1, Math.max(0, (y - 576) / 224));
  return Math.min(1, Math.max(0, (y - 640) / 160));
}
/** outward horizontal unit vector, where a horizontal cut is meaningful */
function horizontalDirection({ part }, index) {
  if (part === 'leftLeg') return [-1, 0];
  if (part === 'rightLeg') return [1, 0];
  if (part === 'crown' && index >= CROWN_OFFSET + CROWN_HORIZONTAL_FROM) return [1, 0];
  return null;
}

/* ------------------------------------------------------------ outer contour */
/**
 * The traced part of the outer silhouette, in the same walk direction, plus the
 * authored off-frame arcs. Used twice: as the target the normals are aimed at,
 * and (through the hits) as the outer control points themselves.
 */
const OUTER_PX = [];
/**
 * Every measured point of the left leg's outer edge, including `(750, 832)`.
 *
 * Cutting at `y > 800` dropped that point and left the walk chaining the base's
 * left end `(760, 823)` directly to `(754, 800)` — a 23 px step that turns about
 * 90 degrees in one station. `(750, 832)` is the measured corner itself, and it
 * is the only traced outer point between the leg and the base's left end.
 */
for (const [x, y] of [...LEFT_OUTER].sort((a, b) => b[1] - a[1])) {
  OUTER_PX.push([x, y]);
}
{
  /* Crown extrados, using the measured legs as tangent neighbours at the joins.
   * Only the half where the crown still runs horizontally is offset
   * perpendicular to the intrados. Past the point where the intrados turns down
   * into the right leg the offset is taken horizontally instead — the same rule
   * as the right leg below it. Offsetting perpendicular there lands the
   * extrados *past* the leg's own edge, so the outer contour doubles back and
   * rays from the crown reach it behind rays from the leg. */
  const withNeighbours = [[atY(LEFT_INNER, 0), 0], ...CROWN, [atY(RIGHT_INNER, 416), 416]];
  for (let i = 1; i < withNeighbours.length - 1; i++) {
    if (i - 1 >= CROWN_HORIZONTAL_FROM) break;
    const [px, py] = withNeighbours[i - 1];
    const [x, y] = withNeighbours[i];
    const [nx, ny] = withNeighbours[i + 1];
    const tx = nx - px;
    const ty = ny - py;
    const length = Math.hypot(tx, ty) || 1;
    const width = CROWN_WIDTH[i - 1];
    OUTER_PX.push([x + (ty / length) * width, y + (-tx / length) * width]);
  }
}
/**
 * Right leg outer edge: entirely off-frame, so it is authored 240 px to the
 * right of the measured inner edge. The crown's right half follows the same
 * rule, which is what lets the two join without a step. Any width that keeps it
 * off-frame renders identically.
 */
for (const [x, y] of CROWN.slice(CROWN_HORIZONTAL_FROM)) OUTER_PX.push([x + 240, y]);
for (let y = 416; y <= 800; y += 32) OUTER_PX.push([atY(RIGHT_INNER, y) + 240, y]);
/**
 * Off-frame turn where the right leg's outer edge meets the base's lower edge,
 * then the measured lower edge itself, walked right to left.
 *
 * The turn was three hand-placed points, which put a V exactly where the contour
 * meets the frame edge at `(1536, 980)`: the base's lower edge leaves that point
 * up-and-left while the leg's outer edge arrived from above, so the centreline
 * turned about 46 degrees in one station. A band ~135 px wide cannot turn on a
 * corner that tight, and the sweep folded through itself there.
 *
 * It is a circular arc tangent to both measured edges instead, which is what the
 * band does out of sight. The arc stays at x >= 1536, so none of it is visible;
 * what it fixes is the ruling of the visible base just inside the frame edge.
 */
function tangentArc(from, to, startTangent, samples) {
  const chordLength = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const chord = [(to[0] - from[0]) / chordLength, (to[1] - from[1]) / chordLength];
  /* the chord bisects the turn, so the total turn is twice its angle to the tangent */
  const turn = 2 * Math.atan2(
    startTangent[0] * chord[1] - startTangent[1] * chord[0],
    startTangent[0] * chord[0] + startTangent[1] * chord[1],
  );
  const radius = chordLength / (2 * Math.sin(Math.abs(turn) / 2));
  /* the half-plane the centre falls in and the direction the spoke turns are two
   * independent sign choices; only one pair lands on `to`, so try them all */
  for (const side of [1, -1]) {
    for (const spin of [1, -1]) {
      const centre = [
        from[0] + -startTangent[1] * side * radius,
        from[1] + startTangent[0] * side * radius,
      ];
      const spoke = [from[0] - centre[0], from[1] - centre[1]];
      const at = (angle) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
          centre[0] + spoke[0] * cos - spoke[1] * sin,
          centre[1] + spoke[0] * sin + spoke[1] * cos,
        ];
      };
      /* the end point itself is not emitted: the walk's next control point is
       * already there, and duplicating it would make a zero-length segment */
      const end = at(turn * spin);
      if (Math.hypot(end[0] - to[0], end[1] - to[1]) >= 1) continue;
      const arc = [];
      for (let i = 1; i < samples; i++) arc.push(at((turn * spin * i) / samples));
      return arc;
    }
  }
  throw new Error('tangentArc produced no arc that reaches its end point');
}
{
  const legEnd = [atY(RIGHT_INNER, 800) + 240, 800];
  const legBefore = [atY(RIGHT_INNER, 768) + 240, 768];
  const legLength = Math.hypot(legEnd[0] - legBefore[0], legEnd[1] - legBefore[1]);
  const startTangent = [
    (legEnd[0] - legBefore[0]) / legLength,
    (legEnd[1] - legBefore[1]) / legLength,
  ];
  /* BASE_LOWER's lowest measured point, which is also where it enters the frame */
  OUTER_PX.push(...tangentArc(legEnd, BASE_LOWER[BASE_LOWER.length - 1], startTangent, 12));
}
for (const [x, y] of [...BASE_LOWER].reverse()) OUTER_PX.push([x, y]);

/* --------------------------------------------- pair by perpendicular onto it */
const closedCurve = (points) =>
  new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'centripetal',
  );

const outerCurve = closedCurve(OUTER_PX);
const DENSE = 4000;
const outerDense = [];
for (let i = 0; i < DENSE; i++) outerDense.push(outerCurve.getPoint(i / DENSE));
/** cumulative arc length of the dense polyline, so a hit has a monotone position */
const outerArc = [0];
for (let i = 0; i < DENSE; i++) {
  const a = outerDense[i];
  const b = outerDense[(i + 1) % DENSE];
  outerArc.push(outerArc[i] + Math.hypot(b.x - a.x, b.y - a.y));
}
const OUTER_LENGTH = outerArc[DENSE];
/** an inversion under 0.2% of the contour is scanline noise, not a crossing */
const arcTolerance = OUTER_LENGTH * 0.002;

/** nearest forward intersection of a ray with the dense outer polyline */
function castToOuter(origin, direction, maxDistance = 500) {
  let best = null;
  for (let i = 0; i < outerDense.length; i++) {
    const a = outerDense[i];
    const b = outerDense[(i + 1) % outerDense.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denominator = direction[0] * ey - direction[1] * ex;
    if (Math.abs(denominator) < 1e-12) continue;
    const rx = a.x - origin[0];
    const ry = a.y - origin[1];
    const w = (rx * ey - ry * ex) / denominator;
    const s = (rx * direction[1] - ry * direction[0]) / denominator;
    if (w > 1e-6 && w <= maxDistance && s >= -1e-9 && s <= 1 + 1e-9) {
      if (!best || w < best.w) best = { w, s, i };
    }
  }
  if (!best) return null;
  return {
    point: [
      origin[0] + direction[0] * best.w,
      origin[1] + direction[1] * best.w,
    ],
    width: best.w,
    segment: best.i,
    arc: outerArc[best.i] + best.s * (outerArc[best.i + 1] - outerArc[best.i]),
  };
}

/**
 * Cross-section direction.
 *
 * NOT the traced inner edge's own normal. A traced edge carries scanline
 * quantisation, and through the left shoulder its tangent turns fast enough that
 * neighbouring normals cross each other — rays then reach the outer contour out
 * of order and the swept solid folds. What a swept band's cross-section
 * actually is, is the normal of the band's own CENTRELINE, so that is used,
 * obtained by iterating:
 *
 *   pair by the current direction -> centres -> the centres' normal -> re-pair
 *
 * The iteration is pinned to the horizontal cut wherever `horizontalWeight` is
 * zero, so the legs and crown rule exactly as they did when they were accepted;
 * the centreline normal only takes over across the feet, where the band
 * genuinely turns under and the horizontal cut stops being a cross-section.
 *
 * Since every paired point is still cast onto the traced outer contour, the
 * silhouette is the measurement whatever direction is used — the direction only
 * decides how the interior is ruled, and this is the ruling that does not cross
 * itself.
 */
const normalsFrom = (centres) => {
  const curve = closedCurve(centres);
  const dt = 1 / (centres.length * 4);
  return centres.map((_, index) => {
    const t = index / centres.length;
    const a = curve.getPoint((t - dt + 1) % 1);
    const b = curve.getPoint((t + dt) % 1);
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const length = Math.hypot(tx, ty) || 1;
    return [ty / length, -tx / length];
  });
};

const tracedNormals = INNER_PX.map((_, index) => {
  const previous = INNER_PX[(index - 1 + INNER_PX.length) % INNER_PX.length];
  const next = INNER_PX[(index + 1) % INNER_PX.length];
  const tx = next[0] - previous[0];
  const ty = next[1] - previous[1];
  const length = Math.hypot(tx, ty) || 1;
  return [ty / length, -tx / length];
});

const mix = (a, b, t) => {
  const x = a[0] * (1 - t) + b[0] * t;
  const y = a[1] * (1 - t) + b[1] * t;
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
};

/** the horizontal cut where it is meaningful, blended into the centreline normal */
const withWeights = (centrelineNormals) =>
  INNER_PX.map((_, index) => {
    const kind = KIND[index];
    const weight = horizontalWeight(kind, index);
    const horizontal = horizontalDirection(kind, index);
    if (!horizontal) return centrelineNormals ? centrelineNormals[index] : tracedNormals[index];
    if (weight >= 1) return centrelineNormals ? centrelineNormals[index] : tracedNormals[index];
    const base = centrelineNormals ? centrelineNormals[index] : tracedNormals[index];
    return mix(horizontal, base, weight);
  });

let directions = withWeights(null);
let hits = [];
for (let pass = 0; pass < 6; pass++) {
  const cast = INNER_PX.map((point, index) => castToOuter(point, directions[index]));
  if (cast.some((hit) => !hit)) break;
  hits = cast;
  directions = withWeights(
    normalsFrom(
      INNER_PX.map((point, index) => [
        (point[0] + hits[index].point[0]) / 2,
        (point[1] + hits[index].point[1]) / 2,
      ]),
    ),
  );
}
if (!hits.length) hits = INNER_PX.map((point, index) => castToOuter(point, directions[index]));

const misses = hits
  .map((hit, index) => (hit ? null : index))
  .filter((index) => index !== null);
if (misses.length) {
  console.error(`FAIL: ${misses.length} inner points have no outer hit: ${misses.join(', ')}`);
  process.exit(1);
}

/* The hits must advance monotonically ALONG the outer contour: a later inner
 * point that pairs to an earlier outer point means two cross-sections cross
 * each other and the swept solid folds. Arc position, not segment index — the
 * authored off-frame arcs can double back on themselves, which moves the
 * segment index backwards while the position still advances. */
{
  /* unwrap the single lap so the wrap-around is not read as an inversion */
  let offset = 0;
  for (let i = 0; i < hits.length; i++) {
    let arc = hits[i].arc + offset;
    if (i > 0 && arc < hits[i - 1].arc - OUTER_LENGTH * 0.5) {
      offset += OUTER_LENGTH;
      arc += OUTER_LENGTH;
    }
    hits[i].arc = arc;
  }
  if (process.argv.includes('--verbose')) {
    INNER_PX.forEach((point, index) => {
      const hit = hits[index];
      console.log(
        `  ${String(index).padStart(2)} ${KIND[index].part.padEnd(8)} ` +
          `inner ${point.map((n) => n.toFixed(0)).join(',')}` +
          ` -> arc ${hit.arc.toFixed(0).padStart(5)}` +
          ` hit ${hit.point.map((n) => n.toFixed(0)).join(',')} width ${hit.width.toFixed(1)}`,
      );
    });
  }
  let previous = -Infinity;
  let inversions = 0;
  let worst = 0;
  for (const hit of hits) {
    if (hit.arc < previous - arcTolerance) {
      inversions++;
      worst = Math.max(worst, previous - hit.arc);
      if (inversions <= 8) {
        console.log(
          `  non-monotone: ${KIND[hits.indexOf(hit)].part} arc ${hit.arc.toFixed(1)} ` +
            `behind ${previous.toFixed(1)}`,
        );
      }
    }
    previous = Math.max(previous, hit.arc);
  }
  const widths = hits.map((hit) => hit.width);
  console.log(
    `outer hits: monotone=${inversions === 0} worst inversion ${worst.toFixed(1)} px ` +
      `(tolerance ${arcTolerance.toFixed(1)}) width min ${Math.min(...widths).toFixed(1)} ` +
      `max ${Math.max(...widths).toFixed(1)} px`,
  );
  if (inversions) {
    console.error('FAIL: outer hits are not monotone along the traced contour');
    process.exit(1);
  }
}

/**
 * Fill the gaps between cast hits from the traced outer polyline.
 *
 * The mesh's outer silhouette is not the traced contour: it is the curve through
 * the *hits*, one per inner control point. Casts are sparse exactly where the
 * contour turns hardest — at the right foot three hits spanned the whole corner,
 * so the base's last 130 px of traced lower edge, from x = 1400 out to the frame
 * edge, were chorded straight past and the base visibly ended short. Sampling the
 * dense polyline inside each gap puts the traced edge back in the silhouette.
 * The station count does not change: the stations resample this curve by arc
 * length either way.
 */
function outerIndexAtArc(target) {
  let low = 0;
  let high = DENSE;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (outerArc[mid] <= target) low = mid;
    else high = mid;
  }
  return low;
}
/** angle turned per pixel of contour, averaged over a window that wide */
function outerTurnRate(index, window) {
  const a = outerDense[(index - window + DENSE) % DENSE];
  const b = outerDense[index];
  const c = outerDense[(index + window) % DENSE];
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu < 1e-9 || lv < 1e-9) return 0;
  const turned = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
  return turned / ((lu + lv) / 2);
}
const outerControlPoints = [];
{
  const mostPerGap = 24;
  const smallestGapWorthFilling = 16;
  for (let i = 0; i < hits.length; i++) {
    outerControlPoints.push(hits[i].point);
    let span = hits[(i + 1) % hits.length].arc - hits[i].arc;
    if (span <= 0) span += OUTER_LENGTH;
    const inserts = Math.min(mostPerGap, Math.floor(span / smallestGapWorthFilling));
    /* A band of half-width h folds if the centreline's radius drops below h, so
     * the traced edge can only be followed where its curvature radius stays
     * above the section's half-width. At the left foot's outer corner it does
     * not — the measured corner spans about 25 px while the band is 135 px wide
     * — and following it there is what folds the sweep through itself. Skipping
     * those points leaves the chord, which is the closest a solid this wide can
     * come to the reference's rounded corner. */
    const halfWidth = Math.max(hits[i].width, hits[(i + 1) % hits.length].width) / 2;
    const window = Math.max(2, Math.round(halfWidth));
    for (let k = 1; k <= inserts; k++) {
      const at = (hits[i].arc + (span * k) / (inserts + 1)) % OUTER_LENGTH;
      const index = outerIndexAtArc(at);
      if (outerTurnRate(index, window) * halfWidth > 1) continue;
      outerControlPoints.push([outerDense[index].x, outerDense[index].y]);
    }
  }
}

/* Resample both contours together. Both curves take the same control points in
 * the same order, so sampling them at the same parameter keeps the pairing. */
const STATIONS = 240;
const innerCurve = closedCurve(INNER_PX);
const hitCurve = closedCurve(outerControlPoints);
const stationsScreen = [];
for (let i = 0; i < STATIONS; i++) {
  const t = i / STATIONS;
  const a = innerCurve.getPointAt(t);
  const b = hitCurve.getPointAt(t);
  stationsScreen.push({
    inner: [a.x, a.y],
    outer: [b.x, b.y],
    centre: [(a.x + b.x) / 2, (a.y + b.y) / 2],
    width: Math.hypot(b.x - a.x, b.y - a.y),
  });
}

/* ------------------------------------------------------------------ to local */
const q = HALF_DEPTH;

/**
 * The hero floor plane, from `canonical.ts` `INSTRUMENT.floor.y`. The band
 * stands on it, so the base's outer edge has to reach it.
 */
const FLOOR_Y = -1.02;
/** Rest the band a hair above the floor rather than exactly on it. */
const FLOOR_CLEARANCE = 0.006;

/** World y of a traced pixel's ray at local depth `z`. */
function worldYAt(pixel, object, camera, z) {
  const local = pixelToLocal(object, camera, pixel[0], pixel[1], z);
  return object.localToWorld(local).y;
}

/**
 * Per-station depth of the cross-section's centre plane.
 *
 * Every traced pixel keeps its own view ray, so sliding a station along that ray
 * is invisible from this camera. That freedom is what puts the base on the
 * floor: traced on the nominal z = +q plane the base's outer edge lands 0.16 to
 * 0.31 *below* the floor, and the opaque floor then renders in front of it and
 * the whole lower base vanishes from the frame.
 *
 * So solve, per station, for the depth at which the outer edge reaches the floor
 * (plus a hair of clearance) and clamp at 0 — stations already above the floor
 * keep the nominal plane, which is why the legs and crown are untouched.
 * `worldYAt` is monotone in z, so a bisection on [q, floor crossing] is exact.
 */
function stationDepths(stationsScreen, object, camera) {
  return stationsScreen.map((station) => {
    const nominal = worldYAt(station.outer, object, camera, q);
    const target = Math.max(nominal, FLOOR_Y + FLOOR_CLEARANCE);
    if (target <= nominal) return 0;
    /* the outer ray's crossing of the floor plane brackets the solution */
    const ray = pixelRay(camera, station.outer[0], station.outer[1]);
    const crossing = object.worldToLocal(
      intersectPlane(
        ray.origin,
        ray.correct,
        new THREE.Vector3(0, FLOOR_Y, 0),
        new THREE.Vector3(0, 1, 0),
      ),
    ).z;
    let low = q;
    let high = Math.max(crossing, q);
    for (let step = 0; step < 48; step++) {
      const mid = (low + high) / 2;
      if (worldYAt(station.outer, object, camera, mid) < target) low = mid;
      else high = mid;
    }
    return Math.max(0, (low + high) / 2 - q);
  });
}

/**
 * Fastest the depth may rise, in local units per station.
 *
 * The solve is a *lower* bound, not a curve: at the right foot the outer edge
 * crosses the floor over nine stations and the bisection lifts it 0.65 local
 * units across that run, in steps of 0.08 to 0.11. A sweep cannot follow a rise
 * that fast when it runs through the cross-section's own plane. Each station's
 * centre moves further along that plane than the section is deep, so neighbours
 * overlap, the strip between them stops being a ruling and the surface folds
 * through itself -- the crease at the right foot of the hero.
 *
 * Nothing forces the solve's exact values. World y is monotone in local z, so a
 * *deeper* station also clears the floor; the freedom only runs one way, which
 * is why this is a cone filter and not a blur. `limitRamp` returns the smallest
 * profile that still dominates the solve and never rises faster than the limit,
 * so the ground contact stays exactly where it was and only the approach to it
 * is spread.
 */
const RAMP_SLOPE = 0.03;

function limitRamp(values, slope) {
  const out = [...values];
  const n = out.length;
  /* the profile is a closed ring, so run the cone both ways until it settles */
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < n; i++) {
      const previous = out[(i - 1 + n) % n];
      if (previous - slope > out[i]) out[i] = previous - slope;
    }
    for (let i = n - 1; i >= 0; i--) {
      const next = out[(i + 1) % n];
      if (next - slope > out[i]) out[i] = next - slope;
    }
  }
  return out;
}

const solved = stationDepths(stationsScreen, aperture, camera);
const depths = limitRamp(solved, RAMP_SLOPE);
const stations = stationsScreen.map((s, index) => {
  const centreZ = depths[index];
  const outer = pixelToLocal(aperture, camera, s.outer[0], s.outer[1], centreZ + q);
  const innerBack = pixelToLocal(aperture, camera, s.inner[0], s.inner[1], centreZ - q);
  return {
    centre: s.centre,
    width: s.width,
    outer: [outer.x, outer.y],
    inner: [innerBack.x, innerBack.y],
    depth: centreZ,
  };
});

/* --------------------------------------------------------------- diagnostics */
const widthsLocal = stations.map((st) =>
  Math.hypot(st.outer[0] - st.inner[0], st.outer[1] - st.inner[1]),
);
const halfMin = Math.min(...widthsLocal) / 2;
console.log(
  `band width (local): min ${Math.min(...widthsLocal).toFixed(4)} max ${Math.max(...widthsLocal).toFixed(4)} world units`,
);
console.log(
  `half-width min ${halfMin.toFixed(4)} vs bevel ${BEVEL} -> radius ${Math.min(BEVEL, halfMin * 0.45).toFixed(4)}`,
);
if (halfMin <= BEVEL) {
  console.error('FAIL: half-width does not exceed the bevel radius');
  process.exit(1);
}

/* neither traced polyline may cross itself */
for (const [name, polyline] of [
  ['inner', stationsScreen.map((s) => s.inner)],
  ['outer', stationsScreen.map((s) => s.outer)],
]) {
  const seg = (p, q2, r, s) => {
    const d = (q2[0] - p[0]) * (s[1] - r[1]) - (q2[1] - p[1]) * (s[0] - r[0]);
    if (Math.abs(d) < 1e-12) return false;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
    const u = ((r[0] - p[0]) * (q2[1] - p[1]) - (r[1] - p[1]) * (q2[0] - p[0])) / d;
    return t > 0 && t < 1 && u > 0 && u < 1;
  };
  let crossings = 0;
  const n = polyline.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (seg(polyline[i], polyline[(i + 1) % n], polyline[j], polyline[(j + 1) % n])) crossings++;
    }
  console.log(`${name} polyline self-crossings: ${crossings}`);
  if (crossings) {
    console.error(`FAIL: the ${name} contour crosses itself`);
    process.exit(1);
  }
}

/* Does the base actually reach the floor plane, and does anything cross it? */
{
  let lowest = Infinity;
  let highest = -Infinity;
  let contact = 0;
  for (const station of stations) {
    const world = aperture.localToWorld(
      new THREE.Vector3(station.outer[0], station.outer[1], station.depth + q),
    );
    lowest = Math.min(lowest, world.y);
    highest = Math.max(highest, world.y);
    if (Math.abs(world.y - FLOOR_Y) < 0.02) contact++;
  }
  console.log(
    `base: outer edge world y ${lowest.toFixed(3)}..${highest.toFixed(3)} (floor ${FLOOR_Y}); ` +
      `${contact} stations resting on it; deepest lift ${Math.max(...depths).toFixed(3)} local`,
  );
  if (lowest < FLOOR_Y - 1e-6) {
    console.error('FAIL: the outer edge still reaches below the floor plane');
    process.exit(1);
  }
}

/* zero-length cross-sections or a duplicated station would tear the sweep */
{
  const half = widthsLocal.map((w) => w / 2);
  let degenerate = 0;
  for (let i = 0; i < stations.length; i++) {
    const a = stations[i];
    const b = stations[(i + 1) % stations.length];
    const step = Math.hypot(a.centre[0] - b.centre[0], a.centre[1] - b.centre[1]);
    if (step < half[i] * 0.02) degenerate++;
  }
  console.log(`stations closer together than 2% of their own half-width: ${degenerate}`);
}

/* ------------------------------------------------------------------- writes */
const nums = (list) =>
  list
    .flatMap((p) => [p[0], p[1]])
    .map((n) => Number(n.toFixed(5)));
const rows = (values, perRow = 8) => {
  const lines = [];
  for (let i = 0; i < values.length; i += perRow)
    lines.push('  ' + values.slice(i, i + perRow).join(', ') + ',');
  return lines.join('\n');
};

const ts = `/**
 * The hero aperture profile.
 *
 * GENERATED — do not hand-edit. Regenerate with:
 *   node components/landing/assembly/aperture/generate-profile.mjs
 *
 * Provenance: the visible band of \`artboards/01-hero.png\` was measured pixel by
 * pixel and the tables transcribed into
 * \`components/landing/assembly/aperture/measured.mjs\` (the scratch NumPy reads
 * that produced them live in \`.work/hero-aperture/\` and are not shipped), then
 * converted into this
 * object's LOCAL space by intersecting each traced pixel's view ray with the
 * aperture's own local z = +q (outer) and z = -q (inner) planes. The camera and
 * the object transform are the production ones — \`CHAPTERS[0].camera\` and the
 * hero aperture transform applied by \`scene-controller.ts\` (position
 * [0.85, 0.52, -0.7], scale 1.62, rotation [0, -0.12, -0.11]) — so the rendered
 * silhouette lands on the artboard through the real pipeline rather than
 * through a scratch camera.
 *
 * The band is a CLOSED RING: ${stations.length} stations once around, no end
 * caps. The crown of the arch and the right leg's outer edge are above /
 * outside the frame and are authored; everything else is measured, including
 * the lower cream base that joins the two legs beneath the source plate.
 *
 * Each array is walked once around the ring, x/y pairs in local units.
 * \`APERTURE_OUTER\` is the front face's outer edge and \`APERTURE_INNER\` the
 * back face's inner edge; the cross-section between them is a rounded rectangle
 * of half-depth ${q} and bevel ${BEVEL}. See \`aperture-geometry.ts\`.
 *
 * \`APERTURE_DEPTH\` slides each station's cross-section along its own view ray.
 * Sliding a traced pixel along its ray cannot move it on screen, so this is
 * free for the silhouette — and it is what puts the base's outer edge on the
 * hero floor plane (world y ${FLOOR_Y}) instead of 0.16-0.31 below it, where
 * the opaque floor hid the whole lower base. Stations already above the floor
 * are 0 and untouched.
 */

/** Front-face outer edge, ${stations.length} stations. */
export const APERTURE_OUTER: readonly number[] = [
${rows(nums(stations.map((s) => s.outer)))}
];

/** Back-face inner edge, same ${stations.length} stations, same walk. */
export const APERTURE_INNER: readonly number[] = [
${rows(nums(stations.map((s) => s.inner)))}
];

/** Local z of each station's cross-section centre, same walk. */
export const APERTURE_DEPTH: readonly number[] = [
${rows(stations.map((s) => Number(s.depth.toFixed(6))), 8)}
];

/** The ring is closed: station N-1 joins station 0. */
export const APERTURE_CLOSED = true;
`;

fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_TS, ts);
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      camera: { position: camera.position.toArray(), fov: camera.fov },
      aperture: {
        position: aperture.position.toArray(),
        rotation: [aperture.rotation.x, aperture.rotation.y, aperture.rotation.z],
        scale: aperture.scale.toArray(),
      },
      halfDepth: q,
      bevel: BEVEL,
      floorY: FLOOR_Y,
      depths,
      closed: true,
      /* the acceptance measurements, so the overlay check cannot drift from them */
      measured: {
        leftOuter: LEFT_OUTER,
        leftInner: LEFT_INNER,
        rightInner: RIGHT_INNER,
        holeBottom: HOLE_BOTTOM,
        baseLower: BASE_LOWER,
      },
      innerControl: INNER_PX,
      outerControl: outerControlPoints,
      stations: stations.length,
      screen: stationsScreen,
      local: stations,
    },
    null,
    1,
  ),
);
console.log(`wrote ${OUT_TS} (${stations.length} stations, closed)`);
console.log(`wrote ${OUT_JSON}`);
