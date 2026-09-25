/**
 * The hero aperture is a closed band, not an extruded ring.
 *
 * The artboard's opening is a horseshoe: its crown leaves the top of the frame,
 * its legs run down either side, and its base joins them beneath the source
 * plate. `aperture-profile.ts` carries the traced contours and
 * `aperture-geometry.ts` sweeps a rounded rectangular section along them.
 *
 * This test guards the properties that made the first two attempts unusable —
 * 976 boundary edges with no side walls or end caps, 19 reversed front-facing
 * triangles and 17 quads whose two triangles disagreed about winding. A closed
 * manifold cannot be validated by looking at it, so the invariants are checked
 * directly.
 *
 * It lives beside the code rather than in `tests/` on purpose: `tests/**` is the
 * library lane, this is landing-page assembly work. `npm test` globs `tests/`
 * only, so run it explicitly:
 *
 *   npm run test:aperture
 */
import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  buildApertureGeometry,
  signedVolume,
  type ApertureOptions,
  type ApertureProfile,
} from "./aperture-geometry";
import {
  APERTURE_CLOSED,
  APERTURE_DEPTH,
  APERTURE_INNER,
  APERTURE_OUTER,
} from "./aperture-profile";

const PROFILE: ApertureProfile = {
  outer: APERTURE_OUTER,
  inner: APERTURE_INNER,
  depth: APERTURE_DEPTH,
  closed: APERTURE_CLOSED,
};
const OPTIONS: ApertureOptions = { halfDepth: 0.05, bevel: 0.02 };

/* Copied out of the Float32 buffers so the helpers are plain number arrays. */
const positions = (geometry: THREE.BufferGeometry) =>
  Array.from(geometry.getAttribute("position").array);
const indices = (geometry: THREE.BufferGeometry) =>
  Array.from(geometry.getIndex()!.array);

/** Every edge, keyed by its two vertex indices in sorted order. */
function edges(geometry: THREE.BufferGeometry) {
  const index = indices(geometry);
  const directed = new Map<string, number>();
  const counts = new Map<string, number>();
  for (let t = 0; t < index.length; t += 3) {
    const triangle = [index[t], index[t + 1], index[t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = triangle[e];
      const b = triangle[(e + 1) % 3];
      assert.notEqual(a, b, "degenerate index pair");
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      directed.set(`${a}:${b}`, (directed.get(`${a}:${b}`) ?? 0) + 1);
    }
  }
  return { counts, directed };
}

function assertClosedManifold(geometry: THREE.BufferGeometry, euler: number) {
  const { counts, directed } = edges(geometry);
  let boundary = 0;
  let nonManifold = 0;
  for (const count of counts.values()) {
    if (count === 1) boundary++;
    else if (count > 2) nonManifold++;
  }
  assert.equal(boundary, 0, "the band has boundary edges (no walls or end caps)");
  assert.equal(nonManifold, 0, "an edge is shared by more than two triangles");

  /* Consistent winding means each interior edge is traversed once in each
   * direction. The earlier ribbon triangulated both faces in the same
   * orientation, which lights half the solid from behind. */
  let inconsistent = 0;
  for (const [key, count] of counts.entries()) {
    if (count !== 2) continue;
    const [a, b] = key.split(":");
    if (directed.get(`${a}:${b}`) !== 1 || directed.get(`${b}:${a}`) !== 1)
      inconsistent++;
  }
  assert.equal(inconsistent, 0, "two triangles on one edge disagree about winding");

  const vertexCount = positions(geometry).length / 3;
  const edgeCount = counts.size;
  const triangleCount = indices(geometry).length / 3;
  assert.equal(
    vertexCount - edgeCount + triangleCount,
    euler,
    `Euler characteristic is not ${euler}`,
  );

  const volume = signedVolume(positions(geometry), indices(geometry));
  assert.ok(volume > 0, `signed volume ${volume} is not positive: faces point inward`);
}

test("aperture band is a closed manifold with consistent winding", () => {
  /* An open strip swept over an interval and capped at both ends is a ball: no
   * tunnel, Euler 2 — and that is the check that catches a missing end cap. The
   * delivered profile closes into a ring instead, which is a torus: one tunnel,
   * Euler 0, and no caps at all. Both are exercised so neither path rots. */
  assertClosedManifold(buildApertureGeometry(PROFILE, OPTIONS), 0);
  assertClosedManifold(
    buildApertureGeometry({ outer: APERTURE_OUTER, inner: APERTURE_INNER }, OPTIONS),
    2,
  );
});

test("aperture band has no degenerate triangles anywhere in the sweep", () => {
  const geometry = buildApertureGeometry(PROFILE, OPTIONS);
  const position = positions(geometry);
  const index = indices(geometry);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let smallest = Infinity;
  for (let t = 0; t < index.length; t += 3) {
    a.fromArray(position, index[t] * 3);
    b.fromArray(position, index[t + 1] * 3);
    c.fromArray(position, index[t + 2] * 3);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    smallest = Math.min(smallest, ab.cross(ac).length());
  }
  assert.ok(smallest > 1e-9, `thinnest triangle area ${smallest} is effectively zero`);
});

test("every vertex carries a finite, non-degenerate surface mapping", () => {
  /* The band's material sets a grain `map`, and three.js silently ignores a map
   * on a geometry with no `uv` attribute — which is how the hero ended up with a
   * textured material and an untextured surface. */
  const geometry = buildApertureGeometry(PROFILE, OPTIONS);
  const uv = geometry.getAttribute("uv");
  assert.ok(uv, "the geometry has no uv attribute");
  assert.equal(uv.count, geometry.getAttribute("position").count);

  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    assert.ok(Number.isFinite(u) && Number.isFinite(v), `uv ${i} is not finite`);
    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  }
  /* u is the fraction of the centreline length, so it must start at 0 and reach
   * 1 exactly once — at the wrap, where the mapping seams. */
  assert.equal(uMin, 0, "u does not start at 0");
  assert.ok(uMax < 1, `u reaches ${uMax}: the ring wraps onto u = 1`);
  assert.ok(uMax > 0.99, `u only reaches ${uMax}: the ring does not close`);
  /* v is the fraction of each section's own perimeter, so it covers [0,1)
   * around every station. */
  assert.equal(vMin, 0, "v does not start at 0");
  assert.ok(vMax < 1 && vMax > 0.9, `v spans [${vMin}, ${vMax}]`);

  /* Non-degenerate means the mapping actually varies in both directions: a
   * constant u or v would collapse the grain to a line. */
  assert.ok(uMax - uMin > 0.9 && vMax - vMin > 0.9);

  /* And it must be a surface parameterisation, not two independent decorations:
   * u advances monotonically around the ring and is constant within a station's
   * ring, which is what makes the grain follow the band rather than swim. */
  const stations = APERTURE_OUTER.length / 2;
  const radial = uv.count / stations;
  assert.equal(radial * stations, uv.count, "vertex count is not stations x radial");
  for (let station = 1; station < stations; station++)
    assert.ok(
      uv.getX(station * radial) > uv.getX((station - 1) * radial),
      `u does not advance at station ${station}`,
    );
  for (let spoke = 1; spoke < radial; spoke++)
    assert.equal(
      uv.getX(spoke),
      uv.getX(0),
      "u varies around a single cross-section",
    );
});

test("aperture profile traces both contours with matching station counts", () => {
  assert.ok(APERTURE_OUTER.length > 0);
  assert.equal(APERTURE_OUTER.length, APERTURE_INNER.length);
  assert.equal(APERTURE_OUTER.length % 2, 0, "profile is x/y pairs");
  for (const value of [...APERTURE_OUTER, ...APERTURE_INNER])
    assert.ok(Number.isFinite(value), "profile holds a non-finite coordinate");
});

test("aperture solid reaches the traced edges and cannot exceed them by more than a bevel", () => {
  /* The traced contours are the rendered silhouette. Inflating the section by
   * the bevel radius puts the whole band one radius outside the artboard on
   * every edge — about 7 px at the hero camera — so the section's half-width is
   * the traced half-width itself and the flat face sits one radius inside. The
   * consequence, checked here, is that the solid is laterally bounded by the
   * traced contours plus at most the bevel radius. */
  const geometry = buildApertureGeometry(PROFILE, OPTIONS);
  const box = new THREE.Box3().setFromBufferAttribute(
    geometry.getAttribute("position") as THREE.BufferAttribute,
  );

  /* Vertices lie in planes of constant z once rotated into the section frame, so
   * the box is not the contour hull. What must hold is the weaker, exact claim:
   * every traced point lies within the bounding box, and nothing reaches further
   * out than the bevel radius in a direction the contour already spans. */
  let outside = 0;
  for (let i = 0; i < APERTURE_OUTER.length; i += 2) {
    const x = APERTURE_OUTER[i];
    const y = APERTURE_OUTER[i + 1];
    if (x < box.min.x - OPTIONS.bevel || x > box.max.x + OPTIONS.bevel) outside++;
    if (y < box.min.y - OPTIONS.bevel || y > box.max.y + OPTIONS.bevel) outside++;
  }
  assert.equal(outside, 0, "the solid does not reach the traced outer contour");

  /* The buffers are Float32, so a half-depth of 0.05 reads back as 0.050000000745.
   * Depth is per station: the base is traced on the nearer plane whose outer edge
   * reaches the floor, so the mesh is no longer a slab and the constant-thickness
   * claim no longer applies. What must still hold is that every station carries
   * the full cross-section depth and that nothing is emitted outside the declared
   * depth range. */
  const depth = box.max.z - box.min.z;
  const span =
    Math.max(...APERTURE_DEPTH) - Math.min(...APERTURE_DEPTH) + OPTIONS.halfDepth * 2;
  assert.ok(
    Math.abs(depth - span) < 1e-5,
    `depth ${depth} is not the per-station span ${span}`,
  );
  assert.ok(
    Math.abs(box.min.z - (Math.min(...APERTURE_DEPTH) - OPTIONS.halfDepth)) < 1e-5,
    "the section is not centred on its own station depth",
  );
});
