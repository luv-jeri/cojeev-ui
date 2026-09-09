"use client";

import * as React from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { cn } from "../lib/utils";
import { signatureShapePaths, type SignatureShapeName } from "../lib/signature-shapes";
import { useChoreography } from "../motion/choreography";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { assignMotionRef } from "../motion/refs";

export type ShapeArtworkTone = "pink" | "olive" | "blue" | "yellow";
export type ShapeArtworkOptions = {
  name?: SignatureShapeName;
  tone?: ShapeArtworkTone;
  /** Foreground rotation, in degrees. */
  rotation?: number;
  /** False draws the foreground as an outline. */
  filled?: boolean;
  shadow?: boolean;
  /** Direction of the cast shadow, clockwise from the right. */
  shadowAngle?: number;
  echo?: boolean;
  /** Rear outline rotation relative to the foreground. */
  echoAngle?: number;
  /** Omit when decorative. */
  label?: string;
};
export type ShapeArtworkColors = { fill: string; shadow: string; echo: string };
export type ShapeArtworkProps = Omit<React.ComponentProps<"svg">, "name" | "children"> & ShapeArtworkOptions;
const tones: Record<ShapeArtworkTone, string> = { pink: "#F0A4CC", olive: "#A8BC75", blue: "#95BAE8", yellow: "#F1D369" };
const degrees = (value: number | undefined, fallback: number) => {
  const angle = Number.isFinite(value) ? value as number : fallback;
  return Number((((angle % 360) + 540) % 360 - 180).toFixed(3));
};
const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);

function artworkModel(options: ShapeArtworkOptions) {
  const name = options.name ?? "daisy-12";
  if (!Object.hasOwn(signatureShapePaths, name)) throw new Error(`Unknown Cojeev signature shape: ${name}`);
  const tone = options.tone ?? "pink";
  if (!Object.hasOwn(tones, tone)) throw new Error(`Unknown Cojeev artwork tone: ${tone}`);
  const rotation = degrees(options.rotation, 0);
  const shadowAngle = degrees(options.shadowAngle, 45);
  const echoAngle = degrees(options.echoAngle, -18);
  const filled = options.filled ?? true;
  const shadow = options.shadow ?? true;
  const echo = options.echo ?? true;
  const dx = Number((Math.cos(shadowAngle * Math.PI / 180) * 9).toFixed(3));
  const dy = Number((Math.sin(shadowAngle * Math.PI / 180) * 9).toFixed(3));
  const layers = [
    ...(shadow ? [{ key: "shadow" as const, transform: `translate(${dx} ${dy}) rotate(${rotation} 50 50)`, filled, opacity: .18, width: 1.5 }] : []),
    ...(echo ? [{ key: "echo" as const, transform: `translate(9 -6) rotate(${degrees(rotation + echoAngle, 0)} 50 50)`, filled: false, opacity: .42, width: .85 }] : []),
    { key: "fill" as const, transform: `rotate(${rotation} 50 50)`, filled, opacity: 1, width: 1.5 },
  ];
  return { name, tone, rotation, shadowAngle, echoAngle, filled, shadow, echo, label: options.label, path: signatureShapePaths[name], layers };
}

/** Standalone vector artwork. Supply resolved colors to bake the current theme/palette. */
export function shapeArtworkSvg(options: ShapeArtworkOptions = {}, colors?: Partial<ShapeArtworkColors>): string {
  const model = artworkModel(options);
  const paint: ShapeArtworkColors = { fill: colors?.fill ?? tones[model.tone], shadow: colors?.shadow ?? "#111111", echo: colors?.echo ?? "#14171B" };
  const semantics = model.label ? ` role="img" aria-label="${escapeXml(model.label)}"` : ' aria-hidden="true"';
  const layers = model.layers.map(layer => `  <g data-artwork-layer="${layer.key}" transform="${layer.transform}" opacity="${layer.opacity}"><path d="${model.path}" fill="${layer.filled ? escapeXml(paint[layer.key]) : "none"}" stroke="${layer.filled ? "none" : escapeXml(paint[layer.key])}" stroke-width="${layer.width}" stroke-linejoin="round" /></g>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 140 140" width="512" height="512"${semantics}>\n${model.label ? `  <title>${escapeXml(model.label)}</title>\n` : ""}${layers}\n</svg>`;
}

/** All editable artwork state, as a copyable React usage example. */
export function shapeArtworkCode(options: ShapeArtworkOptions = {}): string {
  const model = artworkModel(options);
  const stringProp = (name: string, value: string) => `  ${name}={${JSON.stringify(value)}}`;
  return ['import { ShapeArtwork } from "@/components/ui/shape-artwork";', "", "<ShapeArtwork", stringProp("name", model.name), stringProp("tone", model.tone), `  rotation={${model.rotation}}`, `  filled={${model.filled}}`, `  shadow={${model.shadow}}`, `  shadowAngle={${model.shadowAngle}}`, `  echo={${model.echo}}`, `  echoAngle={${model.echoAngle}}`, ...(model.label ? [stringProp("label", model.label)] : []), '  style={{ width: "100%", maxWidth: 400 }}', "/>"].join("\n");
}

/** One authored silhouette, shared by its face, cast shadow and rear outline. */
export function ShapeArtwork({ name, tone, rotation, filled, shadow, shadowAngle, echo, echoAngle, label, className, ref, ...props }: ShapeArtworkProps) {
  const model = artworkModel({ name, tone, rotation, filled, shadow, shadowAngle, echo, echoAngle, label });
  const host = React.useRef<SVGSVGElement>(null);
  const hostRef = React.useCallback((element: SVGSVGElement | null) => { host.current = element; return assignMotionRef(ref, element); }, [ref]);
  const { quiet, transition } = useChoreography();
  const { enabled, inView } = useMotionVisibility(host);
  const path = useMotionValue(model.path);
  React.useEffect(() => {
    if (quiet || !enabled || !inView) { path.jump(model.path); return; }
    const animation = animate(path, model.path, transition);
    return () => animation.stop();
  }, [model.path, quiet, enabled, inView, path, transition]);
  const paint: ShapeArtworkColors = { fill: `var(--v-${model.tone}, ${tones[model.tone]})`, shadow: "var(--ink-fixed, #111111)", echo: "var(--v-text, #14171B)" };
  return <svg {...props} ref={hostRef} data-slot="shape-artwork" data-shape={model.name} data-tone={model.tone} data-quiet={quiet || !enabled || !inView ? "true" : "false"} className={cn("v-shape-artwork", className)} viewBox="-20 -20 140 140" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    {model.layers.map(layer => <g key={layer.key} data-artwork-layer={layer.key} transform={layer.transform} opacity={layer.opacity}>
      <motion.path d={path} fill={layer.filled ? paint[layer.key] : "none"} stroke={layer.filled ? "none" : paint[layer.key]} strokeWidth={layer.width} strokeLinejoin="round" />
    </g>)}
  </svg>;
}
