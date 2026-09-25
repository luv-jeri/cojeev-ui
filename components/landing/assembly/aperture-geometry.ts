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
  /**
   * How much darker the deepest part of the opening's inner wall is drawn than
   * its front rim, as a fraction of its albedo. The reference holds a gradient
   * 90 px long there; this is what makes it a gradient rather than the 25 px
   * step the bevel alone gives. */
  occlusionDepth?: number;
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
 * The arch's vertical falloff, as a multiplier on its albedo. The window is the
 * part of the arch the frame actually shows — local y -0.8328 (screen y 700 at
 * x 800) to -0.0009 (screen y 260) — and `shade` clamps outside it, so the
 * geometry's off-screen top cannot run away. Solved against `01-hero.png`'s own
 * column at x 800; see the `shade` attribute below for how.
 */
export const APERTURE_SHADE_WINDOW: readonly [number, number] = [-0.8328, -0.0009];
export const APERTURE_SHADE_BOTTOM = 0.6107;
export const APERTURE_SHADE_TOP = 1.6257;

/**
 * Builds the band. Returns a geometry whose vertex order is deterministic for a
 * given profile, so a test can assert exact counts.
 */
export function buildApertureGeometry(
  profile: ApertureProfile,
  options: ApertureOptions,
) {
  const { halfDepth, bevel } = options;
  const occlusionDepth = options.occlusionDepth ?? 0.4;
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
  /* How much of an occluded niche each vertex is looking into: 0 on the faces
   * the camera sees straight on, 1 at the deepest part of the opening's wall.
   * Carried per vertex because the alternative - geometry that is actually
   * darker in there - means moving the silhouette, and the silhouette is already
   * within 2-4 px of the reference at every row. */
  const occlusion: number[] = [];
  /** across the band, 0 at the outer edge and 1 at the inner one */
  const rim: number[] = [];
  /** through the band's thickness, 0 at one face and 1 at the other. Which of
   * the two faces the camera sees was read off the render rather than assumed:
   * the lit face measures 1 here. */
  const face: number[] = [];
  /** how much of the opening a station belongs to, 0 on the plinth below it.
   * Kept separate from `rim` so that fading it changes the shadow's strength
   * without moving where the terminator falls. */
  const open: number[] = [];
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
      /* `a` runs outward across the band and `b` through its depth, so the
       * niche's wall is the ring of vertices at the inner edge, and how far
       * into the opening a vertex sits is `b` measured from the front rim. The
       * strength is scaled by how far in from the outer edge it is, which
       * leaves the outer wall, the bevels and both faces untouched. */
      const inward = Math.max(0, -a / halfWidth);
      const intoNiche = (b + halfDepth) / (2 * halfDepth);
      occlusion.push(1 - occlusionDepth * inward * intoNiche * intoNiche);
      /* Three coordinates, each handed to the fragment stage separately so that
       * the shader can gate them independently. Multiplying any two of them
       * together here would make one gate move the other's threshold — a fade
       * applied to `inward` slides the terminator inward instead of only
       * weakening it, which is not what a fade is for.
       *
       * They are resolved per fragment rather than here because the
       * cross-section carries two `edgeSegments`: the band's lit face has
       * exactly two vertex columns, so a per-vertex ramp across it is a straight
       * line between them. The artboard's terminator is a step, and a step needs
       * a value that survives interpolation.
       *
       *   inward  across the band, 0 at the outer edge and 1 at the inner one.
       *   thick   through the band's thickness, 0 at one face and 1 at the
       *           other. Which of the two the camera sees was measured off the
       *           render, not assumed: the lit face reads 1.
       *   open    how much this station belongs to the opening rather than to
       *           the plinth it stands on. The artboard lights the plinth like
       *           the ground it rests on — 197 under the arch against 110 on the
       *           rim 100 px above it — while the same `inward` still runs to 1
       *           across it. Read off the same rows as the rest of this file,
       *           local y -0.58 is plinth and -0.26 is opening. */
      const plinth = Math.min(1, Math.max(0, (centre.y + 0.58) / 0.32));
      rim.push(inward);
      face.push(intoNiche);
      open.push(plinth * plinth * (3 - 2 * plinth));
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
      occlusion.push(1);
      /* The hub sits at the section's centroid, so it is on no particular side
       * of the band: no terminator crosses it and no shadow falls on the fan. */
      rim.push(0);
      face.push(0.5);
      open.push(0);
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
  geometry.setAttribute(
    "occlusion",
    new THREE.Float32BufferAttribute(occlusion, 1),
  );
  /* The vertical falloff across the arch's own face.
   *
   * `01-hero.png` darkens its arch from 240.6 to 217.1 down the face at x 800;
   * ours barely moved — 229.3 to 222.6 before this, and flat below screen y 500.
   * The scene's key light is near enough horizontal that the face reads almost
   * evenly, and moving that light is not available because the panel, the floor
   * and the flower are all lit by it. So the gradient is carried as another
   * vertex attribute, like the niche's occlusion above: it changes the albedo
   * and moves nothing, which matters because the silhouette is already within
   * 2-4 px of the reference at every row.
   *
   * Solved, not swept. The albedo-to-pixel transfer is compressive — the
   * standard material plus tone mapping turns a x1.3 albedo into about x1.04 of
   * pixel — so the multiplier cannot be read straight off the luminance ratio.
   * `.work/hero-stage4/shade-curve.mjs` renders the frame at nine flat albedo
   * multipliers, and the requirement at each row is interpolated off that
   * measured curve rather than assumed. Over the 22 rows where the arch's face
   * is actually visible the least-squares line is
   * `shade = 0.6107 + 1.0150 * u'`, rms 0.09 against a 0.16 worst row. */
  const [windowLow, windowHigh] = APERTURE_SHADE_WINDOW;
  const shade = new Float32Array(positions.length / 3);
  for (let i = 0; i < shade.length; i++) {
    const t = Math.min(
      1,
      Math.max(0, (positions[i * 3 + 1] - windowLow) / (windowHigh - windowLow)),
    );
    const ramp = APERTURE_SHADE_BOTTOM +
      (APERTURE_SHADE_TOP - APERTURE_SHADE_BOTTOM) * t;
    /* The ramp is a property of the lit outer face. Inside the opening the
     * occlusion above already governs, and multiplying the two together cancels
     * it — a x1.63 at the top against a x0.6 in the niche is x0.98, which reads
     * as "no occlusion at all" and put 206 where the artboard has 118 along the
     * opening's top rim. So the ramp is faded out by exactly the occlusion's own
     * mask: `occlusion` is `1 - occlusionDepth * m`, so `m` inverts straight
     * back out of it and no second attribute is needed. */
    const niche = occlusionDepth > 0
      ? Math.min(1, Math.max(0, (1 - occlusion[i]) / occlusionDepth))
      : 0;
    shade[i] = 1 + (ramp - 1) * (1 - niche);
  }
  geometry.setAttribute("shade", new THREE.Float32BufferAttribute(shade, 1));
  geometry.setAttribute("rim", new THREE.Float32BufferAttribute(rim, 1));
  geometry.setAttribute("face", new THREE.Float32BufferAttribute(face, 1));
  geometry.setAttribute("open", new THREE.Float32BufferAttribute(open, 1));
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
