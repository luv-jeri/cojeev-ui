"use client";
import { SculptureSurface, type SculptureCommonProps } from "./glyph-sculpture";
import type { InkTreatment } from "../lib/sculpture-raster";
export type { InkTreatment };
export type InkSculptureProps = SculptureCommonProps & { treatment?: InkTreatment; markSize?: number; density?: number; angle?: number; relief?: number };
/** Engraved lines bend with real surface depth, opening into dashes toward the light. */
export function InkSculpture({ treatment = "hatch", markSize = 8, density = 1, angle = -25, relief = .55, ...props }: InkSculptureProps) {
  const safeTreatment = treatment === "crosshatch" || treatment === "contour" ? treatment : "hatch";
  return <SculptureSurface {...props} surfaceOptions={{ kind: "ink", treatment: safeTreatment, markSize, density, angle, relief }} />;
}
