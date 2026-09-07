"use client";

import * as React from "react";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Button } from "@/registry/sahajiv/ui/button";
import { Meta } from "@/registry/sahajiv/ui/typography";
import { useReducedMotion } from "@/registry/sahajiv/motion/use-reduced-motion";
import { getSettingsSnapshot, getServerSettingsSnapshot, subscribeSettings } from "@/registry/sahajiv/motion/settings";

export type MarqueeDirection = "left" | "right";
export type MarqueeSpeed = "slow" | "normal" | "fast";
export type MarqueeProps = React.ComponentProps<"section"> & {
  direction?: MarqueeDirection;
  speed?: MarqueeSpeed;
  label?: string;
  paused?: boolean;
  defaultPaused?: boolean;
  onPausedChange?: (paused: boolean) => void;
};

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const visibleSnapshot = () => document.visibilityState === "visible";
const hiddenSnapshot = () => false;

/** One semantic list; its inert visual copy has no React effects or duplicate IDs. */
export function Marquee({
  children,
  direction = "left",
  speed = "slow",
  label = "Highlights",
  paused,
  defaultPaused = false,
  onPausedChange,
  className,
  ref,
  onPointerEnter,
  onPointerLeave,
  onFocusCapture,
  onBlurCapture,
  ...props
}: MarqueeProps) {
  const root = React.useRef<HTMLElement>(null);
  const viewport = React.useRef<HTMLDivElement>(null);
  const source = React.useRef<HTMLUListElement>(null);
  const copy = React.useRef<HTMLUListElement>(null);
  const [inView, setInView] = React.useState(false);
  const [localPaused, setLocalPaused] = React.useState(defaultPaused);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [contentFocused, setContentFocused] = React.useState(false);
  const id = React.useId();
  const manuallyPaused = paused ?? localPaused;
  const visible = React.useSyncExternalStore(subscribeVisibility, visibleSnapshot, hiddenSnapshot);
  const { motion } = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);
  const reduced = useReducedMotion();
  const quiet = reduced || motion.mode === "off";
  const running = inView && visible && !quiet && !manuallyPaused && !hovered && !focused;

  React.useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const list = source.current, duplicate = copy.current, windowElement = viewport.current, element = root.current;
    if (!list || !duplicate || !windowElement || !element) return;
    const mirror = () => {
      const nodes = Array.from(list.children, (child) => child.cloneNode(true) as HTMLElement);
      for (const node of nodes) {
        for (const part of [node, ...node.querySelectorAll<HTMLElement>("*")]) {
          for (const attribute of ["id", "name", "for", "form", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns"]) part.removeAttribute(attribute);
          if (part.matches("a,button,input,select,textarea,[tabindex],[contenteditable]")) part.tabIndex = -1;
        }
      }
      duplicate.replaceChildren(...nodes);
      element.dataset.ready = "true";
    };
    const measure = () => element.style.setProperty("--marquee-viewport", `${windowElement.clientWidth}px`);
    mirror();
    measure();
    // Text/content changes matter; per-frame SVG geometry attributes do not.
    const mutation = new MutationObserver(mirror);
    mutation.observe(list, { childList: true, characterData: true, subtree: true });
    const resize = new ResizeObserver(measure);
    resize.observe(windowElement);
    return () => { mutation.disconnect(); resize.disconnect(); duplicate.replaceChildren(); delete element.dataset.ready; };
  }, [children]);

  const status = reduced ? "Reduced motion" : motion.mode === "off" ? "Motion is off" : manuallyPaused ? "Paused" : focused ? "Paused while focused" : hovered ? "Paused while hovered" : running ? "Moving" : "Paused";
  return (
    <section
      {...props}
      ref={(element) => {
        root.current = element;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
      }}
      data-slot="marquee"
      data-direction={direction}
      data-speed={speed}
      data-motion={quiet ? "static" : running ? "running" : "paused"}
      data-content-focused={contentFocused || undefined}
      aria-labelledby={props["aria-labelledby"] ?? (props["aria-label"] ? undefined : `${id}-label`)}
      className={cn("v-marquee", className)}
      onPointerEnter={(event) => { onPointerEnter?.(event); if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={(event) => { onPointerLeave?.(event); setHovered(false); }}
      onFocusCapture={(event) => { onFocusCapture?.(event); setFocused(true); setContentFocused(!!source.current?.contains(event.target)); }}
      onBlurCapture={(event) => {
        onBlurCapture?.(event);
        const next = event.relatedTarget;
        setFocused(next instanceof Node && event.currentTarget.contains(next));
        setContentFocused(next instanceof Node && !!source.current?.contains(next));
      }}
    >
      <div data-slot="marquee-header">
        <Meta as="span" id={`${id}-label`}>{label}</Meta>
        <div data-slot="marquee-controls">
          <Meta as="span" data-slot="marquee-status" role="status">{status}</Meta>
          <Button
            size="sm"
            variant="ghost"
            disabled={quiet}
            aria-controls={`${id}-viewport`}
            onClick={() => {
              if (paused === undefined) setLocalPaused(!manuallyPaused);
              onPausedChange?.(!manuallyPaused);
            }}
          >
            {quiet ? "Motion paused" : manuallyPaused ? "Resume motion" : "Pause motion"}
          </Button>
        </div>
      </div>
      <div ref={viewport} data-slot="marquee-viewport" id={`${id}-viewport`}>
        <div data-slot="marquee-track">
          <ul ref={source} data-slot="marquee-content">
            {React.Children.toArray(children).map((child, index) => <li key={React.isValidElement(child) ? child.key ?? index : index}>{child}</li>)}
          </ul>
          <ul ref={copy} data-slot="marquee-copy" aria-hidden="true" inert />
        </div>
      </div>
    </section>
  );
}
