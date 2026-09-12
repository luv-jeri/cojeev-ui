"use client";

import * as React from "react";
import { PatternBackground } from "../ui/pattern-background";
import { useChoreography } from "../motion/choreography";
import { subtleBackgrounds, type PatternBackgroundVariant } from "./subtle-backgrounds";

const PigmentField = React.lazy(() => import("../ui/pigment-field").then(module => ({ default: module.PigmentField })));
const DepthBackground = React.lazy(() => import("../ui/depth-background").then(module => ({ default: module.DepthBackground })));
const AmbientBackground = React.lazy(() => import("../ui/ambient-background").then(module => ({ default: module.AmbientBackground })));

const livingBackgrounds = [
  { value: "pigment", label: "Pigment wash", description: "Slowly blending color with a fine pigment texture." },
  { value: "pollen", label: "Pollen", description: "Soft pieces floating at different depths." },
  { value: "depth-contour", label: "Depth contours", description: "Layered organic contours around the edges." },
  { value: "orbital", label: "Orbital", description: "Small orbiting shapes with perspective." },
  { value: "ambient-drift", label: "Ambient drift", description: "Sparse shapes drifting past the canvas edges." },
  { value: "ambient-orbit", label: "Ambient orbit", description: "A slow orbit of soft, colored shapes." },
  { value: "ambient-contour", label: "Ambient contours", description: "Broad curved bands framing the content." },
] as const;

export type PreviewBackgroundVariant = PatternBackgroundVariant | typeof livingBackgrounds[number]["value"];
export const previewBackgroundGroups = [
  { label: "Atmosphere", choices: livingBackgrounds },
  { label: "Patterns", choices: subtleBackgrounds },
] as const;

/** Swatches are still CSS/SVG paint, never seven additional animation engines. */
export function PreviewBackgroundThumbnail({ value }: { value: PreviewBackgroundVariant }) {
  if (subtleBackgrounds.some(choice => choice.value === value)) {
    return <PatternBackground variant={value as PatternBackgroundVariant} spacing={12} opacity={.25} />;
  }
  return <span className="v-preview-background-thumbnail" data-preview-thumbnail={value} aria-hidden="true" />;
}

function LivingPreviewBackground({ value }: { value: Exclude<PreviewBackgroundVariant, PatternBackgroundVariant> }) {
  const { quiet } = useChoreography();
  let content: React.ReactNode;
  if (value === "pigment") content = <PigmentField speed={.45} intensity={.8} paused={quiet} />;
  else if (value === "pollen" || value === "depth-contour" || value === "orbital") {
    content = <DepthBackground variant={value === "depth-contour" ? "contour" : value} density={.6} intensity={quiet ? 0 : .45} seed="preview" />;
  } else {
    content = <AmbientBackground variant={value === "ambient-orbit" ? "orbit" : value === "ambient-contour" ? "contour" : "drift"} paused={quiet} />;
  }
  return <div data-preview-background={value} className="v-preview-background" aria-hidden="true" inert>
    <React.Suspense fallback={<PreviewBackgroundThumbnail value={value} />}>{content}</React.Suspense>
  </div>;
}

/** Only the chosen field mounts. The specimen stays a separate, stable sibling. */
export function PreviewBackgroundPaint({ value }: { value: PreviewBackgroundVariant }) {
  if (value === "none") return null;
  if (livingBackgrounds.some(choice => choice.value === value)) {
    return <LivingPreviewBackground value={value as Exclude<PreviewBackgroundVariant, PatternBackgroundVariant>} />;
  }
  return <PatternBackground variant={value as PatternBackgroundVariant} opacity={.12} />;
}
