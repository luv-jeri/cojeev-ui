"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { useMotionVisibility } from "../motion/use-motion-visibility";

export type TextRevealProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  text: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  /** Change this value to deliberately replay the reveal. */
  replayKey?: string | number;
  variant?: "rise" | "fade";
  duration?: number;
};

/** A single, bounded word reveal. The complete text remains readable without motion or JavaScript. */
export function TextReveal({ text, as: Tag = "span", replayKey = 0, variant = "rise", duration = 480, className, ...props }: TextRevealProps) {
  const host = React.useRef<HTMLElement>(null);
  const { enabled, inView } = useMotionVisibility(host);
  const played = React.useRef<string | null>(null);
  const token = JSON.stringify([text, replayKey]);
  React.useEffect(() => {
    if (!inView || !host.current) return;
    if (played.current === token) return;
    played.current = token;
    if (!enabled) return;
    const words = Array.from(host.current.querySelectorAll<HTMLElement>("[data-reveal-word]"));
    const milliseconds = Number.isFinite(duration) ? Math.min(1500, Math.max(0, duration)) : 480;
    if (milliseconds === 0) return;
    const animations = words.map((word, index) => word.animate([
      { opacity: 0, transform: variant === "rise" ? "translateY(.32em)" : "none" },
      { opacity: 1, transform: "none" },
    ], { duration: milliseconds, delay: Math.min(index * 28, 420), easing: "cubic-bezier(.2,.65,.25,1)", fill: "backwards" }));
    return () => animations.forEach((animation) => animation.cancel());
  }, [token, enabled, inView, duration, variant]);
  return <Tag {...props} ref={host as React.Ref<HTMLHeadingElement>} data-slot="text-reveal" className={cn("v-text-reveal", className)}>
    <span className="v-text-reveal__accessible">{text}</span>
    <span aria-hidden="true">{text.split(/(\s+)/).map((word, index) => /^\s+$/.test(word) ? word : <span key={index} data-reveal-word="">{word}</span>)}</span>
  </Tag>;
}
