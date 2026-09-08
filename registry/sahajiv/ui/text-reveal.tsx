"use client";
import * as React from "react";
import { animate, stagger } from "motion";
import { cn } from "../lib/utils";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { motionTokens, trackMotion } from "../motion/choreography";

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
    const sequence = stagger(motionTokens.stagger);
    const controls = animate(words, {
      "--reveal-opacity": [0, 1],
      "--reveal-y": variant === "rise" ? [".32em", "0em"] : ["0em", "0em"],
    }, {
      duration: milliseconds / 1000,
      delay: (index, total) => Math.min(sequence(index, total), .42),
      ease: [...motionTokens.ease.settle],
    });
    const stop = trackMotion(controls);
    return () => {
      stop();
      // Settle through the same Motion values so its queued render cannot
      // overwrite an inline cleanup with a half-revealed word on the next frame.
      const mounted = words.filter(word => word.isConnected);
      if (mounted.length) animate(mounted, { "--reveal-opacity": 1, "--reveal-y": "0em" }, { duration: 0 });
    };
  }, [token, enabled, inView, duration, variant]);
  return <Tag {...props} ref={host as React.Ref<HTMLHeadingElement>} data-slot="text-reveal" className={cn("v-text-reveal", className)}>
    <span className="v-text-reveal__accessible">{text}</span>
    <span aria-hidden="true">{text.split(/(\s+)/).map((word, index) => /^\s+$/.test(word) ? word : <span key={index} data-reveal-word="">{word}</span>)}</span>
  </Tag>;
}
