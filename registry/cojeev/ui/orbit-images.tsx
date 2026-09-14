"use client";
/* eslint-disable @next/next/no-img-element -- This installable React source must work outside Next.js. */
import * as React from "react";
import { frame, cancelFrame } from "motion";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { boundedNumber, orbitPoint } from "../lib/reference-effect-geometry";
import { cn } from "../lib/utils";
export type OrbitImage = { src: string; alt: string };
export type OrbitImagesProps = React.ComponentProps<"div"> & { images: readonly OrbitImage[]; paused?: boolean; duration?: number; reverse?: boolean };
export function OrbitImages({ images, children, paused = false, duration = 24, reverse = false, className, ref, ...props }: OrbitImagesProps) {
  const host = React.useRef<HTMLDivElement>(null), phase = React.useRef(0);
  const { enabled, inView } = useMotionVisibility(host);
  const running = enabled && inView && !paused && images.length > 1;
  const cycle = boundedNumber(duration, 24, 6, 120);
  const imageKey = JSON.stringify(images.slice(0, 12).map(image => image.src));
  React.useEffect(() => {
    const element = host.current;
    if (!element) return;
    const items = Array.from(element.querySelectorAll<HTMLElement>("[data-orbit-item]"));
    const paint = () => items.forEach((item, i) => { const p = orbitPoint(phase.current + i / items.length, element.clientWidth, element.clientHeight); item.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`; });
    const observer = new ResizeObserver(paint); observer.observe(element); paint();
    const tick = ({ delta }: { delta: number }) => { phase.current = (phase.current + Math.min(delta, 33) / (cycle * 1000) * (reverse ? -1 : 1)) % 1; paint(); };
    if (running) frame.update(tick, true);
    return () => { cancelFrame(tick); observer.disconnect(); };
  }, [running, cycle, reverse, images.length, imageKey]);
  return <div {...props} ref={React.useCallback((node: HTMLDivElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref])} data-slot="orbit-images" data-running={running ? "true" : "false"} className={cn("v-orbit-images", className)}><div className="v-orbit-images__center">{children}</div>{images.slice(0, 12).map((image, i) => <img data-orbit-item="" key={`${i}:${image.src}`} src={image.src} alt={image.alt} className="v-orbit-images__image" />)}</div>;
}
