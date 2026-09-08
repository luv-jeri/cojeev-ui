"use client";
import { CartesianChart, type CartesianChartProps } from "@/registry/sahajiv/lib/chart-cartesian";
export type AreaChartProps = CartesianChartProps & { variant?: "linear" | "step" | "stacked" };
export function AreaChart({ variant = "linear", caption = "Area chart", ...props }: AreaChartProps) { return <CartesianChart {...props} caption={caption} kind="area" variant={variant} />; }
