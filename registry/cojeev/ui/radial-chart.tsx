"use client";
import { CircularChart, type CircularChartProps } from "@/registry/cojeev/lib/chart-circular";
export type RadialChartProps = CircularChartProps & { variant?: "full" | "semicircle"; max?: number };
export function RadialChart({ variant = "full", caption = "Radial chart", ...props }: RadialChartProps) { return <CircularChart {...props} caption={caption} kind="radial" variant={variant} />; }
