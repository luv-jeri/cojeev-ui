/**
 * The canonical instrument specification.
 *
 * One panel width is one world unit. Every number here is a production starting
 * specification to be approved in the modelled style frames — not a measurement
 * inferred from generated imagery. The scene builder, the contour press and the
 * unit tests all read this file, so a geometry change cannot land in one place
 * only.
 *
 * Colours are the warm handoff albedos. Lighting may change their apparent
 * brightness; no registry token is recoloured to compensate for rendering.
 */

export type Vec3 = readonly [number, number, number];

export const PALETTE = {
  cream: "#fbf4e6",
  ink: "#111111",
  pink: "#f5b8db",
  blue: "#b6caeb",
  olive: "#9aab63",
  yellow: "#f5d867",
} as const;

export const MATERIAL_ROUGHNESS = {
  cream: 0.7,
  pink: 0.5,
  blue: 0.6,
  olive: 0.82,
  yellow: 0.74,
  ink: 0.44,
} as const;

/** One large upper-left key, broad fill, controlled dark-side separation. */
export const LIGHT_RIG = {
  key: { position: [-2.6, 3.1, 2.4] as Vec3, intensity: 2.75 },
  fill: { position: [2.6, 1.1, 2.2] as Vec3, intensity: 0.62 },
  rim: { position: [1.6, 2.2, -2.8] as Vec3, intensity: 1.1 },
  ambient: 0.16,
} as const;

/** Panel-local layout. +X right, +Y up, +Z out of the panel face. */
export const INSTRUMENT = {
  home: {
    position: [0.3, 0.05, 0] as Vec3,
    rotation: [0.05, 0.28, 0] as Vec3,
    scale: 1,
  },
  panel: {
    width: 1,
    height: 1.05,
    thickness: 0.045,
    radius: 0.085,
    bevel: 0.012,
  },
  create: {
    local: [0, 0.045, 0.045] as Vec3,
    width: 0.78,
    height: 0.236,
    thickness: 0.045,
    radius: 0.11,
    /** Maximum thickness compression while held, as a fraction. */
    pressCompression: 0.07,
  },
  switch: {
    local: [-0.3, 0.34, 0.028] as Vec3,
    width: 0.25,
    height: 0.12,
    thickness: 0.055,
    thumb: 0.0525,
    thumbTravel: 0.056,
  },
  flower: {
    local: [0.3, 0.35, 0.03] as Vec3,
    diameter: 0.3,
    depth: 0.055,
  },
  slider: {
    local: [0, -0.235, 0.016] as Vec3,
    travel: 0.68,
    track: { width: 0.72, height: 0.075, thickness: 0.03 },
    thumb: 0.075,
  },
  drawers: {
    local: [0.6, 0.07, -0.06] as Vec3,
    yaw: -0.24,
    gap: 0.235,
    count: 3,
    /* Measured against the artboard: its three drawers project 82-93 px each
     * with 12-15 px between them, where this stack drew 59-70 px with 20 px
     * gaps. Both numbers scale by the same 1.3, so the stack keeps its internal
     * proportions and stays centred on the middle plate, which is what the
     * hero's override positions. The label faces and their hit areas project
     * from the same pose, so they follow the plate without a second edit. */
    plate: { width: 0.44, height: 0.195, thickness: 0.045 },
    strap: { width: 0.2, height: 0.03, thickness: 0.012 },
  },
  stylePlate: {
    local: [0, 0, -0.36] as Vec3,
    width: 0.86,
    height: 0.98,
    thickness: 0.035,
  },
  sourcePlate: {
    local: [-0.02, -0.62, -0.16] as Vec3,
    width: 0.8,
    height: 0.32,
    thickness: 0.035,
  },
  /** The cream architectural frame. Authored as a deliberate silhouette. */
  aperture: {
    position: [0.32, 0.12, -1.15] as Vec3,
    rotation: [0.02, 0.08, 0] as Vec3,
    outer: [0.88, 1.18] as const,
    inner: [0.62, 0.86] as const,
    /** Superellipse exponents: higher is squarer, lower is rounder. */
    outerExponent: 4.2,
    innerExponent: 3.4,
    thickness: 0.1,
    bevel: 0.02,
  },
  floor: { y: -1.02, size: 26 },
} as const;

export type SpecimenArchetype = {
  id: string;
  /** Registry category the specimen is drawn from. Never renamed for marketing. */
  category: string;
  label: string;
  /** Curated tray position on the table, in world units. */
  tray: Vec3;
  /** Which moulded control this tray carries. */
  kind: "pill" | "slab" | "dial" | "dot" | "bar" | "plate" | "flower";
  tone: keyof typeof PALETTE;
};

/**
 * Twelve specimen archetypes. The featured Create control in the foreground is
 * not one of these: it is the persistent instrument mesh, so choosing a specimen
 * here never changes the object the next chapter requires.
 */
export const SPECIMEN_TRAYS: readonly SpecimenArchetype[] = [
  { id: "button", category: "Actions", label: "Button", tray: [-1.05, -0.86, 0.62], kind: "pill", tone: "pink" },
  { id: "input", category: "Forms", label: "Input", tray: [-0.52, -0.86, 0.5], kind: "slab", tone: "cream" },
  { id: "switch", category: "Forms", label: "Switch", tray: [0.02, -0.86, 0.38], kind: "dial", tone: "olive" },
  { id: "checkbox", category: "Forms", label: "Checkbox", tray: [0.55, -0.86, 0.26], kind: "dot", tone: "blue" },
  { id: "slider", category: "Forms", label: "Slider", tray: [1.08, -0.86, 0.14], kind: "bar", tone: "pink" },
  { id: "badge", category: "Data display", label: "Badge", tray: [1.6, -0.86, 0.02], kind: "plate", tone: "yellow" },
  { id: "kbd", category: "Data display", label: "Kbd", tray: [-1.32, -0.62, 0.02], kind: "plate", tone: "cream" },
  { id: "progress", category: "Feedback", label: "Progress", tray: [-0.79, -0.62, -0.1], kind: "bar", tone: "blue" },
  { id: "spinner", category: "Feedback", label: "Spinner", tray: [-0.26, -0.62, -0.22], kind: "dial", tone: "blue" },
  { id: "animated-icon", category: "Effects", label: "Animated Icon", tray: [0.27, -0.62, -0.34], kind: "flower", tone: "yellow" },
  { id: "shape-artwork", category: "Visual effects", label: "Shape Artwork", tray: [0.8, -0.62, -0.46], kind: "flower", tone: "pink" },
  { id: "pattern-background", category: "Subtle backgrounds", label: "Pattern Background", tray: [1.33, -0.62, -0.58], kind: "slab", tone: "olive" },
];

/**
 * Editorial filters over the registry's own categories. This mapping is
 * deliberately explicit and lives in site code: no registry category is renamed,
 * and every specimen keeps the category its payload declares.
 */
export const SPECIMEN_FILTERS = [
  { id: "essentials", label: "Essentials", categories: ["Actions", "Forms"] },
  { id: "motion", label: "Motion", categories: ["Effects", "Motion", "Feedback"] },
  {
    id: "creative",
    label: "Creative",
    categories: ["Creative", "3D", "Visual effects", "Backgrounds", "Subtle backgrounds"],
  },
  {
    id: "data",
    label: "Data",
    categories: [
      "Data display",
      "Charts",
      "Navigation",
      "Layout",
      "Typography",
      "Composition",
      "Conversation",
      "Tools",
    ],
  },
] as const;

export type SpecimenFilterId = (typeof SPECIMEN_FILTERS)[number]["id"];

export function specimenFilter(id: string) {
  return SPECIMEN_FILTERS.find((filter) => filter.id === id) ?? SPECIMEN_FILTERS[0];
}

export function specimenMatchesFilter(category: string, id: SpecimenFilterId) {
  return (specimenFilter(id).categories as readonly string[]).includes(category);
}

/** The persistent carrier: the one specimen the next chapter requires. */
export const FEATURED_SPECIMEN = "button";

/** Motion characters the Response Chamber can drive, in board order. */
export const RESPONSE_CHARACTERS = [
  "glide",
  "stretch",
  "jelly",
  "drop",
  "rubber",
  "pebble",
] as const;
