"use client";
import * as React from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { ShapeMorph, type SignatureShapeName } from "./shape";
import { useChoreography } from "../motion/choreography";
import { cn } from "../lib/utils";

export type ScrollOrganismProps = Omit<React.ComponentProps<"div">, "children"> & {
  shape?: SignatureShapeName;
  size?: number;
  /** Percentage of the viewport traversed vertically over the document. */
  travel?: number;
};
/** A decorative companion driven by native document scroll; no scroll hijacking,
 * frame-by-frame React state, or idle animation. Place at the edge of a story. */
export function ScrollOrganism({ shape = "pebble-soft", size = 104, travel = 50, className, style, ...props }: ScrollOrganismProps) {
  const { quiet } = useChoreography();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 85, damping: 26, mass: .65 });
  const y = useTransform(progress, [0, 1], [`${-travel / 2}vh`, `${travel / 2}vh`]);
  const x = useTransform(progress, [0, .25, .5, .75, 1], [0, -24, 10, -36, 0]);
  const rotate = useTransform(progress, [0, 1], [-18, 220]);
  const scaleX = useTransform(progress, [0, .25, .5, .75, 1], [1, 1.12, .88, 1.08, 1]);
  const scaleY = useTransform(scaleX, value => 1 / value);
  return <div {...props} data-slot="scroll-organism" data-quiet={quiet} className={cn("v-scroll-organism", className)} style={{ ...style, "--organism-size": `${Math.max(24, Math.min(300, size))}px` } as React.CSSProperties} aria-hidden="true">
    <motion.div style={quiet ? undefined : { x, y, rotate, scaleX, scaleY }}><ShapeMorph name={shape} /></motion.div>
  </div>;
}
