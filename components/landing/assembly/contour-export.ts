/**
 * Site-only contour tooling for the marketing assembly.
 *
 * The registry's `signature-shapes` module owns the twelve canonical silhouettes,
 * and every path there is authored from the same 96 cubic segments. That shared
 * topology is what lets two named contours blend numerically without inventing a
 * shape, and it is why the 3D flower face and the exported SVG can be driven by
 * the same numbers.
 *
 * Nothing in this file is published to consumers, and no installable component is
 * modified by it. A blended contour is exported as a literal SVG and as a plain
 * React `<svg>` — never as an unsupported `ShapeArtwork` prop.
 *
 * One silhouette is site-local: the hero opens on `petal-7`, but the flower the
 * artboard draws is not the table's `petal-7`. `heroFlowerPresetPath` below
 * substitutes the hero's own contour for that one name so the sculpted face and
 * the exported path keep agreeing, and the shared table keeps its own shape.
 */
import {
  signatureShapePaths,
  type SignatureShapeName,
} from "@/registry/cojeev/lib/signature-shapes";
import { HERO_FLOWER_PATH } from "./hero-flower-contour";

export const CONTOUR_VIEWBOX = 100;
export const CONTOUR_SEGMENTS = 96;
export const CONTOUR_NUMBER = /-?\d+(?:\.\d+)?/g;

/** The three named contours offered by the press, and the constrained far end. */
export const CONTOUR_PRESETS = [
  "daisy-12",
  "clover-soft",
  "pebble-soft",
] as const satisfies readonly SignatureShapeName[];
export type ContourPreset = (typeof CONTOUR_PRESETS)[number];
export const CONTOUR_TARGET: SignatureShapeName = "cushion";

export const CONTOUR_LABELS: Record<ContourPreset, string> = {
  "daisy-12": "Daisy",
  "clover-soft": "Clover",
  "pebble-soft": "Pebble",
};

const round = (value: number) => {
  const fixed = Number(value.toFixed(3));
  return Object.is(fixed, -0) ? 0 : fixed;
};

export function isContourPreset(value: unknown): value is ContourPreset {
  return (
    typeof value === "string" &&
    (CONTOUR_PRESETS as readonly string[]).includes(value)
  );
}

/**
 * Accepts any silhouette in the shape table, not only the three the press
 * offers. The hero's flower opens on `petal-7`, so a session that saved it would
 * otherwise fail `isContourPreset` and silently discard the visitor's own
 * amount and tone along with it.
 */
export function isShapeName(value: unknown): value is SignatureShapeName {
  return typeof value === "string" && value in signatureShapePaths;
}

/** The press's label for a shape, or a neutral one for a shape it does not offer. */
export function contourLabel(preset: SignatureShapeName): string {
  return (CONTOUR_LABELS as Record<string, string | undefined>)[preset] ?? "Custom";
}

/**
 * Flattens a canonical 96-segment silhouette into its 578 numbers: the move
 * point followed by six control/end numbers per cubic segment.
 */
export function parseContour(path: string): number[] {
  const numbers = (path.match(CONTOUR_NUMBER) ?? []).map(Number);
  const expected = 2 + CONTOUR_SEGMENTS * 6;
  if (numbers.length !== expected)
    throw new Error(
      `Contour must carry ${expected} numbers, received ${numbers.length}`,
    );
  if (!numbers.every(Number.isFinite))
    throw new Error("Contour carries a non-finite coordinate");
  return numbers;
}

/** Rebuilds the exact path string from a flat contour. */
export function contourPath(values: readonly number[]): string {
  if (values.length !== 2 + CONTOUR_SEGMENTS * 6)
    throw new Error("Contour must carry 2 + 96 x 6 numbers");
  let path = `M${round(values[0])} ${round(values[1])}`;
  for (let segment = 0; segment < CONTOUR_SEGMENTS; segment++) {
    const at = 2 + segment * 6;
    path += `C${round(values[at])} ${round(values[at + 1])} ${round(values[at + 2])} ${round(values[at + 3])} ${round(values[at + 4])} ${round(values[at + 5])}`;
  }
  return `${path}Z`;
}

/**
 * The hero's resting silhouette is its own, not the table's `petal-7`. Swapping
 * it in here rather than in `signature-shapes` is what keeps the substitution
 * site-only: every consumer of this module — the sculpted face, the SVG export
 * and the React export — sees one contour, and no install does.
 */
export function heroFlowerPresetPath(preset: SignatureShapeName): string {
  return preset === "petal-7" ? HERO_FLOWER_PATH : signatureShapePaths[preset];
}

/**
 * Blends a named contour toward the constrained end shape.
 *
 * `amount` is the authored 0–100 contour parameter. 0 is the named preset exactly;
 * 100 is `cushion`. Both ends are real canonical paths, so no intermediate value
 * can leave the authorship of the twelve silhouettes.
 */
export function blendContour(
  preset: SignatureShapeName,
  amount: number,
  target: SignatureShapeName = CONTOUR_TARGET,
): number[] {
  const from = parseContour(heroFlowerPresetPath(preset));
  const to = parseContour(signatureShapePaths[target]);
  const t = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0) / 100);
  return from.map((value, index) => value + (to[index] - value) * t);
}

export type ContourPoint = { x: number; y: number };

/**
 * Samples the blended contour into a polygon. Used for the 3D flower face so the
 * sculpted silhouette and the exported path cannot drift apart.
 */
export function contourPoints(
  values: readonly number[],
  perSegment = 5,
): ContourPoint[] {
  const points: ContourPoint[] = [{ x: values[0], y: values[1] }];
  for (let segment = 0; segment < CONTOUR_SEGMENTS; segment++) {
    const at = 2 + segment * 6;
    const x0 = segment === 0 ? values[0] : values[at - 2];
    const y0 = segment === 0 ? values[1] : values[at - 1];
    const [cx1, cy1, cx2, cy2, x1, y1] = values.slice(at, at + 6);
    for (let step = 1; step <= perSegment; step++) {
      const t = step / perSegment;
      const u = 1 - t;
      points.push({
        x:
          u * u * u * x0 +
          3 * u * u * t * cx1 +
          3 * u * t * t * cx2 +
          t * t * t * x1,
        y:
          u * u * u * y0 +
          3 * u * u * t * cy1 +
          3 * u * t * t * cy2 +
          t * t * t * y1,
      });
    }
  }
  points.pop();
  return points;
}

/** How far a point sits from the contour centre, as a fraction of the viewBox. */
export function contourExtent(values: readonly number[]): number {
  const points = contourPoints(values, 3);
  let radius = 0;
  for (const point of points)
    radius = Math.max(radius, Math.hypot(point.x - 50, point.y - 50));
  return radius / CONTOUR_VIEWBOX;
}

const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

/** The outline alone: enough to describe and name a contour, no colour yet. */
export type ContourOutline = {
  /** Named preset the visitor started from. */
  preset: SignatureShapeName;
  /** Contour parameter, 0–100. */
  amount: number;
};

/** An exported document: an outline plus the literal fill it was drawn with.
 * `contourFileName` takes the outline, because naming a file is not artwork. */
export type ContourDocument = ContourOutline & {
  /** Literal fill colour of the exported artwork. */
  fill: string;
};

export function contourSvgDocument({
  preset,
  amount,
  fill,
  title = "000h contour",
}: ContourDocument & { title?: string }): string {
  const path = contourPath(blendContour(preset, amount));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${escapeXml(title)}">`,
    `  <title>${escapeXml(title)}</title>`,
    `  <path d="${path}" fill="${escapeXml(fill)}"/>`,
    `</svg>`,
    ``,
  ].join("\n");
}

export function contourReactComponent({
  preset,
  amount,
  fill,
  name = "ContourMark",
}: ContourDocument & { name?: string }): string {
  const path = contourPath(blendContour(preset, amount));
  return [
    `// Blended from the canonical "${preset}" silhouette at ${round(amount)}% toward cushion.`,
    `// Plain SVG: no 000h component is required to render it.`,
    `export function ${name}({ className, title = "Contour" }: { className?: string; title?: string }) {`,
    `  return (`,
    `    <svg viewBox="0 0 100 100" width="100" height="100" className={className} role="img" aria-label={title}>`,
    `      <title>{title}</title>`,
    `      <path`,
    `        d="${path}"`,
    `        fill="${escapeXml(fill)}"`,
    `      />`,
    `    </svg>`,
    `  );`,
    `}`,
    ``,
  ].join("\n");
}

/** Stable file name offered by the download action. */
export function contourFileName({
  preset,
  amount,
}: Pick<ContourDocument, "preset" | "amount">): string {
  return `000h-${preset}-${Math.round(round(amount))}.svg`;
}
