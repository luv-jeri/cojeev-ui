"use client";
import * as React from "react";
import { animate } from "motion";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { boundedNumber, boundedCount } from "../lib/reference-effect-geometry";
import { cn } from "../lib/utils";

export type PixelSwapProps = Omit<React.ComponentProps<"div">, "children"> & {
  first: React.ReactNode; second: React.ReactNode;
  active: boolean; duration?: number; columns?: number;
};
/** A staggered tiled mask reveals the selected content without cloning interactive DOM. */
export function PixelSwap({ first, second, active, duration = 850, columns = 10, className, ref, ...props }: PixelSwapProps) {
  const host = React.useRef<HTMLDivElement>(null), clip = React.useRef<SVGClipPathElement>(null), outgoing = React.useRef<HTMLDivElement>(null);
  const id = `pixel-${React.useId().replace(/:/g, "")}`;
  const { enabled, inView } = useMotionVisibility(host);
  const [initialActive] = React.useState(active);
  const previous = React.useRef(active), n = boundedCount(columns, 10, 20), rows = Math.max(3, Math.round(n * .6));
  React.useEffect(() => {
    const changed = previous.current !== active; previous.current = active;
    let cancelled = false;
    if (outgoing.current) outgoing.current.style.visibility = "visible";
    const rects = Array.from(clip.current?.children ?? []);
    const animations = rects.map((node, i) => {
      const x = (i % n) / n, y = Math.floor(i / n) / rows;
      const target = active ? 1 : 0;
      if (!changed || !enabled || !inView) { node.setAttribute("x", String(x)); node.setAttribute("y", String(y)); node.setAttribute("width", String(target / n + (target ? .001 : 0))); node.setAttribute("height", String(target / rows + (target ? .001 : 0))); return null; }
      const from = Number(node.getAttribute("width")) * n;
      return animate(from, target, { duration: boundedNumber(duration, 850, 0, 3000) / 1000 * .58, delay: ((i * 17) % rects.length) / rects.length * boundedNumber(duration, 850, 0, 3000) / 1000 * .42, ease: [.22, 1, .36, 1], onUpdate: value => { node.setAttribute("x", String(x + (1 - value) / n / 2)); node.setAttribute("y", String(y + (1 - value) / rows / 2)); node.setAttribute("width", String(Math.max(0, value / n + (value ? .001 : 0)))); node.setAttribute("height", String(Math.max(0, value / rows + (value ? .001 : 0)))); } });
    });
    const settle = () => { if (!cancelled && outgoing.current) outgoing.current.style.visibility = active ? "hidden" : "visible"; };
    if (!changed || !enabled || !inView) settle();
    else void Promise.all(animations).then(settle);
    return () => { cancelled = true; animations.forEach(animation => animation?.stop()); };
  }, [active, enabled, inView, duration, n, rows]);
  return <div {...props} ref={React.useCallback((node: HTMLDivElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref])} data-slot="pixel-swap" data-active={active ? "true" : "false"} className={cn("v-pixel-swap", className)}>
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}><defs><clipPath id={id} ref={clip} clipPathUnits="objectBoundingBox">{Array.from({ length: n * rows }, (_, i) => <rect key={i} x={(i % n) / n} y={Math.floor(i / n) / rows} width={initialActive ? 1 / n + .001 : 0} height={initialActive ? 1 / rows + .001 : 0} />)}</clipPath></defs></svg>
    <div ref={outgoing} className="v-pixel-swap__layer" inert={active} aria-hidden={active} style={{ visibility: initialActive ? "hidden" : "visible" }}>{first}</div>
    <div className="v-pixel-swap__layer v-pixel-swap__incoming" inert={!active} aria-hidden={!active} style={{ clipPath: `url(#${id})` }}>{second}</div>
  </div>;
}
