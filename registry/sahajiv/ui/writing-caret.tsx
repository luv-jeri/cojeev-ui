"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { createMotionLane } from "../motion/choreography";
import { useGuidanceMotion } from "../motion/use-guidance-motion";
import { assignMotionRef } from "../motion/refs";

const bounded = (value: number, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
export type WritingCaretProps = Omit<React.ComponentProps<"span">, "children" | "role" | "tabIndex"> & {
  active?: boolean;
  /** At most six cycles; zero leaves a still mark. */
  blinkCount?: number;
  /** Milliseconds per cycle. Total motion is bounded to six seconds. */
  duration?: number;
  replayKey?: string | number;
  /** An explicit opacity disables blinking. */
  opacity?: number;
};

/** A decorative writing mark. Real editable controls keep their browser caret. */
export function WritingCaret({ active = false, blinkCount = 3, duration = 880, replayKey = 0, opacity, className, style, ref, ...props }: WritingCaretProps) {
  const host = React.useRef<HTMLSpanElement>(null);
  const attach = React.useCallback((node: HTMLSpanElement | null) => { host.current = node; return assignMotionRef(ref, node); }, [ref]);
  const { quiet, enabled, inView } = useGuidanceMotion(host);
  const consumed = React.useRef("");
  const count = Math.floor(bounded(blinkCount, 3, 0, 6));
  const cycle = bounded(duration, 880, 0, 2000);
  const overridden = opacity !== undefined || style?.opacity !== undefined;
  const request = JSON.stringify([active, count, cycle, replayKey, overridden]);
  React.useEffect(() => {
    const element = host.current;
    if (!element) return;
    const paint = (value: number) => { element.style.setProperty("--writing-caret-opacity", String(value)); };
    paint(1);
    element.dataset.animating = "false";
    if (!active || overridden || count === 0 || cycle === 0 || quiet || !enabled) { consumed.current = request; return; }
    if (!inView || consumed.current === request) return;
    consumed.current = request;
    const lane = createMotionLane(0, progress => paint(progress >= count ? 1 : Math.floor(progress * 2) % 2 === 0 ? 1 : 0));
    element.dataset.animating = "true";
    lane.to(count, { duration: Math.min(6000, count * cycle) / 1000, ease: "linear" }, () => { paint(1); element.dataset.animating = "false"; });
    return () => { lane.dispose(); paint(1); element.dataset.animating = "false"; };
  }, [active, count, cycle, enabled, inView, overridden, quiet, request]);
  return <span {...props} ref={attach} aria-hidden="true" data-slot="writing-caret" data-quiet={quiet || undefined} className={cn("v-writing-caret", className)} style={{ ...style, opacity: opacity === undefined ? style?.opacity ?? "var(--writing-caret-resolved-opacity, var(--writing-caret-opacity, 1))" : bounded(opacity, 1, 0, 1), pointerEvents: "none" }} />;
}
