"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { useLivingShader, type FieldMotionProps } from "../lib/living-shader";

export type PigmentFieldProps = Omit<React.ComponentProps<"div">, "children" | "ref"> & FieldMotionProps;

/** A decorative pigment wash. Give its parent a height and place content beside it. */
export function PigmentField({ speed = 1, intensity = 1, tone = "balanced", paused = false, className, style, ...props }: PigmentFieldProps) {
  const { host: hostRef, canvas: canvasRef, status, tone: safeTone, intensity: safeIntensity, moving } = useLivingShader("pigment", { speed, intensity, tone, paused });
  return (
    <div {...props} ref={hostRef} data-slot="pigment-field" data-tone={safeTone} data-renderer={status} data-moving={moving ? "true" : "false"} className={cn("v-pigment-field", className)} style={{ ...style, "--field-intensity": safeIntensity } as React.CSSProperties} aria-hidden="true" inert>
      <span data-slot="field-fallback" />
      <canvas ref={canvasRef} data-slot="field-canvas" aria-hidden="true" />
    </div>
  );
}
