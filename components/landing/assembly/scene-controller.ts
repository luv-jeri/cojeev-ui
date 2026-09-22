/**
 * The sole scene and camera writer.
 *
 * Responsibilities, in order of importance:
 * 1. One camera, one writer. Nothing else may set `camera.position`.
 * 2. Render only while something is actually changing — scroll, a settling
 *    spring, a live gesture or a resize. A settled page requests no frames.
 * 3. Frame-rate-independent secondary springs with fixed substeps. Direct values
 *    (press state, tension, contour, switch) are never spring-integrated.
 * 4. Measure the projected Create seam against the sculpted mesh itself, so the
 *    DOM control and the WebGL object cannot drift apart silently.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { INSTRUMENT, LIGHT_RIG, PALETTE } from "./canonical";
import {
  evaluate,
  focusFromScroll,
  restingFrame,
  scrollProgress,
  type EvaluatedFrame,
  type PartId,
} from "./choreography";
import { blendContour, type ContourPreset } from "./contour-export";
import { applyOpacity, buildAssemblyScene, type AssemblyScene } from "./scene-geometry";
import { projectSeam, seamMatrices } from "./seam-projection";
import { experience, sceneAnimates } from "./experience-store";

export type SeamRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Screen-space rotation of the sculpted control, in radians. */
  angle: number;
};

export type SeamSample = { create: SeamRect | null };

export type SceneStatus = "pending" | "ready" | "lost" | "unavailable";

export type SceneControllerOptions = {
  canvas: HTMLCanvasElement;
  sectionTops: () => number[];
  onSeam: (sample: SeamSample) => void;
  onChapter: (index: number) => void;
  onStatus: (status: SceneStatus) => void;
};

export type SceneController = {
  /** Pushes a new native scroll position. Cheap; never triggers layout reads. */
  setScroll(scrollY: number, viewportHeight: number): void;
  /** Re-measures and redraws after a resize or orientation change. */
  resize(): void;
  /** 0–100 contour amount for the sculpted face. */
  setContour(preset: ContourPreset, amount: number, colour: string): void;
  invalidate(): void;
  dispose(): void;
};

type Spring = { value: number; velocity: number; target: number };

const createSpring = (value: number): Spring => ({ value, velocity: 0, target: value });

/**
 * Semi-implicit Euler on fixed 1/120 s substeps. Independent of frame rate, and
 * a backgrounded tab cannot accumulate elapsed time because `dt` is clamped.
 */
function stepSpring(spring: Spring, stiffness: number, damping: number, dt: number) {
  const substeps = Math.max(1, Math.min(8, Math.ceil(dt / (1 / 120))));
  const step = dt / substeps;
  for (let index = 0; index < substeps; index++) {
    const force = (spring.target - spring.value) * stiffness - spring.velocity * damping;
    spring.velocity += force * step;
    spring.value += spring.velocity * step;
  }
}

const settled = (spring: Spring, epsilon = 2e-4) =>
  Math.abs(spring.value - spring.target) < epsilon && Math.abs(spring.velocity) < epsilon;

/** Press: 6–8% compression, settling inside the 220–320 ms contract. */
const PRESS = { stiffness: 380, damping: 30 };
/** Layer separation: critically damped, roughly 450 ms to register. */
const SPREAD = { stiffness: 150, damping: 24.5 };
/** Contour echo: one small overshoot, never a spring on the exported value. */
const ECHO = { stiffness: 300, damping: 20 };

const MAX_DPR_DESKTOP = 1.75;
const MAX_DPR_MOBILE = 1.5;

export function isWebglAvailable() {
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      probe.getContext("webgl2") ??
        probe.getContext("webgl") ??
        probe.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function createSceneController(
  options: SceneControllerOptions,
): SceneController | null {
  const { canvas, sectionTops, onSeam, onChapter, onStatus } = options;
  if (!isWebglAvailable()) {
    onStatus("unavailable");
    return null;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    onStatus("unavailable");
    return null;
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0c);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);

  const assembly: AssemblyScene = buildAssemblyScene();
  scene.add(assembly.root);

  /* ------------------------------------------------------------------ lights */
  const key = new THREE.DirectionalLight(0xfff4e2, LIGHT_RIG.key.intensity);
  key.position.set(...(LIGHT_RIG.key.position as unknown as [number, number, number]));
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3.2;
  key.shadow.camera.right = 3.2;
  key.shadow.camera.top = 3.2;
  key.shadow.camera.bottom = -3.2;
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.022;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0xdfe8ff, LIGHT_RIG.fill.intensity);
  fill.position.set(...(LIGHT_RIG.fill.position as unknown as [number, number, number]));
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe9d6, LIGHT_RIG.rim.intensity);
  rim.position.set(...(LIGHT_RIG.rim.position as unknown as [number, number, number]));
  scene.add(rim);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x1a1a1c, LIGHT_RIG.ambient);
  scene.add(ambient);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  // The room gives the object its soft studio wrap. Left at full strength it
  // also lights the ground plane at grazing incidence, where Fresnel turns a
  // near-black albedo into a bright grey sheet, so it is dialled back and the
  // directional rig carries more of the modelling instead.
  scene.environmentIntensity = 0.42;
  room.dispose?.();
  pmrem.dispose();

  /* ------------------------------------------------------------------- state */
  let scrollY = 0;
  let viewportHeight = typeof window === "undefined" ? 1 : window.innerHeight;
  let frame: EvaluatedFrame = evaluate(0);
  let lastChapter = -1;
  let disposed = false;
  let scheduled = 0;
  let previousTime = 0;
  let lastSeamKey = "";
  let contourPreset: ContourPreset = "daisy-12";
  let directContour = 0;
  let contourColour: string = PALETTE.yellow;
  /**
   * The last triple handed to the sculpted face, or `null` when nothing has been
   * applied yet.
   *
   * This is deliberately not a numeric "applied amount" compared with a tolerance.
   * The previous version initialised the applied amount to `NaN` and tested
   * `Math.abs(directContour - contourApplied) > 0.02`, which is false for every
   * input because every comparison against `NaN` is false — so the face was built
   * once from its default and never rebuilt, and the small SVG preview and the
   * large object could disagree indefinitely while both looked plausible. An
   * explicit record of what was actually applied cannot have that failure mode.
   */
  let contourApplied: { preset: ContourPreset; amount: number; colour: string } | null = null;

  const compression = createSpring(0);
  const spread = createSpring(0);
  const echo = createSpring(0);

  const backdrop = new THREE.Color();
  const floorColor = new THREE.Color();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const keyOffset = new THREE.Vector3(
    LIGHT_RIG.key.position[0],
    LIGHT_RIG.key.position[1],
    LIGHT_RIG.key.position[2],
  );

  /**
   * Projects the sculpted control's own world-space probe points to CSS pixels.
   *
   * Ordering matters and is the whole point of this function: `localToWorld`
   * resolves the full parent chain from each object's `matrixWorld`, and
   * `project()` reads `camera.matrixWorldInverse` and `camera.projectionMatrix`.
   * The camera is *not* a child of the scene, so `scene.updateMatrixWorld()`
   * never refreshes it — the matrices have to be brought up to date explicitly,
   * in this order, before a single point is projected. Relying on
   * `renderer.render()` to do it afterwards left the seam measuring the previous
   * frame's camera, and because a settled page requests no further frames that
   * stale measurement could persist indefinitely — which is how the real button
   * ended up hundreds of pixels from the object it was supposed to be sitting on.
   */
  /**
   * Projects the sculpted control's own world-space probe points to CSS pixels.
   *
   * `seamMatrices` is what makes this correct: the camera is *not* a child of the
   * scene, so `scene.updateMatrixWorld()` never refreshes it, and `project()`
   * reads the inverse world matrix it produces. Refreshing here — at the moment of
   * measurement, after the frame's pose has been written — means the DOM handoff
   * always describes the camera that is about to be rendered. Letting
   * `renderer.render()` do it afterwards measured the *previous* frame's camera,
   * and a settled page requests no further frames, so a stale measurement could
   * persist indefinitely. That is how the real button ended up hundreds of pixels
   * from the object it was supposed to be sitting on.
   */
  function measureSeam(): SeamRect | null {
    const { object, probe } = assembly.createSeam;
    if (!object.visible) return null;
    /* The mesh's own world matrix must be current too, including every ancestor:
     * the part pose, the spread offset and the instrument group all sit above it. */
    object.updateWorldMatrix(true, false);
    const { projection, view } = seamMatrices(camera);
    return projectSeam(
      probe,
      object.matrixWorld.elements,
      projection,
      view,
      canvas.clientWidth || 1,
      canvas.clientHeight || 1,
    );
  }

  function publishSeam() {
    const rect = measureSeam();
    const nextKey = rect
      ? `${rect.x.toFixed(1)}:${rect.y.toFixed(1)}:${rect.width.toFixed(1)}:${rect.angle.toFixed(3)}`
      : "hidden";
    if (nextKey === lastSeamKey) return;
    lastSeamKey = nextKey;
    onSeam({ create: rect });
  }

  /**
   * How much further back the camera must sit in portrait. One at landscape and
   * square-ish aspect ratios, rising as the viewport narrows, capped so a very
   * tall phone does not turn the instrument into a speck.
   */
  function portraitFit(width: number, height: number) {
    if (width <= 0 || height <= 0) return 1;
    return Math.min(1.75, Math.max(1, 1.1 / (width / height)));
  }

  function applyFrame(dt: number) {
    const state = experience.get();
    /* One predicate for both silencers. The visitor's system preference is a
     * standing instruction and the site's own switch is the other; either one
     * means the scene changes state directly instead of travelling. */
    const animates = sceneAnimates(state);

    compression.target = state.pressed && animates ? 1 : 0;
    spread.target = state.layersOpen ? 1 : 0;
    if (animates) {
      stepSpring(compression, PRESS.stiffness, PRESS.damping, dt);
      stepSpring(spread, SPREAD.stiffness, SPREAD.damping, dt);
      stepSpring(echo, ECHO.stiffness, ECHO.damping, dt);
    } else {
      /* Settle on the frame the value changed: no spring, no overshoot, and no
       * residual velocity to integrate over the following frames. The value still
       * arrives — it just does not perform the arrival. */
      for (const spring of [compression, spread, echo]) {
        spring.value = spring.target;
        spring.velocity = 0;
      }
    }

    /* Reduced motion swaps between authored chapter poses rather than blending
     * across the boundary. The destination pose is reached exactly, so the camera
     * never crosses the metre of world space a blend would traverse and no chapter
     * subject is ever scaled through an intermediate size. The pose is still a
     * pure function of scroll, so reverse scrolling and a skipped boundary behave
     * exactly as they did — a chapter is simply reached, not travelled to. */
    /* The whole composition is swapped, not only the camera. Snapping the camera
     * to a resting pose while the backdrop, lighting, aperture, floor and part
     * opacities were still mid-blend produced a worse frame than either endpoint:
     * a hard camera cut onto a scene that was still dissolving. */
    const sceneFrame = animates ? frame : restingFrame(frame.progress);
    const pose = sceneFrame.pose;

    camera.position.set(...(pose.position as unknown as [number, number, number]));
    camera.fov = pose.fov;
    cameraTarget.set(...(pose.target as unknown as [number, number, number]));
    // Portrait framing. A 35 degree vertical field on a 390x844 screen is a
    // ~17 degree horizontal one, so the authored three-quarter distance fills
    // the width with the instrument and leaves nothing for the text. Pull back
    // along the same sight line and aim below the subject, which lifts it into
    // the upper half where the document is not.
    const fit = portraitFit(canvas.clientWidth, canvas.clientHeight);
    if (fit > 1) {
      // Pull straight back along the authored sight line, then re-aim at the
      // instrument itself rather than at its chapter framing: a narrow screen
      // has no room for an off-centre subject and a text column.
      const k = Math.min(1, (fit - 1) / 0.75);
      camera.position.sub(cameraTarget).multiplyScalar(fit).add(cameraTarget);
      const [instrumentX, instrumentY] = sceneFrame.instrument.position;
      cameraTarget.x += (instrumentX - cameraTarget.x) * k;
      cameraTarget.y += (instrumentY - 1.15 - cameraTarget.y) * k;
    }
    camera.lookAt(cameraTarget);
    camera.rotation.z = pose.roll;
    camera.updateProjectionMatrix();

    backdrop.setStyle(sceneFrame.backdrop, THREE.SRGBColorSpace);
    (scene.background as THREE.Color).copy(backdrop);
    floorColor.copy(backdrop).multiplyScalar(0.86);
    key.intensity = sceneFrame.lights.key;
    fill.intensity = sceneFrame.lights.fill;
    rim.intensity = sceneFrame.lights.rim;

    // The key light keeps its authored upper-left direction relative to the
    // subject and follows the subject, so the shadow camera stays framed.
    key.target.position.copy(cameraTarget);
    key.target.updateMatrixWorld();
    key.position.copy(cameraTarget).add(keyOffset);

    assembly.aperture.position.set(
      ...(sceneFrame.aperture.position as unknown as [number, number, number]),
    );
    assembly.aperture.scale.setScalar(sceneFrame.aperture.scale);
    applyOpacity(assembly.aperture, sceneFrame.aperture.opacity);

    (assembly.floor.material as THREE.MeshStandardMaterial).color.copy(floorColor);
    applyOpacity(assembly.floor, sceneFrame.floor);
    applyOpacity(assembly.field, sceneFrame.field);
    applyOpacity(assembly.stage, sceneFrame.stage);
    applyOpacity(assembly.closingField, sceneFrame.closing);

    const separation = spread.value;
    for (const id of Object.keys(assembly.parts) as PartId[]) {
      const pose = sceneFrame.parts[id];
      const object = assembly.parts[id];
      const vector = assembly.spreadVectors[id];
      object.position.set(
        pose.position[0] + vector.x * separation,
        pose.position[1] + vector.y * separation,
        pose.position[2] + vector.z * separation,
      );
      object.rotation.set(pose.rotation[0], pose.rotation[1], pose.rotation[2]);
      object.scale.setScalar(pose.scale);
      applyOpacity(object, pose.opacity);
    }

    // Direct control state, applied on top of the chapter pose.
    assembly.parts.switchThumb.position.x += state.motionOn
      ? INSTRUMENT.switch.thumbTravel
      : -INSTRUMENT.switch.thumbTravel;

    const tension = Math.max(0, Math.min(1, state.tension / 100));
    const sliderX = (tension - 0.5) * INSTRUMENT.slider.travel;
    assembly.parts.sliderThumb.position.x += sliderX;

    const trackPose = sceneFrame.parts.sliderTrack;
    assembly.sliderBand.mesh.position.set(
      trackPose.position[0],
      trackPose.position[1],
      trackPose.position[2],
    );
    assembly.sliderBand.setSpine(
      start.set(
        trackPose.position[0] - INSTRUMENT.slider.travel / 2 + 0.04,
        trackPose.position[1],
        trackPose.position[2] + 0.016,
      ),
      end.set(
        trackPose.position[0] + sliderX - 0.02,
        trackPose.position[1],
        trackPose.position[2] + 0.016,
      ),
      0,
      0.026,
    );
    applyOpacity(
      assembly.sliderBand.mesh,
      Math.min(sceneFrame.parts.sliderTrack.opacity, sceneFrame.parts.sliderThumb.opacity),
    );

    // Press deformation on the sculpted face; the group keeps the chapter pose.
    const squash = compression.value;
    assembly.createMesh.scale.set(
      1 + squash * 0.02,
      1 - squash * INSTRUMENT.create.pressCompression,
      1 - squash * 0.05,
    );
    assembly.createMesh.position.z = -squash * INSTRUMENT.create.thickness * 0.45;

    const createPose = sceneFrame.parts.create;
    assembly.ribbon.setSpine(
      start.set(
        createPose.position[0] - INSTRUMENT.create.width / 2 + 0.02,
        createPose.position[1] + 0.02,
        createPose.position[2] + 0.06,
      ),
      end.set(
        createPose.position[0] - 0.42 - 1.24 * tension,
        createPose.position[1] + 0.02 - 0.5 * tension,
        createPose.position[2] + 0.12,
      ),
      0.24 + 0.2 * (1 - tension),
      0.017 * (1 - 0.15 * tension),
    );
    applyOpacity(assembly.ribbon.mesh, sceneFrame.weights[0]);

    // The contour itself is direct: the exported path and the sculpted face read
    // the same value. Only the small echo lags.
    if (
      !contourApplied ||
      contourApplied.preset !== contourPreset ||
      contourApplied.amount !== directContour ||
      contourApplied.colour !== contourColour
    ) {
      contourApplied = {
        preset: contourPreset,
        amount: directContour,
        colour: contourColour,
      };
      assembly.setFlowerContour(
        blendContour(contourPreset, directContour),
        contourColour,
      );
    }
    const flowerPose = sceneFrame.parts.flower;
    assembly.parts.flower.scale.setScalar(flowerPose.scale * (1 + 0.03 * echo.value));

    scene.updateMatrixWorld(true);
    /* `measureSeam` refreshes the camera's own matrices immediately before it
     * projects, so the DOM handoff below always describes the camera that is about
     * to be rendered rather than the one that was rendered last time. */
    publishSeam();

    if (sceneFrame.chapterIndex !== lastChapter) {
      lastChapter = sceneFrame.chapterIndex;
      onChapter(sceneFrame.chapterIndex);
    }
  }

  const active = () =>
    !settled(compression) || !settled(spread) || !settled(echo);

  function tick(time: number) {
    scheduled = 0;
    if (disposed) return;
    const dt = previousTime === 0 ? 1 / 60 : Math.min(0.064, (time - previousTime) / 1000);
    previousTime = time;
    applyFrame(dt);
    renderer.render(scene, camera);
    if (active()) schedule();
  }

  function schedule() {
    if (disposed || scheduled) return;
    scheduled = requestAnimationFrame(tick);
  }

  function updateProgress() {
    const tops = sectionTops();
    if (!tops.length) return;
    frame = evaluate(
      scrollProgress(focusFromScroll(scrollY, viewportHeight), tops, viewportHeight),
    );
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      width < 900 ? MAX_DPR_MOBILE : MAX_DPR_DESKTOP,
    );
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const shadowSize = width < 900 || dpr > 1.5 ? 512 : 1024;
    if (key.shadow.mapSize.x !== shadowSize) {
      key.shadow.map?.dispose();
      key.shadow.map = null;
      key.shadow.mapSize.set(shadowSize, shadowSize);
    }
    viewportHeight = window.innerHeight;
    updateProgress();
    schedule();
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    onStatus("lost");
  };
  const onRestored = () => {
    onStatus("ready");
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost as EventListener, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);

  const unsubscribe = experience.subscribe(() => schedule());

  updateProgress();
  resize();
  applyFrame(1 / 60);
  renderer.render(scene, camera);
  onStatus("ready");

  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).__assembly = {
      scene,
      camera,
      renderer,
      assembly,
    };
  }

  return {
    setScroll(nextScrollY, nextViewportHeight) {
      scrollY = nextScrollY;
      const viewportChanged = Math.abs(nextViewportHeight - viewportHeight) > 0.5;
      viewportHeight = nextViewportHeight;
      updateProgress();
      if (viewportChanged) resize();
      else schedule();
    },
    resize,
    setContour(preset, amount, colour) {
      /* Preset, amount and colour all reach the same applied record, so every
       * one of them is enough on its own to trigger a rebuild — including a
       * colour change at an unchanged shape, which previously reached nothing. */
      const shapeChanged = amount !== directContour || preset !== contourPreset;
      contourPreset = preset;
      directContour = amount;
      contourColour = colour;
      /* The echo is the site's own one-shot flourish on a shape edit. A colour
       * change is not an edit, so a re-tint must not pulse the object. */
      if (shapeChanged) {
        echo.value = 1;
        echo.velocity = 0;
      }
      schedule();
    },
    invalidate: schedule,
    dispose() {
      disposed = true;
      if (scheduled) cancelAnimationFrame(scheduled);
      scheduled = 0;
      unsubscribe();
      canvas.removeEventListener("webglcontextlost", onLost as EventListener);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      assembly.dispose();
      environment.texture.dispose();
      environment.dispose?.();
      renderer.dispose();
    },
  };
}
