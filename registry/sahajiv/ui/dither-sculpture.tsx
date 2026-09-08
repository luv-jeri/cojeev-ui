"use client";
import { SculptureSurface, type SculptureCommonProps } from "./glyph-sculpture";
import type { DitherPattern } from "../lib/sculpture-raster";
export type { DitherPattern };
export type DitherSculptureProps = SculptureCommonProps & { pattern?: DitherPattern; grainSize?: number; density?: number };
/** A depth-tested object printed as ordered dots, halftone, error diffusion or seeded stipple. */
export function DitherSculpture({ pattern = "ordered", grainSize = 3, density = 1, ...props }: DitherSculptureProps) {
  const safePattern = ["ordered", "halftone", "diffusion", "stipple"].includes(pattern) ? pattern : "ordered";
  return <SculptureSurface {...props} surfaceOptions={{ kind: "dither", pattern: safePattern, grainSize, density }} />;
}
