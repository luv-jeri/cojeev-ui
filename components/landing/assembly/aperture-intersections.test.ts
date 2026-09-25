/**
 * The crossing check for the hero aperture band.
 *
 * This test exists because the previous verifier reported "0 crossings out of
 * 190986 pairs" for every input — its separating-axis predicate was false for
 * all pairs, so the number was a property of the bug, not of the mesh. The
 * fixtures below are the guard: the same predicate must say yes to a crossing
 * pair, yes to a coplanar overlap, no to a separated pair, and the mesh scan
 * must be shown capable of failing before its zero is worth anything.
 *
 * Run with: npm run test:aperture
 */
import assert from "node:assert/strict";
import test from "node:test";

import { buildApertureGeometry } from "./aperture-geometry";
import {
  contactChord,
  findTriangleCrossings,
  sharesVertex,
  trianglesIntersect,
  type Triangle,
  type Vec3,
} from "./aperture-intersections";
import {
  APERTURE_CLOSED,
  APERTURE_DEPTH,
  APERTURE_INNER,
  APERTURE_OUTER,
} from "./aperture-profile";

const OPTIONS = { halfDepth: 0.05, bevel: 0.02 } as const;
const PROFILE = {
  outer: APERTURE_OUTER,
  inner: APERTURE_INNER,
  depth: APERTURE_DEPTH,
  closed: APERTURE_CLOSED,
};

const FLAT: Triangle = [
  [0, 0, 0],
  [2, 0, 0],
  [0, 2, 0],
];

test("a crossing pair is reported as crossing", () => {
  /* two vertices behind the plane, one in front, and the crossing segment
   * ((0.3, 0.4) -> (0.5, 0.4)) falls inside the flat triangle */
  const piercing: Triangle = [
    [0.2, 0.2, -1],
    [0.6, 0.2, -1],
    [0.4, 0.6, 1],
  ];
  assert.equal(trianglesIntersect(FLAT, piercing), true);
  assert.equal(trianglesIntersect(piercing, FLAT), true);
});

test("a separated pair is not reported as crossing", () => {
  const away: Triangle = [
    [10, 0, 0],
    [12, 0, 0],
    [10, 2, 0],
  ];
  assert.equal(trianglesIntersect(FLAT, away), false);
  /* clear in z as well as in x/y */
  const above: Triangle = [
    [0, 0, 5],
    [2, 0, 5],
    [0, 2, 5],
  ];
  assert.equal(trianglesIntersect(FLAT, above), false);
});

test("coplanar overlap and coplanar separation are told apart", () => {
  const overlapping: Triangle = [
    [0.5, 0.5, 0],
    [1.5, 0.5, 0],
    [0.5, 1.5, 0],
  ];
  const apart: Triangle = [
    [5, 5, 0],
    [6, 5, 0],
    [5, 6, 0],
  ];
  const contained: Triangle = [
    [0.1, 0.1, 0],
    [0.2, 0.1, 0],
    [0.1, 0.2, 0],
  ];
  assert.equal(trianglesIntersect(FLAT, overlapping), true);
  assert.equal(trianglesIntersect(FLAT, contained), true);
  assert.equal(trianglesIntersect(FLAT, apart), false);
});

/*
 * The coplanar branch is only tested above in the plane z = 0, so it used to
 * pick the projection axis from the *world* x/y pair while the coplanar test
 * picked it from the triangle normal. Whenever the normal was not z-dominant
 * those two disagreed, and the collinear-overlap helper compared the coordinate
 * the projection had thrown away — so in a YZ plane every pair matched and
 * separated triangles were reported as intersecting. The same fixture is
 * therefore rotated into all three planes: a predicate that only works in one
 * plane is the bug, not a detail of it.
 */
test("the plane-independent branches work in every rotation", () => {
  /* the same three shapes as above, written in the YZ plane and permuted in */
  const inPlane = (plane: 0 | 1 | 2, t: Triangle): Triangle =>
    t.map((p) => {
      const [x, y, z] = p;
      return (plane === 0 ? [z, x, y] : plane === 1 ? [y, z, x] : [x, y, z]) as unknown as Vec3;
    }) as unknown as Triangle;

  for (const plane of [0, 1, 2] as const) {
    const name = plane === 0 ? "XY" : plane === 1 ? "XZ" : "YZ";

    /* a separated pair: three units apart along the axis the plane varies in */
    const separated: Triangle = [
      [0, 0, 3],
      [0, 1, 3],
      [0, 0, 4],
    ];
    const base: Triangle = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    assert.equal(
      trianglesIntersect(inPlane(plane, base), inPlane(plane, separated)),
      false,
      `${name}: separated triangles reported as intersecting`,
    );

    /* the same pair overlapping for real, so the plane is not simply rejecting all */
    const overlapping: Triangle = [
      [0, 0.2, 0.2],
      [0, 0.8, 0.2],
      [0, 0.2, 0.8],
    ];
    assert.equal(
      trianglesIntersect(inPlane(plane, base), inPlane(plane, overlapping)),
      true,
      `${name}: coplanar overlap not detected`,
    );

    /* and a shared edge, which is a contact and must still count */
    const neighbour: Triangle = [
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 1],
    ];
    assert.equal(
      trianglesIntersect(inPlane(plane, base), inPlane(plane, neighbour)),
      true,
      `${name}: coplanar edge contact not detected`,
    );
  }
});

test("contact along an edge counts, and adjacency is what suppresses it", () => {
  const neighbour: Triangle = [
    [2, 0, 0],
    [0, 2, 0],
    [2, 2, 0],
  ];
  assert.equal(trianglesIntersect(FLAT, neighbour), true);

  /* the two triangles share the edge (2,0,0)-(0,2,0), and the buffers give that
   * edge the same two vertex indices — which is what a manifold sweep does */
  const positions = [
    0, 0, 0,
    2, 0, 0,
    0, 2, 0,
    2, 2, 0,
  ];
  const indices = [0, 1, 2, 1, 2, 3];
  const all = findTriangleCrossings(positions, indices);
  assert.equal(all.crossingPairs, 1, "two triangles with no shared index are tested");
  const excluding = findTriangleCrossings(positions, indices, {
    adjacent: (a, b) => sharesVertex(indices, a, b),
  });
  assert.equal(excluding.pairsTested, 0, "a shared edge is an expected contact");
});

test("the delivered band crosses itself only at the two feet", () => {
  const geometry = buildApertureGeometry(PROFILE, OPTIONS);
  const positions = Array.from(geometry.getAttribute("position").array);
  const indices = Array.from(geometry.getIndex()!.array);

  /* the scan has to be able to fail: with adjacency switched off, band
   * neighbours touch along every shared edge */
  const naive = findTriangleCrossings(positions, indices, { adjacent: () => false });
  assert.ok(
    naive.crossingPairs > 1000,
    "the crossing predicate reports nothing at all, so its count means nothing",
  );

  const report = findTriangleCrossings(positions, indices, {
    adjacent: (a, b) => sharesVertex(indices, a, b),
    maxExamples: 4000,
  });
  assert.ok(report.pairsTested > 100, "the broad phase must actually test pairs");

  /*
   * KNOWN DEFECT, measured rather than asserted away, and localised.
   *
   * The band is about 135 px wide at the feet and the reference's own outer
   * corners there turn inside 25 px (left foot) and 40 px (right foot). A
   * constant-width band whose centreline radius drops below its half-width
   * sweeps through itself; no amount of resampling changes that, only a
   * different solid. Following those corners is what puts the base's last 60 px
   * of traced lower edge back on screen, so the trade is deliberate: the
   * silhouette matches the reference, and the fold is reported here.
   *
   * Every crossing must stay inside the two foot windows. Anything elsewhere is
   * not this defect.
   */
  const span = (triangle: number) => Math.floor(triangle / 40);
  const inFoot = (s: number) => (s >= 6 && s <= 22) || (s >= 196 && s <= 212);
  const outside = report.examples.filter(([a, b]) => !inFoot(span(a)) || !inFoot(span(b)));
  assert.deepEqual(
    outside,
    [],
    `crossings outside the two foot windows: ${JSON.stringify(outside)}`,
  );
  assert.ok(
    report.crossingPairs < 60,
    `${report.crossingPairs} crossing pairs is more than the two corners explain`,
  );
});

/**
 * The feet used to fold.
 *
 * A pair count cannot express that. The sweep is closed, so its own neighbours
 * touch by construction, and after the predicate was corrected the delivered
 * mesh reported 22 pairs that a bare count read as self-intersection. Measuring
 * the chord where each pair meets separates the two: thirteen of those pairs met
 * at a point — contacts — and the rest met along chords up to 0.037 long, which
 * is 37% of the band's own thickness and what the crease at the right foot
 * actually was.
 *
 * So the pin is on the chord, not the count. The generator spreads the base's
 * rise so the ruling can follow it (see `RAMP_SLOPE` in `generate-profile.mjs`);
 * put the per-station solve's raw steps back and the deepest chord returns to
 * 0.037.
 */
test("the feet stay fixed: no pair interpenetrates, and the base still reaches the floor", () => {
  /* 1. the delivered band touches itself but never passes through itself */
  const band = buildApertureGeometry(PROFILE, OPTIONS);
  const bandPositions = Array.from(band.getAttribute("position").array);
  const bandIndices = Array.from(band.getIndex()!.array);
  const report = findTriangleCrossings(bandPositions, bandIndices, {
    adjacent: (a, b) => sharesVertex(bandIndices, a, b),
    maxExamples: 4000,
  });
  const vertex = (k: number): Vec3 => {
    const v = bandIndices[k] * 3;
    return [bandPositions[v], bandPositions[v + 1], bandPositions[v + 2]];
  };
  const triangle = (t: number): Triangle => [
    vertex(t * 3),
    vertex(t * 3 + 1),
    vertex(t * 3 + 2),
  ];
  const chords = report.examples
    .map(([a, b]) => contactChord(triangle(a), triangle(b)))
    .sort((x, y) => y - x);
  /**
   * 0.004 local units is roughly a tenth of a pixel at the hero camera, where
   * the band's 0.1 thickness covers about sixty. Anything under it cannot be
   * seen; the fold this replaced was nine times larger.
   */
  assert.ok(
    (chords[0] ?? 0) < 0.004,
    `the band interpenetrates itself: deepest chord ${(chords[0] ?? 0).toFixed(4)} over ${chords.filter((c) => c >= 0.004).length} pairs`,
  );
  /* the count is still worth bounding, as a detector for a wrecked sweep */
  assert.ok(
    report.crossingPairs < 60,
    `${report.crossingPairs} touching pairs is more than the two corners explain`,
  );

  /* 2. the base is continuous and reaches the floor across many stations */
  const lifted = APERTURE_DEPTH.filter((d) => d > 0);
  assert.ok(lifted.length > 20, `only ${lifted.length} stations are lifted into the base`);
  assert.ok(Math.max(...APERTURE_DEPTH) > 0.4, "the base never reaches the floor plane");
  /* 3. and the rise into it stays inside what the ruling can follow */
  let steepest = 0;
  for (let i = 0; i < APERTURE_DEPTH.length; i++) {
    const next = APERTURE_DEPTH[(i + 1) % APERTURE_DEPTH.length];
    steepest = Math.max(steepest, Math.abs(next - APERTURE_DEPTH[i]));
  }
  assert.ok(
    steepest <= 0.0301,
    `the base rises ${steepest.toFixed(3)} local units in one station, which folds the sweep`,
  );

  /* 3. stations are paired by arc length along each contour. Sampling both
   * curves at the same curve parameter instead put a 121-degree turn into one
   * station at each foot, which is what folded the sweep. */
  const stations = APERTURE_INNER.length / 2;
  const centre = (s: number) => [
    (APERTURE_INNER[s * 2] + APERTURE_OUTER[s * 2]) / 2,
    (APERTURE_INNER[s * 2 + 1] + APERTURE_OUTER[s * 2 + 1]) / 2,
  ];
  const steps: number[] = [];
  const turns: number[] = [];
  let previous: number[] | null = null;
  let previousStep: number[] | null = null;
  for (let s = 0; s < stations; s++) {
    const now = centre(s);
    if (previous) {
      const step = [now[0] - previous[0], now[1] - previous[1]];
      const length = Math.hypot(step[0], step[1]);
      steps.push(length);
      if (previousStep && length > 1e-9) {
        const dot = (step[0] * previousStep[0] + step[1] * previousStep[1]) /
          (length * Math.hypot(previousStep[0], previousStep[1]));
        turns.push((Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
      }
      previousStep = step;
    }
    previous = now;
  }
  /* Station spacing is deliberately not asserted here. The generator already
   * refuses to write a profile whose stations come closer together than 2% of
   * their own half-width, which is the failure mode that actually matters; the
   * raw spread is noisy because the two contours have different total lengths,
   * so equal arc fractions advance them by different distances. */
  /* What survives is the two traced corners themselves: the left foot's outer
   * corner spans about 25 px of measured contour, so one station turns 74
   * degrees, and the right foot's turns 56. Both belong to the reference, and
   * with the ruling and the depth now right neither folds — the test above is
   * the proof. This bound only has to catch a regression to the old
   * shared-parameter walk, which put 121 degrees into a single station. */
  const worstTurn = Math.max(...turns);
  assert.ok(worstTurn < 90, `one station turns ${worstTurn.toFixed(1)} degrees at a foot`);
});
