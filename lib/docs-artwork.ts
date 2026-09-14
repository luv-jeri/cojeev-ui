import type { SignatureShapeName } from "@/registry/cojeev/lib/signature-shapes";
import type { ShapeArtworkTone } from "@/registry/cojeev/ui/shape-artwork";

export type DocsArtworkLayout = "orbit" | "lean" | "sprout" | "constellation";
export type DocsArtworkPiece = {
  role: "hero" | "companion" | "spark";
  name: SignatureShapeName;
  morphTo: SignatureShapeName;
  tone: ShapeArtworkTone;
  rotation: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  echo: boolean;
};
export type DocsArtworkModel = {
  layout: DocsArtworkLayout;
  seed: number;
  pieces: readonly DocsArtworkPiece[];
};

const layouts: Record<DocsArtworkLayout, readonly Pick<DocsArtworkPiece, "x" | "y" | "size">[]> = {
  orbit: [
    { x: 12, y: 8, size: 84 },
    { x: 56, y: 42, size: 46 },
    { x: -8, y: -10, size: 34 },
  ],
  lean: [
    { x: 2, y: 12, size: 92 },
    { x: 60, y: 34, size: 42 },
    { x: 2, y: -12, size: 32 },
  ],
  sprout: [
    { x: 20, y: 2, size: 78 },
    { x: 55, y: 45, size: 43 },
    { x: -12, y: 18, size: 37 },
  ],
  constellation: [
    { x: 15, y: 7, size: 72 },
    { x: 58, y: 23, size: 48 },
    { x: 4, y: 58, size: 31 },
  ],
};
const layoutNames = Object.keys(layouts) as DocsArtworkLayout[];
const heroShapes: SignatureShapeName[] = ["daisy-12", "petal-7", "aster-9", "sunburst-24", "clover-soft", "cushion"];
const companionShapes: SignatureShapeName[] = ["pebble-soft", "pebble-tall", "cloud-3", "ribbon-soft", "seed-wing"];
const sparkShapes: SignatureShapeName[] = ["sunburst-24", "clover-soft", "aster-9", "petal-7"];
const allShapes: SignatureShapeName[] = [...heroShapes, ...companionShapes];
const tones: ShapeArtworkTone[] = ["pink", "olive", "blue", "yellow"];

function hashSeed(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash || 1;
}

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

const pick = <T,>(values: readonly T[], next: () => number) => values[Math.floor(next() * values.length)]!;
const integer = (low: number, high: number, next: () => number) => Math.round(low + (high - low) * next());

/** Stable pseudo-random artwork: route identity creates variety without hydration drift. */
export function docsArtworkModel(component: string, heroTone: ShapeArtworkTone = "pink"): DocsArtworkModel {
  const seed = hashSeed(component.trim().toLowerCase() || "cojeev");
  const next = random(seed);
  const layout = pick(layoutNames, next);
  const geometry = layouts[layout];
  const sourcePools = [heroShapes, companionShapes, sparkShapes] as const;
  const roles = ["hero", "companion", "spark"] as const;
  const pieces = roles.map((role, index): DocsArtworkPiece => {
    const name = pick(sourcePools[index], next);
    const alternatives = allShapes.filter(candidate => candidate !== name);
    const tone = index === 0 ? heroTone : pick(tones.filter(candidate => candidate !== heroTone), next);
    return {
      role,
      name,
      morphTo: pick(alternatives, next),
      tone,
      rotation: integer(-40, 40, next),
      x: geometry[index]!.x,
      y: geometry[index]!.y,
      size: geometry[index]!.size,
      duration: integer(7, 15, next),
      delay: Number((index * .55 + next() * .8).toFixed(2)),
      echo: index === 0 || (index === 1 && next() > .55),
    };
  });
  return { layout, seed, pieces };
}
