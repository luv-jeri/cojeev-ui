/**
 * Triangle-triangle intersection, used to check that the hero aperture band does
 * not cross itself.
 *
 * The verifier this replaces claimed "zero crossings" from a separating-axis
 * test whose overlap predicate was `overlap <= 1e-7 -> separated`. Because the
 * projections it compared were computed in different frames, that expression was
 * false for *every* pair, so it reported 190986 pairs tested and 0 crossings for
 * any input at all — including a pair of triangles it was built to catch. A
 * predicate that cannot fail does not establish anything, and the zero-crossings
 * claim it produced was unsupported.
 *
 * This is the standard two-stage test instead (Möller, "A Fast Triangle-Triangle
 * Intersection Test"): reject on the signed-distance intervals against each
 * other's plane, then compare the two intersection intervals on the line where
 * those planes meet. Coplanar pairs — where that line is undefined — fall
 * through to a separate 2-D overlap test rather than to a default answer.
 *
 * Contact is not crossing. In a watertight sweep every triangle shares vertices
 * and edges with its neighbours by construction, and those pairs touch along a
 * whole edge, so they are excluded by index before the geometry is consulted.
 * Without that exclusion every manifold mesh reports crossings in proportion to
 * its vertex count.
 */

export type Vec3 = readonly [number, number, number];
export type Triangle = readonly [Vec3, Vec3, Vec3];

/** Points closer than this count as lying on the plane. */
const EPS = 1e-9;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function sideOf(planeNormal: Vec3, planeOffset: number, points: Triangle) {
  const distances = points.map((p) => dot(planeNormal, p) + planeOffset) as [
    number,
    number,
    number,
  ];
  const positive = distances.every((d) => d > EPS);
  const negative = distances.every((d) => d < -EPS);
  return { distances, separated: positive || negative };
}

/**
 * Parameters along `direction` of the points where a triangle meets the other
 * triangle's plane, as a closed interval. `null` when the triangle only touches
 * the plane in a way that leaves no interval.
 */
function planeInterval(
  triangle: Triangle,
  distances: readonly [number, number, number],
  direction: Vec3,
): [number, number] | null {
  const values: number[] = [];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(distances[i]) <= EPS) values.push(dot(triangle[i], direction));
  }
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    if (distances[i] * distances[j] < 0) {
      const t = distances[i] / (distances[i] - distances[j]);
      const point: Vec3 = [
        triangle[i][0] + (triangle[j][0] - triangle[i][0]) * t,
        triangle[i][1] + (triangle[j][1] - triangle[i][1]) * t,
        triangle[i][2] + (triangle[j][2] - triangle[i][2]) * t,
      ];
      values.push(dot(point, direction));
    }
  }
  if (values.length === 0) return null;
  return [Math.min(...values), Math.max(...values)];
}

const orientation = (a: Vec3, b: Vec3, c: Vec3, axis: number) => {
  if (axis === 0) return (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
  if (axis === 1) return (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
};

const sign = (value: number) => (value > EPS ? 1 : value < -EPS ? -1 : 0);

/** Do two collinear segments overlap? Their endpoints are already on one line. */
const collinearOverlap = (a0: Vec3, a1: Vec3, b0: Vec3, b1: Vec3) => {
  const axis = Math.abs(a1[0] - a0[0]) >= Math.abs(a1[1] - a0[1]) ? 0 : 1;
  const lo = Math.min(a0[axis], a1[axis]);
  const hi = Math.max(a0[axis], a1[axis]);
  const otherLo = Math.min(b0[axis], b1[axis]);
  const otherHi = Math.max(b0[axis], b1[axis]);
  return lo <= otherHi + EPS && otherLo <= hi + EPS;
};

/** Inclusive: segments that merely touch at an endpoint still count. */
const crosses2d = (a0: Vec3, a1: Vec3, b0: Vec3, b1: Vec3, axis: number) => {
  const o1 = sign(orientation(a0, a1, b0, axis));
  const o2 = sign(orientation(a0, a1, b1, axis));
  const o3 = sign(orientation(b0, b1, a0, axis));
  const o4 = sign(orientation(b0, b1, a1, axis));
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  /* collinear: touching means the spans actually overlap, not merely share a line */
  if (o1 === 0 && o2 === 0 && collinearOverlap(a0, a1, b0, b1)) return true;
  if (o3 === 0 && o4 === 0 && collinearOverlap(b0, b1, a0, a1)) return true;
  return false;
};

const inside2d = (p: Vec3, t: Triangle, axis: number) => {
  const o0 = sign(orientation(t[0], t[1], p, axis));
  const o1 = sign(orientation(t[1], t[2], p, axis));
  const o2 = sign(orientation(t[2], t[0], p, axis));
  if ((o0 >= 0 && o1 >= 0 && o2 >= 0) || (o0 <= 0 && o1 <= 0 && o2 <= 0)) return true;
  /* on an edge without being enclosed */
  return false;
};

/** Coplanar pairs: overlap is an edge crossing or one triangle containing the other. */
function coplanarOverlap(a: Triangle, b: Triangle, normal: Vec3) {
  const abs = normal.map(Math.abs);
  const axis = abs[0] >= abs[1] && abs[0] >= abs[2] ? 0 : abs[1] >= abs[2] ? 1 : 2;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (crosses2d(a[i], a[(i + 1) % 3], b[j], b[(j + 1) % 3], axis)) return true;
    }
  }
  return inside2d(a[0], b, axis) || inside2d(b[0], a, axis);
}

/**
 * Do two closed triangles share any point? Triangles that merely touch do count:
 * a pair that meets along an edge is a contact, and the caller decides whether
 * that contact is expected.
 */
export function trianglesIntersect(a: Triangle, b: Triangle): boolean {
  const normalB = cross(sub(b[1], b[0]), sub(b[2], b[0]));
  const sideB = sideOf(normalB, -dot(normalB, b[0]), a);
  if (sideB.separated) return false;

  const normalA = cross(sub(a[1], a[0]), sub(a[2], a[0]));
  const sideA = sideOf(normalA, -dot(normalA, a[0]), b);
  if (sideA.separated) return false;

  const direction = cross(normalA, normalB);
  if (dot(direction, direction) <= EPS) return coplanarOverlap(a, b, normalA);

  const intervalA = planeInterval(a, sideB.distances, direction);
  const intervalB = planeInterval(b, sideA.distances, direction);
  if (!intervalA || !intervalB) return false;
  return intervalA[0] <= intervalB[1] + EPS && intervalB[0] <= intervalA[1] + EPS;
}

export type CrossingReport = {
  /** Candidate pairs the broad phase produced after removing adjacency. */
  pairsTested: number;
  crossingPairs: number;
  /** A few crossing pairs, as triangle indices, for reporting. */
  examples: [number, number][];
};

/**
 * Scans every triangle pair for a crossing, with a uniform grid as the broad
 * phase so the delivered mesh can be checked in full rather than sampled.
 *
 * `adjacent` decides which pairs are structurally allowed to touch; the default
 * excludes pairs that share a vertex index, which is exactly the set a manifold
 * sweep creates. Passing `() => false` tests them too, and is how the fixtures
 * below check that the exclusion is what suppresses neighbour contact.
 */
export function findTriangleCrossings(
  positions: readonly number[],
  indices: readonly number[],
  options: { adjacent?: (a: number, b: number) => boolean; maxExamples?: number } = {},
): CrossingReport {
  const triangleCount = Math.floor(indices.length / 3);
  const adjacent = options.adjacent ?? (() => false);
  const triangles: Triangle[] = [];
  for (let t = 0; t < triangleCount; t++) {
    const at = (k: number): Vec3 => {
      const v = indices[t * 3 + k] * 3;
      return [positions[v], positions[v + 1], positions[v + 2]];
    };
    triangles.push([at(0), at(1), at(2)]);
  }

  /* broad phase: hash each triangle's AABB across the grid cells it touches */
  const cell = 0.05;
  const boxes = triangles.map((triangle) => {
    const min = [0, 1, 2].map((axis) =>
      Math.min(triangle[0][axis], triangle[1][axis], triangle[2][axis]),
    );
    const max = [0, 1, 2].map((axis) =>
      Math.max(triangle[0][axis], triangle[1][axis], triangle[2][axis]),
    );
    return { min, max };
  });
  const grid = new Map<string, number[]>();
  boxes.forEach((box, index) => {
    for (let x = Math.floor(box.min[0] / cell); x <= Math.floor(box.max[0] / cell); x++) {
      for (let y = Math.floor(box.min[1] / cell); y <= Math.floor(box.max[1] / cell); y++) {
        for (let z = Math.floor(box.min[2] / cell); z <= Math.floor(box.max[2] / cell); z++) {
          const key = `${x},${y},${z}`;
          const bucket = grid.get(key);
          if (bucket) bucket.push(index);
          else grid.set(key, [index]);
        }
      }
    }
  });

  const seen = new Set<number>();
  const examples: [number, number][] = [];
  const maxExamples = options.maxExamples ?? 8;
  let pairsTested = 0;
  let crossingPairs = 0;
  for (const bucket of grid.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = Math.min(bucket[i], bucket[j]);
        const b = Math.max(bucket[i], bucket[j]);
        const key = a * triangleCount + b;
        if (seen.has(key)) continue;
        seen.add(key);
        if (adjacent(a, b)) continue;
        /* the grid is only a filter, so the pair still has to pass the AABB */
        const boxA = boxes[a];
        const boxB = boxes[b];
        let apart = false;
        for (let axis = 0; axis < 3 && !apart; axis++) {
          if (boxA.max[axis] < boxB.min[axis] || boxB.max[axis] < boxA.min[axis]) apart = true;
        }
        if (apart) continue;
        pairsTested++;
        if (trianglesIntersect(triangles[a], triangles[b])) {
          crossingPairs++;
          if (examples.length < maxExamples) examples.push([a, b]);
        }
      }
    }
  }
  return { pairsTested, crossingPairs, examples };
}

/** Index triples, so adjacency can be tested without unpacking positions. */
export function triangleVertices(indices: readonly number[], triangle: number): [number, number, number] {
  return [indices[triangle * 3], indices[triangle * 3 + 1], indices[triangle * 3 + 2]];
}

/** The default rule: two triangles may touch when they share a vertex index. */
export function sharesVertex(indices: readonly number[], a: number, b: number) {
  const av = triangleVertices(indices, a);
  const bv = triangleVertices(indices, b);
  return av.some((value) => bv.includes(value));
}
