"use client";

import * as React from "react";
import Lenis from "lenis";

export function LandingSmoothScroll({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const lenis = new Lenis({
      anchors: true,
      autoRaf: true,
      lerp: 0.1,
      respectReducedMotion: true,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: false,
    });

    return () => lenis.destroy();
  }, []);

  return <div data-landing-smooth-scroll>{children}</div>;
}
