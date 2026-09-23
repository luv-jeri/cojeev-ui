/**
 * Pure narrative pose evaluation.
 *
 * Everything the six chapters need — camera, lights, backdrop, aperture and each
 * instrument part — is a deterministic function of one scalar derived from native
 * scroll position. There is no timeline, no queue and no accumulated state, so a
 * skipped boundary renders its destination pose directly, reverse scrolling
 * evaluates the identical path backwards, and an interrupted transition needs no
 * recovery step.
 *
 * No React, no DOM and no Three.js import: this module is unit-tested directly.
 */
import {
  INSTRUMENT,
  LIGHT_RIG,
  PALETTE,
  SPECIMEN_TRAYS,
  type Vec3,
} from "./canonical";

export type ChapterId =
  | "hero"
  | "catalogue"
  | "motion"
  | "shape"
  | "source"
  | "closing";

export type PartId =
  | "panel"
  | "create"
  | "switchBase"
  | "switchThumb"
  | "sliderTrack"
  | "sliderThumb"
  | "flower"
  | "drawers"
  | "stylePlate"
  | "sourcePlate";

export type PartPose = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
  /** 0–1. A part the current chapter does not list is hidden. */
  opacity: number;
};

export type Pose = { position: Vec3; target: Vec3; fov: number; roll: number };

export type Chapter = {
  id: ChapterId;
  /** Editorial marker shown above the heading, in board order. */
  marker: string;
  /** DOM tone family for this chapter's text. */
  tone: "dark" | "cream" | "blue" | "yellow";
  backdrop: string;
  camera: Pose;
  lights: { key: number; fill: number; rim: number };
  aperture: { opacity: number; position: Vec3; scale: number };
  floor: number;
  /** Specimen table and its trays. */
  field: number;
  /** Blue contour stage for the press. */
  stage: number;
  /** Yellow closing field and the single pink contour. */
  closing: number;
  /** Source layer separation at rest, before the visitor opens the assembly. */
  spread: number;
  instrument: { position: Vec3; rotation: Vec3; scale: number };
  parts: Partial<Record<PartId, Partial<PartPose>>>;
};

const HOME_INSTRUMENT = INSTRUMENT.home;

/** Every part at its canonical home, hidden unless a chapter says otherwise. */
export const HOME_PARTS: Record<PartId, PartPose> = {
  panel: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1, opacity: 1 },
  create: { position: INSTRUMENT.create.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  switchBase: { position: INSTRUMENT.switch.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  switchThumb: { position: INSTRUMENT.switch.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  sliderTrack: { position: INSTRUMENT.slider.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  sliderThumb: { position: INSTRUMENT.slider.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  flower: { position: INSTRUMENT.flower.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  drawers: { position: INSTRUMENT.drawers.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  stylePlate: { position: INSTRUMENT.stylePlate.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
  sourcePlate: { position: INSTRUMENT.sourcePlate.local, rotation: [0, 0, 0], scale: 1, opacity: 1 },
};

const ALL_PARTS: readonly PartId[] = [
  "panel",
  "create",
  "switchBase",
  "switchThumb",
  "sliderTrack",
  "sliderThumb",
  "flower",
  "drawers",
  "stylePlate",
  "sourcePlate",
];

/** The canonical front-of-panel group: everything except the two plates. */
const FRONT: PartId[] = [
  "panel",
  "create",
  "switchBase",
  "switchThumb",
  "sliderTrack",
  "sliderThumb",
  "flower",
  "drawers",
];

const front = (
  extra: Partial<Record<PartId, Partial<PartPose>>> = {},
): Partial<Record<PartId, Partial<PartPose>>> => {
  const shown: Partial<Record<PartId, Partial<PartPose>>> = {};
  for (const id of FRONT) shown[id] = { opacity: 1 };
  return { ...shown, ...extra };
};

/**
 * The face the Invitation and Response chapters share, mesh for mesh. Response
 * re-lights this exact pose from a different camera, so one mesh and one
 * material instance really do span the boundary; declaring it twice is how that
 * claim would quietly stop being true.
 */
const FRONT_FACE: Partial<Record<PartId, Partial<PartPose>>> = {
  stylePlate: { opacity: 0 },
  // Behind and below the panel, so only its lower band reads: the same plate the
  // Source chapter separates, never a second dark object.
  sourcePlate: { position: [0.02, -0.2, -0.3], opacity: 1 },
};

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "hero",
    marker: "000h / the living assembly",
    tone: "dark",
    backdrop: "#141110",
    camera: { position: [0.55, 0.26, 4.2], target: [-0.42, -0.06, 0], fov: 35, roll: 0 },
    /* Measured off the artboard: its outer leg is #e7d7c5 and its inner edge
     * #af9c89, so the key carries the form and the shadow stays warm. The rig
     * this started from — key .8 against a cool .65 fill and a .42 environment —
     * rendered the band #e8e5df, a neutral white. */
    lights: { key: 2.45, fill: 0.05, rim: 0.5 },
    aperture: { opacity: 1, position: [0.85, 0.52, -0.7], scale: 1.62 },
    /* Below 0.985 `applyOpacity` also stops the floor writing depth, which is
     * what lets the mirrored band underneath show through.
     *
     * 0.70 rather than 0.82, solved against the artboard. The floor is drawn
     * *over* the mirror, so its opacity is what decides how much reflection
     * survives: at 0.82 only 18% of the mirrored band reached the camera and the
     * ground read as a flat warm wash (its own diffuse) with a ghost in it.
     * Swept jointly with the mirror's strength over the 1536x1024 still, against
     * three regions traced from the reference - the halo just under the band,
     * the far ground right of the object, and the left floor. This pair is the
     * best aggregate whose three regions all land inside 10 levels; see
     * HERO-ARTBOARD-FINDINGS.md. */
    floor: 0.70,
    field: 0,
    stage: 0,
    closing: 0,
    spread: 0,
    /* The artboard's panel sits inside the aperture's opening: its face spans
     * x 915-1311 and y 195-603 of 1536x1024, and the blue drawers end at 1455.
     * The panel is an instrument-local 1.0 x 1.05, so the frame that puts it
     * there is this one — the group is scaled to 0.86 and moved up and right of
     * the home pose, which had it 15% too large, 65 px low and overlapping the
     * band's left leg. Measured off the v14 and v16 captures, not chosen by eye:
     * 441 px per world unit across and 388 up, so 0.98 with the group at
     * [0.47, 0.22] puts the face at 920-1311 x 195-603 and the drawers' right
     * edge at 1471 — the artboard's own numbers. */
    instrument: { position: [0.47, 0.22, 0] as Vec3, rotation: HOME_INSTRUMENT.rotation, scale: 0.98 },
    /* The artboard's drawer stack centres on y 413 of the frame; the shared
     * drawer pose puts it at 361. Only the part's position is overridden — the
     * tabs keep the size the geometry draws, because scaling the group would
     * move the tabs without their HTML labels, which anchor to the part. */
    /* The artboard's plate reads at 400 px across; this pose drew 300, which put
 * the three lines below the size the eye can resolve at the hero's depth. The
 * scale is the hero's alone — the Source chapter separates the same mesh at its
 * authored size, where the plate is the subject and already fills its frame. */
    /* The front furniture stands down the panel face. Read off `01-hero.png`
     * through the face's own top and bottom edges, the artboard puts the
     * switch's track at 0.298 of that height, Create at 0.853 and the slider at
     * 0.910; this pose was drawing them at 0.283 / 0.111 / 0.795 — the switch
     * nearly right, Create a quarter of the panel too high, and the pitch
     * between the three short. The local values below are the ones that project
     * the controls onto the artboard's measured screen centres through this
     * chapter's own camera, and they were arrived at by measuring the rendered
     * frame back rather than by scaling the face: at a fixed x the mapping from
     * a control's local y to its screen y is very nearly linear (the switch
     * -376 px/unit, Create -394, the slider -383) but it is not the same line for
     * each control, so a single conversion factor moves one of them correctly
     * and the other two wrong. Verified after the change: the switch's centre
     * reads 306 against the artboard's 306; Create's height bands at x 1030 read
     * 416 / 445 / 474 against 420 / 448 / 478; the slider's filled band reads 552
     * against 552. Only the part positions are overridden: the panel, the
     * drawers, the plates, the labels and the projected hit areas all pose from
     * the same instrument group, so they follow without a second edit. */
    /* `front()` first and the overrides after it: `FRONT_FACE` carries the
     * shared face's own control poses, and spreading it *over* this object's
     * keys silently overrode the Create control — the part kept the canonical
     * y of -0.104 while the switch and the slider moved, which is exactly how
     * the first capture of this change read. The motion chapter keeps
     * `front(FRONT_FACE)` and is therefore unaffected either way. */
    parts: front({
      sourcePlate: { position: [0.02, -0.66, -0.15], scale: 1.28, opacity: 1 },
      drawers: { position: [0.66, -0.064, -0.12], opacity: 1 },
      switchBase: { position: [-0.3, 0.2645, 0.028] },
      switchThumb: { position: [-0.3, 0.2645, 0.028] },
      create: { position: [0, -0.1034, 0.045] },
      sliderTrack: { position: [0, -0.3858, 0.016] },
      sliderThumb: { position: [0, -0.3858, 0.016] },
      /* The flower's centre sits 41 px lower on the artboard than the shared
       * pose draws it, and its disc is larger: `1.2` reproduces the artboard's
       * own outer radius once `petal-7` carries the artboard's petal width. The
       * scale is the hero's alone — the Shape press and the specimen trays draw
       * the same mesh at its authored size — and `sourcePlate` above is the
       * same kind of override. */
      flower: { position: [0.3, 0.2487, 0.03], scale: 1.2 },
      ...FRONT_FACE,
    }),
  },
  {
    id: "catalogue",
    marker: "01 / the collection",
    tone: "cream",
    backdrop: "#e9dcc3",
    camera: { position: [0.3, 2.3, 3.0], target: [0.5, -0.7, 0.35], fov: 35, roll: 0 },
    lights: { key: 1.05, fill: 0.92, rim: 0.35 },
    aperture: { opacity: 0.4, position: [0.32, -0.62, -1.5], scale: 1 },
    floor: 1,
    field: 1,
    stage: 0,
    closing: 0,
    spread: 0,
    instrument: { position: HOME_INSTRUMENT.position, rotation: HOME_INSTRUMENT.rotation, scale: 1 },
    parts: front({
      // Daylight chapter: the bench is the subject, so the panel and its front
      // furniture stand down and only the featured specimen stays lifted.
      panel: { opacity: 0 },
      switchBase: { opacity: 0 },
      switchThumb: { opacity: 0 },
      sliderTrack: { opacity: 0 },
      sliderThumb: { opacity: 0 },
      drawers: { opacity: 0 },
      flower: { opacity: 0 },
      stylePlate: { opacity: 0 },
      sourcePlate: { opacity: 0 },
      create: {
        position: [0.62, 0.06, 0.46],
        rotation: [-0.55, -0.25, 0.05],
        scale: 1.5,
        opacity: 1,
      },
    }),
  },
  {
    id: "motion",
    marker: "02 / feel the difference",
    tone: "dark",
    backdrop: "#0b0b0c",
    camera: { position: [0.4, 0.46, 3.1], target: [-0.25, 0.04, 0.1], fov: 35, roll: 0 },
    lights: { key: 1.1, fill: 0.42, rim: 1.15 },
    aperture: { opacity: 0, position: INSTRUMENT.aperture.position, scale: 1 },
    floor: 0.55,
    field: 0,
    stage: 0,
    closing: 0,
    spread: 0,
    instrument: { position: HOME_INSTRUMENT.position, rotation: HOME_INSTRUMENT.rotation, scale: 1 },
    // The exact hero meshes, at the exact hero transforms: only the camera and
    // the lighting change, so one mesh and material instance span this boundary.
    parts: front(FRONT_FACE),
  },
  {
    id: "shape",
    marker: "03 / shape studio",
    tone: "blue",
    backdrop: PALETTE.blue,
    camera: { position: [0.0, 0.12, 3.0], target: [0.62, 0.04, 0.5], fov: 35, roll: 0 },
    lights: { key: 0.95, fill: 0.85, rim: 0.3 },
    aperture: { opacity: 0, position: INSTRUMENT.aperture.position, scale: 1 },
    floor: 0,
    field: 0,
    stage: 1,
    closing: 0,
    spread: 0,
    instrument: { position: HOME_INSTRUMENT.position, rotation: HOME_INSTRUMENT.rotation, scale: 1 },
    // The instrument group keeps its canonical rotation, so the flower cancels it
    // to reach the frontal registered pose. The group has zero roll and a modest
    // pitch, so the negated Euler is its exact inverse.
    parts: {
      flower: {
        position: [0.34, 0.02, 0.55],
        rotation: [
          -HOME_INSTRUMENT.rotation[0] - 0.1,
          -HOME_INSTRUMENT.rotation[1],
          0,
        ],
        scale: 3.9,
        opacity: 1,
      },
    },
  },
  {
    id: "source",
    marker: "04 / your project, your rules",
    tone: "cream",
    backdrop: "#f7efe1",
    camera: { position: [2.55, 0.95, 2.3], target: [0.1, -0.05, -0.5], fov: 35, roll: 0 },
    lights: { key: 1, fill: 0.88, rim: 0.4 },
    aperture: { opacity: 0, position: INSTRUMENT.aperture.position, scale: 1 },
    floor: 0.7,
    field: 0,
    stage: 0,
    closing: 0,
    spread: 0,
    instrument: { position: HOME_INSTRUMENT.position, rotation: HOME_INSTRUMENT.rotation, scale: 1 },
    // The same assembly, never rearranged: the two plates move back along the
    // common depth axis and the front group is untouched.
    parts: front({
      stylePlate: { position: [0, 0, -0.36], opacity: 1 },
      sourcePlate: { position: [0, 0, -0.72], opacity: 1 },
    }),
  },
  {
    id: "closing",
    marker: "05 / make it yours",
    tone: "yellow",
    backdrop: PALETTE.yellow,
    camera: { position: [0.85, 0.5, 4.7], target: [-0.1, -0.04, -0.06], fov: 35, roll: 0 },
    lights: { key: 1, fill: 0.9, rim: 0.32 },
    aperture: { opacity: 0, position: INSTRUMENT.aperture.position, scale: 1 },
    floor: 0,
    field: 0,
    stage: 0,
    closing: 1,
    spread: 0,
    instrument: { position: HOME_INSTRUMENT.position, rotation: HOME_INSTRUMENT.rotation, scale: 1 },
    parts: front({
      stylePlate: { position: [0, 0, -0.09], opacity: 1 },
      sourcePlate: { position: [0, 0, -0.18], opacity: 1 },
    }),
  },
];

export const CHAPTER_IDS = CHAPTERS.map((chapter) => chapter.id);

/**
 * A boundary's arc: zero at both registered endpoints, so every chapter resting
 * pose is exact and no transition can leave residual velocity in the pose.
 */
export const BOUNDARY_ARCS: readonly { offset: Vec3; fov: number }[] = [
  { offset: [0.12, -0.52, 0.74], fov: -2.5 },
  { offset: [-0.2, -0.82, 0.52], fov: 2 },
  { offset: [-0.28, -0.08, 0.86], fov: 2 },
  { offset: [0.52, 0.12, 0.72], fov: -2 },
  { offset: [0.24, -0.18, 1.05], fov: -1.5 },
];

/** Incoming section top travels from 0.8H to 0.2H across a boundary. */
export const BOUNDARY_BAND = 0.6;
export const BOUNDARY_LEAD = 0.3;

export const clamp01 = (value: number) =>
  value < 0 ? 0 : value > 1 ? 1 : value;

/** C2 continuity at the joints, so a boundary never shows a velocity step. */
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * A true weighted sum over the chapter set: `Σ shareᵢ · valueᵢ`.
 *
 * This must not be written as a chain of lerps. `acc = lerp(acc, valueᵢ, shareᵢ)`
 * looks like a weighted average but is not one — at 0.5/0.5 it returns
 * `0.25A + 0.5B`, pulling every interpolated position and colour toward the
 * origin (and toward black), so a camera target or a part position drifts by a
 * fraction of its own magnitude at each midpoint. Accumulating `shareᵢ · valueᵢ`
 * is exact, preserves both endpoints, and is symmetric under reversal.
 *
 * `share` is the normalised tent-weight partition, so the shares always sum to
 * one and a chapter carrying no weight contributes exactly nothing.
 */
function weightedVec(
  share: readonly number[],
  read: (index: number) => Vec3,
): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 0; index < share.length; index++) {
    const weight = share[index];
    if (!weight) continue;
    const value = read(index);
    x += value[0] * weight;
    y += value[1] * weight;
    z += value[2] * weight;
  }
  return [x, y, z] as unknown as Vec3;
}

function weightedNumber(
  share: readonly number[],
  read: (index: number) => number,
): number {
  let total = 0;
  for (let index = 0; index < share.length; index++) {
    const weight = share[index];
    if (!weight) continue;
    total += read(index) * weight;
  }
  return total;
}

const readHex = (hex: string): Vec3 => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const writeHex = (rgb: Vec3) =>
  `#${rgb
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/**
 * Maps the viewport focus line onto chapter progress.
 *
 * `sectionTops` are the measured document offsets of the six sections. Progress
 * is the sum of each boundary's own eased 0–1 value; the bands cannot overlap for
 * sections at least one viewport tall, which keeps the mapping single-valued.
 */
export function scrollProgress(
  focus: number,
  sectionTops: readonly number[],
  viewportHeight: number,
  band = BOUNDARY_BAND,
  lead = BOUNDARY_LEAD,
): number {
  if (sectionTops.length < 2) return 0;
  const span = Math.max(1, band * viewportHeight);
  let progress = 0;
  for (let index = 1; index < sectionTops.length; index++) {
    const start = sectionTops[index] - lead * viewportHeight;
    progress += smootherstep(clamp01((focus - start) / span));
  }
  return progress;
}

/** The document-space focus line: the middle of the viewport. */
export function focusFromScroll(scrollY: number, viewportHeight: number) {
  return scrollY + viewportHeight * 0.5;
}

export function restingProgress(chapter: number, count = CHAPTERS.length) {
  return Math.max(0, Math.min(count - 1, chapter));
}

/**
 * Tent weights over chapter progress. Because each boundary eases smoothly, this
 * partition of unity is C2 across the joints, and at any moment at most two
 * chapters carry weight.
 */
export function chapterWeights(progress: number): number[] {
  const last = CHAPTERS.length - 1;
  const clamped = Math.max(0, Math.min(last, progress));
  return CHAPTERS.map((_, index) => Math.max(0, 1 - Math.abs(clamped - index)));
}

export type EvaluatedFrame = {
  progress: number;
  weights: number[];
  /** Nearest resting chapter, for DOM tone and announcements. */
  chapterIndex: number;
  chapter: ChapterId;
  /** Non-null while a boundary is in flight. */
  boundary: { from: ChapterId; to: ChapterId; t: number } | null;
  pose: Pose;
  backdrop: string;
  lights: { key: number; fill: number; rim: number };
  aperture: { opacity: number; position: Vec3; scale: number };
  floor: number;
  field: number;
  stage: number;
  closing: number;
  /** Layer separation from chapter rest; the store adds the visitor's opening. */
  spread: number;
  instrument: { position: Vec3; rotation: Vec3; scale: number };
  parts: Record<PartId, PartPose>;
};

function chapterPart(chapter: Chapter, id: PartId): PartPose {
  const override = chapter.parts[id];
  const home = HOME_PARTS[id];
  if (!override) return { ...home, opacity: 0 };
  return {
    position: override.position ?? home.position,
    rotation: override.rotation ?? home.rotation,
    scale: override.scale ?? home.scale,
    opacity: override.opacity ?? 1,
  };
}

/** Evaluates one frame. Pure: same progress always yields the same frame. */
export function evaluate(progress: number): EvaluatedFrame {
  const weights = chapterWeights(progress);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const share = weights.map((weight) => weight / total);

  const blendVec = (read: (chapter: Chapter) => Vec3): Vec3 =>
    weightedVec(share, (index) => read(CHAPTERS[index]));
  const blendNumber = (read: (chapter: Chapter) => number) =>
    weightedNumber(share, (index) => read(CHAPTERS[index]));

  const parts = {} as Record<PartId, PartPose>;
  for (const id of ALL_PARTS) {
    const poses = CHAPTERS.map((chapter) => chapterPart(chapter, id));
    parts[id] = {
      position: weightedVec(share, (index) => poses[index].position),
      rotation: weightedVec(share, (index) => poses[index].rotation),
      scale: weightedNumber(share, (index) => poses[index].scale),
      opacity: weightedNumber(share, (index) => poses[index].opacity),
    };
  }

  const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, progress));
  const chapterIndex = Math.round(clamped);
  const boundaryIndex = Math.min(CHAPTERS.length - 2, Math.floor(clamped));
  const localT = clamped - boundaryIndex;
  const arc = BOUNDARY_ARCS[boundaryIndex] ?? { offset: [0, 0, 0] as Vec3, fov: 0 };
  const arcWeight = Math.sin(Math.PI * localT);

  const pose: Pose = {
    position: blendVec((chapter) => chapter.camera.position),
    target: blendVec((chapter) => chapter.camera.target),
    fov: blendNumber((chapter) => chapter.camera.fov),
    roll: blendNumber((chapter) => chapter.camera.roll),
  };

  /* Component-wise sRGB blend, deliberately: the result is handed straight to
   * `THREE.Color.setStyle(..., SRGBColorSpace)` and to the DOM tone system, both
   * of which expect an sRGB triple. Blending in linear light would darken every
   * chapter midpoint relative to the two authored endpoints it sits between, so
   * the authored backdrop of a resting chapter would not survive the trip. */
  const backdrop = writeHex(
    weightedVec(share, (index) => readHex(CHAPTERS[index].backdrop)),
  );

  return {
    progress: clamped,
    weights,
    chapterIndex,
    chapter: CHAPTERS[chapterIndex].id,
    boundary:
      localT > 0.001 && localT < 0.999
        ? {
            from: CHAPTERS[boundaryIndex].id,
            to: CHAPTERS[boundaryIndex + 1].id,
            t: localT,
          }
        : null,
    pose: {
      /* The authored arc is applied exactly once, on top of the blended pose, and
       * its weight is zero at both registered endpoints so no resting chapter
       * carries arc residue. */
      position: [
        pose.position[0] + arc.offset[0] * arcWeight,
        pose.position[1] + arc.offset[1] * arcWeight,
        pose.position[2] + arc.offset[2] * arcWeight,
      ],
      target: pose.target,
      fov: pose.fov + arc.fov * arcWeight,
      roll: pose.roll,
    },
    backdrop,
    lights: {
      key: blendNumber((chapter) => chapter.lights.key) * LIGHT_RIG.key.intensity,
      fill: blendNumber((chapter) => chapter.lights.fill) * LIGHT_RIG.fill.intensity,
      rim: blendNumber((chapter) => chapter.lights.rim) * LIGHT_RIG.rim.intensity,
    },
    aperture: {
      opacity: blendNumber((chapter) => chapter.aperture.opacity),
      position: blendVec((chapter) => chapter.aperture.position),
      scale: blendNumber((chapter) => chapter.aperture.scale),
    },
    floor: blendNumber((chapter) => chapter.floor),
    field: blendNumber((chapter) => chapter.field),
    stage: blendNumber((chapter) => chapter.stage),
    closing: blendNumber((chapter) => chapter.closing),
    spread: blendNumber((chapter) => chapter.spread),
    instrument: {
      position: blendVec((chapter) => chapter.instrument.position),
      rotation: blendVec((chapter) => chapter.instrument.rotation),
      scale: blendNumber((chapter) => chapter.instrument.scale),
    },
    parts,
  };
}

/** Specimen count is authored once so the field and the caption cannot disagree. */
export const SPECIMEN_COUNT = SPECIMEN_TRAYS.length;

/* ------------------------------------------------------------ reduced motion */

/**
 * The nearest resting chapter, with no interpolation at all.
 *
 * Reduced motion is not "the same journey, slower". The authored chapters move
 * the camera through a metre of world space per boundary, scale chapter subjects
 * by a factor of four, and add an arc on top; the comfort problem is the travel
 * itself, so softening or slowing it does not address it. This returns the
 * destination chapter's pose exactly, and the caller switches between poses at
 * the boundary rather than blending through it.
 *
 * `progress` is rounded rather than floored so a section becomes current when it
 * is closer to the focus line than the one before it — which is also where the
 * DOM tone and the chapter announcement already flip, so the pose and the text
 * change together instead of the text changing over a moving camera.
 */
export function restingFrame(progress: number): EvaluatedFrame {
  return evaluate(Math.round(Math.max(0, Math.min(CHAPTERS.length - 1, progress))));
}

/**
 * Whether a chapter's own composition is safe to present without the transition.
 *
 * Every authored resting pose is inside the comfort budget: no roll, a 35° field,
 * and a camera at or beyond the instrument's own depth. This asserts the property
 * the reduced-motion path depends on, so a future chapter authored with a rolled
 * or unusually close camera is named by a test rather than shipped to the
 * visitors least able to tolerate it.
 */
export const COMFORT_MAX_FOV = 45;
export const COMFORT_MIN_DISTANCE = 2.4;
