"use client";
import { CircularChart, type CircularChartProps } from "@/registry/sahajiv/lib/chart-circular";
export type PieChartProps = CircularChartProps & { variant?: "pie" | "donut" };
export function PieChart({ variant = "pie", caption = "Pie chart", ...props }: PieChartProps) { return <CircularChart {...props} caption={caption} kind="pie" variant={variant} />; }
