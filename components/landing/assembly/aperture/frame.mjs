/**
 * Exact hero frame maths, mirroring the *production* hero pose.
 *
 * The values here are copied from the running application, not invented:
 *   camera   : components/landing/assembly/choreography.ts  CHAPTERS[0].camera
 *   aperture : CHAPTERS[0].aperture, as applied by
 *              scene-controller.ts applyFrame() at the resting hero
 *              (zoom === 1, heroWeight === 1, desktop canvas >= 900px)
 *
 * The aperture group's rotation is NOT zero: scene-controller.ts:534 sets
 * `assembly.aperture.rotation.set(0, -0.12*heroWeight, -0.11*heroWeight)`.
 * Both the trace and the renderer must use the same transform, so it is built
 * here with a real THREE.Object3D rather than re-derived by hand.
 */
import * as THREE from 'three';

export const W = 1536;
export const H = 1024;

/** CHAPTERS[0] — the resting hero. */
export const HERO_CAMERA = {
  position: [0.55, 0.26, 4.2],
  target: [-0.42, -0.06, 0],
  fov: 35,
  roll: 0,
};

/**
 * The aperture group at the resting hero.
 * `zoom` is 1 at 1536x1024 (compositionZoom saturates to 1 at aspect 1.5),
 * so `scale` is the authored 1.62 unchanged.
 */
export const HERO_APERTURE = {
  position: [0.85, 0.52, -0.7],
  scale: 1.62,
  rotation: [0, -0.12, -0.11],
};

/** Extrusion half-depth: INSTRUMENT.aperture.thickness / 2. */
export const HALF_DEPTH = 0.05;
/** INSTRUMENT.aperture.bevel. */
export const BEVEL = 0.02;

export function heroCamera() {
  const camera = new THREE.PerspectiveCamera(
    HERO_CAMERA.fov,
    W / H,
    0.1,
    60,
  );
  camera.position.set(...HERO_CAMERA.position);
  camera.lookAt(new THREE.Vector3(...HERO_CAMERA.target));
  camera.rotation.z = HERO_CAMERA.roll;
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

/** The aperture object with its production transform applied. */
export function apertureObject() {
  const object = new THREE.Object3D();
  object.position.set(...HERO_APERTURE.position);
  object.rotation.set(...HERO_APERTURE.rotation);
  object.scale.setScalar(HERO_APERTURE.scale);
  object.updateMatrixWorld(true);
  return object;
}

/**
 * Pixel -> world ray.
 *
 * Two independent formulations are returned so a caller can assert they agree;
 * the earlier pass blamed a ~27px error on `Vector3.unproject` when the real
 * cause was its own ray construction. `correct` uses unproject exactly as it is
 * meant to be used (a point on the near/far NDC plane, minus the camera
 * position, normalised); `analytic` derives the ray from the projection matrix.
 */
export function pixelRay(camera, sx, sy) {
  const ndc = new THREE.Vector3((sx / W) * 2 - 1, 1 - (sy / H) * 2, 0.5);
  const far = ndc.clone().unproject(camera);
  const correct = far.sub(camera.position).normalize();

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const vx = ((sx / W) * 2 - 1) / camera.projectionMatrix.elements[0];
  const vy = (1 - (sy / H) * 2) / camera.projectionMatrix.elements[5];
  const analytic = new THREE.Vector3(vx, vy, -1)
    .normalize()
    .applyQuaternion(camera.quaternion);

  return { origin: camera.position.clone(), correct, analytic, forward };
}

/** Ray/plane intersection. Plane given by a world point and a unit normal. */
export function intersectPlane(origin, direction, point, normal) {
  const denominator = direction.dot(normal);
  if (Math.abs(denominator) < 1e-9) return null;
  const t = point.clone().sub(origin).dot(normal) / denominator;
  return origin.clone().addScaledVector(direction, t);
}

/** World point on the aperture's own plane at local z = `z`, plus its normal. */
export function localPlane(object, z) {
  const point = object.localToWorld(new THREE.Vector3(0, 0, z));
  const normal = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(object.quaternion)
    .normalize();
  return { point, normal };
}

/** Intersect an artboard pixel with the aperture's local plane z, in local coords. */
export function pixelToLocal(object, camera, sx, sy, z) {
  const { origin, correct } = pixelRay(camera, sx, sy);
  const { point, normal } = localPlane(object, z);
  const world = intersectPlane(origin, correct, point, normal);
  return object.worldToLocal(world);
}
