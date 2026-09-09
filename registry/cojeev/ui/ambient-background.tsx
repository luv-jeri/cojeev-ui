"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import { Shape } from "@/registry/cojeev/ui/shape";
import { useReducedMotion } from "@/registry/cojeev/motion/use-reduced-motion";
import {
  getSettingsSnapshot,
  getServerSettingsSnapshot,
  subscribeSettings,
} from "@/registry/cojeev/motion/settings";

export const ambientBackgroundVariants = cva("v-ambient-background", {
  variants: { variant: { drift: "-drift", orbit: "-orbit", contour: "-contour" } },
  defaultVariants: { variant: "drift" },
});

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const visibleSnapshot = () => document.visibilityState === "visible";
const hiddenSnapshot = () => false;

export type AmbientBackgroundProps = React.ComponentProps<"div"> &
  VariantProps<typeof ambientBackgroundVariants> & { paused?: boolean };

/** Sparse edge decoration; the opaque content surface preserves its own contrast. */
export function AmbientBackground({
  variant = "drift",
  paused = false,
  children,
  className,
  ref,
  ...props
}: AmbientBackgroundProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(false);
  const visible = React.useSyncExternalStore(subscribeVisibility, visibleSnapshot, hiddenSnapshot);
  const { motion } = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);
  const reduced = useReducedMotion();
  const quiet = reduced || motion.mode === "off";
  const running = inView && visible && !paused && !quiet;

  React.useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      {...props}
      ref={(element) => {
        root.current = element;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
      }}
      data-slot="ambient-background"
      data-variant={variant}
      data-motion={quiet ? "static" : running ? "running" : "paused"}
      className={cn(ambientBackgroundVariants({ variant }), className)}
    >
      <div data-slot="ambient-background-decoration" aria-hidden="true" inert>
        {variant === "contour" ? (
          <svg className="v-ambient-background__contour" viewBox="0 0 600 600" fill="none">
            <ellipse cx="300" cy="300" rx="260" ry="214" />
            <ellipse cx="300" cy="300" rx="210" ry="172" />
            <ellipse cx="300" cy="300" rx="160" ry="130" />
            <ellipse cx="300" cy="300" rx="110" ry="88" />
          </svg>
        ) : (
          <div className="v-ambient-background__field">
            <span className="v-ambient-background__piece -one"><Shape name="blob-4" /></span>
            <span className="v-ambient-background__piece -two"><Shape name="star-8" /></span>
            <span className="v-ambient-background__piece -three"><Shape name="circle" /></span>
          </div>
        )}
      </div>
      {children != null && <div data-slot="ambient-background-content">{children}</div>}
    </div>
  );
}
