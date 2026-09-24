/**
 * Geometry for the canonical assembly.
 *
 * One editable specification, one place where a bevel is decided, and one shared
 * set of mesh instances. Every control is built here so the Hero, the Response
 * Chamber, the Open Assembly and Closing cannot drift into three similar-looking
 * objects: they literally share the same meshes.
 *
 * Construction rules that matter:
 * - Bevels that affect the silhouette are geometry, never a shading trick.
 * - The flower face is extruded from the same canonical contour the SVG press
 *   exports, so the sculpted and exported silhouettes cannot disagree.
 * - The ribbon and the slider band are fixed-topology strips whose existing
 *   buffers are updated in place. Nothing here is rebuilt per frame.
 * - Every fadable object owns its materials. Chapter opacity is a per-part
 *   property, so two parts may never share a material instance.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { buildApertureGeometry } from "./aperture-geometry";
import {
  APERTURE_CLOSED,
  APERTURE_DEPTH,
  APERTURE_INNER,
  APERTURE_OUTER,
} from "./aperture-profile";
import {
  INSTRUMENT,
  MATERIAL_ROUGHNESS,
  PALETTE,
  SPECIMEN_TRAYS,
  type SpecimenArchetype,
  type Vec3,
} from "./canonical";
import {
  CONTOUR_VIEWBOX,
  blendContour,
  contourExtent,
  contourPoints,
} from "./contour-export";
import type { PartId } from "./choreography";
import { createSeamProbe, type CreateSeamProbe } from "./seam-projection";

const srgb = (hex: string) =>
  new THREE.Color().setStyle(hex, THREE.SRGBColorSpace);

/** Fadable by design: opacity and depth writing are per-frame render state only. */
function standard(hex: string, roughness: number) {
  return new THREE.MeshStandardMaterial({
    color: srgb(hex),
    roughness,
    metalness: 0,
    envMapIntensity: 0.55,
    transparent: true,
  });
}

/**
 * A large ground plane seen almost edge-on sits at grazing incidence, where
 * Fresnel reflectance approaches 1 whatever the albedo is. A "black" floor with
 * the instrument's environment response therefore renders as a bright grey
 * sheet. Ground and other near-edge-on backdrops get a matte material instead:
 * the colour still comes from the chapter, but it stops acting like a mirror.
 */
function matte(hex: string) {
  return new THREE.MeshPhongMaterial({
    color: srgb(hex),
    // No specular at all: the ground still receives the object's cast shadow,
    // but it can no longer reflect the key light or the room back at the camera.
    specular: new THREE.Color(0x000000),
    shininess: 0,
    envMapIntensity: 0,
    transparent: true,
  });
}

/**
 * Where each reflection tap sits along the mirror axis, in world units. The
 * controller poses every tap from the aperture, so this is shared: leaving it
 * inside the builder is what let the second tap sit unposed at the origin.
 */
export const MIRROR_TAP_OFFSETS = [-0.16, -0.08, 0, 0.08, 0.16] as const;

export type MaterialKit = ReturnType<typeof createMaterialKit>;

function createMaterialKit() {
  return {
    cream: standard(PALETTE.cream, MATERIAL_ROUGHNESS.cream),
    pink: standard(PALETTE.pink, MATERIAL_ROUGHNESS.pink),
    blue: standard(PALETTE.blue, MATERIAL_ROUGHNESS.blue),
    olive: standard(PALETTE.olive, MATERIAL_ROUGHNESS.olive),
    yellow: standard(PALETTE.yellow, MATERIAL_ROUGHNESS.yellow),
    ink: standard(PALETTE.ink, MATERIAL_ROUGHNESS.ink),
    floor: matte("#0E0E10"),
    recess: standard("#D8CEBB", 0.82),
  };
}

/** A superellipse: the architectural silhouette used by the aperture and stage. */
function superellipse(rx: number, ry: number, exponent: number, steps = 128) {
  const shape = new THREE.Shape();
  for (let step = 0; step <= steps; step++) {
    const angle = (step / steps) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const x = rx * Math.sign(cosine) * Math.abs(cosine) ** (2 / exponent);
    const y = ry * Math.sign(sine) * Math.abs(sine) ** (2 / exponent);
    if (step === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function extruded(
  shape: THREE.Shape,
  depth: number,
  bevel: number,
  hole?: THREE.Shape,
) {
  if (hole) shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The rounded rectangle the panel's controls are cut from: a stadium when the
 * radius is half the height, which is what the slider's rail and its fill both
 * are. Extruded rather than built as a `RoundedBoxGeometry`, because that rounds
 * all three axes at once — at a radius of half the height its cross-section is a
 * drum, and the bar shades as a gradient instead of the flat face the artboard
 * draws.
 */
function roundedOutline(width: number, height: number, r: number) {
  const shape = new THREE.Shape();
  const centres = [
    [width / 2 - r, height / 2 - r],
    [-width / 2 + r, height / 2 - r],
    [-width / 2 + r, -height / 2 + r],
    [width / 2 - r, -height / 2 + r],
  ];
  for (let corner = 0; corner < 4; corner++)
    for (let j = 0; j <= 12; j++) {
      const theta = ((corner + j / 12) * Math.PI) / 2;
      const x = centres[corner][0] + r * Math.cos(theta);
      const y = centres[corner][1] + r * Math.sin(theta);
      if (corner === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  shape.closePath();
  return shape;
}

/**
 * Extrudes a canonical contour into the flower face.
 *
 * The contour arrives in the 100-unit viewBox and is normalised so the sculpted
 * diameter matches `diameter` exactly. Because `contourPoints` walks the same
 * cubic segments the SVG path uses, the exported outline is the same outline.
 */
export function contourGeometry(
  values: readonly number[],
  diameter: number,
  depth: number,
) {
  // `contourExtent` is normalised to the viewBox (a shape touching the edge
  // reports 0.5), while the points below are still in viewBox units. Both must
  // be in the same unit before the diameter can be honoured.
  const extent = contourExtent(values) || 0.5;
  const scale = diameter / 2 / (extent * CONTOUR_VIEWBOX);
  const points = contourPoints(values, 5);
  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    const x = (point.x - CONTOUR_VIEWBOX / 2) * scale;
    const y = -(point.y - CONTOUR_VIEWBOX / 2) * scale;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return extruded(shape, Math.max(0.001, depth - 0.024), 0.012);
}

export type Ribbon = {
  mesh: THREE.Mesh;
  /** Updates the existing buffers; never allocates a new geometry. */
  setSpine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    sag: number,
    radius: number,
  ): void;
};

const RIBBON_UP = new THREE.Vector3(0, 1, 0);

/**
 * The pointer that holds the free end of the ribbon.
 *
 * The artboard draws the visitor's cursor there — the pink thread runs from the
 * Create control to a white arrow — so the cursor belongs at the spine's end
 * rather than the ribbon simply stopping. Flat in the instrument's own plane,
 * like the ribbon, and anchored at the hotspot so it sits where the pointer is.
 */
function pointerShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.004, -0.116);
  shape.lineTo(0.034, -0.086);
  shape.lineTo(0.058, -0.128);
  shape.lineTo(0.079, -0.117);
  shape.lineTo(0.054, -0.075);
  shape.lineTo(0.093, -0.073);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
  });
}

/**
 * How the band's half-width varies along the spine.
 *
 * - `lens` is blunt at both ends and fullest in the middle: the slider's fill.
 * - `grip` comes to a point at both ends: a band pinched where it is held.
 * - `thread` is fullest where it leaves the panel and narrows toward the free
 *   end, which is what the artboard's thread does and what a lens cannot do.
 *
 * Measured along the artboard's thread against its own width at the panel, the
 * profile is 0.79 at 15% of the span, 0.64 at 46%, 0.43 at 77% and 0.14 at the
 * cursor; `1 - 0.86t` reproduces that inside 0.08 everywhere. A `grip` lens,
 * which is what this drew, is 1.00 / 0.71 / 0.36 / 0.00 at those points and 0.00
 * at the panel, so it pinched to nothing exactly where the artboard is widest.
 */
type RibbonTaper = "lens" | "grip" | "thread";

/**
 * How the spine's height is distributed along its length.
 *
 * `linear` spends height evenly, so the band is steepest where it is held and
 * level in the middle: a hanging cord. `smooth` eases in and out, so the band
 * leaves level, steepens through the middle and levels again at the far end.
 * `thread` is the artboard's own measured curve, described below.
 *
 * The artboard's thread is neither of the first two. Traced across the reference
 * its fall per 40 px of span runs 13, 10, 6, 6, 11, 19, 35, 49, 35, 24, 14, 9, 4
 * from the cursor to the panel — level at the cursor, sharply steepest from 55%
 * to 75% of the span, then level again for the last quarter into the panel. No
 * two-term `ease(t)` reproduces that: `smooth` puts its steepest section at 50%
 * and still gives away height at both ends, which is why this band floated ~27 px
 * below the reference through the middle and met the panel arriving steeply when
 * the reference arrives flat.
 */
type RibbonEase = "linear" | "smooth" | "thread";

/**
 * `thread`'s profile: how much of the spine's height has been spent by each
 * fraction of the way from the free end (0) to the panel end (1). The reference
 * was traced column by column, unprojected into the plane the ribbon itself
 * lives in — at the z each column's own position along the spine implies, since
 * the thread runs from 0.045 behind the panel's front face to 0.12 in front of
 * it — and normalised against the total fall so the curve survives the free end
 * moving.
 *
 * The last point is past where the panel cuts the thread off: the spine has to
 * start behind the panel for the panel to occlude it, so it is extended one
 * tail-segment along its own end tangent and the measured part is rescaled into
 * what remains. `0.8889` is where the visible thread ends.
 */
const THREAD_FALL: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.1111, 0.027],
  [0.2222, 0.0784],
  [0.3333, 0.2179],
  [0.4444, 0.47],
  [0.5556, 0.6746],
  [0.6667, 0.7704],
  [0.7778, 0.8171],
  [0.8889, 0.8899],
  [1, 1],
];

function makeHermite(points: readonly (readonly [number, number])[]) {
  const secants = points.slice(1).map((point, i) => {
    const [x0, y0] = points[i];
    const [x1, y1] = point;
    return (y1 - y0) / (x1 - x0);
  });
  const tangents = points.map((point, i) => {
    if (i === 0) return secants[0];
    if (i === secants.length) return secants[secants.length - 1];
    const before = secants[i - 1];
    const after = secants[i];
    if (before * after <= 0) return 0;
    const spanBefore = point[0] - points[i - 1][0];
    const spanAfter = points[i + 1][0] - point[0];
    return (2 * (spanBefore + spanAfter)) / (spanBefore / before + spanAfter / after);
  });
  const last = points.length - 1;
  return (t: number) => {
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    let i = 1;
    while (i < last && x > points[i][0]) i += 1;
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const h = x1 - x0;
    const s = (x - x0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * y0 +
      (s3 - 2 * s2 + s) * h * tangents[i - 1] +
      (-2 * s3 + 3 * s2) * y1 +
      (s3 - s2) * h * tangents[i]
    );
  };
}

/* The secant of each measured segment, and the tangent at each measured point
 * as the Fritsch-Carlson harmonic mean of its two neighbouring secants — which
 * is zero wherever they disagree in sign, so the interpolant can never step
 * backwards. A central difference, the obvious thing to write, overshoots on
 * both sides of the shoulder at 0.67 where the fall rises from 0.30 to 0.80 in a
 * fifth of the span, and shows up as a kink in the band. */
const threadEase = makeHermite(THREAD_FALL);

/**
 * `thread`'s span: the same measurement again, as the fraction of the spine's
 * WIDTH that has been covered. The thread does not walk evenly from its free end
 * to the panel — it runs almost straight for the first half and then turns up
 * into the plate — so interpolating x linearly in `t` bunches the bend in the
 * wrong place. With the height alone measured, reaching the reference's tail
 * meant stretching the whole band sideways and losing the middle, which is
 * exactly the compromise the previous fit kept making.
 */
const THREAD_SPAN: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.1111, 0.1924],
  [0.2222, 0.2761],
  [0.3333, 0.3655],
  [0.4444, 0.4622],
  [0.5556, 0.5626],
  [0.6667, 0.6645],
  [0.7778, 0.7698],
  [0.8889, 0.8813],
  [1, 1],
];

const RIBBON_EASES: Record<RibbonEase, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  thread: threadEase,
};

const RIBBON_SPANS: Record<RibbonEase, ((t: number) => number) | null> = {
  linear: null,
  smooth: null,
  thread: makeHermite(THREAD_SPAN),
};

const RIBBON_TAPERS: Record<RibbonTaper, (t: number) => number> = {
  lens: (t) => 0.5 + 0.5 * Math.sin(Math.PI * t),
  grip: (t) => Math.sin(Math.PI * t),
  thread: (t) => 1 - 0.86 * t,
};

function createRibbon(
  segments: number,
  radial: number,
  material: THREE.Material,
  taperName: RibbonTaper = "lens",
  easeName: RibbonEase = "linear",
): Ribbon {
  const positions = new Float32Array((segments + 1) * radial * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const indices: number[] = [];
  for (let ring = 0; ring < segments; ring++) {
    for (let spoke = 0; spoke < radial; spoke++) {
      const next = (spoke + 1) % radial;
      const a = ring * radial + spoke;
      const b = ring * radial + next;
      const c = (ring + 1) * radial + spoke;
      const d = (ring + 1) * radial + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const spine = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const behind = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  /* The height and the span are eased independently; a ribbon that names only
   * an ease keeps the old behaviour, with x and z even in `t`. `z` follows the
   * span rather than `t` because the thread's depth was measured as it crossed
   * the plate, so it belongs to the position along the band and not to the
   * ring's index. */
  const spineAt = (
    t: number,
    start: THREE.Vector3,
    end: THREE.Vector3,
    sag: number,
    ease: (value: number) => number,
    span: (value: number) => number,
    out: THREE.Vector3,
  ) =>
    out.set(
      THREE.MathUtils.lerp(start.x, end.x, span(t)),
      THREE.MathUtils.lerp(start.y, end.y, ease(t)) - Math.sin(Math.PI * t) * sag,
      THREE.MathUtils.lerp(start.z, end.z, span(t)),
    );

  return {
    mesh,
    setSpine(start, end, sag, ribbonRadius) {
      const taperAt = RIBBON_TAPERS[taperName];
      const ease = RIBBON_EASES[easeName];
      const span = RIBBON_SPANS[easeName] ?? ((value: number) => value);
      for (let ring = 0; ring <= segments; ring++) {
        const t = ring / segments;
        spineAt(t, start, end, sag, ease, span, spine);
        spineAt(Math.min(1, t + 0.01), start, end, sag, ease, span, ahead);
        spineAt(Math.max(0, t - 0.01), start, end, sag, ease, span, behind);
        tangent.copy(ahead).sub(behind);
        if (tangent.lengthSq() < 1e-10) tangent.set(1, 0, 0);
        tangent.normalize();
        binormal.crossVectors(tangent, RIBBON_UP);
        if (binormal.lengthSq() < 1e-8) binormal.set(0, 0, 1);
        binormal.normalize();
        normal.crossVectors(binormal, tangent).normalize();
        const taper = taperAt(t);
        for (let spoke = 0; spoke < radial; spoke++) {
          const angle = (spoke / radial) * Math.PI * 2;
          const at = (ring * radial + spoke) * 3;
          vertex
            .copy(spine)
            .addScaledVector(binormal, Math.cos(angle) * ribbonRadius * taper)
            .addScaledVector(
              normal,
              Math.sin(angle) * ribbonRadius * taper * 0.68,
            );
          positions[at] = vertex.x;
          positions[at + 1] = vertex.y;
          positions[at + 2] = vertex.z;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    },
  };
}

/**
 * A short visual summary for the angled source plate.
 *
 * The plan is explicit that this plane carries a summary only: real, selectable
 * source lives in a stable DOM panel, and no essential code exists only as a
 * texture.
 */
function sourceSummaryTexture() {
  if (typeof document === "undefined") return new THREE.Texture();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    /* Three lines, centred. A fourth `ui/button.tsx` header used to sit above
     * them, and at the hero's depth the plate's own top edge cut it in half
     * across the glyphs — the artboard shows the three lines and nothing above
     * them, so the header is gone and the block is centred in the canvas rather
     * than pushed to the bottom. */
    context.font = "600 42px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = "#9EC5F2";
    context.fillText("<Button>", 34, 88);
    context.fillStyle = "#F5B8DB";
    context.fillText("Create", 82, 142);
    context.fillStyle = "#9EC5F2";
    context.fillText("</Button>", 34, 196);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Deterministic per-specimen contour variation: the field never repeats exactly. */
function speciesAmount(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index++)
    hash = (hash * 31 + id.charCodeAt(index)) % 1000;
  return hash % 38;
}

export type AssemblyScene = {
  root: THREE.Group;
  aperture: THREE.Group;
  /** The band mirrored about the floor plane; follows `aperture` every frame. */
  /** Every mirror tap, so the controller can pose all of them from the aperture. */
  apertureMirrors: THREE.Mesh[];
  floor: THREE.Mesh;
  /**
   * A real planar reflection of the hero about the floor plane: the scene is
   * re-rendered each time the scene itself changes, from a camera mirrored
   * through the ground, and the floor's shader samples the result projectively.
   */
  floorReflection: {
    render(
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
    ): void;
    /** Resizes the target; the caller owns the canvas size, not this module. */
    setSize(width: number, height: number): void;
    /** Recreates the target after a lost context. */
    reset(): void;
    dispose(): void;
  };
  field: THREE.Group;
  stage: THREE.Group;
  closingField: THREE.Group;
  instrument: THREE.Group;
  parts: Record<PartId, THREE.Object3D>;
  /** Offsets added to the chapter pose when the assembly opens. */
  spreadVectors: Record<PartId, THREE.Vector3>;
  /**
   * The one projected DOM seam. Restricted deliberately to the Create control:
   * every other genuine control keeps a stable, un-projected DOM home.
   */
  createSeam: { object: THREE.Mesh; probe: CreateSeamProbe };
  /** The sculpted face the press deforms; the group around it carries the pose. */
  createMesh: THREE.Mesh;
  heroFaces: Record<string, { object: THREE.Object3D; probe: CreateSeamProbe }>;
  setHeroPresentation(weight: number): void;
  /**
   * Tracks the floor's reflection to the instrument's current pose. Must be
   * called after the caller has positioned `instrument`, since the reflected
   * thread is a child of `root` and cannot inherit the instrument's transform.
   */
  syncReflection(): void;
  ribbon: Ribbon;
  /** The pointer at the ribbon's free end; follows the spine every frame. */
  cursor: THREE.Mesh;
  sliderFill: THREE.Mesh;
  /**
   * Rebuilds the sculpted face from the same blended contour the SVG press
   * previews and exports, and re-tints it to the selected tone. One call, one
   * geometry: the previous geometry is disposed here rather than retained, so a
   * long shaping session cannot accumulate dead CPU-side buffers.
   */
  setFlowerContour(values: readonly number[], colour: string): void;
  dispose(): void;
};

/**
 * Applies a 0–1 opacity to one object's own materials.
 *
 * Parts own their materials so this can never leak into a sibling. Depth writing
 * is switched off only while a part is genuinely translucent, which keeps the
 * settled frames free of transparent-pass sorting artefacts.
 */
export function applyOpacity(object: THREE.Object3D, value: number) {
  const opacity = Math.max(0, Math.min(1, value));
  object.visible = opacity > 0.005;
  if (!object.visible) return;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.985;
    }
  });
}

export function buildAssemblyScene(): AssemblyScene {
  const kit = createMaterialKit();
  /**
   * The hero's albedo profile.
   *
   * The hero lights the rig roughly 2.4x harder than any other chapter
   * (`lights.key` 2.45 against the collection's 1.05), because its band has to
   * read as cream against the artboard's own #e7d7c5. That is right for the
   * band, whose albedo is nearly white, and wrong for everything coloured: a
   * pass through the tone curve at that level takes the drawer blue from
   * #b6caeb to a measured #d0d2d2 — visually grey. The artboard holds the
   * drawers at #8591a9, the switch at #848354 and the flower at #f4d078, so the
   * saturated parts are pre-compensated by darkening their albedo until the lit
   * result lands on the reference, and the correction is weighted so it is only
   * ever applied inside the hero. These are the base colours divided by the
   * measured over-brightening, not eyeballed adjustments to the palette.
   */
  const HERO_ALBEDO = {
    pink: "#f79ad0",
    /* The slider's fill needs a darker pink than the Create control, and a
     * separate entry rather than a shared one for the same reason the flower
     * owns its material: they sit on the same panel and one is not the other.
     * Solved rather than scaled - the red channel is already near the tone
     * curve's shoulder, so dividing the albedo by the measured difference cannot
     * land on it. At #f5b8db the fill rendered (233, 200, 203) where the artboard
     * holds (220, 142, 173) along the whole bar; at this it renders (235, 142,
     * 177). */
    sliderFill: "#b15a96",
    blue: "#687ca9",
    olive: "#6d784b",
    yellow: "#ffd25b",
  } as const;
  const heroTints: {
    material: THREE.MeshStandardMaterial;
    base: THREE.Color;
    hero: THREE.Color;
  }[] = [];
  /** Every material handed to a mesh is owned here and disposed exactly once. */
  const ownedMaterials: THREE.Material[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.Material>(template: T, hero?: string): T => {
    const clone = template.clone();
    if (hero && "color" in clone) {
      const tinted = clone as unknown as THREE.MeshStandardMaterial;
      heroTints.push({
        material: tinted,
        base: tinted.color.clone(),
        hero: new THREE.Color(hero),
      });
    }
    ownedMaterials.push(clone);
    return clone;
  };
  const geo = <T extends THREE.BufferGeometry>(geometry: T): T => {
    ownedGeometries.push(geometry);
    return geometry;
  };

  /* 250-255 rather than 248-255: at 16 repeats over a panel that is only about
   * 300 px wide on screen, a 2.7% range resolved into a visible stipple and the
   * control faces read as noisy rather than matte. 1.9% is texture the eye only
   * finds on the large floor, which is where it was wanted. */
  const grainData = new Uint8Array(64 * 64 * 4);
  let grainSeed = 73;
  for (let i = 0; i < grainData.length; i += 4) {
    grainSeed = (grainSeed * 1664525 + 1013904223) >>> 0;
    const value = 250 + (grainSeed % 6);
    grainData.set([value, value, value, 255], i);
  }
  const grain = new THREE.DataTexture(grainData, 64, 64, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(16, 16);
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.generateMipmaps = true;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.magFilter = THREE.LinearFilter;
  /* The floor now uses this as a bump map, which puts it under the hero camera
   * at a grazing angle across thirty units of nearly edge-on ground. At the
   * default anisotropy of 1 that reads as a diagonal moire: mipmaps pick one
   * level for the whole footprint, and the bump derivative is not filtered by
   * them at all. eight samples along the footprint is what turns it back into
   * grain. Clamped by the renderer to whatever the device supports. */
  grain.anisotropy = 8;
  grain.needsUpdate = true;
  /* The artboard's floor is a warm pool that fades into the field, not a lit
   * slab with a visible horizon. A plane under a directional light is uniformly
   * bright, so the falloff has to be in the map. It rides `setHeroPresentation`
   * with the grain, so no other chapter's floor gains a texture.
   *
   * Two things about its *shape* were measured off the reference rather than
   * guessed, by projecting screen points back onto the floor plane. The pool is
   * not centred on the plane, and it is steep: the reference holds 145 at world
   * (-0.22, 0.95), 62 a metre to its left, 38 at 2.5 units, and 13 by 3.4 — and
   * 13 is *below* the backdrop's own 17.6, so the plane's far edge is very
   * slightly darker than the field and draws no line either way. A first fit at
   * a 4.2-unit radius with a 1.6 exponent measured 101 where the artboard holds
   * 62: it was a broad wash rather than a pool, and the whole lower-left of the
   * frame came up 40 levels. 3.7 and 2.1 pull the metre ring to 93 and the 2.5
   * ring to 30, which brackets the reference on both sides instead of erring one
   * way across the whole pool. */
  /* Solved from the artboard rather than tuned. `.work/fix-f8c3aa9/solve-floor.py`
   * projects a grid of screen pixels back onto this plane through the production
   * camera, inverts the artboard's own luminance through the calibrated
   * map-to-luminance relation (14.95 + 141.57 x map, residual 5.3 levels), and
   * fits centre and shape jointly against every clean-floor sample. It puts the
   * pool at world (+0.10, +0.70) with a 4.5-unit radius on a 4.6 exponent; the
   * earlier hand-tuned map was centred 0.4 m left and 0.2 m deep of that and
   * predicted the artboard's own row scan at 39.5 mean levels against this one's
   * 24.1. The mask is floor that is unambiguously floor, because binning the
   * whole lower frame let the band's cream base and the panel's shadow into the
   * near rings and the first fit tracked them instead. */
  const poolX = 0.1;
  const poolZ = 0.7;
  const floorFalloffData = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      /* Plane-local UV to world XZ. The plane is rotated -90 degrees about X, so
       * its +V runs down world -Z. */
      const u = (x + 0.5) / 64;
      const v = (y + 0.5) / 64;
      const wx = (u - 0.5) * INSTRUMENT.floor.size;
      const wz = -(v - 0.5) * INSTRUMENT.floor.size;
      const distance = Math.hypot(wx - poolX, wz - poolZ);
      /* The far field is 11% rather than 0. At 0 the plane rendered at 3.2
       * against a backdrop of 17.6, which is the same hard edge as before with
       * the sign flipped — a dark line instead of a brown one. 11% landed it at
       * 25.4, still 8 clear of the backdrop; 7.5% measures 19, which is what the
       * reference holds at that row. */
      const value = Math.round(
        255 * (0.063 + 0.937 * Math.pow(1 - Math.min(1, distance / 4.5), 4.6)),
      );
      floorFalloffData.set([value, value, value, 255], (y * 64 + x) * 4);
    }
  }
  const floorFalloff = new THREE.DataTexture(
    floorFalloffData,
    64,
    64,
    THREE.RGBAFormat,
  );
  floorFalloff.wrapS = floorFalloff.wrapT = THREE.ClampToEdgeWrapping;
  /* Linear, not sRGB: this is a multiplier on the floor colour, not a picture. */
  floorFalloff.minFilter = THREE.LinearMipmapLinearFilter;
  floorFalloff.magFilter = THREE.LinearFilter;
  floorFalloff.generateMipmaps = true;
  floorFalloff.needsUpdate = true;

  const root = new THREE.Group();
  const shadowed = (object: THREE.Object3D, cast = true, receive = true) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = cast;
        child.receiveShadow = receive;
      }
    });
    return object;
  };

  /* ---------------------------------------------------------------- aperture */
  /**
   * The hero aperture is a closed band, not an extruded ring. The artboard's
   * opening is a horseshoe whose crown leaves the frame, whose legs run down the
   * left and right of the frame, and whose base joins them beneath the source
   * plate — so an outer contour with a concentric hole cannot describe it. The
   * profile is authored in this group's local space through the real hero
   * camera and closes into a ring, so the group keeps the transform
   * `scene-controller.ts` gives it and the sweep has no end caps — see
   * `aperture-geometry.ts` and `aperture-profile.ts`.
   */
  const aperture = new THREE.Group();
  const apertureSpec = INSTRUMENT.aperture;
  const apertureFrame = new THREE.Mesh(
    geo(
      buildApertureGeometry(
        {
          outer: APERTURE_OUTER,
          inner: APERTURE_INNER,
          depth: APERTURE_DEPTH,
          closed: APERTURE_CLOSED,
        },
        { halfDepth: apertureSpec.thickness / 2, bevel: apertureSpec.bevel },
      ),
    ),
    own(kit.cream),
  );
  apertureFrame.castShadow = true;
  apertureFrame.receiveShadow = true;
  /* The band occludes its own opening. The reference holds a gradient about
   * 90 px long from the opening's front rim into its deepest part, darkening the
   * wall from 235 to 140; the bevel alone gives 25 px, because a bevel is an
   * edge treatment and this is ambient occlusion. Carrying it as a vertex
   * attribute keeps it silhouette-neutral — nothing moves, only the albedo —
   * which matters because the silhouette is already within 2-4 px of the
   * reference at every row.
   *
   * Hero-scoped through a uniform rather than by changing the material: other
   * chapters share this geometry builder, and the niche is only lit this way in
   * the hero. */
  const apertureOcclusion = { value: 1 };
  apertureFrame.material.onBeforeCompile = (shader) => {
    shader.uniforms.heroOcclusion = apertureOcclusion;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float occlusion;
varying float vOcclusion;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vOcclusion = occlusion;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float heroOcclusion;
varying float vOcclusion;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
diffuseColor.rgb *= mix(1.0, vOcclusion, heroOcclusion);`,
      );
  };
  aperture.add(apertureFrame);
  root.add(aperture);

  /* The artboard's floor holds a *soft* reflection: the band's cream reads as a
   * glow under it, and the pink thread smears into a faint warm streak. The
   * previous version was the real mesh mirrored about the floor plane, once, at
   * full sharpness — which is a physically tidy answer and the wrong picture. A
   * perfect mirror under a nearly-clear floor reads as a second object lying
   * under the first, not as the ground catching light. `DoubleSide` is required:
   * the negative scale reverses the winding, so a single-sided material would
   * render the inside of the band.
   *
   * The blur is two taps along the mirror axis rather than a render target. A
   * planar reflection pass would be the honest general answer, but it needs a
   * projective sampler patched into the floor's shader to be worth anything at
   * all, and the only thing a floor reflection has to lose is vertical detail —
   * which is exactly the axis a tap offset moves along. The first attempt kept
   * the band's own brightness and spread four taps over 8 cm, and the result was
   * still a legible second band lying under the real one: at this size a 0.1
   * unit smear is not a blur. What the artboard actually holds under the band is
   * a warm pool with no shape in it, and the floor's own map now carries that
   * brightness (see `floorFalloff`), so the mirror's job is only to keep the
   * reflection from being perfectly flat. Two faint taps, one offset a third of
   * the band's own depth, do that; anything more legible is a second object.
   *
   * The opacities are also the floor's doing rather than the mirror's: the floor
   * is drawn over these taps, so at its old 0.82 only 18% of the band's
   * reflection reached the camera and the artboard's bright halo under the band
   * came back 22 levels dark. Lowering the floor to 0.70 lets 30% through, and
   * this set is what was solved jointly against the artboard alongside it.
   *
   * Offset 0.13 as a second tap was a bug, not a blur. Every tap is positioned
   * from the aperture each frame, but only `apertureMirror` - the first - was
   * ever written; the second kept its authored `position.y` of 0.13 and sat at
   * the world origin at unit scale, scale 1 against the aperture's 1.62. So the
   * "two-tap blur" was one real tap plus a stray band, and widening the second
   * tap's offset could only ever have measured worse. All five are synced now.
   *
   * Five taps over +/-0.16 rather than two over 0.13: at this size a 0.13-unit
   * step is a ghosted edge, not a blur, which is why the single real tap read as
   * a second object lying under the first. The weights are triangular and scaled
   * so the composite is 0.65, matching the strength the floor solve chose; a
   * symmetric spread blurs toward the object as well as away from it. */
  const MIRROR_TAP_GAIN = 0.28;
  const MIRROR_TAP_WEIGHTS = [0.35, 0.8, 1, 0.8, 0.35] as const;
  const MIRROR_TAPS = MIRROR_TAP_OFFSETS.map((offset, index) => ({
    offset,
    opacity: MIRROR_TAP_WEIGHTS[index] * MIRROR_TAP_GAIN,
  }));

  const reflection = new THREE.Group();
  reflection.scale.y = -1;
  reflection.position.y = 2 * INSTRUMENT.floor.y;
  reflection.visible = false;
  root.add(reflection);

  /* Each tap gets its own material, since opacity is per material. The band's
   * colour is lifted because the floor is drawn at 0.82 over it — a straight
   * copy of the band's own material came back at a fifth of the artboard's
   * reflected streak (99 against 159 at the brightest point). */
  const mirrorTaps = MIRROR_TAPS.map(({ opacity }) => {
    const material = own(kit.cream);
    material.side = THREE.DoubleSide;
    material.color.multiplyScalar(1.15);
    material.transparent = true;
    material.opacity = opacity;
    /* Overlapping taps must not write depth or they z-fight each other into a
     * stipple; the floor is opaque enough to sort them on its own. */
    material.depthWrite = false;
    const band = new THREE.Mesh(apertureFrame.geometry, material);
    reflection.add(band);
    return band;
  });
  const apertureMirrors = mirrorTaps;

  /* The pink thread is the brightest thing the artboard's floor catches, and it
   * is the one part of the reflection a viewer actually notices. Its geometry is
   * rewritten every frame by the ribbon's own solver, so its mirror shares that
   * buffer rather than copying it, and follows `instrument`'s transform through
   * this pivot — the reflection group is a child of `root`, where the mirror
   * transform lives, and the ribbon is a child of `instrument`, so the mirror
   * cannot simply be parented to it. `syncReflection` below copies the matrix;
   * see the controller, which calls it after it has posed the instrument. */
  const mirrorPivot = new THREE.Group();
  mirrorPivot.matrixAutoUpdate = false;
  reflection.add(mirrorPivot);

  /* ------------------------------------------------------------------- floor */
  /* `own()` clones, so the material the mesh actually renders with is this
   * one — toggling `kit.floor.map` would have changed nothing at all. */
  /* Same noise, its own repeat: see the bump assignment in
   * `setHeroPresentation`. A clone shares the image, so this costs no texture
   * memory, and `repeat` is per-texture rather than per-image. */
  const floorGrain = grain.clone();
  floorGrain.repeat.set(110, 110);
  floorGrain.needsUpdate = true;

  const floorMaterial = own(kit.floor);
  const floor = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(INSTRUMENT.floor.size, INSTRUMENT.floor.size)),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = INSTRUMENT.floor.y;
  floor.receiveShadow = true;
  floor.visible = false;
  root.add(floor);

  /* ------------------------------------------------------- planar reflection */
  /**
   * The artboard's ground is dark and glossy, and the brightness in it is a
   * blurred reflection of the object standing on it. What was there instead was
   * a falloff map plus five displaced copies of the band laid under a 0.70
   * floor — which reads as a second object lying under the first, because a
   * displaced copy is a copy, and no offset turns one into a reflection.
   *
   * This is the real thing. The scene is rendered a second time from a camera
   * mirrored through the floor plane into its own target, and the floor samples
   * that target projectively through the mirrored camera's own view-projection.
   * The projective sampler is what makes it correct rather than approximate: the
   * fragment's texture coordinate comes from the same matrix that drew the
   * texture, so the mirrored camera's pose and the floor's own geometry cannot
   * disagree.
   *
   * Blur is the target's own mip chain rather than a second pass. The reflection
   * is drawn at half resolution and sampled with an explicit LOD bias, which is
   * a uniform roughness — honest about what it is, one parameter, and no extra
   * full-screen passes on a page that already renders on scroll. `Reflector`
   * would have needed two more targets and a separable kernel for a blur this
   * size.
   *
   * Hero-scoped and skipped where it is not wanted: nothing below a hero weight
   * of a half, nothing on a phone-width canvas. `setHeroPresentation` owns the
   * weight, so the reflection fades with the chapter rather than with the
   * material, and the simpler presentation the mobile and reduced-motion paths
   * already have is left alone.
   */
  const REFLECTION_MAX = 1024;
  /* Solved, not chosen: 0.10, 0.20 and 0.32 were rendered and measured against
   * the reference. 0.32 costs the floor pool 0.4 and the frame 0.19 against
   * 0.10, and 0.20 sits between them, so the reflection is a lift in the right
   * places rather than a wash. */
  const REFLECTION_STRENGTH = 0.1;
  const REFLECTION_MOBILE_MIN = 900;
  const reflectionTint = {
    warm: new THREE.Color(1.06, 1.0, 0.9),
    cool: new THREE.Color(0.84, 0.94, 1.18),
  };
  let reflectWeight = 0;
  let reflectWidth = 0;
  let reflectTarget = new THREE.WebGLRenderTarget(1, 1, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });
  reflectTarget.texture.name = "hero-floor-reflection";
  const reflectCamera = new THREE.PerspectiveCamera();
  const reflectTextureMatrix = new THREE.Matrix4();
  const reflectBias = new THREE.Matrix4().set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1,
  );
  const reflectLookAt = new THREE.Vector3();
  const reflectTargetPoint = new THREE.Vector3();
  const reflectUp = new THREE.Vector3();
  const reflectNormal = new THREE.Vector3(0, 1, 0);
  const reflectOrigin = new THREE.Vector3(0, INSTRUMENT.floor.y, 0);
  const reflectView = new THREE.Vector3();

  /* The floor's own uniform block. `onBeforeCompile` is the only way in: the
   * floor is a `MeshPhongMaterial` with its specular zeroed on purpose, and a
   * black `MeshStandardMaterial` floor renders as a bright grey sheet at
   * grazing incidence, so the material cannot simply be swapped for one that
   * would take the reflection natively. */
  const reflectionUniforms = {
    uReflectionMap: { value: reflectTarget.texture as THREE.Texture | null },
    uReflectionMatrix: { value: reflectTextureMatrix },
    uReflectionStrength: { value: 0 },
    uReflectionLod: { value: 3.4 },
    uReflectionWarm: { value: reflectionTint.warm },
    uReflectionCool: { value: reflectionTint.cool },
  };
  floorMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, reflectionUniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform mat4 uReflectionMatrix;
varying vec4 vReflectionUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vReflectionUv = uReflectionMatrix * modelMatrix * vec4( transformed, 1.0 );`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uReflectionMap;
uniform float uReflectionStrength;
uniform float uReflectionLod;
uniform vec3 uReflectionWarm;
uniform vec3 uReflectionCool;
varying vec4 vReflectionUv;`,
      )
      /* `opaque_fragment` rather than `aomap_fragment`: in `meshphong_frag` the
       * ambient-occlusion chunk comes *before* `outgoingLight` is declared, so
       * adding to it there is a compile error and the floor drops out of the
       * frame entirely. It has to be the last chunk that still sees it. */
      .replace(
        "#include <opaque_fragment>",
        `{
  vec2 reflectionUv = vReflectionUv.xy / max( vReflectionUv.w, 1e-4 );
  vec3 reflected = texture2D( uReflectionMap, reflectionUv, uReflectionLod ).rgb;
  /* Grazing incidence catches the most light and holds the cool cast the
   * artboard's ground has; the near field stays warm, which is the object's own
   * colour coming back. This is where the reference's 3.9% of cool floor pixels
   * comes from — there is no cool light anywhere in the hero to reflect. */
  float grazing = pow( 1.0 - clamp( abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) ), 0.0, 1.0 ), 3.0 );
  outgoingLight += reflected * mix( uReflectionWarm, uReflectionCool, grazing ) *
    uReflectionStrength * ( 0.22 + 1.05 * grazing );
}
#include <opaque_fragment>`,
      );
  };

  const floorReflection = {
    render(
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
    ) {
      /* The reflection is only drawn where it is shown, so a settled page with
       * no hero on screen costs nothing at all. */
      if (reflectWeight <= 0.5 || reflectWidth < REFLECTION_MOBILE_MIN) return;
      if (reflectTarget.width < 2 || reflectTarget.height < 2) return;

      reflectCamera.position.set(
        camera.position.x,
        2 * INSTRUMENT.floor.y - camera.position.y,
        camera.position.z,
      );
      /* Mirrored through the plane rather than reflected with a mirror matrix:
       * a mirror matrix has a negative determinant and flips triangle winding,
       * which would cull the front faces of every mesh in the scene. Building
       * the pose from mirrored position, target and up keeps the camera proper,
       * and the projective sampler absorbs the resulting flip exactly. */
      reflectLookAt.set(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
      reflectTargetPoint.set(
        reflectLookAt.x,
        2 * INSTRUMENT.floor.y - reflectLookAt.y,
        reflectLookAt.z,
      );
      reflectUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      reflectUp.reflect(reflectNormal);
      reflectCamera.up.copy(reflectUp);
      reflectCamera.lookAt(reflectTargetPoint);
      reflectCamera.near = camera.near;
      reflectCamera.far = camera.far;
      reflectCamera.updateMatrixWorld();
      reflectCamera.projectionMatrix.copy(camera.projectionMatrix);
      reflectCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      reflectView.copy(reflectOrigin);

      reflectTextureMatrix
        .copy(reflectBias)
        .multiply(reflectCamera.projectionMatrix)
        .multiply(reflectCamera.matrixWorldInverse);

      /* The ground cannot appear in its own reflection, and neither may the
       * displaced copies that are still drawn under it. */
      const floorWas = floor.visible;
      const tapsWere = reflection.visible;
      const ribbonWas = ribbonMirror.visible;
      floor.visible = false;
      reflection.visible = false;
      ribbonMirror.visible = false;
      const previousTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(reflectTarget);
      renderer.clear();
      renderer.render(scene, reflectCamera);
      renderer.setRenderTarget(previousTarget);
      floor.visible = floorWas;
      reflection.visible = tapsWere;
      ribbonMirror.visible = ribbonWas;
    },
    setSize(width: number, height: number) {
      reflectWidth = width;
      const scale = Math.min(0.5, REFLECTION_MAX / Math.max(1, width));
      const nextWidth = Math.max(2, Math.floor(width * scale));
      const nextHeight = Math.max(2, Math.floor(height * scale));
      if (reflectTarget.width === nextWidth && reflectTarget.height === nextHeight) return;
      /* Resizing rather than recreating keeps the texture object identity, so
       * the floor's uniform does not have to be re-pointed on every resize. */
      reflectTarget.setSize(nextWidth, nextHeight);
    },
    reset() {
      /* A lost context takes the target's GPU-side storage with it. The CPU-side
       * descriptor survives, so the honest repair is a fresh target handed to
       * the same uniform rather than a resize of the dead one. */
      const previous = reflectTarget;
      reflectTarget = new THREE.WebGLRenderTarget(previous.width, previous.height, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
      });
      reflectTarget.texture.name = "hero-floor-reflection";
      reflectionUniforms.uReflectionMap.value = reflectTarget.texture;
      previous.dispose();
    },
    dispose() {
      reflectTarget.dispose();
    },
  };

  /* ---------------------------------------------------------- specimen field */
  const field = new THREE.Group();
  field.visible = false;
  field.add(
    shadowed(
      new THREE.Mesh(
        geo(new RoundedBoxGeometry(4.8, 0.08, 3.4, 4, 0.07)),
        own(kit.cream),
      ),
    ),
  );
  const fieldTop = field.children[0];
  fieldTop.position.set(0.15, INSTRUMENT.floor.y + 0.04, -0.2);
  const trayMaterials = new Map<string, THREE.Material>();
  const trayMaterial = (tone: keyof typeof PALETTE) => {
    const existing = trayMaterials.get(tone);
    if (existing) return existing;
    const created = own(kit[tone]);
    trayMaterials.set(tone, created);
    return created;
  };
  const recessMaterial = own(kit.recess);

  function trayControl(specimen: SpecimenArchetype) {
    const group = new THREE.Group();
    const tone = trayMaterial(specimen.tone);
    switch (specimen.kind) {
      case "pill": {
        const mesh = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.28, 0.075, 0.09, 4, 0.037)),
          tone,
        );
        mesh.position.y = 0.045;
        group.add(mesh);
        break;
      }
      case "slab": {
        const mesh = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.3, 0.11, 0.12, 4, 0.028)),
          tone,
        );
        mesh.position.y = 0.055;
        group.add(mesh);
        break;
      }
      case "dial": {
        const base = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.2, 0.06, 0.11, 4, 0.03)),
          tone,
        );
        base.position.y = 0.03;
        const knob = new THREE.Mesh(
          geo(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 32)),
          own(kit.cream),
        );
        knob.position.set(0.05, 0.075, 0);
        group.add(base, knob);
        break;
      }
      case "dot": {
        const base = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.11, 0.06, 0.11, 4, 0.028)),
          tone,
        );
        base.position.y = 0.03;
        const pip = new THREE.Mesh(
          geo(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 24)),
          own(kit.cream),
        );
        pip.position.y = 0.07;
        group.add(base, pip);
        break;
      }
      case "bar": {
        const rail = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.32, 0.05, 0.07, 4, 0.025)),
          own(kit.cream),
        );
        rail.position.y = 0.026;
        const fill = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.2, 0.038, 0.05, 4, 0.019)),
          tone,
        );
        fill.position.set(-0.05, 0.05, 0);
        const knob = new THREE.Mesh(
          geo(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 28)),
          own(kit.cream),
        );
        knob.position.set(0.07, 0.06, 0);
        group.add(rail, fill, knob);
        break;
      }
      case "plate": {
        const mesh = new THREE.Mesh(
          geo(new RoundedBoxGeometry(0.2, 0.07, 0.1, 4, 0.026)),
          tone,
        );
        mesh.position.y = 0.035;
        group.add(mesh);
        break;
      }
      case "flower":
      default: {
        const mesh = new THREE.Mesh(
          geo(
            contourGeometry(
              blendContour("daisy-12", speciesAmount(specimen.id)),
              0.17,
              0.06,
            ),
          ),
          tone,
        );
        mesh.position.y = 0.05;
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
        break;
      }
    }
    return shadowed(group);
  }

  for (const specimen of SPECIMEN_TRAYS) {
    const tray = new THREE.Group();
    const base = new THREE.Mesh(
      geo(new RoundedBoxGeometry(0.46, 0.05, 0.32, 4, 0.035)),
      own(kit.cream),
    );
    base.receiveShadow = true;
    base.castShadow = true;
    const recess = new THREE.Mesh(
      geo(new RoundedBoxGeometry(0.34, 0.03, 0.22, 4, 0.03)),
      recessMaterial,
    );
    recess.position.y = 0.032;
    recess.receiveShadow = true;
    const control = trayControl(specimen);
    control.position.y = 0.03;
    tray.add(base, recess, control);
    tray.position.set(specimen.tray[0], specimen.tray[1], specimen.tray[2]);
    tray.rotation.y = -0.22;
    field.add(tray);
  }
  root.add(field);

  /* ---------------------------------------------------------------- blue stage */
  const stage = new THREE.Group();
  stage.visible = false;
  const stagePlane = shadowed(
    new THREE.Mesh(
      geo(new RoundedBoxGeometry(5.6, 3.6, 0.08, 4, 0.09)),
      own(kit.blue),
    ),
    false,
    true,
  );
  stagePlane.position.set(0.5, 0.05, -1.15);
  const stageBlob = shadowed(
    new THREE.Mesh(
      geo(extruded(superellipse(0.98, 0.66, 2.6, 96), 0.14, 0.03)),
      own(kit.pink),
    ),
  );
  stageBlob.position.set(0.66, -0.54, -0.3);
  stageBlob.rotation.z = -0.16;
  stage.add(stagePlane, stageBlob);
  root.add(stage);

  /* ------------------------------------------------------------ closing field */
  const closingField = new THREE.Group();
  closingField.visible = false;
  const closingPlane = shadowed(
    new THREE.Mesh(
      geo(new RoundedBoxGeometry(9.5, 5.8, 0.08, 4, 0.1)),
      own(kit.yellow),
    ),
    false,
    true,
  );
  closingPlane.position.set(0.4, 0.2, -1.7);
  const closingContour = shadowed(
    new THREE.Mesh(
      geo(contourGeometry(blendContour("daisy-12", 0), 2.5, 0.08)),
      own(kit.pink),
    ),
  );
  closingContour.position.set(1.55, 0.3, -1.45);
  closingContour.rotation.z = 0.12;
  closingField.add(closingPlane, closingContour);
  root.add(closingField);

  /* -------------------------------------------------------------- instrument */
  const instrument = new THREE.Group();
  instrument.position.set(
    ...(INSTRUMENT.home.position as unknown as [number, number, number]),
  );
  instrument.rotation.set(
    ...(INSTRUMENT.home.rotation as unknown as [number, number, number]),
  );
  root.add(instrument);

  const panel = new THREE.Mesh(
    geo(
      new RoundedBoxGeometry(
        INSTRUMENT.panel.width,
        INSTRUMENT.panel.height,
        INSTRUMENT.panel.thickness,
        6,
        INSTRUMENT.panel.radius,
      ),
    ),
    own(kit.cream),
  );
  panel.castShadow = true;
  panel.receiveShadow = true;
  instrument.add(panel);

  const create = new THREE.Group();
  const createMesh = new THREE.Mesh(
    geo(
      new RoundedBoxGeometry(
        INSTRUMENT.create.width,
        INSTRUMENT.create.height,
        INSTRUMENT.create.thickness,
        6,
        INSTRUMENT.create.radius,
      ),
    ),
    own(kit.pink, HERO_ALBEDO.pink),
  );
  createMesh.castShadow = true;
  createMesh.receiveShadow = true;
  create.position.set(
    ...(INSTRUMENT.create.local as unknown as [number, number, number]),
  );
  create.add(createMesh);
  instrument.add(create);

  const switchBase = new THREE.Group();
  const switchPlate = new THREE.Mesh(
    geo(
      new RoundedBoxGeometry(
        INSTRUMENT.switch.width,
        INSTRUMENT.switch.height,
        INSTRUMENT.switch.thickness,
        5,
        INSTRUMENT.switch.height / 2,
      ),
    ),
    own(kit.olive, HERO_ALBEDO.olive),
  );
  switchPlate.castShadow = true;
  switchBase.add(switchPlate);
  switchBase.position.set(
    ...(INSTRUMENT.switch.local as unknown as [number, number, number]),
  );
  instrument.add(switchBase);

  // The thumb is its own top-level part so the scene controller remains the only
  // writer of its transform: pose here, on/off offset applied on top.
  const switchThumb = new THREE.Mesh(
    geo(
      new THREE.CylinderGeometry(
        INSTRUMENT.switch.thumb,
        INSTRUMENT.switch.thumb,
        0.062,
        36,
      ),
    ),
    own(kit.cream),
  );
  switchThumb.rotation.x = Math.PI / 2;
  switchThumb.castShadow = true;
  switchThumb.position.set(
    ...(INSTRUMENT.switch.local as unknown as [number, number, number]),
  );
  instrument.add(switchThumb);

  const sliderTrack = new THREE.Group();
  const sliderRail = new THREE.Mesh(
    geo(
      new RoundedBoxGeometry(
        INSTRUMENT.slider.track.width,
        INSTRUMENT.slider.track.height,
        INSTRUMENT.slider.track.thickness,
        5,
        INSTRUMENT.slider.track.height / 2,
      ),
    ),
    own(kit.cream),
  );
  sliderRail.castShadow = true;
  sliderTrack.add(sliderRail);
  sliderTrack.position.set(
    ...(INSTRUMENT.slider.local as unknown as [number, number, number]),
  );
  instrument.add(sliderTrack);

  /* The fill carries the pink and the rail under it stays cream, which is what
   * the artboard draws. Stage 3 read the artboard's pink bar as the rail and
   * repainted the whole 276 px track, so the pink ran past the thumb to the
   * rail's far cap where the artboard's stops dead at the thumb's left edge. The
   * pink is the fill; the rail is the cream track it runs in, and past the thumb
   * the track is cream on cream and therefore invisible.
   *
   * The fill is the rail's own shape, drawn short. It began as a ribbon, which
   * cannot be it: `lens` tapers to half width at both ends and its 0.68 section
   * makes the band deeper than it is tall, so the only way to keep it in front of
   * the rail was to stand it 0.008 proud as a ridge. The artboard's bar is a
   * constant 27 px from cap to cap, and a rounded box is that shape exactly. Only
   * its length changes, so it is scaled in x and its left cap is placed on the
   * rail's; because the box is centred, the position compensates for the scale. */
  const sliderFill = new THREE.Mesh(
    geo(
      extruded(
        roundedOutline(
          INSTRUMENT.slider.track.width,
          INSTRUMENT.slider.track.height,
          INSTRUMENT.slider.track.height / 2,
        ),
        INSTRUMENT.slider.track.thickness - 0.012,
        0.006,
      ),
    ),
    own(kit.cream, HERO_ALBEDO.sliderFill),
  );
  sliderFill.castShadow = false;
  sliderFill.receiveShadow = true;
  sliderFill.position.copy(sliderTrack.position);
  instrument.add(sliderFill);

  const sliderThumb = new THREE.Mesh(
    geo(
      new THREE.CylinderGeometry(
        INSTRUMENT.slider.thumb,
        INSTRUMENT.slider.thumb,
        0.075,
        40,
      ),
    ),
    own(kit.cream),
  );
  sliderThumb.rotation.x = Math.PI / 2;
  sliderThumb.castShadow = true;
  sliderThumb.position.copy(sliderTrack.position);
  instrument.add(sliderThumb);

  /* The flower owns its material rather than sharing `kit.yellow`, because the
   * contour press re-tints this one object and a shared instance would repaint
   * every yellow part on the panel with it. The base colour is the authored
   * yellow so the hero and Motion chapters are unchanged until the visitor picks
   * a different tone. */
  const flowerMaterial = own(kit.yellow, HERO_ALBEDO.yellow);
  /* `petal-7`, not `daisy-12`. Counting the artboard's flower by sampling its
   * silhouette's radius around its own centroid finds seven lobes - angles 49,
   * 105, 151, 195, 257, 305, 345, gaps averaging 51.4 degrees - and the same
   * measurement on this object found twelve. `daisy-12` is `35 + 10 cos 12t`, a
   * shallow scallop, which is why the hero drew a sunburst where the artboard
   * has petals; `petal-7` is the same seven lobes at the same pitch, and it is
   * the silhouette the artboard actually shows. The preset itself now cuts those
   * lobes as grooves in a disc rather than as cosine lobes, because the
   * artboard's petals are wide with narrow valleys between them; see
   * `registry/cojeev/lib/signature-shapes.ts`. */
  const flower = new THREE.Mesh(
    geo(
      contourGeometry(
        blendContour("petal-7", 0),
        INSTRUMENT.flower.diameter,
        INSTRUMENT.flower.depth,
      ),
    ),
    flowerMaterial,
  );
  flower.position.set(
    ...(INSTRUMENT.flower.local as unknown as [number, number, number]),
  );
  flower.castShadow = true;
  flower.receiveShadow = true;
  instrument.add(flower);

  const drawers = new THREE.Group();
  const drawerBody = own(kit.blue, HERO_ALBEDO.blue);
  const drawerStrap = own(kit.cream);
  for (let index = 0; index < INSTRUMENT.drawers.count; index++) {
    const plate = new THREE.Group();
    const body = new THREE.Mesh(
      geo(
        new RoundedBoxGeometry(
          INSTRUMENT.drawers.plate.width,
          INSTRUMENT.drawers.plate.height,
          INSTRUMENT.drawers.plate.thickness,
          5,
          0.032,
        ),
      ),
      drawerBody,
    );
    body.castShadow = true;
    body.receiveShadow = true;
    const strap = new THREE.Mesh(
      geo(
        new RoundedBoxGeometry(
          INSTRUMENT.drawers.strap.width,
          INSTRUMENT.drawers.strap.height,
          INSTRUMENT.drawers.strap.thickness,
          4,
          0.012,
        ),
      ),
      drawerStrap,
    );
    strap.position.z = INSTRUMENT.drawers.plate.thickness / 2;
    plate.add(body, strap);
    plate.position.y =
      (index - (INSTRUMENT.drawers.count - 1) / 2) * INSTRUMENT.drawers.gap;
    plate.rotation.y = INSTRUMENT.drawers.yaw;
    drawers.add(plate);
  }
  drawers.position.set(
    ...(INSTRUMENT.drawers.local as unknown as [number, number, number]),
  );
  instrument.add(drawers);

  const stylePlate = new THREE.Group();
  const styleBody = new THREE.Mesh(
    geo(
      new RoundedBoxGeometry(
        INSTRUMENT.stylePlate.width,
        INSTRUMENT.stylePlate.height,
        INSTRUMENT.stylePlate.thickness,
        5,
        0.05,
      ),
    ),
    own(kit.blue),
  );
  styleBody.castShadow = true;
  styleBody.receiveShadow = true;
  stylePlate.add(styleBody);
  const swatchTones = ["pink", "blue", "olive", "yellow"] as const;
  swatchTones.forEach((tone, index) => {
    const swatch = new THREE.Mesh(
      geo(new RoundedBoxGeometry(0.13, 0.13, 0.02, 4, 0.035)),
      own(kit[tone]),
    );
    swatch.position.set(
      -0.24 + index * 0.16,
      0.06,
      INSTRUMENT.stylePlate.thickness / 2 + 0.012,
    );
    stylePlate.add(swatch);
  });
  stylePlate.position.set(
    ...(INSTRUMENT.stylePlate.local as unknown as [number, number, number]),
  );
  instrument.add(stylePlate);

  const sourcePlate = new THREE.Group();
  const sourceBody = new THREE.Mesh(
    geo(
      new RoundedBoxGeometry(
        INSTRUMENT.stylePlate.width,
        INSTRUMENT.stylePlate.height,
        INSTRUMENT.sourcePlate.thickness,
        5,
        0.05,
      ),
    ),
    own(kit.ink),
  );
  sourceBody.castShadow = true;
  sourceBody.receiveShadow = true;
  const summaryTexture = sourceSummaryTexture();
  const summaryMaterial = new THREE.MeshBasicMaterial({
    map: summaryTexture,
    transparent: true,
    toneMapped: false,
  });
  const summary = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(0.72, 0.36)),
    summaryMaterial,
  );
  summary.position.set(0, -0.17, INSTRUMENT.sourcePlate.thickness / 2 + 0.006);
  sourcePlate.add(sourceBody, summary);
  sourcePlate.position.set(
    ...(INSTRUMENT.sourcePlate.local as unknown as [number, number, number]),
  );
  instrument.add(sourcePlate);

  /* ------------------------------------------------------------------ ribbon */
  const ribbon = createRibbon(
    56,
    10,
    own(kit.pink, HERO_ALBEDO.pink),
    "thread",
    "thread",
  );
  instrument.add(ribbon.mesh);

  /* The thread's reflection, sharing the ribbon's own buffer so it tracks every
   * rewrite of the spine for free. Its material is the pink lifted a little,
   * since the floor is drawn over it, and only the base tap: a thin tube smears
   * under its own weight and four copies of a 1mm thread would cost three
   * passes to say the same thing. */
  const ribbonMirrorMaterial = own(kit.pink);
  ribbonMirrorMaterial.side = THREE.DoubleSide;
  ribbonMirrorMaterial.transparent = true;
  ribbonMirrorMaterial.opacity = 0.34;
  ribbonMirrorMaterial.depthWrite = false;
  const ribbonMirror = new THREE.Mesh(ribbon.mesh.geometry, ribbonMirrorMaterial);
  ribbonMirror.matrixAutoUpdate = false;
  mirrorPivot.add(ribbonMirror);

  const cursor = new THREE.Mesh(geo(pointerShape()), own(kit.cream));
  cursor.rotation.z = 0.42;
  cursor.scale.setScalar(1.5);
  instrument.add(cursor);

  const parts: Record<PartId, THREE.Object3D> = {
    panel,
    create,
    switchBase,
    switchThumb,
    sliderTrack,
    sliderThumb,
    flower,
    drawers,
    stylePlate,
    sourcePlate,
  };

  const spreadVectors: Record<PartId, THREE.Vector3> = {
    panel: new THREE.Vector3(0, 0, 0.06),
    create: new THREE.Vector3(0, 0, 0.06),
    switchBase: new THREE.Vector3(0, 0, 0.06),
    switchThumb: new THREE.Vector3(0, 0, 0.06),
    sliderTrack: new THREE.Vector3(0, 0, 0.06),
    sliderThumb: new THREE.Vector3(0, 0, 0.06),
    flower: new THREE.Vector3(0, 0, 0.06),
    drawers: new THREE.Vector3(0, 0, 0.06),
    stylePlate: new THREE.Vector3(0, 0, -0.34),
    sourcePlate: new THREE.Vector3(0, 0, -0.58),
  };

  // Route-local morph targets keep the exact original meshes at Collection.
  // RoundedBox clamps its radius to depth/2: a thin panel therefore needs an
  // independent XY silhouette, rather than a bigger 3D box radius.
  const heroMorphs: {
    mesh: THREE.Mesh;
    original: THREE.BufferGeometry;
    sculpted: THREE.BufferGeometry;
  }[] = [];
  function softenFace(
    mesh: THREE.Mesh,
    width: number,
    height: number,
    radius: number,
  ) {
    const original = mesh.geometry;
    const depth =
      (original.boundingBox ??
        (original.computeBoundingBox(), original.boundingBox))!.max.z * 2;
    const outline = (r: number) => roundedOutline(width, height, r);
    const sculpted = geo(
      extruded(outline(radius), Math.max(0.005, depth - 0.012), 0.006),
    );
    const square = extruded(
      outline(Math.min(0.012, radius)),
      Math.max(0.005, depth - 0.012),
      0.006,
    );
    if (
      square.getAttribute("position").count ===
      sculpted.getAttribute("position").count
    ) {
      sculpted.morphAttributes.position = [
        square.getAttribute("position").clone(),
      ];
      sculpted.morphAttributes.normal = [square.getAttribute("normal").clone()];
    }
    square.dispose();
    heroMorphs.push({ mesh, original, sculpted });
  }
  softenFace(panel, 1, 1.05, 0.085);
  softenFace(createMesh, 0.78, 0.236, 0.11);
  softenFace(switchPlate, 0.25, 0.12, 0.06);
  softenFace(
    sliderRail,
    INSTRUMENT.slider.track.width,
    INSTRUMENT.slider.track.height,
    INSTRUMENT.slider.track.height / 2,
  );
  softenFace(sourceBody, 0.86, 0.98, 0.06);
  for (const plate of drawers.children)
    softenFace(plate.children[0] as THREE.Mesh, 0.44, 0.15, 0.032);
  const textured = [
    panel.material,
    createMesh.material,
    switchPlate.material,
    drawerBody,
    flowerMaterial,
    apertureFrame.material,
  ] as THREE.MeshStandardMaterial[];
  // Subtle baked albedo variation; no derivative-heavy bump shader.
  // The aperture deliberately has no second silhouette: the hero and the
  // catalogue share one solid, so scrolling between them cannot pop. The
  // earlier superellipse ring was a different object standing in for this one.
  const heroFaces: AssemblyScene["heroFaces"] = {
    create: { object: createMesh, probe: createSeamProbe(0.78, 0.236, 0.024) },
    switch: { object: switchPlate, probe: createSeamProbe(0.25, 0.12, 0.065) },
    slider: { object: sliderRail, probe: createSeamProbe(0.76, 0.15, 0.08) },
  };
  for (const [index, name] of ["actions", "content", "layout"].entries()) {
    heroFaces[name] = {
      object: drawers.children[index].children[0],
      probe: createSeamProbe(0.44, 0.15, 0.025),
    };
  }

  return {
    root,
    aperture,
    apertureMirrors,
    floor,
    field,
    stage,
    closingField,
    instrument,
    parts,
    spreadVectors,
    createSeam: {
      object: createMesh,
      probe: createSeamProbe(INSTRUMENT.create.width, INSTRUMENT.create.height),
    },
    ribbon,
    cursor,
    sliderFill,
    createMesh,
    heroFaces,
    floorReflection,
    setHeroPresentation(weight) {
      /* Lerped from the authored colour every frame rather than accumulated, so
       * scrubbing back and forth across the boundary is exactly reversible. */
      for (const tint of heroTints) {
        tint.material.color.copy(tint.base).lerp(tint.hero, weight);
      }
      apertureOcclusion.value = Math.max(0, Math.min(1, weight));
      reflectWeight = weight;
      /* Zero on the paths that do not draw it, so the shader's add is a no-op
       * rather than a stale reflection left over from the last hero frame. */
      reflectionUniforms.uReflectionStrength.value =
        weight > 0.5 && reflectWidth >= REFLECTION_MOBILE_MIN ? REFLECTION_STRENGTH * weight : 0;
      for (const material of textured) {
        const map = weight > 0 ? grain : null;
        if (material.map !== map) {
          material.map = map;
          material.needsUpdate = true;
        }
      }
      {
        reflection.visible = weight > 0.5;
        /* The thread's mirror is only worth drawing where the floor is, and the
         * floor is translucent enough that a faint thread under it still reads.
         * Below the threshold the instrument is elsewhere in the chapter and the
         * ribbon's spine is somewhere the floor never sees. */
        ribbonMirror.visible = weight > 0.5;
        const map = weight > 0 ? floorFalloff : null;
        if (floorMaterial.map !== map) {
          floorMaterial.map = map;
          floorMaterial.needsUpdate = true;
        }
        /* The artboard's ground is textured, and the falloff leaves it a flat
         * wash: a 26-unit plane with one soft gradient across it has no detail
         * anywhere. The grain is already loaded for the instrument, and bump is
         * the right slot for it — the floor's thin film of sheen in the reference
         * is the key light catching that texture, and perturbing the normal is
         * how the light comes by it. Weighted like the map, so the catalogue's
         * floor stays the flat one. */
        /* The artboard's ground carries fine grain and this had none: measured
         * in 41x41 windows over nine clean floor points, its texture energy was
         * 8.8 against the artboard's 13.3, and 0.8 bumpScale was the reason.
         * 0.8 is right for a control face filling 300 px; the floor is a single
         * 26-unit plane seen at a grazing angle, where the same perturbation
         * barely bends a normal. Swept against the artboard, 12 lands at 10.5
         * energy for +0.25 on the floor-pool mean and +0.08 on the frame - the
         * visible grain the artboard has, bought as cheaply as it can be.
         * `floorGrain` is the same noise at its own repeat; that turned out to
         * be nearly neutral on its own (8.80 -> 8.82) and is kept only because
         * it is what 12 was measured with. */
        const bump = weight > 0 ? floorGrain : null;
        if (floorMaterial.bumpMap !== bump) {
          floorMaterial.bumpMap = bump;
          floorMaterial.bumpScale = 12;
          floorMaterial.needsUpdate = true;
        }
      }
      for (const { mesh, original, sculpted } of heroMorphs) {
        const geometry = weight > 0 ? sculpted : original;
        if (mesh.geometry !== geometry) {
          mesh.geometry = geometry;
          mesh.updateMorphTargets();
        }
        if (mesh.morphTargetInfluences)
          mesh.morphTargetInfluences[0] = 1 - weight;
      }
      for (const plate of drawers.children)
        plate.children[1].scale.setScalar(1 - weight);
      sourceBody.scale.y = 1 - weight * 0.59;
      summary.position.y = -0.17 + weight * 0.14;
      summary.scale.setScalar(1 - weight * 0.25);
    },
    syncReflection() {
      /* `instrument.matrix` is the instrument's own pose, which is what the
       * reflection group needs: it is applied under a group that already carries
       * the mirror transform, so using the world matrix would mirror the mirror.
       * The controls and the flower are children of the instrument and inherit
       * this, so their mirrored forms follow without being listed. */
      mirrorPivot.matrix.copy(instrument.matrix);
      mirrorPivot.matrixWorldNeedsUpdate = true;
      ribbonMirror.matrix.copy(ribbon.mesh.matrix);
      ribbonMirror.matrixWorldNeedsUpdate = true;
    },
    setFlowerContour(values, colour) {
      /* Rebuild the face from the exported blend, dispose the previous geometry
       * immediately, and hand the new one to the same owned list so `dispose()`
       * still frees whatever is current. Pushing without releasing was the leak:
       * every slider step retained a full CPU-side contour buffer for the life of
       * the page. */
      const previous = flower.geometry;
      const next = contourGeometry(
        values,
        INSTRUMENT.flower.diameter,
        INSTRUMENT.flower.depth,
      );
      flower.geometry = next;
      const owned = ownedGeometries.indexOf(previous);
      if (owned >= 0) ownedGeometries[owned] = next;
      else ownedGeometries.push(next);
      previous.dispose();
      /* `colour` arrives as a palette KEY ("pink"), not a CSS colour. Passing the
       * key straight to `setStyle` silently parsed it as the CSS keyword of the
       * same name — "pink" became #ffc0cb instead of the palette's #f5b8db,
       * "yellow" became #ffff00, "olive" became #808000, and "cream" is not a CSS
       * keyword at all, so Three.js logged "Unknown color cream" and left the
       * flower whatever colour it already was. The tone swatch, the SVG export and
       * the 3D object must be the same colour, so the key is resolved through the
       * palette it names before it reaches the material. */
      const tone = PALETTE[colour as keyof typeof PALETTE];
      flowerMaterial.color.setStyle(tone ?? colour, THREE.SRGBColorSpace);
    },
    dispose() {
      for (const material of ownedMaterials) material.dispose();
      for (const material of Object.values(kit)) material.dispose();
      for (const geometry of ownedGeometries) geometry.dispose();
      summaryMaterial.dispose();
      summaryTexture.dispose();
      grain.dispose();
      ribbon.mesh.geometry.dispose();
      sliderFill.geometry.dispose();
      floorReflection.dispose();
      root.clear();
    },
  };
}

export const VEC = {
  from(value: Vec3) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  },
};
