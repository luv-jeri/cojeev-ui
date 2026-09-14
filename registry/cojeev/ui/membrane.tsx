"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { createMembraneRenderer, type MembranePalette, type MembraneRenderer, type MembraneScene, type MembraneStatus } from "../lib/membrane-field";

export type MembraneHandle = {
  /** Paints one frame. The last scene is repainted on resize and theme change. */
  draw(scene: MembraneScene): void;
  /** Current CSS pixel size of the surface. */
  size(): { width: number; height: number };
  status(): MembraneStatus;
};

export type MembraneProps = Omit<React.ComponentProps<"div">, "children" | "ref"> & {
  ref?: React.Ref<MembraneHandle>;
  /** Called after each measured resize with the new CSS size. */
  onMeasure?: (size: { width: number; height: number }) => void;
};

function readPalette(element: HTMLElement): MembranePalette {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    tones: [read("--v-pink", "#F5B8DB"), read("--v-olive", "#9AAB63"), read("--v-blue", "#B6CAEB"), read("--v-yellow", "#F5D867")],
    deep: [read("--v-pink-deep", "#E09CC1"), read("--v-olive-deep", "#808F53"), read("--v-blue-deep", "#8BA2C8"), read("--v-yellow-deep", "#E8C84D")],
    paper: read("--v-paper", read("--v-canvas", "#FBF4E6")),
  };
}

/** A decorative living-membrane surface. The consumer owns the clock and the
 * scene; this host owns measurement, device pixel bounds, theme colour and
 * context loss. It is a local prototype in library source, not a registry entry. */
export function Membrane({ ref, onMeasure, className, style, ...props }: MembraneProps) {
  const host = React.useRef<HTMLDivElement>(null), canvas = React.useRef<HTMLCanvasElement>(null);
  const renderer = React.useRef<MembraneRenderer | null>(null);
  const lastScene = React.useRef<MembraneScene | null>(null);
  const size = React.useRef({ width: 1, height: 1 });
  const measure = React.useRef(onMeasure);
  React.useLayoutEffect(() => { measure.current = onMeasure; }, [onMeasure]);

  React.useImperativeHandle(ref, () => ({
    draw(scene) { lastScene.current = scene; renderer.current?.draw(scene); },
    size: () => ({ ...size.current }),
    status: () => renderer.current?.status ?? "fallback",
  }), []);

  React.useEffect(() => {
    const element = host.current, surface = canvas.current;
    if (!element || !surface) return;
    let current = createMembraneRenderer(surface);
    renderer.current = current;
    const repaint = () => { if (lastScene.current) current.draw(lastScene.current); };
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      size.current = { width, height };
      current.resize(width, height, window.devicePixelRatio || 1);
      element.dataset.renderer = current.status;
      measure.current?.({ width, height });
      repaint();
    };
    const recolor = () => { current.setPalette(readPalette(element)); repaint(); };
    current.setPalette(readPalette(element));
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const theme = new MutationObserver(recolor);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-skin", "class"] });
    window.addEventListener("v-theme", recolor);
    window.addEventListener("v-palette", recolor);
    const lost = (event: Event) => { event.preventDefault(); element.dataset.renderer = "lost"; };
    const restored = () => {
      current.dispose();
      current = createMembraneRenderer(surface);
      renderer.current = current;
      current.setPalette(readPalette(element));
      resize();
    };
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    resize();
    return () => {
      observer.disconnect(); theme.disconnect();
      window.removeEventListener("v-theme", recolor); window.removeEventListener("v-palette", recolor);
      surface.removeEventListener("webglcontextlost", lost); surface.removeEventListener("webglcontextrestored", restored);
      current.dispose(); renderer.current = null;
    };
  }, []);

  return <div {...props} ref={host} data-slot="membrane" aria-hidden="true" className={cn("v-membrane", className)} style={{ position: "relative", pointerEvents: "none", ...style }}>
    <canvas ref={canvas} data-slot="membrane-canvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
  </div>;
}
