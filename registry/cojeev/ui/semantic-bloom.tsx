"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { BloomSimulation, bloomNumber, type BloomOptions, type BloomPoint } from "../lib/bloom-engine";
import { useMotionVisibility } from "../motion/use-motion-visibility";

export type SemanticBloomControls = { gather: () => void; scatter: () => void; reset: () => void };
export type SemanticBloomProps = Omit<React.ComponentProps<"div">, "children" | "ref"> & {
  /** Readable DOM wordmark. Whitespace and long text wrap naturally. */
  text?: string;
  /** Cojeev color presets. Inherits the surrounding light/dark theme. */
  tone?: "signature" | "memory" | "together" | "ink";
  /** Wordmark scale, 0.55–1.6. */
  size?: number;
  /** Canvas opacity, 0–1; text always remains readable. */
  opacity?: number;
  /** Freeze decorative movement and pointer response. */
  paused?: boolean;
  /** Enable local pointer attraction without capturing scroll or clicks. */
  interactive?: boolean;
  /** Editable simulation forces, distances and density. */
  physics?: BloomOptions;
  /** Liquid edge blur, 0–20 CSS pixels. Default 12 (upstream). */
  softness?: number;
  /** Organic edge displacement, 0–40. Default 20 (upstream). */
  edgeTexture?: number;
  /** Connection stroke width, 0–8 CSS pixels. Default 4. */
  connectionWidth?: number;
  /** Repeatable initial particle arrangement. */
  seed?: number;
  /** Imperative commands for native buttons or application events. */
  controlsRef?: React.Ref<SemanticBloomControls>;
  /** Optional decorative word proximity event; does not represent semantic understanding. */
  onWordActive?: (word: string, index: number) => void;
};

type Runtime = SemanticBloomControls & {
  configure: (options: BloomOptions, connectionWidth: number) => void;
  play: (moving: boolean) => void;
  measure: () => void;
  pointer: (point: BloomPoint | null) => void;
  destroy: () => void;
};

function mountBloom(host: HTMLDivElement, canvas: HTMLCanvasElement, wordmark: HTMLDivElement, seed: number,
  onWord: (word: string, index: number) => void): Runtime | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  let simulation = new BloomSimulation(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight), {}, seed);
  let words: (BloomPoint & { element: HTMLElement; active: boolean })[] = [];
  let pointer: BloomPoint | null = null;
  let colors = ["#F5B8DB"];
  let connection = "#9AAB63";
  let connectionWidth = 4;
  let frame = 0;
  let previous = 0;
  let moving = false;
  let disposed = false;

  function palette() {
    const style = getComputedStyle(host);
    colors = [0, 1, 2, 3].map(i => style.getPropertyValue(`--bloom-color-${i}`).trim() || "#F5B8DB");
    connection = style.getPropertyValue("--bloom-connection").trim() || colors[0];
  }

  function draw() {
    if (!context || disposed) return;
    context.clearRect(0, 0, simulation.width, simulation.height);
    const particles = simulation.particles;
    context.lineWidth = connectionWidth;
    // Preserve the source's particle/connection pass ordering and alpha values.
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      context.globalAlpha = 0.8;
      context.fillStyle = colors[p.color];
      context.beginPath(); context.arc(p.x, p.y, p.radius, 0, Math.PI * 2); context.fill();
      context.globalAlpha = 0.15;
      context.strokeStyle = connection;
      if (connectionWidth > 0) for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        if (Math.hypot(p.x - other.x, p.y - other.y) < simulation.options.connectionDistance) {
          context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(other.x, other.y); context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
    words.forEach((word, index) => {
      const distance = Math.min(...particles.map(p => Math.hypot(p.x - word.x, p.y - word.y)));
      const active = distance < (word.active ? 60 : 30);
      if (word.active !== active) {
        word.active = active; word.element.dataset.active = String(active);
        if (active) onWord(word.element.textContent ?? "", index);
      }
    });
  }

  function measure() {
    if (disposed || !context) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    // Cap backing-store area for large host surfaces as well as high DPR.
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2_000_000 / (width * height)));
    simulation.resize(width, height);
    canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    words = Array.from(wordmark.querySelectorAll<HTMLElement>("[data-bloom-word]")).map(element => {
      const word = element.getBoundingClientRect();
      return { x: word.left - rect.left - host.clientLeft + word.width / 2, y: word.top - rect.top - host.clientTop + word.height / 2, element, active: false };
    });
    draw();
  }

  function tick(now: number) {
    frame = 0;
    if (!moving || disposed) return;
    if (previous) simulation.advance((now - previous) / 1000, words, pointer);
    previous = now; draw();
    frame = requestAnimationFrame(tick);
  }

  const resize = new ResizeObserver(measure);
  resize.observe(host); resize.observe(wordmark);
  const theme = new MutationObserver(() => { palette(); draw(); });
  // A nested theme boundary is as valid as the document theme.
  for (let element: HTMLElement | null = host; element; element = element.parentElement) {
    const attributeFilter = ["data-mode", "data-palette", "data-contrast", "class"];
    if (element === host || element === document.documentElement) attributeFilter.push("style");
    theme.observe(element, { attributes: true, attributeFilter });
  }
  const fontsChanged = () => measure();
  document.fonts?.addEventListener("loadingdone", fontsChanged);
  void document.fonts?.ready.then(() => { if (!disposed) measure(); });
  palette(); measure();
  return {
    configure(options, width) { simulation.configure(options); connectionWidth = width; palette(); measure(); },
    play(value) {
      moving = value;
      if (!value) { cancelAnimationFrame(frame); frame = 0; previous = 0; pointer = null; }
      else if (!frame) frame = requestAnimationFrame(tick);
    },
    measure,
    pointer(point) { pointer = moving ? point : null; },
    gather() { simulation.gather(); if (!moving) { simulation.settle(words); draw(); } },
    scatter() { simulation.scatter(); draw(); },
    reset() { simulation = new BloomSimulation(simulation.width, simulation.height, simulation.options, seed); previous = 0; pointer = null; draw(); },
    destroy() {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect(); theme.disconnect();
      document.fonts?.removeEventListener("loadingdone", fontsChanged);
      canvas.width = 1; canvas.height = 1;
    },
  };
}

const DEFAULT_PHYSICS: BloomOptions = {};

export function SemanticBloom({ text = "Cojeev", tone = "signature", size = 1, opacity = 0.9,
  paused = false, interactive = true, physics = DEFAULT_PHYSICS, softness = 12, edgeTexture = 20,
  connectionWidth = 4, seed = 42, controlsRef, onWordActive, className, style,
  onPointerMove, onPointerLeave, onPointerCancel, onPointerUp, ...props }: SemanticBloomProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const wordmark = React.useRef<HTMLDivElement>(null);
  const runtime = React.useRef<Runtime | null>(null);
  const callback = React.useRef(onWordActive);
  const [renderer, setRenderer] = React.useState<"still" | "canvas" | "fallback">("still");
  const { enabled, inView } = useMotionVisibility(host);
  const moving = enabled && inView && !paused && bloomNumber(physics.speed, 1, 0, 2) > 0;
  const id = `bloom-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const safeSeed = bloomNumber(seed, 42, 0, 4294967295);

  React.useEffect(() => { callback.current = onWordActive; }, [onWordActive]);
  React.useEffect(() => {
    if (!host.current || !canvas.current || !wordmark.current) return;
    runtime.current = mountBloom(host.current, canvas.current, wordmark.current, safeSeed,
      (word, index) => callback.current?.(word, index));
    setRenderer(runtime.current ? "canvas" : "fallback");
    return () => { runtime.current?.destroy(); runtime.current = null; };
  }, [safeSeed]);
  React.useEffect(() => {
    runtime.current?.configure(physics, bloomNumber(connectionWidth, 4, 0, 8));
    runtime.current?.play(moving);
    if (!interactive) runtime.current?.pointer(null);
  }, [physics, connectionWidth, moving, interactive, tone, text, size, safeSeed]);
  React.useImperativeHandle(controlsRef, () => ({
    gather: () => runtime.current?.gather(), scatter: () => runtime.current?.scatter(), reset: () => runtime.current?.reset(),
  }), []);

  return <div {...props} ref={host} data-slot="semantic-bloom" data-tone={tone} data-renderer={renderer}
    data-moving={moving && renderer === "canvas" ? "true" : "false"} className={cn("v-semantic-bloom", className)}
    style={{ "--bloom-size": bloomNumber(size, 1, 0.55, 1.6), "--bloom-opacity": bloomNumber(opacity, 0.9, 0, 1), ...style } as React.CSSProperties}
    onPointerMove={event => {
      onPointerMove?.(event);
      if (event.defaultPrevented || !interactive) return;
      const rect = event.currentTarget.getBoundingClientRect();
      runtime.current?.pointer({ x: event.clientX - rect.left - event.currentTarget.clientLeft, y: event.clientY - rect.top - event.currentTarget.clientTop });
    }}
    onPointerLeave={event => { onPointerLeave?.(event); runtime.current?.pointer(null); }}
    onPointerCancel={event => { onPointerCancel?.(event); runtime.current?.pointer(null); }}
    onPointerUp={event => { onPointerUp?.(event); if (event.pointerType !== "mouse") runtime.current?.pointer(null); }}>
    <svg className="v-semantic-bloom__defs" aria-hidden="true" focusable="false"><defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={bloomNumber(softness, 12, 0, 20)} result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
        <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
        <feDisplacementMap in="goo" in2="noise" scale={bloomNumber(edgeTexture, 20, 0, 40)} xChannelSelector="R" yChannelSelector="G" />
        <feComposite in="SourceGraphic" operator="atop" />
      </filter>
    </defs></svg>
    <span data-slot="bloom-fallback" aria-hidden="true" />
    <canvas ref={canvas} aria-hidden="true" data-slot="bloom-canvas" style={{ filter: `url(#${id}) contrast(150%) brightness(100%)` }} />
    <div ref={wordmark} data-slot="bloom-wordmark">{text.split(/(\s+)/).map((word, index) => word.trim()
      ? <span key={index} data-bloom-word>{word}</span> : word)}</div>
  </div>;
}
