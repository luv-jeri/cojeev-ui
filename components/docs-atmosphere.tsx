"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { docsArtworkModel } from "@/lib/docs-artwork";
import { PigmentField } from "@/registry/cojeev/ui/pigment-field";
import { ShapeArtwork, type ShapeArtworkTone } from "@/registry/cojeev/ui/shape-artwork";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { motionTokens, useChoreography } from "@/registry/cojeev/motion/choreography";
import { useMotionVisibility } from "@/registry/cojeev/motion/use-motion-visibility";

/** One bounded shader for the documentation shell; content retains its own surface. */
export function DocsAtmosphere() {
  return <div className="docs-atmosphere" aria-hidden="true" inert>
    <PigmentField tone="balanced" speed={0.35} intensity={0.8} />
  </div>;
}

/** Stable per-page artwork that shares the component library's living contour language. */
export function DocsIntroArtwork({ tone = "pink", seed = "cojeev" }: { tone?: ShapeArtworkTone; seed?: string }) {
  const model = React.useMemo(() => docsArtworkModel(seed, tone), [seed, tone]);
  const host = React.useRef<HTMLDivElement>(null);
  const { quiet } = useChoreography();
  const { enabled, inView } = useMotionVisibility(host);
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, motionTokens.spring.gentle);
  const y = useSpring(targetY, motionTokens.spring.gentle);

  React.useEffect(() => {
    const reset = () => {
      targetX.jump(0);
      targetY.jump(0);
      x.jump(0);
      y.jump(0);
    };
    if (quiet || !enabled || !inView || !matchMedia("(hover: hover) and (pointer: fine)").matches) {
      reset();
      return;
    }
    const follow = (event: PointerEvent) => {
      const rect = host.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / 520);
      targetX.set(Math.max(-13, Math.min(13, dx * .045 * influence)));
      targetY.set(Math.max(-10, Math.min(10, dy * .04 * influence)));
    };
    document.addEventListener("pointermove", follow, { passive: true });
    document.addEventListener("pointerleave", reset);
    return () => {
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerleave", reset);
    };
  }, [enabled, inView, quiet, targetX, targetY, x, y]);

  return <motion.div ref={host} className="docs-intro-artwork" data-artwork-seed={model.seed} data-artwork-layout={model.layout} style={{ x, y }} aria-hidden="true" inert>
    {model.pieces.map((piece, index) => <FloatLayer
      key={piece.role}
      className="docs-artwork-piece"
      data-artwork-role={piece.role}
      depth={0}
      drift={index === 0 ? 4 : index === 1 ? 6 : 3}
      delay={piece.delay}
      revealDistance={0}
      style={{ left: `${piece.x}%`, top: `${piece.y}%`, width: `${piece.size}%` }}
    >
      <ShapeArtwork
        name={piece.name}
        morphTo={piece.morphTo}
        ambient
        morphDuration={piece.duration}
        motionDelay={piece.delay}
        tone={piece.tone}
        rotation={piece.rotation}
        echo={piece.echo}
        echoAngle={18 + index * 7}
        shadow={false}
      />
    </FloatLayer>)}
  </motion.div>;
}
