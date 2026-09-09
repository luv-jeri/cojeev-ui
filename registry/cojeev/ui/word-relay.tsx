"use client";

import * as React from "react";
import type { Transition } from "motion";
import { cn } from "../lib/utils";
import { createMotionLane, motionTokens } from "../motion/choreography";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { relayIndex, relayRank, relayTiming, type RelayOrder } from "../lib/text-relay";

export type WordRelayHandle = { next: () => void; previous: () => void; jumpTo: (index: number) => void; reset: () => void };

export type WordRelayProps = Omit<React.ComponentProps<"span">, "children"> & {
  words: readonly string[];
  /** A controlled index. Omit for the internal timer. */
  index?: number;
  defaultIndex?: number;
  /** Opt in to automatic changes and provide a nearby pause control. */
  auto?: boolean;
  /** When false, automatic and manual navigation stop at the first/last phrase. */
  loop?: boolean;
  paused?: boolean;
  interval?: number;
  duration?: number;
  split?: "phrase" | "word" | "grapheme";
  /** Milliseconds between units, compressed to a maximum 500ms stagger window. */
  stagger?: number;
  staggerFrom?: RelayOrder;
  direction?: "up" | "down";
  /** Keeps the normal ref pointing to the span; navigation has its own optional ref. */
  controlsRef?: React.Ref<WordRelayHandle>;
  tone?: "inherit" | "pink" | "olive" | "blue" | "yellow";
  onIndexChange?: (index: number) => void;
};

/** A quiet exchange of phrases. All candidates reserve one shared, wrapping footprint. */
export function WordRelay({ words, index, defaultIndex = 0, auto = false, loop = true, paused = false, interval = 3000, duration = 650, split = "phrase", stagger = 24, staggerFrom = "first", direction = "up", controlsRef, tone = "pink", onIndexChange, className, ref, onPointerEnter, onPointerLeave, onFocusCapture, onBlurCapture, ...props }: WordRelayProps) {
  const host = React.useRef<HTMLSpanElement>(null);
  const [internal, setInternal] = React.useState(defaultIndex);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const { enabled, inView } = useMotionVisibility(host);
  const current = relayIndex(index ?? internal, words.length);
  type Lane = ReturnType<typeof createMotionLane>;
  const lanes = React.useRef<{ phrase: number; unit: number; count: number; opacity: Lane; y: Lane }[]>([]);
  const callbacks = React.useRef({ onIndexChange });
  React.useLayoutEffect(() => { callbacks.current = { onIndexChange }; });
  const running = auto && !paused && !hovered && !focused && enabled && inView && words.length > 1 && (loop || current < words.length - 1);
  const contentKey = JSON.stringify(words);
  const segmenter = React.useMemo(() => new Intl.Segmenter(undefined, { granularity: "grapheme" }), []);
  const longest = Math.max(1, ...words.map(word => split === "phrase" ? 1 : split === "word" ? word.split(/\s+/).filter(Boolean).length : Array.from(segmenter.segment(word)).filter(({ segment }) => !/^\s+$/.test(segment)).length));
  const timing = relayTiming(duration, stagger, longest);

  const navigate = React.useCallback((next: number) => {
    if (!words.length) return;
    const target = relayIndex(next, words.length);
    if (index === undefined) setInternal(target);
    if (target !== current) callbacks.current.onIndexChange?.(target);
  }, [current, index, words.length]);
  React.useImperativeHandle(controlsRef, () => ({
    next: () => navigate(loop ? (current + 1) % words.length : current + 1),
    previous: () => navigate(loop ? (current - 1 + words.length) % words.length : current - 1),
    jumpTo: navigate,
    reset: () => navigate(defaultIndex),
  }), [current, defaultIndex, navigate, words.length, loop]);

  React.useEffect(() => {
    if (!running) return;
    const milliseconds = Math.max(timing.window + 500, Number.isFinite(interval) ? Math.max(1200, Math.min(60000, interval)) : 3000);
    const timer = setTimeout(() => {
      const next = (current + 1) % words.length;
      if (index === undefined) setInternal(next);
      callbacks.current.onIndexChange?.(next);
    }, milliseconds);
    return () => clearTimeout(timer);
  }, [running, interval, current, words.length, index, contentKey, timing.window]);

  React.useLayoutEffect(() => {
    const elements = host.current?.querySelectorAll<HTMLElement>("[data-relay-phrase]") ?? [];
    lanes.current = Array.from(elements).flatMap((phrase, position) => {
      const units = Array.from(phrase.querySelectorAll<HTMLElement>("[data-relay-unit]"));
      const selected = phrase.dataset.selected === "true";
      return units.map((element, unit) => ({
        phrase: position, unit, count: units.length,
        opacity: createMotionLane(selected ? 1 : 0, value => {
          const visibility = Math.max(0, Math.min(1, value));
          element.style.setProperty("--relay-opacity", String(visibility));
          element.style.setProperty("--relay-blur", `${(1 - visibility) * 3}px`);
        }),
        y: createMotionLane(selected ? 0 : .28, value => element.style.setProperty("--relay-y", `${value}em`)),
      }));
    });
    return () => { lanes.current.forEach(lane => { lane.opacity.dispose(); lane.y.dispose(); }); lanes.current = []; };
  }, [contentKey, split]);

  React.useLayoutEffect(() => {
    const sign = direction === "up" ? 1 : -1;
    for (const lane of lanes.current) {
      const selected = lane.phrase === current;
      const target = selected ? 1 : 0;
      const unitTiming = relayTiming(duration, stagger, lane.count);
      if (!enabled || !inView || paused || unitTiming.duration === 0 || lane.opacity.get() === target) {
        lane.opacity.jump(target);
        lane.y.jump(selected ? 0 : .28 * sign);
      } else {
        if (selected && lane.opacity.get() === 0) lane.y.jump(.28 * sign);
        const transition: Transition = { duration: unitTiming.duration, delay: relayRank(lane.unit, lane.count, staggerFrom) * unitTiming.step, ease: [...motionTokens.ease.settle] };
        lane.opacity.to(target, transition);
        lane.y.to(selected ? 0 : -.28 * sign, transition);
      }
    }
    return () => lanes.current.forEach(lane => { lane.opacity.stop(); lane.y.stop(); });
  }, [current, contentKey, enabled, inView, duration, paused, split, stagger, staggerFrom, direction]);

  return <span {...props} ref={React.useCallback((node: HTMLSpanElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref])}
    className={cn("v-word-relay", className)} data-slot="word-relay" data-tone={tone} data-relay-split={split} data-motion-quiet={!enabled || !inView || paused} data-running={running ? "true" : "false"}
    onPointerEnter={event => { setHovered(true); onPointerEnter?.(event); }}
    onPointerLeave={event => { setHovered(false); onPointerLeave?.(event); }}
    onFocusCapture={event => { setFocused(true); onFocusCapture?.(event); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); onBlurCapture?.(event); }}>
    <span className="v-word-relay__accessible">{words[current] ?? ""}</span>
    {words.map((word, position) => <span key={`${position}:${word}`} aria-hidden="true" data-relay-phrase="" data-selected={position === current ? "true" : "false"}>{split === "phrase" ? <span data-relay-unit="">{word}</span> : word.split(/(\s+)/).map((part, partIndex) => /^\s+$/.test(part) ? part : <span key={partIndex} data-relay-word="" {...(split === "word" ? { "data-relay-unit": "" } : {})}>{split === "word" ? part : Array.from(segmenter.segment(part), ({ segment }, letterIndex) => <span key={letterIndex} data-relay-unit="">{segment}</span>)}</span>)}</span>)}
  </span>;
}
