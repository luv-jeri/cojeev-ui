import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraStep,
  dragTension,
  heroInteraction,
  heroPointer,
  registerHeroInvalidator,
  requestHeroFrame,
} from "./hero-interaction";
import { experience } from "./experience-store";
import { createSeamProbe, projectFace } from "./seam-projection";
import { PerspectiveCamera, Matrix4, Euler } from "three";

test("drag uses captured axis and span, independent of later camera projection", () => {
  const initial = { x: 0.8, y: 0.6, length: 200 };
  assert.equal(dragTension(30, 80, 60, initial), 80);
  assert.equal(dragTension(30, -1000, 0, initial), 0);
  assert.equal(dragTension(30, 1000, 0, initial), 100);
});
test("cancellation releases input, closes previews and retains committed values", () => {
  experience.reset();
  experience.set({
    tension: 71,
    motionOn: false,
    heroDrawer: "content",
    pressed: true,
  });
  heroInteraction.activate("create");
  heroInteraction.acquired();
  heroPointer.active = true;
  let released = false;
  const off = heroInteraction.register(() => {
    released = true;
  });
  heroInteraction.cancel();
  off();
  assert.equal(released, true);
  assert.equal(heroPointer.active, false);
  assert.equal(heroPointer.frozen, false);
  assert.equal(experience.get().heroPhase, "idle");
  assert.equal(experience.get().heroDrawer, null);
  assert.equal(experience.get().pressed, false);
  assert.equal(experience.get().tension, 71);
  assert.equal(experience.get().motionOn, false);
  experience.reset();
});
test("camera reaches exact rest at different refresh rates", () => {
  for (const fps of [30, 60, 120, 144]) {
    let mix = 0;
    for (let frame = 0; frame < fps; frame++) mix = cameraStep(mix, 1, 1 / fps);
    assert.equal(mix, 1);
    for (let frame = 0; frame < fps; frame++) mix = cameraStep(mix, 0, 1 / fps);
    assert.equal(mix, 0);
  }
});
test("perspective matrix maps all four corners, including rolled close-ups", () => {
  const camera = new PerspectiveCamera(35, 1.5, 0.1, 60);
  camera.position.set(0.8, 0.7, 3);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const world = new Matrix4().makeRotationFromEuler(
    new Euler(0.25, -0.4, 0.12),
  );
  const face = projectFace(
    createSeamProbe(0.8, 0.24, 0.025),
    world.elements,
    camera.projectionMatrix.elements,
    camera.matrixWorldInverse.elements,
    1536,
    1024,
  )!;
  assert.ok(face.matrix && face.corners);
  const m = face.matrix;
  for (const [i, [x, y]] of [
    [0, 0],
    [face.width, 0],
    [face.width, face.height],
    [0, face.height],
  ].entries()) {
    const w = m[3] * x + m[7] * y + 1;
    assert.ok(
      Math.abs((m[0] * x + m[4] * y + m[12]) / w - face.corners[i].x) < 1e-6,
    );
    assert.ok(
      Math.abs((m[1] * x + m[5] * y + m[13]) / w - face.corners[i].y) < 1e-6,
    );
  }
});

/* The scene renders on demand, and a drag sample mutates `heroPointer` without
 * touching React - so the loop cannot tell a moving pointer from a still one.
 * Measured in the browser before this hook existed: a six-step drag drew 14,
 * 14, 2, 0, 0, 0 frames and the cursor froze after the third move. */
test("a pointer sample asks the on-demand renderer for a frame", () => {
  let frames = 0;
  const off = registerHeroInvalidator(() => {
    frames++;
  });
  requestHeroFrame();
  requestHeroFrame();
  assert.equal(frames, 2);
  off();
  requestHeroFrame();
  assert.equal(frames, 2, "an unregistered scheduler is never called");
});
test("Motion Off and reduced motion release straight to idle", () => {  for (const patch of [{ motionOn: false }, { reducedMotion: true }]) {
    experience.reset();
    experience.set(patch);
    heroInteraction.activate("create");
    assert.equal(experience.get().heroPhase, "interact");
    heroInteraction.release();
    assert.equal(experience.get().heroPhase, "idle");
    assert.equal(experience.get().heroControl, null);
  }
  experience.reset();
});
