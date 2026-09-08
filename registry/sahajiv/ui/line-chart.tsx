"use client";
import { CartesianChart, type CartesianChartProps } from "@/registry/sahajiv/lib/chart-cartesian";
export type LineChartProps = CartesianChartProps & { variant?: "linear" | "smooth" | "step" };
export function LineChart({ variant = "linear", caption = "Line chart", ...props }: LineChartProps) { return <CartesianChart {...props} caption={caption} kind="line" variant={variant} />; }
