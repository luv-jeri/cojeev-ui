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
  findTriangleCrossings,
  sharesVertex,
  trianglesIntersect,
  type Triangle,
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

test("the only crossings are the known fold at the two feet", () => {
  const geometry = buildApertureGeometry(PROFILE, OPTIONS);
  const positions = Array.from(geometry.getAttribute("position").array);
  const indices = Array.from(geometry.getIndex()!.array);

  /* the scan has to be able to fail: with adjacency switched off, band
   * neighbours touch along every shared edge */
  const naive = findTriangleCrossings(positions, indices, { adjacent: () => false });
  assert.ok(
    naive.crossingPairs > 1000,
    "the crossing predicate reports nothing at all, so its zero would be meaningless",
  );

  const report = findTriangleCrossings(positions, indices, {
    adjacent: (a, b) => sharesVertex(indices, a, b),
    maxExamples: 400,
  });
  assert.ok(report.pairsTested > 100, "the broad phase must actually test pairs");

  /*
   * KNOWN DEFECT, recorded rather than asserted away. The old verifier's "0
   * crossings" was false; the corrected predicate finds real ones, and they are
   * all in the two feet. There the inner contour has no authored stations
   * between the right end of the hole bottom (1319, 832) and the right leg's
   * inner edge (1356, 800), so the walk spans the turn with a few very long
   * cross-sections (up to 265 px) that rotate fast, and the ruled surface
   * between them folds through itself. It is local: no crossing involves a span
   * outside the two foot windows. Fixing it means authoring inner stations
   * through each foot so the section turns gradually, and that is not this
   * change. Until then the band is NOT proven free of self-intersection.
   */
  const span = (triangle: number) => Math.floor(triangle / 40);
  const inFoot = (s: number) => (s >= 5 && s <= 12) || (s >= 165 && s <= 178);
  const outside = report.examples.filter(
    ([a, b]) => !inFoot(span(a)) || !inFoot(span(b)),
  );
  assert.deepEqual(
    outside,
    [],
    `crossings outside the known foot fold: ${JSON.stringify(outside)}`,
  );
  assert.ok(
    report.crossingPairs > 0,
    "the foot fold has been fixed — narrow this test to require zero crossings",
  );
});
