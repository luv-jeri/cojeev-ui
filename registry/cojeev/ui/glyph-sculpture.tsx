"use client";

import * as React from "react";
import { cn } from "@/registry/cojeev/lib/utils";
import { createGlyphMesh, glyphGrid, normalizeGlyphOptions, type GlyphForm, type GlyphTone } from "@/registry/cojeev/lib/glyph-mesh";
import { sculptureGeometry, type SculptureGeometryInput } from "@/registry/cojeev/lib/sculpture-geometry";
import { rasterizeSculpture, sculptureCharacters, sculptureGrid, sculptureNumber, sculpturePrint, sculpturePrintPath, type GlyphSet, type PrintOptions } from "@/registry/cojeev/lib/sculpture-raster";
import { useMotionVisibility } from "@/registry/cojeev/motion/use-motion-visibility";

export type { GlyphForm, GlyphTone, GlyphSet, SculptureGeometryInput };
export { loadSculptureFile, sculptureFromGLB, sculptureFromSVG } from "../lib/sculpture-loaders";
export { sculptureFromPixels, sculptureGeometry } from "../lib/sculpture-geometry";
export type SculptureCommonProps = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  form?: GlyphForm; tone?: GlyphTone;
  /** Immutable triangle geometry. Centered and fitted to a unit sphere; invalid geometry exposes an error. */
  geometry?: SculptureGeometryInput;
  speed?: number; turn?: number; pitch?: number; zoom?: number;
  pointerTracking?: boolean; paused?: boolean;
  onGeometryError?: (error: Error) => void;
};
export type GlyphSculptureProps = SculptureCommonProps & {
  /** Character-cell height in CSS pixels, bounded to 7–20. */
  cellSize?: number;
  glyphSet?: GlyphSet;
  /** Trace the silhouette with directional marks in the density set. */
  edgeMatching?: boolean;
};
type SurfaceOptions = { kind: "glyph" | "dither" | "ink"; cellSize?: number; glyphSet?: GlyphSet; edgeMatching?: boolean; grainSize?: number } & Omit<PrintOptions, "kind">;
type Configuration = SurfaceOptions & { run: boolean; visible: boolean; pointer: boolean; speed: number; turn: number; pitch: number; zoom: number };
type Control = { configure: (configuration: Configuration) => void };

/** Shared surface primitive: geometry, print treatment and motion have separate owners. */
export function SculptureSurface({ form = "bloom", tone = "rose", geometry, speed = 1, turn = 0, pitch = 0, zoom = 1, pointerTracking = false, paused = false, onGeometryError, className, surfaceOptions, ...props }: SculptureCommonProps & { surfaceOptions: SurfaceOptions }) {
  const host = React.useRef<HTMLDivElement>(null), canvas = React.useRef<HTMLCanvasElement>(null), control = React.useRef<Control | null>(null);
  const { enabled, inView } = useMotionVisibility(host);
  const safeForm: GlyphForm = form === "seed" || form === "pebble" ? form : "bloom";
  const safeTone: GlyphTone = ["ink", "rose", "moss", "sky"].includes(tone) ? tone : "rose";
  const { speed: pace, cellSize: size, turn: degrees } = normalizeGlyphOptions({ speed, cellSize: surfaceOptions.cellSize, turn });
  const tilt = sculptureNumber(pitch, 0, -80, 80), scale = sculptureNumber(zoom, 1, .6, 1.15), moving = enabled && inView && !paused && pace > 0;
  const { kind, glyphSet = "density", edgeMatching = true, pattern, treatment, grainSize, markSize, density, angle, relief } = surfaceOptions;
  const meshResult = React.useMemo(() => {
    try { return { mesh: geometry ? sculptureGeometry(geometry) : sculptureGeometry(createGlyphMesh(safeForm)), error: null }; }
    catch (error) { return { mesh: null, error: error instanceof Error ? error : new Error("The geometry could not be read.") }; }
  }, [geometry, safeForm]);
  const mesh = meshResult.mesh;
  React.useEffect(() => { if (meshResult.error) onGeometryError?.(meshResult.error); }, [meshResult.error, onGeometryError]);
  const configuration = React.useRef<Configuration>({ ...surfaceOptions, run: moving, visible: inView, pointer: pointerTracking, speed: pace, cellSize: size, turn: degrees, pitch: tilt, zoom: scale });
  const [renderer, setRenderer] = React.useState("pending");
  const still = React.useMemo(() => {
    if (!mesh) return null;
    const grid = kind === "glyph" ? glyphGrid(432, 324, 10.8) : sculptureGrid(384, 288, 4);
    const frame = rasterizeSculpture(mesh, grid, .35 + degrees * Math.PI / 180, -.2 + tilt * Math.PI / 180, scale);
    if (kind === "glyph") { const characters = sculptureCharacters(frame, glyphSet, edgeMatching), lines: string[] = []; for (let i = 0; i < characters.length; i += grid.columns) lines.push(characters.slice(i, i + grid.columns).join("")); return { text: lines.join("\n"), grid }; }
    return { path: sculpturePrintPath(sculpturePrint(frame, { kind, pattern, treatment, markSize, density, angle, relief }), grid.columns), grid };
  }, [mesh, kind, degrees, tilt, scale, glyphSet, edgeMatching, pattern, treatment, markSize, density, angle, relief]);

  React.useEffect(() => {
    configuration.current = { kind, glyphSet, edgeMatching, pattern, treatment, grainSize, markSize, density, angle, relief, run: moving, visible: inView, pointer: pointerTracking, speed: pace, cellSize: size, turn: degrees, pitch: tilt, zoom: scale };
    control.current?.configure(configuration.current);
  }, [kind, glyphSet, edgeMatching, pattern, treatment, grainSize, markSize, density, angle, relief, moving, inView, pointerTracking, pace, size, degrees, tilt, scale, safeTone]);

  React.useEffect(() => {
    const element = host.current, surface = canvas.current;
    if (!element || !surface || !mesh) return;
    let context: CanvasRenderingContext2D | null;
    try { context = surface.getContext("2d"); } catch { context = null; }
    if (!context) { setRenderer("fallback"); return; }
    let options = configuration.current, disposed = false, lost = false, frame = 0, last = 0, elapsed = 0, painted = false;
    let width = 1, height = 1, ratio = 1, pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0, ink = "#26282d";
    let grid = glyphGrid(width, height, options.cellSize ?? 10);
    const hover = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    function cancel() { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; }
    function request() { if (!disposed && !lost && !frame && options.visible && !document.hidden) frame = requestAnimationFrame(draw); }
    function draw(now: number) {
      frame = 0;
      if (disposed || lost || !options.visible || document.hidden) return;
      if (options.run && last && now - last < 32) { request(); return; }
      if (options.run) { elapsed += (last ? Math.min(now - last, 70) : 0) / 1000 * options.speed; tiltX += (pointerX - tiltX) * .18; tiltY += (pointerY - tiltY) * .18; }
      last = now;
      const yaw = .35 + options.turn * Math.PI / 180 + Math.sin(elapsed * .42) * .4 + tiltX, pitch = -.2 + options.pitch * Math.PI / 180 + Math.sin(elapsed * .31) * .12 + tiltY;
      const result = rasterizeSculpture(mesh!, grid, yaw, pitch, options.zoom);
      surface!.dataset.sampling = result.sampling > 1 ? "adaptive" : "full";
      context!.setTransform(ratio, 0, 0, ratio, 0, 0); context!.clearRect(0, 0, width, height); context!.fillStyle = ink; context!.globalAlpha = 1;
      if (options.kind === "glyph") {
        const characters = sculptureCharacters(result, options.glyphSet, options.edgeMatching);
        context!.font = `600 ${grid.cellHeight * .94}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; context!.textAlign = "center"; context!.textBaseline = "middle";
        for (let i = 0; i < characters.length; i++) if (characters[i] !== " ") context!.fillText(characters[i], (i % grid.columns + .5) * grid.cellWidth, (Math.floor(i / grid.columns) + .5) * grid.cellHeight);
      } else {
        const marks = sculpturePrint(result, { ...options, kind: options.kind });
        for (let i = 0; i < marks.length;) {
          if (!marks[i]) { i++; continue; }
          const x = i % grid.columns, y = Math.floor(i / grid.columns); let count = 1;
          while (x + count < grid.columns && marks[i + count]) count++;
          context!.fillRect(x * grid.cellWidth, y * grid.cellHeight, count * grid.cellWidth + .25, grid.cellHeight + .25); i += count;
        }
      }
      if (!painted) { painted = true; setRenderer("canvas2d"); }
      if (options.run) request();
    }
    function resize() {
      const rect = element!.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      ratio = Math.min(2, window.devicePixelRatio || 1, 2048 / Math.max(width, height), Math.sqrt(1500000 / (width * height)));
      const backingWidth = Math.max(1, Math.floor(width * ratio)), backingHeight = Math.max(1, Math.floor(height * ratio));
      if (surface!.width !== backingWidth || surface!.height !== backingHeight) { surface!.width = backingWidth; surface!.height = backingHeight; }
      grid = options.kind === "glyph" ? glyphGrid(width, height, options.cellSize ?? 10) : sculptureGrid(width, height, options.kind === "dither" ? sculptureNumber(options.grainSize, 3, 1.5, 9) : 1.5);
      repaint();
    }
    function repaint() { ink = getComputedStyle(element!).color; request(); }
    const instance: Control = { configure(next) { options = next; if (!options.pointer || !options.run) { pointerX = 0; pointerY = 0; } cancel(); resize(); } };
    control.current = instance;
    const pointer = (event: PointerEvent) => {
      if (!options.run || !options.pointer || !hover.matches || event.pointerType === "touch") return;
      const rect = element.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height, inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      pointerX = inside ? (x * 2 - 1) * .3 : 0; pointerY = inside ? (y * 2 - 1) * .2 : 0;
    };
    const visibility = () => { cancel(); request(); }, onLost = (event: Event) => { event.preventDefault(); lost = true; cancel(); setRenderer("fallback"); }, onRestored = () => { lost = false; painted = false; resize(); };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element);
    const appearance = new MutationObserver(repaint);
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) appearance.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "data-mode", "data-tone"] });
    window.addEventListener("pointermove", pointer, { passive: true }); window.addEventListener("resize", resize); window.addEventListener("cojeev:appearancechange", repaint); document.addEventListener("visibilitychange", visibility);
    surface.addEventListener("contextlost", onLost); surface.addEventListener("contextrestored", onRestored); resize();
    return () => {
      disposed = true; cancel(); if (control.current === instance) control.current = null;
      resizeObserver.disconnect(); appearance.disconnect(); window.removeEventListener("pointermove", pointer); window.removeEventListener("resize", resize); window.removeEventListener("cojeev:appearancechange", repaint); document.removeEventListener("visibilitychange", visibility);
      surface.removeEventListener("contextlost", onLost); surface.removeEventListener("contextrestored", onRestored); context!.clearRect(0, 0, surface.width, surface.height); surface.width = 1; surface.height = 1;
    };
  }, [mesh]);

  return <div {...props} ref={host} className={cn("v-sculpture-surface", `v-${kind}-sculpture`, className)} data-slot={`${kind}-sculpture`} data-form={geometry ? "custom" : safeForm} data-tone={safeTone} data-renderer={meshResult.error ? "error" : renderer} data-moving={moving && renderer === "canvas2d" && mesh ? "true" : "false"} aria-hidden={meshResult.error ? undefined : true} inert={meshResult.error ? undefined : true} role={meshResult.error ? "status" : undefined}>
    {meshResult.error ? <span data-slot="sculpture-error">{meshResult.error.message}</span> : still && ("text" in still ? <pre data-slot="glyph-sculpture-still">{still.text}</pre> : <svg data-slot="sculpture-print-still" viewBox={`0 0 ${still.grid.columns} ${still.grid.rows}`}><path d={still.path} fill="currentColor" /></svg>)}
    <canvas ref={canvas} data-slot="glyph-sculpture-canvas" />
  </div>;
}

/** A decorative three-dimensional surface drawn with characters and optional contour marks. */
export function GlyphSculpture({ cellSize = 10, glyphSet = "density", edgeMatching = true, ...props }: GlyphSculptureProps) {
  const set = glyphSet === "digits" || glyphSet === "letters" ? glyphSet : "density";
  return <SculptureSurface {...props} surfaceOptions={{ kind: "glyph", cellSize, glyphSet: set, edgeMatching }} />;
}
