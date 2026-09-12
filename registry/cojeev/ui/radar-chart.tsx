"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChartFrame, type ChartFrameProps } from "@/registry/cojeev/ui/chart";
import { useChartMotion } from "@/registry/cojeev/lib/use-chart-motion";
import {
  chartColor,
  finiteValue,
  polarPoint,
  radarPath,
} from "@/registry/cojeev/lib/chart-geometry";

export type RadarChartProps = Omit<
  ChartFrameProps,
  "children" | "legendMode" | "interaction"
> & { variant?: "polygon" | "rounded" | "grid"; max?: number };
export function RadarChart({
  variant = "polygon",
  caption = "Radar chart",
  max,
  ...props
}: RadarChartProps) {
  const { quiet, transition, geometryTransition } = useChartMotion();
  return (
    <ChartFrame {...props} caption={caption} interaction="radar">
      {(plot) => {
        const { data, series, width, height, active } = plot;
        const ceiling =
          Number.isFinite(max) && max! > 0
            ? max!
            : Math.max(
                1,
                ...data.flatMap((point) =>
                  series.map((item) =>
                    Math.max(0, finiteValue(point[item.key]) ?? 0),
                  ),
                ),
              );
        const cx = width / 2,
          cy = height / 2,
          radius = Math.max(1, Math.min(108, width / 2 - 72));
        const axes = data.map((point, index) => ({
          point,
          angle: (index / data.length) * Math.PI * 2 - Math.PI / 2,
        }));
        if (data.length < 3)
          return (
            <text x={cx} y={cy} textAnchor="middle" className="v-chart-note">
              Add at least three categories.
            </text>
          );
        return (
          <>
            <g className="v-chart-grid" aria-hidden="true">
              {[0.25, 0.5, 0.75, 1].map((level) =>
                variant === "grid" ? (
                  <circle
                    key={level}
                    cx={cx}
                    cy={cy}
                    r={radius * level}
                    fill="none"
                  />
                ) : (
                  <path
                    key={level}
                    d={radarPath(
                      axes.map((axis) =>
                        polarPoint(cx, cy, radius * level, axis.angle),
                      ),
                    )}
                    fill="none"
                  />
                ),
              )}
              {axes.map((axis, index) => {
                const point = polarPoint(cx, cy, radius, axis.angle);
                return (
                  <line key={index} x1={cx} x2={point.x} y1={cy} y2={point.y} />
                );
              })}
            </g>
            <g className="v-chart-axis" aria-hidden="true">
              {axes.map((axis, index) => {
                const point = polarPoint(cx, cy, radius + 16, axis.angle);
                return (
                  <text
                    key={index}
                    x={point.x}
                    y={point.y + 4}
                    textAnchor={
                      Math.abs(point.x - cx) < 2
                        ? "middle"
                        : point.x < cx
                          ? "end"
                          : "start"
                    }
                  >
                    {axis.point.label.length > 11
                      ? `${axis.point.label.slice(0, 10)}…`
                      : axis.point.label}
                  </text>
                );
              })}
            </g>
            <AnimatePresence initial={!quiet}>
              {series.map((item, index) => {
                const points = axes.map((axis) => {
                  const value = finiteValue(axis.point[item.key]);
                  return value === null
                    ? null
                    : polarPoint(
                        cx,
                        cy,
                        radius * Math.max(0, Math.min(1, value / ceiling)),
                        axis.angle,
                      );
                });
                const incomplete = points.some((point) => point === null);
                const d = radarPath(points, variant === "rounded");
                return (
                  <motion.g
                    key={item.key}
                    initial={quiet ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  >
                    <motion.path
                      data-slot="chart-mark"
                      d={d}
                      fill={incomplete ? "none" : chartColor(item.color, index)}
                      fillOpacity=".18"
                      stroke={chartColor(item.color, index)}
                      strokeWidth="2"
                      initial={false}
                      animate={{ d }}
                      transition={transition}
                    />
                    <AnimatePresence initial={!quiet}>
                      {points.map(
                        (point, pointIndex) =>
                          point && (
                            <motion.circle
                              key={`${data[pointIndex].label}-${pointIndex}`}
                              data-slot="chart-point"
                              cx={point.x}
                              cy={point.y}
                              initial={
                                quiet
                                  ? false
                                  : {
                                      cx: point.x,
                                      cy: point.y,
                                      r: 0,
                                      opacity: 0,
                                    }
                              }
                              animate={{
                                cx: point.x,
                                cy: point.y,
                                r: active === pointIndex ? 5 : 2.5,
                                opacity: 1,
                              }}
                              exit={{ r: 0, opacity: 0 }}
                              fill={chartColor(item.color, index)}
                              stroke="var(--card)"
                              strokeWidth="1.5"
                              transition={{
                                ...transition,
                                r: geometryTransition,
                              }}
                              onPointerEnter={() => plot.inspect(pointIndex)}
                            />
                          ),
                      )}
                    </AnimatePresence>
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </>
        );
      }}
    </ChartFrame>
  );
}
