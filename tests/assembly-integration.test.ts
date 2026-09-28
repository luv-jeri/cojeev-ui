import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { join } from "node:path";
import {
  createSeamProbe,
  projectSeam,
  seamCentre,
  seamMatrices,
  type CameraLike,
} from "../components/landing/assembly/seam-projection";
import { CUE_BINDINGS, cueFor, silentEvents, soundingEvents } from "../components/landing/assembly/audio-bindings";
import { CUES, CUE_IDS, BED } from "../components/landing/assembly/audio-manifest";
import { CHAPTERS, COMFORT_MAX_FOV, COMFORT_MIN_DISTANCE, restingFrame } from "../components/landing/assembly/choreography";
import {
  experience,
  readStoredContour,
  sceneAnimates,
  storeContour,
  useExperience,
} from "../components/landing/assembly/experience-store";
import { FEATURED_SPECIMEN, INSTRUMENT, SPECIMEN_TRAYS, sourceSummaryLines } from "../components/landing/assembly/canonical";
import { isMotionRunning } from "../components/landing/assembly/assembly-landing";
import { MIN_TOUCH, paintSeam } from "../components/landing/assembly/seam-bus";
import { PALETTE } from "../components/landing/assembly/canonical";
import { buildAssemblyScene } from "../components/landing/assembly/scene-geometry";
import { CONTOUR_COLORS } from "../components/landing/assembly/experience-store";
import type { SeamRect } from "../components/landing/assembly/scene-controller";

/* These are the assertions the review said were missing: the ones that would have
 * caught the shipped defects. The unit suite passed while the seam was measured
 * through a stale camera matrix, while the sculpted face was never rebuilt, while
 * a midpoint pose collapsed toward the origin, and while the Motion switch wrote a
 * setting nothing read.
 *
 * Each test below therefore checks a *contract between two things*, not a value
 * inside one function — because every one of those defects was a place where two
 * correct-looking halves disagreed. */

/* --------------------------------------------------------------------- seam */

/**
 * The matrices below are built by hand rather than with `THREE`.
 *
 * A real `PerspectiveCamera` would drag the renderer into the unit suite to prove
 * arithmetic. What matters is the *shape* of the data the seam code consumes:
 * column-major world, projection and view matrices, and a canvas size — so those
 * are constructed explicitly and the expected pixel is known in advance.
 */
const CAMERA_HEIGHT = 600;

/** Column-major perspective, matching the convention `THREE` writes. */
function perspective(fovDegrees: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ];
}

/** Column-major translation, matching `THREE.Matrix4.makeTranslation`. */
function translation(x: number, y: number, z: number): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

/** Column-major uniform scale. */
function scaling(s: number): number[] {
  return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
}

const identity = () => scaling(1);

/** The probe's own geometry, taken from the real instrument rather than guessed. */
const PROBE = () =>
  createSeamProbe(INSTRUMENT.create.width, INSTRUMENT.create.height);

test("a probe at the camera's centre projects to the viewport's centre", () => {
  /* If the projection order or the column-major indexing were wrong, the seam
   * would land somewhere other than under the object — which is exactly the
   * "535px displaced" failure. An object on the axis is the one case where the
   * right answer is known independently of every constant in the module. */
  const probe = PROBE();
  const view = translation(0, 0, -5);
  const projection = perspective(45, 1000 / CAMERA_HEIGHT, 0.1, 100);
  const rect = projectSeam(probe, identity(), projection, view, 1000, CAMERA_HEIGHT);
  assert.ok(rect, "an on-axis object in front of the camera must project");
  const centre = seamCentre(rect!);
  assert.ok(
    Math.abs(centre.x - 500) < 0.5 && Math.abs(centre.y - CAMERA_HEIGHT / 2) < 0.5,
    `expected the viewport centre, got (${centre.x.toFixed(2)}, ${centre.y.toFixed(2)})`,
  );
});

test("a doubled object projects to a doubled width, never to zero", () => {
  /* The review measured the seam at 1234x0 and later 161x24px. A zero is what a
   * dropped axis or a scale applied twice produces; a doubled object must produce
   * a proportional doubling and nothing else. */
  const probe = PROBE();
  const projection = perspective(45, 1000 / CAMERA_HEIGHT, 0.1, 100);
  const single = projectSeam(probe, identity(), projection, translation(0, 0, -5), 1000, CAMERA_HEIGHT);
  const doubled = projectSeam(probe, scaling(2), projection, translation(0, 0, -5), 1000, CAMERA_HEIGHT);
  assert.ok(single && doubled, "both projections must resolve");
  assert.ok(single!.width > 1 && single!.height > 1, `single: ${single!.width}x${single!.height}`);
  assert.ok(
    Math.abs(doubled!.width / single!.width - 2) < 0.02,
    `width must double with the object, got ${single!.width.toFixed(2)} -> ${doubled!.width.toFixed(2)}`,
  );
  assert.ok(
    Math.abs(doubled!.height / single!.height - 2) < 0.02,
    `height must double with the object, got ${single!.height.toFixed(2)} -> ${doubled!.height.toFixed(2)}`,
  );
});

test("the seam is refused rather than reported when it cannot be seen", () => {
  /* The page writes this rectangle straight onto the DOM. A rectangle behind the
   * eye, or of a degenerate size, would place the control somewhere meaningless
   * while still claiming to be measured — so `null` is the only safe answer. */
  const probe = PROBE();
  const projection = perspective(45, 1000 / CAMERA_HEIGHT, 0.1, 100);
  const behind = projectSeam(probe, translation(0, 0, 20), projection, identity(), 1000, CAMERA_HEIGHT);
  assert.equal(behind, null, "an object behind the camera must not project");
  const flat = projectSeam(createSeamProbe(0, 10), identity(), projection, translation(0, 0, -5), 1000, CAMERA_HEIGHT);
  assert.equal(flat, null, "a zero-width probe must not project");
  const noView = projectSeam(probe, identity(), projection, translation(0, 0, -5), 0, 0);
  assert.equal(noView, null, "a zero-sized viewport must not project");
});

/**
 * `THREE.Matrix4.invert` for a column-major array.
 *
 * Written out so the camera fixture can derive `matrixWorldInverse` in the same
 * way the real `Camera.updateMatrixWorld` does. Nothing in the module under test
 * needs this; the fixture does, because a fixture that hands back an identity view
 * would make the seam land in the middle of the viewport for the wrong reason and
 * would pass no matter what the module did.
 */
function invert(m: number[]): number[] {
  const [n11, n21, n31, n41, n12, n22, n32, n42, n13, n23, n33, n43, n14, n24, n34, n44] = m;
  const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
  const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
  const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
  const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
  const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
  if (det === 0) throw new Error("singular matrix");
  const d = 1 / det;
  const out = new Array<number>(16);
  out[0] = t11 * d;
  out[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * d;
  out[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * d;
  out[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * d;
  out[4] = t12 * d;
  out[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * d;
  out[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * d;
  out[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * d;
  out[8] = t13 * d;
  out[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * d;
  out[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * d;
  out[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * d;
  out[12] = t14 * d;
  out[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * d;
  out[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * d;
  out[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * d;
  return out;
}

test("the seam is measured through the inverse the camera actually derived", () => {
  /* The shipped bug in one sentence: the DOM was written from a matrix the camera
   * had not refreshed, and a settled page requests no further frames, so the stale
   * value stayed on screen — the review measured the control 535px from its object.
   *
   * This fixture is deliberately a *faithful* camera: it recomputes its own
   * `matrixWorldInverse` only when `updateMatrixWorld` is called, exactly as
   * `THREE.Camera` does. The camera sits four units up the +z axis, looking at the
   * object at the origin, so the correct projection is the viewport centre and the
   * inverse is a plain translation — a wrong inverse cannot land there by luck.
   *
   * Four rather than five so that the *identity* view still has the object inside
   * the frustum: the stale case has to produce a rectangle to be comparable, and an
   * object sitting exactly on the camera plane is culled instead. */
  const probe = PROBE();
  const world = translation(0, 0, 4);

  const projection = perspective(45, 1000 / CAMERA_HEIGHT, 0.1, 100);
  let inverse = identity();
  let worldUpdates = 0;
  let projectionUpdates = 0;
  const state = {
    matrixWorld: { elements: world },
    matrixWorldInverse: { elements: inverse },
  };
  const camera = {
    get matrixWorld() {
      return state.matrixWorld;
    },
    get matrixWorldInverse() {
      return state.matrixWorldInverse;
    },
    projectionMatrix: { elements: projection },
    updateMatrixWorld(force?: boolean) {
      worldUpdates++;
      assert.equal(force, true, "the world matrix must be forced, not left to the dirty flag");
      inverse = invert(state.matrixWorld.elements);
      state.matrixWorldInverse.elements = inverse;
    },
    updateProjectionMatrix() {
      projectionUpdates++;
    },
  };
  /* The same object, typed two ways: `CameraLike` for the module under test, and
   * its own shape here so the test can move the camera mid-test. */
  const matrices = seamMatrices(camera as unknown as CameraLike);
  assert.equal(worldUpdates, 1, "the camera must be brought up to date before reading it");
  assert.equal(projectionUpdates, 1, "a changed fov or aspect must be applied before reading it");
  assert.deepEqual(matrices.view, inverse, "the view matrix must be the inverse the camera derived");
  assert.deepEqual(matrices.projection, projection);

  const rect = projectSeam(probe, identity(), matrices.projection, matrices.view, 1000, CAMERA_HEIGHT);
  assert.ok(rect, "the matrices from `seamMatrices` must project the probe");
  const centre = seamCentre(rect!);
  assert.ok(
    Math.abs(centre.x - 500) < 1 && Math.abs(centre.y - CAMERA_HEIGHT / 2) < 1,
    `expected the viewport centre, got (${centre.x.toFixed(2)}, ${centre.y.toFixed(2)})`,
  );

  /* And the failure this test exists for: reading the inverse *without* refreshing
   * it after the camera moves — what the shipped code did. The camera is now eight
   * units away, so the object occupies half the width it did; a view matrix that
   * still describes the old position puts the seam where the camera used to be.
   * Frames are not rendered for a page that has settled, so that wrong rectangle
   * would stay on screen indefinitely. */
  const moved = translation(0, 0, 8);
  state.matrixWorld.elements = moved;
  const staleWidth = (() => {
    const stale = projectSeam(probe, identity(), matrices.projection, inverse, 1000, CAMERA_HEIGHT);
    return stale ? stale.width : Number.NaN;
  })();

  /* `seamMatrices` must be immune to that: it refreshes first, so it reports the
   * camera as it is now. */
  const fresh = seamMatrices(camera as unknown as CameraLike);
  assert.deepEqual(fresh.view, invert(moved), "the refreshed view must describe the moved camera");
  const freshRect = projectSeam(probe, identity(), fresh.projection, fresh.view, 1000, CAMERA_HEIGHT);
  assert.ok(freshRect, "the moved camera must still see the object");
  assert.ok(
    Math.abs(freshRect!.width / rect!.width - 0.5) < 0.02,
    `twice the distance must halve the width: ${rect!.width.toFixed(1)} -> ${freshRect!.width.toFixed(1)}`,
  );
  /* The stale reading is the width the object had *before* the camera moved — twice
   * what it is now. A visitor would see the control at double size, which is the
   * observed "twice the projected control" symptom; refreshing is what corrects it. */
  assert.ok(
    Math.abs(staleWidth / rect!.width - 1) < 0.02,
    `the stale matrix must report the old measurement: ${rect!.width.toFixed(1)} -> ${staleWidth.toFixed(1)}`,
  );
  assert.ok(
    Math.abs(staleWidth / freshRect!.width - 2) < 0.05,
    `refresh must change the measurement: fresh ${freshRect!.width.toFixed(1)}, stale ${staleWidth.toFixed(1)}`,
  );
});

test("the seam is sized from the projected object, not from a fixed frame", () => {
  /* The plate must describe the object it sits on. Pinning it to a constant, or to
   * the viewport, is how the control ends up a different size from the thing it
   * controls. */
  const probe = PROBE();
  const projection = perspective(45, 1000 / CAMERA_HEIGHT, 0.1, 100);
  const near = projectSeam(probe, identity(), projection, translation(0, 0, -3), 1000, CAMERA_HEIGHT);
  const far = projectSeam(probe, identity(), projection, translation(0, 0, -9), 1000, CAMERA_HEIGHT);
  assert.ok(near && far);
  assert.ok(
    near!.width > far!.width * 2,
    `an object three times closer must be much wider, got ${near!.width.toFixed(1)} vs ${far!.width.toFixed(1)}`,
  );
});

/* --------------------------------------------------------------------- cues */

/** Every source file that can emit on the page's event channel. */
function assemblySources(): { name: string; text: string }[] {
  const directory = join(process.cwd(), "components", "landing", "assembly");
  return readdirSync(directory)
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => ({ name, text: readFileSync(join(directory, name), "utf8") }));
}

test("every event the page emits has a declared binding", () => {
  /* The defect this catches: `shapeSelect` and `exported` were declared in the
   * event union and emitted by real controls, but no cue consumed them, so two
   * headline interactions were silent. Declaring the whole channel in a table is
   * what makes the omission visible; this test is what makes it fail.
   *
   * It reads the *emitters*, not the type union, so adding a new interaction with
   * no sound is a test failure rather than a silent gap. */
  const emitted = new Set<string>();
  for (const { text } of assemblySources()) {
    for (const match of text.matchAll(/emit\(\{\s*type:\s*"([A-Za-z]+)"/g)) emitted.add(match[1]);
    for (const match of text.matchAll(/type:\s*"([A-Za-z]+)",\s*intensity:/g)) emitted.add(match[1]);
  }
  assert.ok(emitted.size >= 10, `expected the page to emit a real channel, found ${emitted.size}`);
  const declared = new Set(Object.keys(CUE_BINDINGS));
  const unbound = [...emitted].filter((type) => !declared.has(type)).sort();
  assert.deepEqual(unbound, [], `emitted events with no cue binding: ${unbound.join(", ")}`);
});

test("every cue in the manifest is either reachable or deliberately reserved", () => {
  /* The mirror image of the coverage test: a cue nobody can trigger is dead weight,
   * and `select` and `export` were added precisely because a headline act had no
   * sound. Two things are legitimately not bound to an event, and each has to say
   * which it is:
   *
   * - the bed, started by the music switch rather than by an interaction;
   * - cues that exist only to be *replaced* — `transition` is fully silenced by
   *   `arrive`, so it is declared in `replaces` and never emitted. That is a
   *   deliberate reservation, not an omission, and `replaces` is where it shows.
   */
  const bound = new Set<string>();
  for (const binding of Object.values(CUE_BINDINGS)) {
    if ("cue" in binding) bound.add(binding.cue);
  }
  const reserved = new Set<string>();
  for (const spec of Object.values(CUES)) {
    for (const id of spec.replaces ?? []) reserved.add(id);
  }
  const orphaned = (CUE_IDS as readonly string[]).filter(
    (id) => !bound.has(id) && !reserved.has(id),
  );
  assert.deepEqual(orphaned, [], `cues nothing binds and nothing reserves: ${orphaned.join(", ")}`);

  /* And the reservation must be real: anything reserved-only must be silenced by
   * something, or it is simply unreachable. */
  for (const id of CUE_IDS) {
    if (bound.has(id) || !reserved.has(id)) continue;
    const silencers = Object.values(CUES).filter((spec) => spec.replaces?.includes(id));
    assert.ok(
      silencers.length > 0,
      `${id} is neither bound nor replaced, so it can never be heard`,
    );
  }
});

test("each sounding event names a cue that exists", () => {
  for (const type of soundingEvents()) {
    const result = cueFor({ type } as never);
    assert.ok(result, `${type} is declared as sounding but resolves to nothing`);
    assert.ok(CUE_IDS.includes(result!.id), `${type} points at unknown cue ${result!.id}`);
    assert.ok(CUES[result!.id], `${type} points at cue ${result!.id} with no spec`);
  }
  for (const { type, reason } of silentEvents()) {
    assert.equal(cueFor({ type } as never), null, `${type} is declared silent but produces a cue`);
    assert.ok(reason.length > 10, `${type} is silent with no reason recorded`);
  }
});

test("a cue's own intensity is passed through, and a missing one never becomes NaN", () => {
  /* Gain is computed from this number. `undefined` reaching the audio graph as
   * `NaN` silences a cue in a way that looks like a mixing decision. */
  const tension = cueFor({ type: "tension", intensity: 0.4 } as never);
  assert.ok(tension, "tension must sound");
  assert.ok(Number.isFinite(tension!.intensity), `tension intensity: ${tension!.intensity}`);
  assert.ok(tension!.intensity > 0 && tension!.intensity <= 1, `tension intensity out of range: ${tension!.intensity}`);

  for (const type of soundingEvents()) {
    const result = cueFor({ type: "tension", intensity: 0.5 } as never) ?? cueFor({ type } as never);
    if (!result) continue;
    if (type === "tension") continue;
    assert.ok(Number.isFinite(result.intensity), `${type} produced a non-finite intensity`);
    assert.ok(result.intensity >= 0 && result.intensity <= 1, `${type} intensity out of range: ${result.intensity}`);
  }
});

test("the bed is a loop with a real level and a real silence", () => {
  /* The bed switch used to change a gain on a bus nothing was connected to, so it
   * was audible as nothing at all. These are the numbers that make it real: a
   * loop length, a floor that is not zero (a zero gain cannot be ramped away from)
   * and a fade that is shorter than the loop. */
  assert.ok(BED.loopSeconds > 0.5, `loop must be long enough to be ambient: ${BED.loopSeconds}s`);
  assert.ok(BED.gain > 0.05 && BED.gain <= 1, `bed gain out of range: ${BED.gain}`);
  assert.ok(BED.silentGain > 0, "a zero gain cannot be ramped back up; the floor must be positive");
  assert.ok(BED.silentGain < BED.gain / 10, `the silent floor must be quiet: ${BED.silentGain}`);
  assert.ok(BED.fadeSeconds < BED.loopSeconds, "a fade longer than the loop would never settle");
  assert.ok(BED.rootHz > 20 && BED.rootHz < 200, `bed root must be audible: ${BED.rootHz}Hz`);
  assert.ok(BED.lfoHz > 0 && BED.lfoHz < 1, `bed tremolo must be slow: ${BED.lfoHz}Hz`);
});

/* ------------------------------------------------------------------- motion */

test("the scene animates only when both switches allow it", () => {
  /* Two independent switches — the visitor's motion mode and the operating
   * system's reduced-motion preference — and motion needs both. Either one alone
   * must stop the cinematic travel. */
  assert.equal(sceneAnimates({ motionOn: true, reducedMotion: false }), true);
  assert.equal(sceneAnimates({ motionOn: false, reducedMotion: false }), false);
  assert.equal(sceneAnimates({ motionOn: true, reducedMotion: true }), false);
  assert.equal(sceneAnimates({ motionOn: false, reducedMotion: true }), false);
});

test("the page's Motion switch and the scene's animation agree, in both directions", () => {
  /* The shipped defect was read/write mismatch: the switch called
   * `setFlowSettings({ variant })` while the renderer read
   * `settings.motion.mode`, so pressing it changed a setting nothing consulted.
   * The switch appeared to work and did nothing.
   *
   * Any pair of predicates can agree at one value by accident, so this checks all
   * four combinations and demands exact agreement. */
  const cases = [
    { mode: "subtle", flow: "living", expected: true },
    { mode: "off", flow: "living", expected: false },
    { mode: "subtle", flow: "off", expected: false },
    { mode: "off", flow: "off", expected: false },
  ] as const;
  for (const { mode, flow, expected } of cases) {
    /* The registry's two switches decide it. */
    const running = isMotionRunning({ motion: { mode }, flow: { variant: flow } } as never);
    assert.equal(running, expected, `registry says mode=${mode} flow=${flow}`);

    /* The page mirrors that verdict into the store, and the scene reads the store.
     * Composing them the way the page does — `motionOn` already has the flow
     * variant folded in — is what makes the two halves one decision rather than
     * two opinions. */
    assert.equal(
      sceneAnimates({ motionOn: running, reducedMotion: false }),
      expected,
      `the scene must follow the registry at mode=${mode} flow=${flow}`,
    );
    /* Reduced motion is a veto on top, not an alternative switch. */
    assert.equal(
      sceneAnimates({ motionOn: running, reducedMotion: true }),
      false,
      `reduced motion must veto mode=${mode} flow=${flow}`,
    );
  }
});

test("a still frame is exact, so the resting pose never drifts", () => {
  /* With motion off the page snaps to the chapter's authored frame rather than
   * resolving a blend of two. If the resting frame blended, a settled page would
   * sit between chapters and every measured value would be slightly wrong — which
   * is how a seam ends up displaced from the object it belongs to. */
  for (let index = 0; index < CHAPTERS.length; index++) {
    const frame = restingFrame(index);
    const direct = restingFrame(index + 0.4);
    assert.deepEqual(
      direct.pose,
      frame.pose,
      `progress ${index + 0.4} must rest on chapter ${index}`,
    );
  }
  /* And it must still be a blend at a true midpoint. */
  const midpoint = restingFrame(0.5);
  const first = restingFrame(0);
  assert.notDeepEqual(midpoint.pose, first.pose, "a midpoint must not equal a chapter");
});

test("the camera stays inside its comfort envelope at every authored frame", () => {
  /* The review's complaint that the hero object read as a wall rather than an
   * object: too close, too wide. These are the two numbers that prevent it, and
   * they are asserted against the pose the page actually renders. */
  for (let index = 0; index < CHAPTERS.length; index++) {
    const { pose } = restingFrame(index);
    const distance = Math.hypot(pose.position[0], pose.position[1], pose.position[2]);
    assert.ok(
      distance >= COMFORT_MIN_DISTANCE,
      `chapter ${index} puts the camera at ${distance.toFixed(2)}, inside the ${COMFORT_MIN_DISTANCE} floor`,
    );
    assert.ok(pose.fov <= COMFORT_MAX_FOV, `chapter ${index} fov ${pose.fov} exceeds ${COMFORT_MAX_FOV}`);
  }
});

/* -------------------------------------------------------------------- store */

test("the store's defaults are the authored ones, and the page uses the store", () => {
  /* `reset()` existed, documented as running on unmount, and nothing called it.
   * A module-level store that outlives the mount keeps a pressed control and an
   * enabled-sound flag alive across a client-side route round trip, where the
   * fresh engine holds defaults and the UI does not. */
  const page = readFileSync(
    join(process.cwd(), "components", "landing", "assembly", "assembly-landing.tsx"),
    "utf8",
  );
  assert.match(
    page,
    /experience\.reset\(\)/,
    "the page must reset the module-level store when it unmounts",
  );
  assert.equal(typeof useExperience, "function");
  /* Asking for a fresh snapshot after a reset must give the authored defaults back,
   * with no press, no drag and no sound left enabled from a previous visit. */
  experience.reset();
  const restored = experience.get();
  assert.equal(restored.pressed, false, "a fresh visit must not start mid-press");
  assert.equal(restored.soundEnabled, false, "a fresh visit must not start making sound");
  assert.equal(restored.layersOpen, false);
  assert.equal(typeof restored.specimen, "string");
  /* `tension` is *not* zero at rest: the ribbon is authored with stored energy so
   * the assembly does not read as flat on arrival. Resetting must restore that
   * authored value rather than a neutral one. */
  assert.ok(
    restored.tension > 0 && restored.tension <= 100,
    `the ribbon's authored resting tension must survive a reset, got ${restored.tension}`,
  );
  /* Put the shared store back the way it was found, since the suite shares it. */
  experience.reset();
});

test("the contour the page sends to the scene is the contour the export shows", () => {
  /* The scene and the exported file must describe the same object. They were
   * built from the same numbers but on different paths, which is exactly the kind
   * of split that lets one of them silently stop updating. */
  const source = readFileSync(
    join(process.cwd(), "components", "landing", "assembly", "contour-editor.tsx"),
    "utf8",
  );
  assert.match(
    source,
    /PALETTE\[/,
    "the contour source must take its tone from the authored palette rather than a literal",
  );
  /* Comments explain the fix by naming the old literal, so only executable code is
   * searched: the defect was in a prop, not in prose. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  assert.doesNotMatch(
    code,
    /PALETTE\.yellow/,
    "the contour source must not hard-code the yellow tone now that tone is selectable",
  );
});

/* -------------------------------------------------------- contour persistence */

test("the saved contour keeps its tone, and an older record still loads", () => {
  /* The tone was not persisted while the preset and the amount were, so choosing
   * one and reloading silently reverted the preview, the sculpted face and the
   * export to yellow — with the swatch no longer showing the pressed one. */
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    },
  });
  try {
    storeContour("pebble-soft", 62, "pink");
    const round = readStoredContour();
    assert.deepEqual(round, { preset: "pebble-soft", amount: 62, color: "pink" });

    /* The tone is what changed the appearance, so it must be in the record. */
    assert.match(store.get("000h-assembly-contour") ?? "", /"color":"pink"/);

    /* A record written by the earlier build has no `color`. It must still load,
     * falling back to the authored tone rather than being discarded — losing a
     * visitor's preset because of a missing key would be a worse bug than the one
     * being fixed. */
    store.set("000h-assembly-contour", JSON.stringify({ preset: "clover-soft", amount: 30 }));
    assert.deepEqual(readStoredContour(), { preset: "clover-soft", amount: 30, color: "yellow" });

    /* An unknown tone is treated the same way, never trusted into the store. */
    store.set("000h-assembly-contour", JSON.stringify({ preset: "clover-soft", amount: 30, color: "chartreuse" }));
    assert.equal(readStoredContour()?.color, "yellow");

    /* And a genuinely unusable record is still rejected. */
    store.set("000h-assembly-contour", JSON.stringify({ preset: "hexagon", amount: 30 }));
    assert.equal(readStoredContour(), null);
    store.set("000h-assembly-contour", JSON.stringify({ preset: "clover-soft", amount: "wide" }));
    assert.equal(readStoredContour(), null);
    store.set("000h-assembly-contour", "not json");
    assert.equal(readStoredContour(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("the amount is clamped on the way in, so a corrupt record cannot break the scene", () => {
  /* The amount drives a range input and the sculpted geometry. A stored 900 would
   * push both past their authored range. */
  const store = new Map<string, string>([["000h-assembly-contour", JSON.stringify({ preset: "daisy-12", amount: 900, color: "olive" })]]);
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    },
  });
  try {
    assert.equal(readStoredContour()?.amount, 100);
    store.set("000h-assembly-contour", JSON.stringify({ preset: "daisy-12", amount: -40 }));
    assert.equal(readStoredContour()?.amount, 0);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

/* ------------------------------------------------- the reviewed defects, pinned */

/**
 * The regressions below are the ones an independent review found by reading the
 * source after the first round of fixes. Each asserts the *observable consequence*
 * of the defect rather than the shape of the code, because every one of them
 * passed the unit suite in its broken form.
 */

test("a contour tone is resolved through the palette, not parsed as a CSS colour name", () => {
  /* `setStyle` accepts a CSS colour string. The store holds a palette KEY —
   * "pink", "yellow", "olive", "cream" — and every one of those is either a CSS
   * keyword with a different value or, for "cream", not a CSS colour at all. So
   * passing the key straight through silently produced #ffc0cb for pink instead
   * of the palette's #f5b8db, #ffff00 for yellow, #808000 for olive, and left the
   * material unchanged for cream while logging "Unknown color cream". The tone
   * swatch, the SVG export and the 3D object are required to be the same colour. */
  const parse = (value: string) => {
    const colour = new THREE.Color().setStyle(value, THREE.SRGBColorSpace);
    return `#${colour.getHexString(THREE.SRGBColorSpace)}`;
  };

  for (const key of CONTOUR_COLORS) {
    const authored = PALETTE[key];
    /* The authored tone must survive the round trip... */
    assert.equal(parse(authored), authored, `${key}: ${authored} must parse to itself`);

    /* ...and the bare key must NOT be mistaken for it, which is the defect. */
    assert.notEqual(
      parse(key),
      authored,
      `${key}: the CSS colour named "${key}" is not the palette's ${authored}`,
    );
  }

  /* The two that a visitor would actually notice, named explicitly. */
  assert.equal(parse("pink"), "#ffc0cb", "CSS pink is not the palette's pink");
  assert.notEqual(PALETTE.pink, "#ffc0cb");
  assert.notEqual(PALETTE.yellow, "#ffff00");
  assert.notEqual(PALETTE.olive, "#808000");
});

test("every authored tone reaches the real flower material as its palette colour", () => {
  /* The behavioural half of the test below: this builds the actual Three.js scene
   * and reads the actual material. Before the fix, "pink" put #ffc0cb on the
   * flower, "yellow" put #ffff00 and "olive" put #808000 — CSS keywords that merely
   * share a name with the palette entries — and "cream" was not a CSS colour at
   * all, so Three.js logged "Unknown color cream" and left the previous tone in
   * place. No renderer or WebGL context is needed for this, which is why the
   * earlier claim that only a GPU could check it was wrong. */
  const scene = buildAssemblyScene();
  let material: THREE.MeshStandardMaterial | null = null;
  scene.parts.flower.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!material && mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      material = mesh.material;
    }
  });
  assert.ok(material, "the flower must still be a mesh with its own material");

  const written = () =>
    `#${(material as THREE.MeshStandardMaterial).color.getHexString(THREE.SRGBColorSpace)}`;

  for (const tone of CONTOUR_COLORS) {
    scene.setFlowerContour(new Array(64).fill(1), tone);
    assert.equal(
      written(),
      PALETTE[tone],
      `the ${tone} tone must put the palette's ${PALETTE[tone]} on the flower`,
    );
  }

  /* And no two tones collapse onto the same colour, which is what a key parsed as
   * a CSS name would do for the pairs that happen to share a name. */
  const seen = new Set<string>();
  for (const tone of CONTOUR_COLORS) {
    scene.setFlowerContour(new Array(64).fill(1), tone);
    assert.ok(!seen.has(written()), `the ${tone} tone must differ from every other tone`);
    seen.add(written());
  }
  scene.dispose();
});

test("the sculpted object's tone comes from the palette rather than the raw key", () => {
  /* Guards the wiring, not just the arithmetic: whatever value the controller
   * hands to the geometry for a tone must already be a palette colour. */
  const source = readFileSync(
    new URL("../components/landing/assembly/scene-geometry.ts", import.meta.url),
    "utf8",
  );
  const call = /flowerMaterial\.color\.setStyle\(([\s\S]*?)\);/m.exec(source);
  assert.ok(call, "the flower's tone must still be set on its own material");

  /* The argument may be the resolved value directly or a local holding it, so the
   * resolution is looked for in the statement that sets the tone rather than in the
   * call alone — but the bare key reaching setStyle is the defect and is rejected
   * either way. */
  const before = source.slice(Math.max(0, (call.index ?? 0) - 420), call.index);
  const resolvesThroughPalette =
    /PALETTE\[/.test(call[1]) || /const\s+\w+\s*=\s*PALETTE\[/.test(before);
  assert.ok(
    resolvesThroughPalette,
    "the tone must be resolved through PALETTE before it reaches setStyle",
  );
  assert.doesNotMatch(
    call[1],
    /^\s*colour\s*[,)]/,
    "passing the raw palette key to setStyle is the defect this pins",
  );
});

test("growing the seam box to the touch floor keeps the button on the projected centre", () => {
  /* The plate centres its child, so a taller box moves the button down by half
   * the growth. A 161x24 projection — the measured contour object's own box —
   * therefore sat its button 10px below the pill it is drawn on. */
  const written: Record<string, string> = {};
  const plate = {
    style: new Proxy(written, {
      get: (target, key: string) => target[key] ?? "",
      set: (target, key: string, value: string) => {
        target[key] = value;
        return true;
      },
    }) as unknown as CSSStyleDeclaration,
    dataset: {} as DOMStringMap,
  };

  const short: SeamRect = { x: 40, y: 100, width: 161, height: 24, angle: 0 };
  paintSeam(plate as unknown as HTMLElement, short);

  const height = Number.parseFloat(written.height);
  const translateY = Number.parseFloat(/translate3d\(\s*-?[\d.]+px,\s*(-?[\d.]+)px/.exec(written.transform)![1]);

  assert.equal(height, MIN_TOUCH, "a short projection must still be a reachable target");
  assert.ok(height > short.height, "the box must have grown for this case to mean anything");

  /* Where the button's centre ends up, versus where the projection says it is. */
  const buttonCentre = translateY + height / 2;
  const projectedCentre = short.y + short.height / 2;
  assert.ok(
    Math.abs(buttonCentre - projectedCentre) <= 1,
    `button centre ${buttonCentre} must sit on the projected centre ${projectedCentre}`,
  );

  /* And a projection already taller than the floor is left alone. */
  const tall: SeamRect = { x: 0, y: 50, width: 200, height: 90, angle: 0 };
  paintSeam(plate as unknown as HTMLElement, tall);
  assert.equal(Number.parseFloat(written.height), 90);
  const tallY = Number.parseFloat(/translate3d\(\s*-?[\d.]+px,\s*(-?[\d.]+)px/.exec(written.transform)![1]);
  assert.equal(tallY, 50, "an unclamped box must not be shifted");
});

test("a fading voice still counts against the ceiling", () => {
  /* `release()` marks a voice `releasing` at the START of its fade, so excluding
   * those voices meant a voice stopped counting the moment it began to fade — and
   * the ceiling admitted a replacement for something still sounding. */
  const source = readFileSync(
    new URL("../components/landing/assembly/audio-engine.ts", import.meta.url),
    "utf8",
  );
  const liveVoices = /const liveVoices = \(\) =>([^;]*);/.exec(source);
  assert.ok(liveVoices, "the engine must still expose a single liveness predicate");
  assert.doesNotMatch(
    liveVoices[1],
    /releasing/,
    "a voice that is fading is still audible and must still be counted",
  );

  /* Every ceiling decision and every reported count goes through it. */
  assert.match(source, /while \(liveVoices\(\)\.length >= limit\)/);
});

test("the context is suspended after its fades, not underneath them", () => {
  /* Suspending a running context freezes scheduled automation where it is, so a
   * release fade scheduled immediately before the suspend never plays. */
  const engine = readFileSync(
    new URL("../components/landing/assembly/audio-engine.ts", import.meta.url),
    "utf8",
  );
  assert.match(engine, /function suspendWhenSilent\(\)/, "the deferred suspend must exist");

  /* The two paths that dismissed audio must both defer. */
  const disable = /disable\(\)\s*\{([\s\S]*?)\n    \},/.exec(engine);
  assert.ok(disable, "disable() must still exist");
  assert.doesNotMatch(
    disable[1],
    /void context\.suspend\(\)/,
    "disable() must not suspend the context in the same turn as scheduling a fade",
  );
  assert.match(disable[1], /suspendWhenSilent\(\)/);

  const lifecycle = /suspendForLifecycle\(\)\s*\{([\s\S]*?)\n    \},/.exec(engine);
  assert.ok(lifecycle, "suspendForLifecycle() must still exist");
  assert.doesNotMatch(lifecycle[1], /void context\.suspend\(\)/);
  assert.match(lifecycle[1], /suspendWhenSilent\(\)/);

  /* The existing Motion read/write contract still holds. */
  assert.equal(isMotionRunning({ motion: { mode: "subtle" }, flow: { variant: "glide" } }), true);
  assert.equal(isMotionRunning({ motion: { mode: "off" }, flow: { variant: "glide" } }), false);
});

test("the Motion switch reads the one setting it can write", () => {
  /* It can only write `motion.mode`, so a checked state derived from the mode AND
   * the flow variant described something the switch could not change: with the
   * variant off, pressing it wrote `mode: "subtle"`, announced motion on, and left
   * the switch visibly off. */
  const source = readFileSync(
    new URL("../components/landing/assembly/assembly-landing.tsx", import.meta.url),
    "utf8",
  );
  const control = /function MotionModeControl\(\)\s*\{([\s\S]*?)\n\}/.exec(source);
  assert.ok(control, "the Motion switch must still be its own component");
  assert.match(
    control[1],
    /checked=\{settings\.motion\.mode !== "off"\}/,
    "the checked state must describe the setting this control writes",
  );
  assert.doesNotMatch(
    control[1],
    /checked=\{isMotionRunning\(/,
    "the conjunction is not a state this switch can reach",
  );
  /* Turning motion on restores the variant, so the switch cannot latch while the
   * scene stays still for the other reason. */
  assert.match(control[1], /setFlowSettings\(\{ variant: FLOW_DEFAULTS\.variant \}\)/);
});

test("no placeholder copy survives on the page", () => {
  /* The review asked for prototype language to be replaced, and a "fixed" copy
   * claim is easy to make and easy to get wrong one paragraph later. */
  /* Scans every file the route renders, not just the landing component. The first
   * version of this test read only `assembly-landing.tsx`, so it passed while the
   * route's own metadata still described the page as "a test section" — and that
   * description is what a browser tab, a link preview and a search result show. */
  const files = [
    "../app/assembly/page.tsx",
    "../components/landing/assembly/assembly-landing.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const phrase of [
      "test section",
      "while its quality is reviewed",
      "existing home page is untouched",
      "not published work yet",
    ]) {
      assert.ok(
        !source.toLowerCase().includes(phrase),
        `placeholder phrasing must not remain in ${file.split("/").pop()}: "${phrase}"`,
      );
    }
  }
});


/* -------------------------------------------------- selection → store → plate */

/**
 * Runs `build` with a stub document that can answer `getContext("2d")`, and
 * returns everything the plate painted while that document was installed.
 *
 * `paintSourceSummary` needs a 2D context and the unit suite has no DOM. A real
 * canvas element is not what is under test — the *wiring* is — so the stub is the
 * smallest object that can answer the painter, and it keeps the fill calls. That
 * is enough to read back what the plate was told to draw, which is the only thing
 * the visitor sees change.
 *
 * The stub stays installed for the whole callback because the canvas it hands out
 * outlives the build: `setSourceSummary` repaints that same canvas in place, so a
 * later repaint must still reach the recording context.
 */
function recordingDocument<T>(build: (painted: string[]) => T): { result: T; painted: string[] } {
  const painted: string[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement(tag: string) {
        if (tag !== "canvas") throw new Error(`unexpected element <${tag}>`);
        return {
          width: 0,
          height: 0,
          getContext(kind: string) {
            if (kind !== "2d") return null;
            return {
              clearRect() {},
              set font(_value: string) {},
              set fillStyle(_value: string) {},
              fillText(text: string) { painted.push(text); },
            };
          },
        };
      },
    },
  });
  try {
    return { result: build(painted), painted };
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete (globalThis as { document?: unknown }).document;
  }
}

test("selecting a specimen repaints the source plate with that specimen", () => {
  /* R10, as a chain rather than a unit check.
   *
   * The defect was never inside one function: `sourceSummaryLines` returned the
   * right lines, the store held the right id, and the plate still drew
   * `<Button>Create</Button>` over a Slider selection, because the two halves were
   * never connected. `assembly.test.ts` already asserts the lines themselves. This
   * asserts the wiring, using the real scene, the real painter and the real store:
   *
   *   bench selection → `experience.set({ specimen })`   (assembly-landing.tsx)
   *                   → `experience.get().specimen`      (scene-controller.ts)
   *                   → `assembly.setSourceSummary(id)`  → the plate canvas
   *
   * Both connections are load-bearing, and dropping either makes this fail: without
   * the store write the scene never learns the selection and the plate paints the
   * featured specimen; without the repaint the plate is never repainted at all. */
  experience.reset();

  /* The two connections, read from the page's own source rather than restated
   * here. A regression test that re-implements the wiring it is meant to protect
   * passes forever while the real thing rots — verified by deleting each call and
   * watching a restated version keep passing. */
  const landing = readFileSync(join(process.cwd(), "components", "landing", "assembly", "assembly-landing.tsx"), "utf8");
  const controller = readFileSync(join(process.cwd(), "components", "landing", "assembly", "scene-controller.ts"), "utf8");

  const pickSpecimen = /const pickSpecimen = React\.useCallback\([\s\S]*?\n  \);/.exec(landing)?.[0];
  assert.ok(pickSpecimen, "assembly-landing.tsx must still select via `pickSpecimen`");
  assert.match(pickSpecimen, /experience\.set\(\{\s*specimen:\s*id\s*\}\)/,
    "selecting on the bench must write the specimen to the store; without it the scene never learns the selection (R10)");

  const applyFrame = /function applyFrame\(dt: number, cameraDt = dt\) \{[\s\S]*?\n  \}/.exec(controller)?.[0];
  assert.ok(applyFrame, "scene-controller.ts must still pose the scene in `applyFrame`");
  assert.match(applyFrame, /experience\.get\(\)/,
    "`applyFrame` must read the store; it is the scene's only view of the selection");
  assert.match(applyFrame, /assembly\.setSourceSummary\(state\.specimen\)/,
    "`applyFrame` must repaint the plate for the specimen the store now holds; reading without repainting leaves the plate stale (R10)");

  const scene = recordingDocument(() => buildAssemblyScene());
  /* Arriving on the hero paints the featured specimen. */
  assert.deepEqual(scene.painted, [...sourceSummaryLines(FEATURED_SPECIMEN)],
    "the plate must summarise the featured specimen on arrival");

  const selected = SPECIMEN_TRAYS.find((specimen) => specimen.id === "slider");
  assert.ok(selected, "the bench must still offer the slider");
  assert.notDeepEqual(sourceSummaryLines(selected.id), sourceSummaryLines(FEATURED_SPECIMEN),
    "this test is only meaningful while the two summaries differ");
  /* The selected specimen must really be one the page's own picker can select,
   * so the two connections above are the ones this very selection travels. */
  assert.ok(SPECIMEN_TRAYS.some((specimen) => specimen.id === experience.get().specimen),
    "the store must start on a specimen the bench actually offers");

  /* Drive the chain the way the page drives it: the selection the source makes,
   * then the frame the controller runs. */
  const summarised = { id: FEATURED_SPECIMEN };
  const frame = () => {
    const state = experience.get();
    if (state.specimen !== summarised.id) {
      summarised.id = state.specimen;
      scene.result.setSourceSummary(state.specimen);
    }
  };

  scene.painted.length = 0;
  frame();
  assert.deepEqual(scene.painted, [],
    "a frame with no new selection must not repaint the plate");

  scene.painted.length = 0;
  /* What `pickSpecimen` does, applied to the real store the controller reads. */
  experience.set({ specimen: selected.id });
  experience.emit({ type: "specimenLift", id: selected.id });
  assert.equal(experience.get().specimen, selected.id,
    "the bench selection must reach the store — without this write the scene cannot see it");
  frame();

  assert.deepEqual(scene.painted, [...sourceSummaryLines(selected.id)],
    "the plate must repaint from the selection rather than keep a fixed snippet");
  assert.notDeepEqual(scene.painted, [...sourceSummaryLines(FEATURED_SPECIMEN)],
    "the plate must not still be drawing the featured specimen");

  /* A repeat selection is not a new one, and must not repaint. */
  scene.painted.length = 0;
  frame();
  assert.deepEqual(scene.painted, [],
    "the plate repaints on change, not on every frame");

  experience.reset();
});
