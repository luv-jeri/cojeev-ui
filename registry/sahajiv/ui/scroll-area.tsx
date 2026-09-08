"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-scroll-area";
import { motionTokens, useChoreography } from "../motion/choreography";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { acquirePageScrollbar, pageScrollGeometry, scrollThumbPath } from "../motion/scroll-thumb";
import { assignMotionRef } from "../motion/refs";

export const scrollAreaVariants = cva("v-scroll", {
  variants: { variant: { default: "", ink: "-ink" } },
  defaultVariants: { variant: "default" },
});
export type ScrollAreaProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof scrollAreaVariants> & {
    viewportClassName?: string;
    /** Native viewport attributes, including a ref, scroll listener or accessible name. */
    viewportProps?: React.ComponentProps<typeof Primitive.Viewport>;
  };
export function ScrollArea({ className, variant, children, viewportClassName, viewportProps, type = "auto", ...props }: ScrollAreaProps) {
  return (
    <Primitive.Root data-slot="scroll-area" data-part="root" type={type} className={cn(scrollAreaVariants({ variant }), className)} {...props}>
      <Primitive.Viewport
        data-slot="scroll-area-viewport"
        data-part="viewport"
        tabIndex={0}
        role="region"
        aria-label={props["aria-label"] ?? "Scrollable content"}
        {...viewportProps}
        className={cn("v-scroll__viewport", viewportClassName, viewportProps?.className)}
      >
        {children}
      </Primitive.Viewport>
      <ScrollBar />
      <Primitive.Corner data-slot="scroll-area-corner" />
    </Primitive.Root>
  );
}
export type ScrollBarProps = React.ComponentProps<typeof Primitive.Scrollbar>;
export function ScrollBar({
  className,
  ref,
  orientation = "vertical",
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ...props
}: ScrollBarProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const [mountedElement, setMountedElement] = React.useState<HTMLDivElement | null>(null);
  const hostRef = React.useCallback((element: HTMLDivElement | null) => {
    host.current = element;
    setMountedElement(element);
    const release = assignMotionRef(ref, element);
    return () => { host.current = null; setMountedElement(null); release(); };
  }, [ref]);
  const thumb = React.useRef<HTMLDivElement>(null);
  const { quiet } = useChoreography();
  const { enabled, inView } = useMotionVisibility(host, mountedElement);
  const target = useMotionValue(0);
  const pointer = useMotionValue(0);
  const engagement = useSpring(target, motionTokens.spring.responsive);
  const bend = useSpring(pointer, motionTokens.spring.gentle);
  const contour = useTransform([engagement, bend], values => scrollThumbPath(values[0] as number, values[1] as number));
  const [dragging, setDragging] = React.useState(false);
  const hovered = React.useRef(false);
  const active = !quiet && enabled && inView;
  React.useEffect(() => {
    if (!active) {
      engagement.jump(0);
      bend.jump(0);
    } else target.set(dragging ? 1 : hovered.current ? .65 : 0);
  }, [active, dragging, target, engagement, bend]);
  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active || !thumb.current) return;
    const rect = thumb.current.getBoundingClientRect();
    const offset = orientation === "vertical" ? event.clientY - rect.top : event.clientX - rect.left;
    const length = orientation === "vertical" ? rect.height : rect.width;
    pointer.set(Math.max(-1, Math.min(1, offset / Math.max(1, length) * 2 - 1)));
  };
  const release = () => {
    setDragging(false);
    if (active) target.set(hovered.current ? .65 : 0);
    pointer.set(0);
  };
  return (
    <Primitive.Scrollbar
      ref={hostRef}
      data-slot="scroll-area-scrollbar"
      data-dragging={dragging ? "true" : undefined}
      data-motion={active ? "on" : "off"}
      orientation={orientation}
      className={cn("v-scroll__bar", className)}
      {...props}
      onPointerEnter={event => { onPointerEnter?.(event); hovered.current = true; if (active) target.set(dragging ? 1 : .65); point(event); }}
      onPointerLeave={event => { onPointerLeave?.(event); hovered.current = false; if (!dragging) { target.set(0); pointer.set(0); } }}
      onPointerDown={event => { onPointerDown?.(event); if (event.defaultPrevented || event.button !== 0) return; setDragging(true); if (active) target.set(1); point(event); }}
      onPointerMove={event => { onPointerMove?.(event); point(event); }}
      onPointerUp={event => { onPointerUp?.(event); release(); }}
      onPointerCancel={event => { onPointerCancel?.(event); release(); }}
      onLostPointerCapture={event => { onLostPointerCapture?.(event); release(); }}
    >
      <Primitive.Thumb ref={thumb} data-slot="scroll-area-thumb" data-part="thumb" className="v-scroll__thumb">
        <svg className="v-scroll__contour" viewBox={orientation === "vertical" ? "0 0 20 100" : "0 0 100 20"} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <motion.path d={contour} transform={orientation === "horizontal" ? "matrix(0 1 1 0 0 0)" : undefined} />
        </svg>
      </Primitive.Thumb>
    </Primitive.Scrollbar>
  );
}

export type PageScrollBarProps = React.ComponentProps<"div">;
/** Mount once near the application root. The document remains the scroll owner. */
export function PageScrollBar({ className, ref, onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, ...props }: PageScrollBarProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const externalRef = React.useCallback((element: HTMLDivElement | null) => {
    host.current = element;
    const release = assignMotionRef(ref, element);
    return () => { host.current = null; release(); };
  }, [ref]);
  const generatedId = `page-scroll-${React.useId().replace(/:/g, "")}`;
  const [controlledId, setControlledId] = React.useState(generatedId);
  const [metrics, setMetrics] = React.useState({ maxScroll: 0, thumbSize: 0, thumbOffset: 0, travel: 0, scrollTop: 0, viewport: 0 });
  const metricsRef = React.useRef(metrics);
  const drag = React.useRef<{ pointerId: number; grabOffset: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const hovered = React.useRef(false);
  const { quiet } = useChoreography();
  const { enabled, inView } = useMotionVisibility(host);
  const target = useMotionValue(0), pointer = useMotionValue(0);
  const engagement = useSpring(target, motionTokens.spring.responsive);
  const bend = useSpring(pointer, motionTokens.spring.gentle);
  const contour = useTransform([engagement, bend], values => scrollThumbPath(values[0] as number, values[1] as number));
  const active = !quiet && enabled && inView;
  React.useEffect(() => {
    if (!active) { engagement.jump(0); bend.jump(0); }
    else target.set(dragging ? 1 : hovered.current ? .65 : 0);
  }, [active, dragging, engagement, bend, target]);
  React.useEffect(() => {
    const rail = host.current, documentElement = document.documentElement;
    if (!rail) return;
    const owner = document.scrollingElement ?? documentElement;
    const previousId = owner.getAttribute("id");
    if (!previousId) owner.setAttribute("id", generatedId);
    setControlledId(previousId || generatedId);
    const restoreNativeScrollbar = acquirePageScrollbar(documentElement);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = {
        ...pageScrollGeometry(owner.scrollHeight, owner.clientHeight, rail.getBoundingClientRect().height, owner.scrollTop),
        scrollTop: owner.scrollTop, viewport: owner.clientHeight,
      };
      metricsRef.current = next;
      setMetrics(old => Object.keys(next).every(key => next[key as keyof typeof next] === old[key as keyof typeof old]) ? old : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const resize = new ResizeObserver(schedule);
    resize.observe(documentElement);
    resize.observe(rail);
    if (document.body) resize.observe(document.body);
    const content = new MutationObserver(schedule);
    content.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect(); content.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      if (!previousId && owner.id === generatedId) owner.removeAttribute("id");
      restoreNativeScrollbar();
    };
  }, [generatedId]);
  const scrollTo = (top: number) => {
    const owner = document.scrollingElement ?? document.documentElement;
    owner.scrollTo({ top: Math.max(0, Math.min(metricsRef.current.maxScroll, top)), behavior: "instant" });
  };
  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active || !host.current) return;
    const relative = event.clientY - host.current.getBoundingClientRect().top - metricsRef.current.thumbOffset;
    pointer.set(Math.max(-1, Math.min(1, relative / Math.max(1, metricsRef.current.thumbSize) * 2 - 1)));
  };
  const move = (clientY: number) => {
    if (!drag.current || !host.current) return;
    const { travel, maxScroll } = metricsRef.current;
    const position = clientY - host.current.getBoundingClientRect().top - drag.current.grabOffset;
    scrollTo(travel > 0 ? position / travel * maxScroll : 0);
  };
  const release = () => {
    drag.current = null; setDragging(false);
    if (active) target.set(hovered.current ? .65 : 0);
    pointer.set(0);
  };
  return (
    <div
      {...props}
      ref={externalRef}
      data-slot="page-scrollbar"
      data-overflow={metrics.maxScroll > 0 ? "true" : "false"}
      data-dragging={dragging ? "true" : undefined}
      data-motion={active ? "on" : "off"}
      role="scrollbar"
      aria-label={props["aria-label"] ?? "Page scroll position"}
      aria-controls={controlledId}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={Math.round(metrics.maxScroll)}
      aria-valuenow={Math.round(Math.max(0, Math.min(metrics.maxScroll, metrics.scrollTop)))}
      aria-hidden={metrics.maxScroll <= 0 || undefined}
      tabIndex={metrics.maxScroll > 0 ? 0 : -1}
      className={cn("v-page-scrollbar", className)}
      onPointerEnter={event => { hovered.current = true; if (active) target.set(dragging ? 1 : .65); point(event); props.onPointerEnter?.(event); }}
      onPointerLeave={event => { hovered.current = false; if (!dragging) { target.set(0); pointer.set(0); } props.onPointerLeave?.(event); }}
      onPointerDown={event => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0 || metrics.maxScroll <= 0) return;
        const relative = event.clientY - event.currentTarget.getBoundingClientRect().top - metrics.thumbOffset;
        const onThumb = event.target instanceof Element && !!event.target.closest('[data-slot="page-scrollbar-thumb"]');
        drag.current = { pointerId: event.pointerId, grabOffset: onThumb ? relative : metrics.thumbSize / 2 };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        setDragging(true); if (active) target.set(1); move(event.clientY); point(event);
      }}
      onPointerMove={event => { onPointerMove?.(event); if (drag.current?.pointerId === event.pointerId) move(event.clientY); point(event); }}
      onPointerUp={event => { onPointerUp?.(event); release(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={event => { onPointerCancel?.(event); release(); }}
      onLostPointerCapture={event => { onLostPointerCapture?.(event); release(); }}
      onKeyDown={event => {
        onKeyDown?.(event); if (event.defaultPrevented) return;
        const { scrollTop, viewport, maxScroll } = metricsRef.current;
        const targets: Record<string, number> = { ArrowDown: scrollTop + 48, ArrowUp: scrollTop - 48, PageDown: scrollTop + viewport * .9, PageUp: scrollTop - viewport * .9, Home: 0, End: maxScroll, " ": scrollTop + viewport * .9 * (event.shiftKey ? -1 : 1) };
        if (event.key in targets) { event.preventDefault(); scrollTo(targets[event.key]); }
      }}
    >
      <div data-slot="page-scrollbar-thumb" style={{ height: metrics.thumbSize, transform: `translateY(${metrics.thumbOffset}px)` }}>
        <svg viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><motion.path d={contour} /></svg>
      </div>
    </div>
  );
}
