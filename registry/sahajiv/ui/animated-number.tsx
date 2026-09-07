"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { useMotionVisibility } from "../motion/use-motion-visibility";

export type AnimatedNumberProps = Omit<React.ComponentProps<"span">, "children"> & {
  value: number;
  locale?: string;
  format?: Intl.NumberFormatOptions;
  /** Transition time in milliseconds, bounded to 0–2000. */
  duration?: number;
  /** Text for NaN or infinite values; never presents missing data as zero. */
  fallback?: string;
};

/** Updates a number smoothly while exposing only the final value to assistive technology. */
export function AnimatedNumber({ value, locale = "en-US", format, duration = 500, fallback = "—", className, ref, ...props }: AnimatedNumberProps) {
  const host = React.useRef<HTMLSpanElement>(null);
  const visual = React.useRef<HTMLSpanElement>(null);
  const safeValue = Number.isFinite(value) ? value : null;
  const current = React.useRef(safeValue);
  const formatter = React.useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);
  const { enabled, inView } = useMotionVisibility(host);
  const formatted = safeValue === null ? fallback : formatter.format(safeValue);
  React.useLayoutEffect(() => {
    const element = visual.current;
    if (!element) return;
    const milliseconds = Number.isFinite(duration) ? Math.min(2000, Math.max(0, duration)) : 500;
    if (safeValue === null) {
      current.current = null;
      element.textContent = fallback;
      return;
    }
    const start = current.current ?? safeValue;
    if (!enabled || !inView || milliseconds === 0 || start === safeValue) {
      current.current = safeValue;
      element.textContent = formatted;
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / milliseconds);
      current.current = start + (safeValue - start) * (1 - Math.pow(1 - progress, 3));
      element.textContent = formatter.format(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    element.textContent = formatter.format(start);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeValue, formatted, formatter, duration, enabled, inView, fallback]);
  return <span {...props} ref={React.useCallback((node: HTMLSpanElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref])} data-slot="animated-number" className={cn("v-animated-number", className)}>
    <span className="v-animated-number__accessible">{formatted}</span>
    <span ref={visual} aria-hidden="true">{formatted}</span>
  </span>;
}
