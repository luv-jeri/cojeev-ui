"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { textRibbonPath, ribbonCopies, ribbonPeriod, advanceRibbonPhase, moveRibbonPhase, type TextRibbonShape } from "../lib/text-ribbon-path";
import { useGuidanceMotion } from "../motion/use-guidance-motion";
import { assignMotionRef } from "../motion/refs";

export type TextRibbonDirection = "forward" | "backward";

export type TextRibbonProps = Omit<React.ComponentProps<"div">, "children"> & {
  text: string;
  shape?: TextRibbonShape;
  /** Automatic movement is opt-in. Pair it with a visible pause control. */
  auto?: boolean;
  paused?: boolean;
  /** SVG units per second, bounded to 0–120. */
  speed?: number;
  /** Supply direction/onDirectionChange to control direction after dragging. */
  direction?: TextRibbonDirection;
  onDirectionChange?: (direction: TextRibbonDirection) => void;
  /** Wave and arch curvature, from a straight path (0) to the full curve (1). */
  curvature?: number;
  hoverBehavior?: "pause" | "slow" | "quicken" | "none";
  /** Horizontal drag, arrow keys and Home directly position the ribbon. */
  draggable?: boolean;
  /** Size in the 640 × 280 SVG, bounded to 24–56. The entire ribbon scales responsively. */
  fontSize?: number;
  separator?: string;
  guide?: boolean;
  tone?: "ink" | "pink" | "olive" | "blue" | "yellow";
};

/** A measured typographic path. Repeated glyphs are decorative; the actual phrase is read once. */
export function TextRibbon({ text, shape = "wave", auto = false, paused = false, speed = 28,
  direction, onDirectionChange, curvature = 1, hoverBehavior = "pause", draggable = false,
  fontSize = 40, separator = " · ", guide = true, tone = "ink",
  className, ref, onPointerEnter, onPointerLeave, onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
  onLostPointerCapture, onKeyDown, onFocusCapture, onBlurCapture, style, ...props }: TextRibbonProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const path = React.useRef<SVGPathElement>(null);
  const sample = React.useRef<SVGTextElement>(null);
  const textPath = React.useRef<SVGTextPathElement>(null);
  const phase = React.useRef(0);
  const velocity = React.useRef(0);
  const drag = React.useRef<{ id: number; x: number; y: number; distance: number; claimed: boolean } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [localDirection, setLocalDirection] = React.useState<TextRibbonDirection>("forward");
  const [measure, setMeasure] = React.useState({ unit: 0, count: 1 });
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const { quiet, enabled, inView } = useGuidanceMotion(host);
  const attach = React.useCallback((node: HTMLDivElement | null) => { host.current = node; return assignMotionRef(ref, node); }, [ref]);
  const id = `ribbon-${React.useId().replace(/:/g, "")}`;
  const size = Number.isFinite(fontSize) ? Math.min(56, Math.max(24, fontSize)) : 40;
  const pace = Number.isFinite(speed) ? Math.min(120, Math.max(0, speed)) : 28;
  const content = text.trim() ? text + separator : "";
  const heading = direction ?? localDirection;
  if (dragging && (!draggable || !inView)) setDragging(false);
  const running = auto && !paused && !(hovered && hoverBehavior === "pause") && !focused && !dragging && !quiet && enabled && inView && measure.unit > 0 && pace > 0;
  const targetSpeed = Math.min(120, pace * (hovered ? hoverBehavior === "slow" ? .25 : hoverBehavior === "quicken" ? 2 : 1 : 1)) * (heading === "forward" ? 1 : -1);
  const targetVelocity = React.useRef(targetSpeed);
  React.useEffect(() => { targetVelocity.current = targetSpeed; }, [targetSpeed]);
  const changeDirection = (next: TextRibbonDirection) => {
    if (direction === undefined) setLocalDirection(next);
    if (next !== heading) onDirectionChange?.(next);
  };
  const move = (distance: number) => {
    phase.current = moveRibbonPhase(phase.current, distance, measure.unit);
    textPath.current?.setAttribute("startOffset", String(-phase.current));
  };
  const finishDrag = (cancelled = false) => {
    const gesture = drag.current;
    drag.current = null;
    setDragging(false);
    if (!cancelled && gesture && Math.abs(gesture.distance) > 2) changeDirection(gesture.distance < 0 ? "forward" : "backward");
    if (gesture && host.current?.hasPointerCapture(gesture.id)) host.current.releasePointerCapture(gesture.id);
  };
  React.useEffect(() => {
    if (!draggable || !inView) {
      const gesture = drag.current;
      drag.current = null;
      if (gesture && host.current?.hasPointerCapture(gesture.id)) host.current.releasePointerCapture(gesture.id);
    }
  }, [draggable, inView]);
  React.useEffect(() => {
    const cancel = () => {
      const gesture = drag.current;
      drag.current = null; setDragging(false);
      if (gesture && host.current?.hasPointerCapture(gesture.id)) host.current.releasePointerCapture(gesture.id);
    };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  React.useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let frame = 0;
    const read = () => {
      frame = 0;
      if (disposed || !sample.current || !path.current) return;
      const natural = sample.current.getComputedTextLength();
      const length = path.current.getTotalLength();
      const unit = ribbonPeriod(length, natural, shape === "loop" || shape === "figure-eight" || shape === "circle");
      if (unit > 0 && length > 0) {
        phase.current = phase.current % unit;
        textPath.current?.setAttribute("startOffset", String(-phase.current));
      }
      const count = ribbonCopies(length, unit);
      setMeasure(old => old.unit === unit && old.count === count ? old : { unit, count });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    document.fonts.ready.then(() => { if (!disposed) schedule(); });
    document.fonts.addEventListener("loadingdone", schedule);
    return () => { disposed = true; if (frame) cancelAnimationFrame(frame); resize.disconnect(); document.fonts.removeEventListener("loadingdone", schedule); };
  }, [content, shape, size, curvature]);

  React.useEffect(() => {
    if (!running || !textPath.current) { velocity.current = 0; return; }
    let frame = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      const elapsed = previous === undefined ? 0 : (now - previous) / 1000;
      previous = now;
      velocity.current += (targetVelocity.current - velocity.current) * (1 - Math.exp(-Math.min(.05, elapsed) * 7));
      phase.current = advanceRibbonPhase(phase.current, elapsed, velocity.current, measure.unit);
      textPath.current?.setAttribute("startOffset", String(-phase.current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, measure.unit]);

  return <div {...props} ref={attach}
    role={props.role ?? (draggable ? "group" : undefined)} tabIndex={props.tabIndex ?? (draggable ? 0 : undefined)}
    aria-label={props["aria-label"] ?? (draggable ? "Move text ribbon" : undefined)}
    aria-keyshortcuts={draggable ? "ArrowLeft ArrowRight Home" : undefined}
    data-slot="text-ribbon" data-shape={shape} data-tone={tone} data-running={running} data-draggable={draggable || undefined} data-dragging={dragging || undefined} data-direction={heading}
    className={cn("v-text-ribbon", className)} style={{ ...style, "--ribbon-size": `${size}px` } as React.CSSProperties}
    onPointerEnter={event => { onPointerEnter?.(event); if (!event.defaultPrevented && event.pointerType !== "touch") setHovered(true); }}
    onPointerLeave={event => { onPointerLeave?.(event); setHovered(false); }}
    onPointerDown={event => {
      onPointerDown?.(event);
      if (event.defaultPrevented || !draggable || !content || !event.isPrimary || event.button !== 0 || drag.current) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, claimed: event.pointerType !== "touch" };
      event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
    }}
    onPointerMove={event => {
      onPointerMove?.(event);
      const gesture = drag.current;
      if (!gesture || gesture.id !== event.pointerId || event.defaultPrevented) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (!gesture.claimed) {
        if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) { finishDrag(true); return; }
        if (Math.abs(dx) < 6) return;
        gesture.claimed = true;
      }
      const units = shape === "circle" ? 280 : 640;
      move(-dx * units / Math.max(1, event.currentTarget.getBoundingClientRect().width));
      gesture.x = event.clientX; gesture.y = event.clientY; gesture.distance += dx;
    }}
    onPointerUp={event => { onPointerUp?.(event); if (drag.current?.id === event.pointerId) finishDrag(event.defaultPrevented); }}
    onPointerCancel={event => { onPointerCancel?.(event); finishDrag(true); }}
    onLostPointerCapture={event => { onLostPointerCapture?.(event); if (drag.current?.id === event.pointerId) finishDrag(true); }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !draggable || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); const forward = event.key === "ArrowLeft";
        move(size * (event.shiftKey ? 2 : 1) * (forward ? 1 : -1)); changeDirection(forward ? "forward" : "backward");
      } else if (event.key === "Home") { event.preventDefault(); move(-phase.current); }
    }}
    onFocusCapture={event => { onFocusCapture?.(event); setFocused(true); }}
    onBlurCapture={event => { onBlurCapture?.(event); if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <span className="v-text-ribbon__accessible">{text}</span>
    <svg viewBox={shape === "circle" ? "180 0 280 280" : "0 0 640 280"} aria-hidden="true" focusable="false">
      <defs><path id={id} ref={path} d={textRibbonPath(shape, curvature)} /></defs>
      {guide && <use href={`#${id}`} className="v-text-ribbon__guide" />}
      <text ref={sample} className="v-text-ribbon__sample" xmlSpace="preserve">{content}</text>
      <text className="v-text-ribbon__words" xmlSpace="preserve" textLength={measure.unit > 0 ? measure.unit * measure.count : undefined} lengthAdjust="spacingAndGlyphs">
        <textPath ref={textPath} href={`#${id}`} startOffset="0">{content.repeat(measure.count)}</textPath>
      </text>
    </svg>
  </div>;
}
