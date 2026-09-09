"use client";
import * as React from "react";
import { animate } from "motion";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { cn } from "../lib/utils";

export type TargetCursorProps = React.ComponentProps<"div"> & { paused?: boolean };
/** Local brackets track real buttons/links on pointer hover and keyboard focus. */
export function TargetCursor({ children, paused = false, className, ref, ...props }: TargetCursorProps) {
  const host = React.useRef<HTMLDivElement>(null), mark = React.useRef<HTMLDivElement>(null);
  const { enabled, inView } = useMotionVisibility(host);
  React.useEffect(() => {
    const element = host.current, marker = mark.current;
    if (!element || !marker) return;
    let animation: ReturnType<typeof animate> | undefined;
    const target = (event: Event) => {
      const item = (event.target as Element).closest<HTMLElement>("button,a[href],[data-cursor-target]");
      if (!item || !element.contains(item) || item.matches(":disabled")) return;
      const box = element.getBoundingClientRect(), rect = item.getBoundingClientRect();
      const sx = element.clientWidth / Math.max(1, box.width), sy = element.clientHeight / Math.max(1, box.height);
      animation?.stop(); marker.style.opacity = "1";
      animation = animate(marker, { x: (rect.left - box.left) * sx - 6, y: (rect.top - box.top) * sy - 6, width: rect.width * sx + 12, height: rect.height * sy + 12 }, { duration: enabled && inView && !paused ? .24 : 0, ease: [.22, 1, .36, 1] });
    };
    const hide = () => { if (!element.contains(document.activeElement)) marker.style.opacity = "0"; };
    element.addEventListener("pointerover", target); element.addEventListener("focusin", target); element.addEventListener("pointerleave", hide); element.addEventListener("focusout", hide);
    const reset = () => { animation?.stop(); marker.style.opacity = "0"; };
    const resize = new ResizeObserver(reset); resize.observe(element);
    return () => { animation?.stop(); resize.disconnect(); element.removeEventListener("pointerover", target); element.removeEventListener("focusin", target); element.removeEventListener("pointerleave", hide); element.removeEventListener("focusout", hide); };
  }, [enabled, inView, paused]);
  return <div {...props} ref={React.useCallback((node: HTMLDivElement | null) => { host.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref])} data-slot="target-cursor" className={cn("v-target-cursor", className)}>{children}<div aria-hidden="true" ref={mark} className="v-target-cursor__mark"><i /><i /><i /><i /></div></div>;
}
