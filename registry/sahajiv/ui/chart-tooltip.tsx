"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/registry/sahajiv/ui/card";
import { cn } from "@/registry/sahajiv/lib/utils";
import { motionTokens, useChoreography } from "@/registry/sahajiv/motion/choreography";
import { chartColor, tooltipPosition, type ChartColor } from "@/registry/sahajiv/lib/chart-geometry";

export type ChartTooltipItem = { label: string; value: number | null; color?: ChartColor };
export type ChartTooltipProps = {
  id?: string;
  active?: { label: string; items: ChartTooltipItem[] } | null;
  position?: { x: number; y: number };
  bounds?: { width: number; height: number };
  valueFormatter?: (value: number) => string;
  className?: string;
};

/** A controlled tooltip shared by every chart; coordinates are local to its plot. */
export function ChartTooltip({ id, active, position = { x: 0, y: 0 }, bounds = { width: 320, height: 280 }, valueFormatter = value => value.toLocaleString(), className }: ChartTooltipProps) {
  const { quiet, transition } = useChoreography();
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 220, height: 100 });
  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setSize({ width: node.offsetWidth, height: node.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, [active?.label, active?.items.length]);
  const target = tooltipPosition(position.x, position.y, bounds.width, bounds.height, Math.min(size.width, bounds.width - 16), size.height);
  return <AnimatePresence initial={!quiet}>
    {active && <motion.div
      key="tooltip" ref={ref} id={id} role="tooltip" data-slot="chart-tooltip"
      className={cn("v-chart-tooltip", className)}
      initial={quiet ? false : { opacity: 1, scale: .97, x: target.x, y: target.y }}
      animate={{ opacity: 1, scale: 1, x: target.x, y: target.y }}
      exit={{ opacity: 0, scale: quiet ? 1 : .98 }} transition={{ ...transition, x: { type: "tween", duration: quiet ? 0 : motionTokens.duration.quick, ease: [...motionTokens.ease.enter] }, y: { type: "tween", duration: quiet ? 0 : motionTokens.duration.quick, ease: [...motionTokens.ease.enter] } }}
      style={{ width: Math.min(220, Math.max(1, bounds.width - 16)), maxHeight: Math.max(1, bounds.height - 16) }}
    >
      <Card className="v-chart-tooltip__card">
        <div className="v-chart-tooltip__label">{active.label}</div>
        <AnimatePresence initial={false} mode="popLayout">
          {active.items.map((item, index) => <motion.div key={`${active.label}-${item.label}-${index}`} className="v-chart-tooltip__row"
            initial={quiet ? false : { opacity: 1, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition}>
            <span className="v-chart-key" style={{ background: chartColor(item.color, index) }} aria-hidden="true" />
            <span>{item.label}</span><strong>{item.value === null ? "No observation" : valueFormatter(item.value)}</strong>
          </motion.div>)}
        </AnimatePresence>
      </Card>
    </motion.div>}
  </AnimatePresence>;
}
