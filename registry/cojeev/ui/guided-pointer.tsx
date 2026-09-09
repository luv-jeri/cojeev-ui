"use client";

import * as React from "react";
import { Icon } from "./icon";
import { cn } from "../lib/utils";
import { resolvePointerPoint, type GuidedPointerPoint } from "../lib/pointer-geometry";
import { createMotionLane, motionTokens } from "../motion/choreography";
import { useGuidanceMotion } from "../motion/use-guidance-motion";
import { assignMotionRef } from "../motion/refs";
export type { GuidedPointerPoint } from "../lib/pointer-geometry";
const bounded = (value: number, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export type GuidedPointerProps = Omit<React.ComponentProps<"div">, "children" | "role" | "tabIndex"> & {
  points: readonly GuidedPointerPoint[];
  /** Omit to use the first valid point. An unknown ID hides the pointer. */
  activeId?: string;
  /** Milliseconds per move, capped at two seconds. */
  duration?: number;
  /** Change to repeat a finite arrival cue at the current waypoint. */
  replayKey?: string | number;
  glyph?: "arrow" | "hand";
  /** Glyph size in pixels. Coordinates use the stage area minus this size. */
  size?: number;
};
type PointerEngine = { retarget: (point: GuidedPointerPoint, duration: number, animate: boolean, replay: boolean) => void; hide: () => void };
/** Decorative guidance; caller controls select waypoints and own all real actions. */
export function GuidedPointer({ points, activeId, duration = 640, replayKey = 0, glyph = "arrow", size = 28, className, style, ref, ...props }: GuidedPointerProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const mark = React.useRef<HTMLSpanElement>(null);
  const glyphHost = React.useRef<HTMLSpanElement>(null);
  const ring = React.useRef<HTMLSpanElement>(null);
  const engine = React.useRef<PointerEngine | null>(null);
  const attach = React.useCallback((node: HTMLDivElement | null) => { host.current = node; return assignMotionRef(ref, node); }, [ref]);
  const { quiet, enabled, inView } = useGuidanceMotion(host);
  const target = resolvePointerPoint(points, activeId);
  const safeSize = bounded(size, 28, 12, 64);
  const travelTime = bounded(duration, 640, 0, 2000);
  const request = JSON.stringify([target?.id, target?.x, target?.y, target?.click, target?.pressed, replayKey]);
  const targetId = target?.id, targetX = target?.x, targetY = target?.y, targetClick = target?.click, targetPressed = target?.pressed;
  const consumed = React.useRef("");

  React.useEffect(() => {
    const element = host.current, marker = mark.current, icon = glyphHost.current, halo = ring.current;
    if (!element || !marker || !icon || !halo) return;
    let current = { x: 0, y: 0 }, start = current, destination = current;
    let first = true, pressure = 1, pulse = 1;
    const paintPosition = () => {
      marker.style.transform = `translate3d(${current.x * Math.max(0, element.clientWidth - safeSize)}px, ${current.y * Math.max(0, element.clientHeight - safeSize)}px, 0)`;
      marker.dataset.x = String(current.x); marker.dataset.y = String(current.y);
    };
    const paintFeedback = () => {
      const tap = Math.sin(Math.PI * Math.min(1, pulse / .42));
      icon.style.transform = `scale(${pressure * (1 - .09 * tap)})`;
      halo.style.opacity = String(pulse >= 1 ? 0 : .44 * Math.sin(Math.PI * pulse));
      halo.style.transform = `translate(-50%, -50%) scale(${.45 + pulse * 1.3})`;
    };
    const travel = createMotionLane(1, progress => { current = { x: start.x + (destination.x - start.x) * progress, y: start.y + (destination.y - start.y) * progress }; paintPosition(); });
    const press = createMotionLane(1, value => { pressure = value; paintFeedback(); });
    const arrival = createMotionLane(1, value => { pulse = value; paintFeedback(); });
    const resize = new ResizeObserver(paintPosition); resize.observe(element);
    engine.current = {
      hide() { travel.stop(); arrival.jump(1); press.jump(1); marker.style.visibility = "hidden"; element.dataset.state = "empty"; first = true; },
      retarget(point, milliseconds, animate, replay) {
        marker.style.visibility = "visible";
        arrival.jump(1);
        start = first ? point : current; destination = point; first = false;
        press.to(point.pressed ? .92 : 1, { duration: animate ? motionTokens.duration.quick : 0, ease: [...motionTokens.ease.settle] });
        const finish = () => {
          if (animate && replay && point.click) {
            element.dataset.state = "pulsing";
            arrival.jump(0); arrival.to(1, { duration: .54, ease: "linear" }, () => { element.dataset.state = "still"; });
          } else element.dataset.state = "still";
        };
        if (!animate || milliseconds === 0) { current = point; start = point; travel.jump(1); finish(); return; }
        element.dataset.state = "moving";
        travel.jump(0); travel.to(1, { duration: milliseconds / 1000, ease: [...motionTokens.ease.enter] }, finish);
      },
    };
    return () => { resize.disconnect(); travel.dispose(); press.dispose(); arrival.dispose(); engine.current = null; };
  }, [safeSize]);
  React.useEffect(() => {
    const driver = engine.current;
    if (!driver) return;
    if (targetId === undefined || targetX === undefined || targetY === undefined) { driver.hide(); consumed.current = request; return; }
    const animate = !quiet && enabled && inView;
    const replay = animate && consumed.current !== request;
    consumed.current = request;
    driver.retarget({ id: targetId, x: targetX, y: targetY, click: targetClick, pressed: targetPressed }, travelTime, replay, replay);
  }, [request, targetId, targetX, targetY, targetClick, targetPressed, enabled, inView, quiet, travelTime, safeSize]);
  return <div {...props} ref={attach} aria-hidden="true" inert data-slot="guided-pointer" data-glyph={glyph} data-quiet={quiet || undefined} className={cn("v-guided-pointer", className)} style={{ ...style, "--guided-pointer-size": `${safeSize}px`, pointerEvents: "none" } as React.CSSProperties}>
    <span ref={mark} data-slot="guided-pointer-position" className="v-guided-pointer__position" style={{ visibility: target ? "visible" : "hidden" }}>
      <span ref={ring} data-slot="guided-pointer-ring" className="v-guided-pointer__ring" />
      <span ref={glyphHost} data-slot="guided-pointer-glyph" className="v-guided-pointer__glyph"><Icon name={glyph === "hand" ? "pointer" : "mouse-pointer-2"} feedback={false} /></span>
    </span>
  </div>;
}
