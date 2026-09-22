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

function createRibbon(
  segments: number,
  radial: number,
  material: THREE.Material,
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

  const spineAt = (
    t: number,
    start: THREE.Vector3,
    end: THREE.Vector3,
    sag: number,
    out: THREE.Vector3,
  ) =>
    out.set(
      THREE.MathUtils.lerp(start.x, end.x, t),
      THREE.MathUtils.lerp(start.y, end.y, t) - Math.sin(Math.PI * t) * sag,
      THREE.MathUtils.lerp(start.z, end.z, t),
    );

  return {
    mesh,
    setSpine(start, end, sag, ribbonRadius) {
      for (let ring = 0; ring <= segments; ring++) {
        const t = ring / segments;
        spineAt(t, start, end, sag, spine);
        spineAt(Math.min(1, t + 0.01), start, end, sag, ahead);
        spineAt(Math.max(0, t - 0.01), start, end, sag, behind);
        tangent.copy(ahead).sub(behind);
        if (tangent.lengthSq() < 1e-10) tangent.set(1, 0, 0);
        tangent.normalize();
        binormal.crossVectors(tangent, RIBBON_UP);
        if (binormal.lengthSq() < 1e-8) binormal.set(0, 0, 1);
        binormal.normalize();
        normal.crossVectors(binormal, tangent).normalize();
        // A lens: thin where the ribbon is gripped, fullest in the middle.
        const taper = 0.5 + 0.5 * Math.sin(Math.PI * t);
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
    context.font = "500 22px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = "#7A7A83";
    context.fillText("ui/button.tsx", 34, 48);
    context.font = "600 42px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = "#9EC5F2";
    context.fillText("<Button>", 34, 122);
    context.fillStyle = "#F5B8DB";
    context.fillText("Create", 82, 176);
    context.fillStyle = "#9EC5F2";
    context.fillText("</Button>", 34, 230);
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
  floor: THREE.Mesh;
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
  ribbon: Ribbon;
  sliderBand: Ribbon;
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
  /** Every material handed to a mesh is owned here and disposed exactly once. */
  const ownedMaterials: THREE.Material[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.Material>(template: T): T => {
    const clone = template.clone();
    ownedMaterials.push(clone);
    return clone;
  };
  const geo = <T extends THREE.BufferGeometry>(geometry: T): T => {
    ownedGeometries.push(geometry);
    return geometry;
  };

  const grainData = new Uint8Array(64 * 64 * 4);
  let grainSeed = 73;
  for (let i = 0; i < grainData.length; i += 4) {
    grainSeed = (grainSeed * 1664525 + 1013904223) >>> 0;
    const value = 248 + (grainSeed % 8);
    grainData.set([value, value, value, 255], i);
  }
  const grain = new THREE.DataTexture(grainData, 64, 64, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(16, 16);
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.generateMipmaps = true;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.magFilter = THREE.LinearFilter;
  grain.needsUpdate = true;
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
  const aperture = new THREE.Group();
  const apertureSpec = INSTRUMENT.aperture;
  const apertureFrame = new THREE.Mesh(
    geo(
      extruded(
        superellipse(
          apertureSpec.outer[0],
          apertureSpec.outer[1],
          apertureSpec.outerExponent,
        ),
        apertureSpec.thickness,
        apertureSpec.bevel,
        superellipse(
          apertureSpec.inner[0],
          apertureSpec.inner[1],
          apertureSpec.innerExponent,
        ),
      ),
    ),
    own(kit.cream),
  );
  apertureFrame.castShadow = true;
  apertureFrame.receiveShadow = true;
  aperture.add(apertureFrame);
  root.add(aperture);

  /* ------------------------------------------------------------------- floor */
  const floor = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(INSTRUMENT.floor.size, INSTRUMENT.floor.size)),
    own(kit.floor),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = INSTRUMENT.floor.y;
  floor.receiveShadow = true;
  floor.visible = false;
  root.add(floor);

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
    own(kit.pink),
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
    own(kit.olive),
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

  const sliderBand = createRibbon(12, 8, own(kit.pink));
  sliderBand.mesh.position.copy(sliderTrack.position);
  instrument.add(sliderBand.mesh);

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
  const flowerMaterial = own(kit.yellow);
  const flower = new THREE.Mesh(
    geo(
      contourGeometry(
        blendContour("daisy-12", 0),
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
  const drawerBody = own(kit.blue);
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
  const ribbon = createRibbon(56, 10, own(kit.pink));
  instrument.add(ribbon.mesh);

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
    function outline(r: number) {
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
  softenFace(sliderRail, 0.72, 0.075, 0.037);
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
  const originalAperture = apertureFrame.geometry;
  const heroAperture = geo(
    extruded(
      superellipse(0.92, 1.18, 2.7),
      0.17,
      0.035,
      superellipse(0.69, 0.95, 2.6),
    ),
  );
  if (
    heroAperture.getAttribute("position").count ===
    originalAperture.getAttribute("position").count
  ) {
    heroAperture.morphAttributes.position = [
      originalAperture.getAttribute("position").clone(),
    ];
    heroAperture.morphAttributes.normal = [
      originalAperture.getAttribute("normal").clone(),
    ];
  }
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
    sliderBand,
    createMesh,
    heroFaces,
    setHeroPresentation(weight) {
      for (const material of textured) {
        const map = weight > 0 ? grain : null;
        if (material.map !== map) {
          material.map = map;
          material.needsUpdate = true;
        }
      }
      const apertureGeometry = weight > 0 ? heroAperture : originalAperture;
      if (apertureFrame.geometry !== apertureGeometry) {
        apertureFrame.geometry = apertureGeometry;
        apertureFrame.updateMorphTargets();
      }
      if (apertureFrame.morphTargetInfluences)
        apertureFrame.morphTargetInfluences[0] = 1 - weight;
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
      sliderRail.material.color.lerpColors(
        kit.cream.color,
        kit.pink.color,
        weight,
      );
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
      sliderBand.mesh.geometry.dispose();
      root.clear();
    },
  };
}

export const VEC = {
  from(value: Vec3) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  },
};
