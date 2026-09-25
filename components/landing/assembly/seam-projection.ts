/**
 * The projected Create seam, as arithmetic.
 *
 * Split out of the scene controller for one reason: the failure this module
 * exists to prevent is an *ordering* failure, not a rendering failure. A camera
 * whose world matrix has not been refreshed projects through a stale
 * `matrixWorldInverse`, which lands the DOM control hundreds of pixels from the
 * object it is supposed to be sitting on — and because a settled page requests no
 * further frames, that wrong measurement can persist indefinitely. It looked
 * plausible enough on screen that it survived review.
 *
 * So the matrices are injected rather than read off a live camera. Whatever calls
 * this cannot skip the refresh by accident, because producing the input requires
 * doing it, and the arithmetic itself can be pinned in a unit test with synthetic
 * matrices and no WebGL context at all.
 *
 * The pipeline, in order:
 *
 *   local → world (`matrixWorld`) → clip (`projection · view`) → NDC → CSS px
 *
 * Matrices are the 16-number column-major arrays THREE.js uses, so a
 * `THREE.Matrix4.elements` can be passed straight in.
 */
import type { Vec3 } from "./canonical";
import type { SeamRect } from "./scene-controller";

/** A column-major 4×4, exactly as `THREE.Matrix4.elements`. */
export type Matrix4Like = ArrayLike<number>;

/** Six local-space points of the sculpted control: centre plus four edge middles. */
export type CreateSeamProbe = {
  centre: Vec3;
  left: Vec3;
  right: Vec3;
  top: Vec3;
  bottom: Vec3;
};

/** Builds the standard probe for a control of the given local size. */
export function createSeamProbe(
  width: number,
  height: number,
  z = 0,
): CreateSeamProbe {
  return {
    centre: [0, 0, z],
    left: [-width / 2, 0, z],
    right: [width / 2, 0, z],
    top: [0, height / 2, z],
    bottom: [0, -height / 2, z],
  };
}

/** The minimum a camera must expose for `seamMatrices`; keeps this module THREE-free. */
export type CameraLike = {
  updateMatrixWorld(force?: boolean): void;
  updateProjectionMatrix(): void;
  projectionMatrix: { elements: ArrayLike<number> };
  matrixWorldInverse: { elements: ArrayLike<number> };
};

/**
 * The two matrices a projection needs, both guaranteed current.
 *
 * `updateMatrixWorld()` recomputes the camera's world matrix when it is flagged
 * dirty and then derives `matrixWorldInverse`; `updateProjectionMatrix()` must run
 * for a changed `fov` or `aspect` to take effect. Both are called every time on
 * purpose — one matrix multiply per frame against a scene that already
 * re-multiplies every mesh, in exchange for making the stale-camera failure
 * impossible rather than merely unlikely.
 *
 * Returning the matrix *elements* rather than the matrices means the caller
 * cannot hold a reference and read it later, after something else has moved.
 */
export function seamMatrices(camera: CameraLike): {
  projection: ArrayLike<number>;
  view: ArrayLike<number>;
} {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return {
    projection: camera.projectionMatrix.elements,
    view: camera.matrixWorldInverse.elements,
  };
}

/** `m · [x, y, z, 1]`, without allocating a vector. */
function transform(
  m: Matrix4Like,
  x: number,
  y: number,
  z: number,
): [number, number, number, number] {
  const e = m;
  return [
    e[0] * x + e[4] * y + e[8] * z + e[12],
    e[1] * x + e[5] * y + e[9] * z + e[13],
    e[2] * x + e[6] * y + e[10] * z + e[14],
    e[3] * x + e[7] * y + e[11] * z + e[15],
  ];
}

const clipRange = (normalised: number) => normalised * 0.5 + 0.5;

/**
 * Projects the probe into CSS pixels relative to the canvas's own top-left
 * corner, or `null` when there is no honest rectangle to report.
 *
 * `null` is returned for a control that is at or behind the eye plane, degenerate
 * in screen space, or far enough outside the viewport that the caller should fall
 * back to a static placement rather than paint a control into empty space.
 */
export function projectSeam(
  probe: CreateSeamProbe,
  matrixWorld: Matrix4Like,
  projection: Matrix4Like,
  view: Matrix4Like,
  viewWidth: number,
  viewHeight: number,
): SeamRect | null {
  if (!(viewWidth > 0) || !(viewHeight > 0)) return null;

  const toClip = (local: Vec3) => {
    const world = transform(matrixWorld, local[0], local[1], local[2]);
    /* Composing here rather than demanding a pre-multiplied viewProjection keeps
     * the caller honest: both matrices are required, so neither can be left stale
     * by omission. */
    const eye = transform(view, world[0], world[1], world[2]);
    return transform(projection, eye[0], eye[1], eye[2]);
  };

  const centre = toClip(probe.centre);
  /* A point at or behind the eye plane has a non-positive w after the perspective
   * divide, which mirrors it to the wrong side of the screen. */
  if (centre[3] <= 0) return null;
  const centreNdc = [
    centre[0] / centre[3],
    centre[1] / centre[3],
    centre[2] / centre[3],
  ];
  if (centreNdc[2] > 1) return null;

  const edges = {
    left: toClip(probe.left),
    right: toClip(probe.right),
    top: toClip(probe.top),
    bottom: toClip(probe.bottom),
  };
  for (const point of Object.values(edges)) {
    if (point[3] <= 0) return null;
  }
  const ndcX = (point: readonly number[]) => point[0] / point[3];
  const ndcY = (point: readonly number[]) => point[1] / point[3];

  /* NDC → CSS. `y` is flipped: NDC counts up from the bottom, the DOM down from
   * the top. */
  const x = clipRange(centreNdc[0]) * viewWidth;
  const y = (1 - clipRange(centreNdc[1])) * viewHeight;

  /* `left`/`right` sit at ±width/2 in local space, so their separation is already
   * the full projected width. Treating it as a half-size doubled the plate: the
   * centre and the look stayed correct while the DOM hit area reached a whole
   * control's width past the sculpted face in every direction. */
  const width =
    (Math.abs(ndcX(edges.right) - ndcX(edges.left)) / 2) * viewWidth;
  const height =
    (Math.abs(ndcY(edges.top) - ndcY(edges.bottom)) / 2) * viewHeight;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1)
    return null;
  if (
    x < -width ||
    x > viewWidth + width ||
    y < -height ||
    y > viewHeight + height
  )
    return null;

  const spanX = (ndcX(edges.right) - ndcX(edges.left)) * 0.5 * viewWidth;
  const spanY = -(ndcY(edges.right) - ndcY(edges.left)) * 0.5 * viewHeight;

  return {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
    /* The screen-space rotation of the control's own local +X axis: the honest
     * angle of the sculpted face. Five points and a 2D rotation are not a planar
     * homography, so a steeply rolled pose is approximated rather than mapped
     * exactly; the centre, which is what alignment is judged on, is exact. */
    angle: Math.atan2(spanY, spanX),
  };
}

/** The centre of a projected rect in CSS pixels, for alignment assertions. */
export function seamCentre(rect: SeamRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Four corners, including depth, mapped by a planar homography. */
export function projectFace(
  probe: CreateSeamProbe,
  world: Matrix4Like,
  projection: Matrix4Like,
  view: Matrix4Like,
  width: number,
  height: number,
): SeamRect | null {
  const rect = projectSeam(probe, world, projection, view, width, height);
  if (!rect) return null;
  const corners = [
    [probe.left[0], probe.top[1]],
    [probe.right[0], probe.top[1]],
    [probe.right[0], probe.bottom[1]],
    [probe.left[0], probe.bottom[1]],
  ].map(([x, y]) => {
    const w = transform(world, x, y, probe.centre[2]);
    const e = transform(view, w[0], w[1], w[2]);
    const c = transform(projection, e[0], e[1], e[2]);
    return {
      x: ((c[0] / c[3] + 1) * width) / 2,
      y: ((1 - c[1] / c[3]) * height) / 2,
    };
  });
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x,
    dx2 = p3.x - p2.x,
    dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y,
    dy2 = p3.y - p2.y,
    dy3 = p0.y - p1.y + p2.y - p3.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 1e-8) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const a = p1.x - p0.x + g * p1.x,
    b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y,
    e = p3.y - p0.y + h * p3.y;
  return {
    ...rect,
    corners,
    matrix: [
      a / rect.width,
      d / rect.width,
      0,
      g / rect.width,
      b / rect.height,
      e / rect.height,
      0,
      h / rect.height,
      0,
      0,
      1,
      0,
      p0.x,
      p0.y,
      0,
      1,
    ],
  };
}
