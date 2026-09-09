"use client";
import * as React from "react";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { boundedNumber } from "../lib/reference-effect-geometry";
import { cn } from "../lib/utils";

export type ScrollExpandProps = React.ComponentProps<"div"> & {
  /** Controlled 0–1 progress; omit to follow the document's native scroll. */
  progress?: number;
  startScale?: number;
  paused?: boolean;
};
export function ScrollExpand({ progress, startScale = .65, paused = false, children, className, ref, ...props }: ScrollExpandProps) {
  const host = React.useRef<HTMLDivElement>(null), frame = React.useRef<HTMLDivElement>(null);
  const { enabled, inView } = useMotionVisibility(host);
  const scale = boundedNumber(startScale, .65, .3, 1);
  React.useEffect(() => {
    const element = host.current, surface = frame.current;
    if (!element || !surface) return;
    let pending = 0;
    const paint = () => {
      pending = 0;
      const box = element.getBoundingClientRect();
      const p = !enabled ? 1 : boundedNumber(progress ?? (window.innerHeight * .9 - box.top) / Math.max(1, window.innerHeight * .65), 1, 0, 1);
      surface.style.transform = `scale(${scale + (1 - scale) * p})`;
      surface.style.borderRadius = `${28 - 12 * p}px`; element.dataset.progress = p.toFixed(3);
    };
    const schedule = () => { if (!paused && !pending) pending = requestAnimationFrame(paint); };
    paint();
    if (progress === undefined && enabled && inView && !paused) window.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule); observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(pending); window.removeEventListener("scroll", schedule); };
  }, [enabled, inView, paused, progress, scale]);
  return <div {...props} ref={React.useCallback((node: HTMLDivElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref])} data-slot="scroll-expand" data-running={enabled && inView && !paused ? "true" : "false"} className={cn("v-scroll-expand", className)}><div ref={frame} className="v-scroll-expand__surface">{children}</div></div>;
}
