/**
 * The hero aperture: a closed, manifold band.
 *
 * The reference aperture is not an outer contour with a concentric hole — it is
 * a sculpted band wrapping a niche, with an S-bend inner wall, two legs and a
 * crown above the frame, and a continuous curved base joining the legs beneath
 * the source plate. Earlier passes tried to express it as
 * `ExtrudeGeometry(superellipse, hole)` and then as a bare ribbon between two
 * contours; the first triangulates into wedges, and the second has no side
 * walls and folds its quads (see docs/workspace).
 *
 * This builder makes the complete intended surface instead:
 *
 *   - a front face and a back face, each the strip between the profile's outer
 *     and inner edges;
 *   - an outer wall and an inner wall connecting them;
 *   - a rounded cross-section, so the band has the beveled edge the artboard
 *     shows rather than a knife edge;
 *   - for a closed profile, the sweep wraps: station N-1 joins station 0 and
 *     there are no end caps at all.
 *
 * Topologically a closed profile gives a torus — every edge is shared by exactly
 * two triangles, Euler characteristic 0, positive signed volume — and an open
 * profile gives a capped ball, Euler characteristic 2. Both are watertight; the
 * mesh never has an open boundary.
 *
 * Surface mapping: `uv` is a legitimate swept-surface parameterisation. `u` is
 * the fraction of the band's own centreline length at that station; `v` is the
 * fraction of that station's cross-section perimeter. Texel density is therefore
 * uniform along and around the band, the only seam being the single quad where
 * `u` wraps from 1 back to 0 at the profile's own start. That wiring is what the
 * grain texture in `scene-geometry.ts` samples; without it the material's `map`
 * has nothing to read and three.js silently renders the flat base colour.
 *
 * Coordinates are the aperture object's LOCAL space. No centring, no rotation
 * compensation: the object's own transform places it, and `aperture-profile.ts`
 * was derived through that same transform.
 */
import * as THREE from "three";

export type ApertureProfile = {
  /** Front-face outer edge, x/y pairs, walked once along the band. */
  outer: readonly number[];
  /** Front-face inner edge, x/y pairs, same length and walk. */
  inner: readonly number[];
  /**
   * True when the walk closes into a ring: station N-1 joins station 0 and no
   * end caps are built. `aperture-profile.ts` emits `APERTURE_CLOSED` for this.
   */
  closed?: boolean;
  /**
   * Local z of each station's cross-section centre, one entry per station,
   * default 0. The traced edges sit at `depth + halfDepth` (outer) and
   * `depth - halfDepth` (inner).
   *
   * This is not decoration. The base of the band reaches below the hero's floor
   * plane when every station is traced on the same plane, and the dark floor
   * then renders in front of it — the base disappears. Sliding a station along
   * its own view ray cannot move it on screen, so the base is instead traced on
   * the nearer plane whose outer edge lands on the floor. That keeps the
   * silhouette pixel-exact *and* puts the ground contact in the floor plane,
   * where a contact shadow can find it. `generate-profile.mjs` solves the same
   * depth it emits here.
   */
  depth?: readonly number[];
};

export type ApertureOptions = {
  /** Half the band's depth, i.e. thickness / 2. */
  halfDepth: number;
  /** Edge radius. Clamped per station so a thin section cannot invert. */
  bevel: number;
  /** Sub-segments per rounded corner. */
  arcSegments?: number;
  /** Sub-segments per straight cross-section edge. */
  edgeSegments?: number;
};

/**
 * The cross-section outline, in (a, b): `a` runs across the band, `b` runs
 * through its depth. A rounded rectangle walked once, counter-clockwise.
 */
function crossSection(
  halfWidth: number,
  halfDepth: number,
  radius: number,
  arcSegments: number,
  edgeSegments: number,
) {
  const w = Math.max(1e-6, halfWidth - radius);
  const d = Math.max(1e-6, halfDepth - radius);
  const points: [number, number][] = [];
  const straight = (
    from: [number, number],
    to: [number, number],
  ) => {
    for (let index = 0; index < edgeSegments; index++) {
      const t = index / edgeSegments;
      points.push([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ]);
    }
  };
  const arc = (
    cx: number,
    cy: number,
    from: number,
    to: number,
  ) => {
    for (let index = 0; index < arcSegments; index++) {
      const angle = from + ((to - from) * index) / arcSegments;
      points.push([
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
      ]);
    }
  };
  const half = Math.PI / 2;
  straight([w, halfDepth], [-w, halfDepth]);
  arc(-w, d, half, Math.PI);
  straight([-halfWidth, d], [-halfWidth, -d]);
  arc(-w, -d, Math.PI, Math.PI + half);
  straight([-w, -halfDepth], [w, -halfDepth]);
  arc(w, -d, Math.PI + half, Math.PI * 2);
  straight([halfWidth, -d], [halfWidth, d]);
  arc(w, d, 0, half);
  return points;
}

/** Normalised cumulative perimeter of one cross-section, one entry per spoke. */
function perimeterParameters(ring: readonly [number, number][]) {
  const length = ring.length;
  const cumulative = [0];
  for (let index = 1; index < length; index++) {
    cumulative.push(
      cumulative[index - 1] +
        Math.hypot(ring[index][0] - ring[index - 1][0], ring[index][1] - ring[index - 1][1]),
    );
  }
  const total =
    cumulative[length - 1] +
    Math.hypot(ring[0][0] - ring[length - 1][0], ring[0][1] - ring[length - 1][1]);
  return cumulative.map((value) => value / total);
}

/**
 * Builds the band. Returns a geometry whose vertex order is deterministic for a
 * given profile, so a test can assert exact counts.
 */
export function buildApertureGeometry(
  profile: ApertureProfile,
  options: ApertureOptions,
) {
  const { halfDepth, bevel } = options;
  const arcSegments = options.arcSegments ?? 3;
  const edgeSegments = options.edgeSegments ?? 2;
  const closed = profile.closed === true;

  const stations = profile.outer.length / 2;
  if (stations < 3 || profile.inner.length / 2 !== stations) {
    throw new Error(
      `aperture profile mismatch: outer ${profile.outer.length / 2} stations, inner ${profile.inner.length / 2}`,
    );
  }
  const depth = profile.depth;
  if (depth && depth.length !== stations) {
    throw new Error(
      `aperture depth mismatch: ${depth.length} entries for ${stations} stations`,
    );
  }
  const stationDepth = (station: number) => depth?.[station] ?? 0;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rings: number[][] = [];

  const inner = new THREE.Vector2();
  const outer = new THREE.Vector2();
  const centre = new THREE.Vector2();
  const axis = new THREE.Vector2();

  /** centreline point per station, needed for `u` before any vertex is emitted */
  const centres: THREE.Vector3[] = [];
  for (let station = 0; station < stations; station++) {
    outer.set(profile.outer[station * 2], profile.outer[station * 2 + 1]);
    inner.set(profile.inner[station * 2], profile.inner[station * 2 + 1]);
    centres.push(
      new THREE.Vector3(
        (outer.x + inner.x) * 0.5,
        (outer.y + inner.y) * 0.5,
        stationDepth(station),
      ),
    );
  }

  const spans = closed ? stations : stations - 1;
  const arcLength: number[] = [0];
  for (let station = 0; station < spans; station++) {
    arcLength.push(
      arcLength[station] +
        centres[station].distanceTo(centres[(station + 1) % stations]),
    );
  }
  const totalLength = arcLength[spans];

  for (let station = 0; station < stations; station++) {
    outer.set(profile.outer[station * 2], profile.outer[station * 2 + 1]);
    inner.set(profile.inner[station * 2], profile.inner[station * 2 + 1]);
    centre.copy(outer).add(inner).multiplyScalar(0.5);
    axis.subVectors(outer, inner);
    const halfWidth = axis.length() / 2;
    if (halfWidth < 1e-6) throw new Error(`degenerate station ${station}`);
    axis.normalize();
    /* The traced edges are the rendered silhouette's, and the silhouette of a
     * rounded edge is the arc, not the flat face. So the cross-section's
     * half-width is the traced half-width itself: the arc reaches the trace and
     * the flat face sits one radius inside it. Inflating by the radius here
     * instead — the first version — put the whole band one bevel radius (about
     * 7 px at the hero camera) outside the artboard on every edge. */
    const radius = Math.min(bevel, halfWidth * 0.45, halfDepth * 0.9);
    const ring = crossSection(
      halfWidth,
      halfDepth,
      radius,
      arcSegments,
      edgeSegments,
    );
    const parameters = perimeterParameters(ring);
    const u = arcLength[station] / totalLength;
    const base = positions.length / 3;
    const z = stationDepth(station);
    for (let spoke = 0; spoke < ring.length; spoke++) {
      const [a, b] = ring[spoke];
      positions.push(
        centre.x + axis.x * a,
        centre.y + axis.y * a,
        z + b,
      );
      uvs.push(u, parameters[spoke]);
    }
    rings.push(
      Array.from({ length: ring.length }, (_, index) => base + index),
    );
  }

  const radial = rings[0].length;

  /* Walls and faces: each quad between consecutive stations, split into two
   * triangles with the same diagonal, so the two faces of every quad agree.
   * When the profile closes, the last span is N-1 -> 0 and the seam is welded
   * by index rather than capped. */
  for (let station = 0; station < spans; station++) {
    const a = rings[station];
    const b = rings[(station + 1) % stations];
    for (let spoke = 0; spoke < radial; spoke++) {
      const next = (spoke + 1) % radial;
      indices.push(
        a[spoke], b[spoke], b[next],
        a[spoke], b[next], a[next],
      );
    }
  }

  /* End caps, open profiles only: a fan from the section's own centroid. */
  if (!closed) {
    for (const [end, u] of [
      [0, 0],
      [stations - 1, 1],
    ] as const) {
      const ring = rings[end];
      const cx = ring.reduce((sum, at) => sum + positions[at * 3], 0) / radial;
      const cy = ring.reduce((sum, at) => sum + positions[at * 3 + 1], 0) / radial;
      const cz = ring.reduce((sum, at) => sum + positions[at * 3 + 2], 0) / radial;
      const hub = positions.length / 3;
      positions.push(cx, cy, cz);
      uvs.push(u, 0);
      for (let spoke = 0; spoke < radial; spoke++) {
        const next = (spoke + 1) % radial;
        /* The wall quads traverse the first station's rim spoke[n] -> spoke[s]
         * and the last station's rim spoke[s] -> spoke[n]; each cap must walk
         * its rim the other way round or the two disagree along the shared
         * edge. */
        if (end === 0) indices.push(hub, ring[spoke], ring[next]);
        else indices.push(hub, ring[next], ring[spoke]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  /* Orient the whole surface outward. The signed volume of a closed mesh is
   * positive exactly when its triangles wind outward, so this is a checked
   * correction rather than a guess. */
  if (signedVolume(positions, indices) < 0) {
    for (let index = 0; index < indices.length; index += 3) {
      const swap = indices[index + 1];
      indices[index + 1] = indices[index + 2];
      indices[index + 2] = swap;
    }
    geometry.setIndex(indices);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Six times the enclosed volume, summed over the triangle list. */
export function signedVolume(
  positions: readonly number[],
  indices: readonly number[],
) {
  let total = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3;
    const b = indices[index + 1] * 3;
    const c = indices[index + 2] * 3;
    total +=
      positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1]) -
      positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c]) +
      positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c]);
  }
  return total;
}
