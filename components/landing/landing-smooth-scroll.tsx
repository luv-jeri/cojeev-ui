"use client";

import * as React from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/registry/cojeev/motion/use-reduced-motion";

export function LandingSmoothScroll({ children }: { children: React.ReactNode }) {
  // Reduced motion gets native scrolling. Lenis would still run its autoRaf loop every frame with nothing to animate.
  const reduced = useReducedMotion();
  React.useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      anchors: true,
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: false,
    });

    return () => lenis.destroy();
  }, [reduced]);

  return <div data-landing-smooth-scroll>{children}</div>;
}
