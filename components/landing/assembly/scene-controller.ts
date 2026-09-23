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
import { blendContour } from "./contour-export";
import type { SignatureShapeName } from "../../../registry/cojeev/lib/signature-shapes";
import {
  MIRROR_TAP_OFFSETS,
  applyOpacity,
  buildAssemblyScene,
  type AssemblyScene,
} from "./scene-geometry";
import { projectSeam, projectFace, seamMatrices } from "./seam-projection";
import {
  heroInteraction,
  heroPointer,
  cameraStep,
  cameraEase,
  registerHeroInvalidator,
} from "./hero-interaction";
import { experience, sceneAnimates } from "./experience-store";

export type SeamRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Screen-space rotation of the sculpted control, in radians. */
  angle: number;
  corners?: { x: number; y: number }[];
  matrix?: number[];
};

export type SeamSample = {
  create: SeamRect | null;
  faces: Record<string, SeamRect | null>;
};

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
  setContour(preset: SignatureShapeName, amount: number, colour: string): void;
  invalidate(): void;
  dispose(): void;
};

type Spring = { value: number; velocity: number; target: number };

const createSpring = (value: number): Spring => ({
  value,
  velocity: 0,
  target: value,
});

/**
 * Semi-implicit Euler on fixed 1/120 s substeps. Independent of frame rate, and
 * a backgrounded tab cannot accumulate elapsed time because `dt` is clamped.
 */
function stepSpring(
  spring: Spring,
  stiffness: number,
  damping: number,
  dt: number,
) {
  const substeps = Math.max(1, Math.min(8, Math.ceil(dt / (1 / 120))));
  const step = dt / substeps;
  for (let index = 0; index < substeps; index++) {
    const force =
      (spring.target - spring.value) * stiffness - spring.velocity * damping;
    spring.velocity += force * step;
    spring.value += spring.velocity * step;
  }
}

const settled = (spring: Spring, epsilon = 2e-4) =>
  Math.abs(spring.value - spring.target) < epsilon &&
  Math.abs(spring.velocity) < epsilon;

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
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0c);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);

  const assembly: AssemblyScene = buildAssemblyScene();
  scene.add(assembly.root);

  /* ------------------------------------------------------------------ lights */
  const key = new THREE.DirectionalLight(0xfff4e2, LIGHT_RIG.key.intensity);
  key.position.set(
    ...(LIGHT_RIG.key.position as unknown as [number, number, number]),
  );
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
  fill.position.set(
    ...(LIGHT_RIG.fill.position as unknown as [number, number, number]),
  );
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe9d6, LIGHT_RIG.rim.intensity);
  rim.position.set(
    ...(LIGHT_RIG.rim.position as unknown as [number, number, number]),
  );
  scene.add(rim);

  const ambient = new THREE.HemisphereLight(
    0xffffff,
    0x1a1a1c,
    LIGHT_RIG.ambient,
  );
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
  let contourPreset: SignatureShapeName = "petal-7";
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
  let contourApplied: {
    preset: SignatureShapeName;
    amount: number;
    colour: string;
  } | null = null;

  const compression = createSpring(0);
  const spread = createSpring(0);
  const echo = createSpring(0);

  let cameraMix = 0;
  let releaseBeat = 0;
  let previousPhase = "idle";
  let cameraControl: string | null = null;
  const cameraFocusPoint = new THREE.Vector3();
  const focusStart = new THREE.Vector3();
  const focusEnd = new THREE.Vector3();
  let focusMix = 1;
  let hidden = false;
  let contextLost = false;
  let mobileStageTop = 0;
  let mobileStageHeight = 0;
  const pointerRay = new THREE.Raycaster();
  const ribbonPlane = new THREE.Plane();
  const pointerWorld = new THREE.Vector3();
  const planeNormal = new THREE.Vector3();
  const warmHeroLight = new THREE.Color(0xffdca0);
  /* The fill is authored cool (0xdfe8ff) for the catalogue's daylight look; in
   * the hero its bounce lands on cream and desaturates it, so the hero warms it
   * too, and the room environment steps back so the directional rig keeps the
   * modelling. */
  const warmHeroBounce = new THREE.Color(0xffdcb4);
  /* The artboard's shadow side and the underside of the band are warm, not dark:
   * 175,157,138 on the inner edge and 150,133,119 along the lower sweep, which is
   * light coming back off the floor. The rig's hemisphere is a white sky over a
   * near-black ground, so the hero warms both halves and leans on the ground
   * more. */
  const warmHeroSky = new THREE.Color(0xffe0bd);
  const warmHeroGround = new THREE.Color(0x655749);
  /* The artboard's floor is a warm brown, brighter than the field behind it —
   * the object is standing on a lit surface, not floating over a void. The
   * chapter frame only carries one backdrop, so the hero's floor is lifted
   * toward its own colour by the hero weight rather than by a second field.
   * Sampled from the reference at 400,950 and 1150,1000.
   *
   * Raised from 0x6a6058 once the falloff map stopped reaching its dark end: the
   * pool under the object measured 84.7 where the artboard keeps 136.8, and the
   * artboard holds that lit ground against a far field of 19. Since the pool is
   * the map's bright end, the only way to move it without also lifting the far
   * field — which is what has to stay dark for the plane's edge to disappear —
   * is the albedo. The shadow band's own median was 84.9 against the artboard's
   * 111.2, so this closes both gaps at once. */
  /* Neutralised from 0x988b81: over the floor's own 790-1020 band the artboard
   * reads mean r-minus-b 19.2 and this read 28.2. The floor's albedo is drawn
   * 85% from this colour over the backdrop, so the cast is set here; 0x968b86
   * is the same luminance with an r-minus-b of 15.5, which the warm key scales
   * back up to the artboard's 19. */
  const warmHeroFloor = new THREE.Color(0x968b86);
  const backdrop = new THREE.Color();
  const floorColor = new THREE.Color();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const cursorAt = new THREE.Vector3();
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
    if (nextKey === lastSeamKey && experience.get().heroPhase === "idle")
      return;
    lastSeamKey = nextKey;
    const faces: Record<string, SeamRect | null> = {};
    const { projection, view } = seamMatrices(camera);
    for (const [id, face] of Object.entries(assembly.heroFaces)) {
      face.object.updateWorldMatrix(true, false);
      faces[id] = projectFace(
        face.probe,
        face.object.matrixWorld.elements,
        projection,
        view,
        canvas.clientWidth,
        canvas.clientHeight,
      );
    }
    onSeam({ create: rect, faces });
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

  function applyFrame(dt: number, cameraDt = dt) {
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

    camera.position.set(
      ...(pose.position as unknown as [number, number, number]),
    );
    camera.fov = pose.fov;
    cameraTarget.set(...(pose.target as unknown as [number, number, number]));
    // Portrait framing. A 35 degree vertical field on a 390x844 screen is a
    // ~17 degree horizontal one, so the authored three-quarter distance fills
    // the width with the instrument and leaves nothing for the text. Pull back
    // along the same sight line and aim below the subject, which lifts it into
    // the upper half where the document is not.
    const heroWeight = sceneFrame.weights[0];
    const fit = portraitFit(canvas.clientWidth, canvas.clientHeight);
    if (fit > 1) {
      const k = Math.min(1, (fit - 1) / 0.75);
      camera.position.sub(cameraTarget).multiplyScalar(fit).add(cameraTarget);
      const [instrumentX, instrumentY] = sceneFrame.instrument.position;
      cameraTarget.x += (instrumentX - cameraTarget.x) * k;
      cameraTarget.y += (instrumentY - 1.15 - cameraTarget.y) * k;
    }
    // A mobile hero owns an actual document-space stage below its actions. The
    // canvas stays fixed; setViewOffset registers the object to that stage as
    // native scroll moves it, without pinning the document or intercepting input.
    camera.clearViewOffset();
    canvas.style.clipPath = "";
    if (canvas.clientWidth < 900 && heroWeight > 0) {
      const width = canvas.clientWidth;
      const stageHeight = mobileStageHeight || width * 1.12;
      const mobilePosition = new THREE.Vector3(0.75, 0.23, 3.4);
      const mobileTarget = new THREE.Vector3(0.42, -0.08, 0);
      camera.position.lerp(mobilePosition, heroWeight);
      cameraTarget.lerp(mobileTarget, heroWeight);
      const fullHeight = width * 1.18;
      const top = mobileStageTop - scrollY + (stageHeight - fullHeight) / 2;
      canvas.style.clipPath = `inset(${Math.max(0, mobileStageTop - scrollY) * heroWeight}px 0 ${Math.max(0, canvas.clientHeight - (mobileStageTop - scrollY + stageHeight)) * heroWeight}px)`;
      camera.setViewOffset(
        width,
        fullHeight,
        0,
        -top * heroWeight,
        width,
        canvas.clientHeight,
      );
    }
    if (
      state.heroControl !== cameraControl ||
      (previousPhase === "idle" && state.heroPhase === "approach")
    ) {
      cameraControl = state.heroControl;
      if (cameraControl) {
        focusStart.copy(cameraFocusPoint);
        assembly.heroFaces[cameraControl]?.object.getWorldPosition(focusEnd);
        focusMix = cameraMix > 0 && animates ? 0 : 1;
      }
    }
    if (!heroPointer.frozen) focusMix = Math.min(1, focusMix + cameraDt / 0.42);
    cameraFocusPoint.lerpVectors(focusStart, focusEnd, cameraEase(focusMix));
    if (!animates) releaseBeat = 0;
    if (state.heroPhase !== previousPhase) {
      if (state.heroPhase === "return") releaseBeat = animates ? 0.09 : 0;
      previousPhase = state.heroPhase;
    }
    if (!animates || state.heroPhase === "idle" || heroWeight < 0.999)
      cameraMix = 0;
    else if (!heroPointer.frozen) {
      releaseBeat = Math.max(0, releaseBeat - cameraDt);
      if (state.heroPhase !== "return" || releaseBeat === 0)
        cameraMix = cameraStep(
          cameraMix,
          state.heroPhase === "return" ? 0 : 1,
          cameraDt,
        );
    }
    if (cameraMix === 1 && state.heroPhase === "approach")
      experience.set({
        heroPhase: state.heroControl === "switch" ? "return" : "interact",
      });
    if (cameraMix === 0 && state.heroPhase === "return" && releaseBeat === 0)
      experience.set({ heroPhase: "idle", heroControl: null });
    const approach = cameraEase(cameraMix);
    const compositionZoom =
      canvas.clientWidth < 900
        ? 1
        : 1 +
          Math.min(
            0.14,
            Math.max(0, canvas.clientWidth / canvas.clientHeight - 1.5) * 0.5,
          ) *
            heroWeight;
    const zoom =
      compositionZoom *
      (1 + approach * (canvas.clientWidth < 900 ? 0.12 : 0.28));
    const restingCameraPosition = camera.position.clone();
    camera.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / zoom),
    );
    // Keep the selected face at its resting screen location as we approach.
    // This also leaves the exit and preview outside the moving surface.
    if (approach > 0 && state.heroControl) {
      const face = assembly.heroFaces[state.heroControl];
      if (face) {
        const shift = cameraFocusPoint
          .clone()
          .sub(cameraTarget)
          .multiplyScalar(1 - 1 / zoom);
        camera.position.add(shift);
        cameraTarget.add(shift);
      }
    }
    camera.lookAt(cameraTarget);
    camera.rotation.z = pose.roll;
    camera.updateProjectionMatrix();

    backdrop.setStyle(sceneFrame.backdrop, THREE.SRGBColorSpace);
    (scene.background as THREE.Color).copy(backdrop);
    floorColor.copy(backdrop).multiplyScalar(0.86);
    floorColor.lerp(warmHeroFloor, heroWeight * 0.85);
    key.color.setHex(0xfff4e2).lerp(warmHeroLight, heroWeight * 0.45);
    fill.color.setHex(0xdfe8ff).lerp(warmHeroBounce, heroWeight * 0.85);
    ambient.color.setHex(0xffffff).lerp(warmHeroSky, heroWeight);
    ambient.groundColor.setHex(0x1a1a1c).lerp(warmHeroGround, heroWeight);
    /* The hero leans on the key and lets its shadows go deep: the artboard's
     * darkest ground in the object's own shadow band is 34 where the rig's
     * hemisphere alone held it at 57, and the fill is already down at 0.05 of
     * its authored strength. The catalogue keeps the rig it was tuned with. */
    ambient.intensity = LIGHT_RIG.ambient + 0.02 * heroWeight;
    key.intensity = sceneFrame.lights.key;
    fill.intensity = sceneFrame.lights.fill;
    rim.intensity = sceneFrame.lights.rim;
    scene.environmentIntensity = 0.42 - 0.32 * heroWeight;

    /*
     * The hero's shadows were hard-edged wedges. `radius` was left at its
     * default of 1, which over this 6.4-unit shadow camera is a 6 mm penumbra on
     * a two-metre object — and the artboard's ground shades across tens of
     * centimetres. `radius` is in texels: the PCF here is a five-sample Vogel
     * disk rotated per pixel by interleaved gradient noise, so a large radius
     * reads as a smooth falloff rather than a stepped one, which is what makes
     * the cheap version of this viable at all.
     *
     * Scaled with the map, because the map shrinks to 512 on a phone and the
     * same texel radius would then be half the blur in world units; scaled by
     * `heroWeight` so no other chapter's shadows move.
     */
    {
      const texelsPerUnit = key.shadow.mapSize.x / 6.4;
      key.shadow.radius = (1 + 11 * heroWeight) * (texelsPerUnit / 160);
      /* The controls stand 0.023 off the panel, and `normalBias` was 0.022 —
       * within a thousandth of the protrusion, so the key found no occluder
       * under any of them and the buttons sat on the face with no contact at
       * all. The artboard has a shadow under each. Eased in the hero only,
       * because the bias is what keeps the catalogue's larger shadow camera
       * free of acne and it is tuned for that. */
      key.shadow.normalBias = 0.022 - 0.017 * heroWeight;
    }

    // The key light keeps its authored upper-left direction relative to the
    // subject and follows the subject, so the shadow camera stays framed.
    key.target.position.copy(cameraTarget);
    key.target.updateMatrixWorld();
    key.position.copy(cameraTarget).add(keyOffset);

    assembly.aperture.position.set(
      ...(sceneFrame.aperture.position as unknown as [number, number, number]),
    );
    assembly.aperture.scale.setScalar(sceneFrame.aperture.scale / zoom);
    if (zoom > 1) {
      // Preserve depth while counter-scaling in the camera plane. Scaling the
      // depth as well would magnify the frame and move it in front of the source.
      const forward = cameraTarget.clone().sub(camera.position).normalize();
      const depth = assembly.aperture.position
        .clone()
        .sub(restingCameraPosition)
        .dot(forward);
      assembly.aperture.position
        .sub(restingCameraPosition)
        .divideScalar(zoom)
        .add(camera.position)
        .addScaledVector(forward, depth * (1 - 1 / zoom));
    }
    assembly.aperture.rotation.set(0, -0.12 * heroWeight, -0.11 * heroWeight);
    applyOpacity(assembly.aperture, sceneFrame.aperture.opacity);
    /* Every tap is a copy of the band at the aperture's own pose, displaced
     * along the mirror axis. Posing only the first - which is what this did -
     * left the rest at the origin. */
    for (let tap = 0; tap < assembly.apertureMirrors.length; tap++) {
      const mirror = assembly.apertureMirrors[tap];
      mirror.position.copy(assembly.aperture.position);
      mirror.position.y += MIRROR_TAP_OFFSETS[tap];
      mirror.rotation.copy(assembly.aperture.rotation);
      mirror.scale.copy(assembly.aperture.scale);
    }

    (assembly.floor.material as THREE.MeshStandardMaterial).color.copy(
      floorColor,
    );
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

    assembly.setHeroPresentation(heroWeight);
    /* The chapter frame's instrument position and scale were dead: the group was
     * posed once at build time from `INSTRUMENT.home`, and the frame's own values
     * were read only to aim the phone camera. The artboard needs the hero's panel
     * smaller and further up-right than the home pose, so they are applied here.
     * The rotation stays authored below, not read from the frame, because the
     * hero weight animates it. */
    assembly.instrument.position.set(
      sceneFrame.instrument.position[0],
      sceneFrame.instrument.position[1],
      sceneFrame.instrument.position[2],
    );
    assembly.instrument.scale.setScalar(sceneFrame.instrument.scale);
    assembly.instrument.rotation.set(
      0.05,
      0.28 - 0.6 * heroWeight,
      0.04 * heroWeight,
    );
    assembly.parts.switchThumb.rotation.x += (Math.PI / 2) * heroWeight;
    assembly.parts.sliderThumb.rotation.x += (Math.PI / 2) * heroWeight;
    /* After the pose above, never before: the reflected thread is parented at the
     * root and copies the instrument's matrix, so it has to read the one just
     * written. */
    assembly.syncReflection();
    assembly.parts.switchThumb.position.z += 0.04 * heroWeight;
    assembly.parts.sliderThumb.position.z += 0.06 * heroWeight;
    /* ACES desaturates as it compresses, and the hero was sitting at the top of
     * its curve — the band rendered as a flat #e8e5df whatever the key did. The
     * artboard is bright where the key lands (251,237,220) and warm in shadow
     * (175,157,138), so the hero keeps less indirect light and a lower exposure
     * than the catalogue chapters. */
    renderer.toneMappingExposure = 1.02 - 0.24 * heroWeight;
    // Direct control state, applied on top of the chapter pose.
    assembly.parts.switchThumb.position.x += state.motionOn
      ? INSTRUMENT.switch.thumbTravel
      : -INSTRUMENT.switch.thumbTravel;

    const tension = Math.max(0, Math.min(1, state.tension / 100));
    const sliderX = (tension - 0.5) * INSTRUMENT.slider.travel;
    assembly.parts.sliderThumb.position.x += sliderX;

    const trackPose = sceneFrame.parts.sliderTrack;
    assembly.sliderBand.mesh.position.set(
      trackPose.position[0] * (1 - heroWeight),
      trackPose.position[1] * (1 - heroWeight),
      trackPose.position[2] * (1 - heroWeight),
    );
    assembly.sliderBand.setSpine(
      /* The fill starts at the rail's own left cap rather than short of it. The
       * artboard's bar is one continuous pink from that cap to the thumb, so a
       * fill that began 0.04 inside the track left a cream notch at the end of
       * the control that the artboard does not have. */
      start.set(
        trackPose.position[0] - INSTRUMENT.slider.track.width / 2 + 0.012,
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
    /* The fill is faded out with the hero weight, which is the opposite of what
     * this did before. The earlier reading was that the band was what made the
     * slider pink, because the track rendered (233, 200, 203) against an artboard
     * (221, 141, 172) - but the cause was the rail's own albedo, not a missing
     * fill: `PALETTE.pink` renders that pale under the hero's key. With the rail's
     * albedo solved the rail alone lands on the artboard's colour, and the band
     * can only subtract from it.
     *
     * It has to, because a fill has nowhere flat to sit. The rail is a 0.03-thick
     * plate and the band is a 0.026 tube whose spine lies on the plate's face, so
     * it stands proud as a ridge with a shaded crevice down the length of the
     * control. The artboard's slider is one flat bar - #da8dab held from end to
     * end - with no ridge in it. The band stays for the chapters that draw a cream
     * rail, where it is the only thing that makes the fill visible at all. */
    applyOpacity(
      assembly.sliderBand.mesh,
      Math.min(
        sceneFrame.parts.sliderTrack.opacity,
        sceneFrame.parts.sliderThumb.opacity,
      ) * (1 - heroWeight),
    );

    // Press deformation on the sculpted face; the group keeps the chapter pose.
    const squash = compression.value;
    assembly.createMesh.scale.set(
      1 + squash * 0.02,
      1 - squash * INSTRUMENT.create.pressCompression,
      1 - squash * 0.05,
    );
    assembly.createMesh.position.z =
      -squash * INSTRUMENT.create.thickness * 0.45;

    const createPose = sceneFrame.parts.create;
    /* The thread's sag and gauge are computed once and used by both the resting
     * spine and the pointer-driven one below. They were written out twice, and
     * the second copy had drifted to a hard-coded sag of 0.12 and a radius of
     * 0.012 — so the moment the pointer took the thread the band snapped to a
     * quarter of its width and its curve jumped. Nothing about grabbing a
     * thread should change how thick it is. */
    /* The measured curve carries the whole shape, so there is no separate sag:
     * every one of these constants is read off the reference rather than chosen
     * to look right, and a sag on top of them would double-count the fall. */
    const ribbonSag = 0;
    /* The artboard's thread is a tapering band 13 px wide where it leaves the
     * plate, not the 4 px cord the original radius drew — and measured against
     * the reference render it is 11-13 px through the sweep where the first
     * hero radius drew 17-18, so the gauge is 0.7 of that first estimate. */
    const ribbonRadius = (0.012 + 0.037 * heroWeight) * (1 - 0.15 * tension);
    assembly.ribbon.setSpine(
      /* Both endpoints are solved, not eyeballed: the reference's thread was
       * traced column by column, and these four numbers are the ones that put
       * this ribbon's own spine on that trace through this chapter's camera —
       * mean error 1.4 px over the 552 columns both show, worst 11.5, against
       * 14.8 px mean and 41.5 worst for the approximation it replaces. The
       * solve runs in screen space for that reason: unprojecting the trace
       * needs the ribbon's own z at every column, and an error there bends the
       * answer. The free end also carries the cursor, so the arrow lands on the
       * reference's arrow as a consequence rather than as its own edit.
       *
       * The spine's panel end sits behind the panel, not on the Create
       * control's face. The artboard's thread is occluded by the panel from its
       * left edge - measured along the reference it reads 14 px wide at x 900
       * and is gone by x 940 - so the segment that would cross the face is
       * hidden and the thread appears to come out from behind the panel. Drawn
       * at the control's own depth it instead ran across the face for 40 px,
       * which is what the closeup showed. The panel spans z -0.0225..+0.0225
       * around the instrument origin, so -0.09 from the control's centre is
       * clear of the back face by more than the band's own half-width. */
      start.set(
        createPose.position[0] - 0.2763,
        createPose.position[1] + 0.0548,
        createPose.position[2] - 0.09,
      ),
      end.set(
        createPose.position[0] - 0.42 - 1.24 * tension - 1.6771 * heroWeight,
        createPose.position[1] +
          0.156 -
          0.5 * tension -
          (canvas.clientWidth >= 900 && canvas.clientHeight < 800
            ? 1.2603
            : 0.6581) *
            heroWeight,
        createPose.position[2] + 0.12,
      ),
      ribbonSag,
      ribbonRadius,
    );
    /* The cursor rides the spine's free end, so when the pointer pulls the
     * thread the arrow is under it. */
    cursorAt.copy(end);
    if (heroPointer.active && animates && heroWeight > 0.999) {
      camera.updateMatrixWorld(true);
      assembly.instrument.updateWorldMatrix(true, false);
      pointerRay.setFromCamera(
        new THREE.Vector2(
          (heroPointer.x / canvas.clientWidth) * 2 - 1,
          1 - (heroPointer.y / canvas.clientHeight) * 2,
        ),
        camera,
      );
      planeNormal
        .set(0, 0, 1)
        .transformDirection(assembly.instrument.matrixWorld);
      pointerWorld
        .set(0, 0, createPose.position[2] + 0.12)
        .applyMatrix4(assembly.instrument.matrixWorld);
      ribbonPlane.setFromNormalAndCoplanarPoint(planeNormal, pointerWorld);
      if (pointerRay.ray.intersectPlane(ribbonPlane, pointerWorld)) {
        assembly.instrument.worldToLocal(pointerWorld);
        assembly.ribbon.setSpine(start, pointerWorld, ribbonSag, ribbonRadius);
        cursorAt.copy(pointerWorld);
      }
    }
    assembly.cursor.position.copy(cursorAt);
    applyOpacity(assembly.cursor, sceneFrame.weights[0]);
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
    assembly.parts.flower.scale.setScalar(
      flowerPose.scale * (1 + 0.03 * echo.value),
    );

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
    !settled(compression) ||
    !settled(spread) ||
    !settled(echo) ||
    (sceneAnimates(experience.get()) &&
      !heroPointer.frozen &&
      (experience.get().heroPhase === "approach" ||
        experience.get().heroPhase === "return" ||
        (focusMix < 1 && experience.get().heroPhase !== "idle")));

  function tick(time: number) {
    scheduled = 0;
    if (disposed || hidden || contextLost) return;
    const elapsed =
      previousTime === 0 ? 1 / 60 : Math.min(0.5, (time - previousTime) / 1000);
    previousTime = time;
    applyFrame(Math.min(0.064, elapsed), elapsed);
    /* The reflection is drawn from the same frame's pose, immediately before the
     * frame that samples it, so it is never a frame behind its own reflection —
     * and it is only drawn at all inside `floorReflection.render`, which is what
     * keeps a settled renderer free of a second full scene pass. */
    assembly.floorReflection.render(renderer, scene, camera);
    renderer.render(scene, camera);
    if (active()) schedule();
  }

  function schedule() {
    if (disposed || scheduled || hidden || contextLost) return;
    scheduled = requestAnimationFrame(tick);
  }
  /* A drag is the one gesture that changes nothing React can see, so the loop
   * cannot notice it by itself. See `requestHeroFrame`. */
  const unregisterInvalidator = registerHeroInvalidator(schedule);

  function updateProgress() {
    const tops = sectionTops();
    if (!tops.length) return;
    frame = evaluate(
      scrollProgress(
        focusFromScroll(scrollY, viewportHeight),
        tops,
        viewportHeight,
      ),
    );
  }

  function resize() {
    const stage = document
      .querySelector(".asm-hero-space")
      ?.getBoundingClientRect();
    mobileStageTop = (stage?.top ?? 0) + window.scrollY;
    mobileStageHeight = stage?.height ?? 0;
    const shell = document.querySelector<HTMLElement>(".asm");
    shell?.style.setProperty("--hero-stage-top", `${mobileStageTop}px`);
    shell?.style.setProperty(
      "--hero-preview-top",
      `${mobileStageTop + mobileStageHeight}px`,
    );
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      width < 900 ? MAX_DPR_MOBILE : MAX_DPR_DESKTOP,
    );
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    assembly.floorReflection.setSize(width, height);
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
    contextLost = true;
    heroInteraction.cancel();
    onStatus("lost");
  };
  const onRestored = () => {
    contextLost = false;
    lastSeamKey = "";
    /* Every render target's storage died with the context. Recreate rather than
     * resize: the dead target's GPU-side allocation is gone and `setSize` would
     * compare against dimensions that no longer describe anything. */
    assembly.floorReflection.reset();
    assembly.floorReflection.setSize(
      Math.max(1, canvas.clientWidth || window.innerWidth),
      Math.max(1, canvas.clientHeight || window.innerHeight),
    );
    onStatus("ready");
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost as EventListener, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);

  const onVisibility = () => {
    hidden = document.hidden;
    if (hidden && scheduled) {
      cancelAnimationFrame(scheduled);
      scheduled = 0;
    }
    previousTime = 0;
    if (!hidden) schedule();
  };
  document.addEventListener("visibilitychange", onVisibility);
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
      const viewportChanged =
        Math.abs(nextViewportHeight - viewportHeight) > 0.5;
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
      unregisterInvalidator();
      if (scheduled) cancelAnimationFrame(scheduled);
      scheduled = 0;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost as EventListener);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      assembly.dispose();
      environment.texture.dispose();
      environment.dispose?.();
      renderer.dispose();
    },
  };
}
