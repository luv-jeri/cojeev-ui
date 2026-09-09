"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { AreaChart } from "@/registry/cojeev/ui/area-chart";
import { BarChart } from "@/registry/cojeev/ui/bar-chart";
import { LineChart } from "@/registry/cojeev/ui/line-chart";
import { PieChart } from "@/registry/cojeev/ui/pie-chart";
import { RadarChart } from "@/registry/cojeev/ui/radar-chart";
import { RadialChart } from "@/registry/cojeev/ui/radial-chart";
import { ChartTooltip } from "@/registry/cojeev/ui/chart-tooltip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/registry/cojeev/ui/card";
import { Label } from "@/registry/cojeev/ui/label";
import { Button } from "@/registry/cojeev/ui/button";
import { NativeSelect, NativeSelectOption } from "@/registry/cojeev/ui/native-select";
import type { ChartPoint, ChartSeries, ChartSlice } from "@/registry/cojeev/ui/chart";

const week: ChartPoint[] = [
  { label: "Mon", notes: 18, ideas: 10 }, { label: "Tue", notes: 26, ideas: 14 },
  { label: "Wed", notes: 22, ideas: 18 }, { label: "Thu", notes: 38, ideas: 16 },
  { label: "Fri", notes: 32, ideas: 24 }, { label: "Sat", notes: 46, ideas: 28 },
  { label: "Sun", notes: 42, ideas: 22 },
];
const series: ChartSeries[] = [{ key: "notes", label: "Notes", color: "pink" }, { key: "ideas", label: "Ideas", color: "blue" }];
const slices: ChartSlice[] = [{ label: "Making", value: 38, color: "pink" }, { label: "Reading", value: 27, color: "blue" }, { label: "Reflecting", value: 20, color: "olive" }, { label: "Exploring", value: 15, color: "yellow" }];
type Dataset = "current" | "updated" | "zero" | "missing" | "empty";
function DatasetControl({ value, onChange }: { value: Dataset; onChange: (value: Dataset) => void }) {
  const id = React.useId();
  return <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}><Label htmlFor={id}>Sample data</Label><NativeSelect id={id} value={value} onChange={event => onChange(event.target.value as Dataset)}><NativeSelectOption value="current">This week</NativeSelectOption><NativeSelectOption value="updated">Next week</NativeSelectOption><NativeSelectOption value="zero">All zero</NativeSelectOption><NativeSelectOption value="missing">Missing observations</NativeSelectOption><NativeSelectOption value="empty">Empty dataset</NativeSelectOption></NativeSelect><span role="status" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Local demonstration · {value === "updated" ? "Next week loaded" : value === "empty" ? "No data loaded" : "Sample data loaded"}</span></div>;
}
function samplePoints(mode: Dataset, source = week): ChartPoint[] {
  if (mode === "empty") return [];
  return source.map((point, index) => Object.fromEntries(Object.entries(point).map(([key, value]) => [key, typeof value !== "number" ? value : mode === "zero" ? 0 : mode === "missing" && index % 3 === 1 ? null : mode === "updated" ? Math.round(value * (index % 2 ? 1.25 : .78)) : value])) as ChartPoint);
}
function sampleSlices(mode: Dataset, source = slices): ChartSlice[] {
  if (mode === "empty") return [];
  return source.map((point, index) => ({ ...point, value: mode === "zero" ? 0 : mode === "missing" && index % 2 ? null : mode === "updated" ? Math.round((point.value ?? 0) * (index % 2 ? 1.3 : .7)) : point.value }));
}
export function AreaChartExample({ variant = "linear" }: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  return <div style={{ display: "grid", gap: 20 }}><DatasetControl value={mode} onChange={setMode} /><AreaChart data={samplePoints(mode)} series={series} variant={variant === "step" || variant === "stacked" ? variant : "linear"} caption="A week of useful ideas" description="Notes and ideas gathered across a sample week." /></div>;
}
export function BarChartExample({ variant = "grouped" }: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  return <div style={{ display: "grid", gap: 20 }}><DatasetControl value={mode} onChange={setMode} /><BarChart data={samplePoints(mode)} series={series} variant={variant === "stacked" || variant === "horizontal" ? variant : "grouped"} caption="Small things, kept" description="Compare the two collections day by day." /></div>;
}
export function LineChartExample({ variant = "linear" }: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  return <div style={{ display: "grid", gap: 20 }}><DatasetControl value={mode} onChange={setMode} /><LineChart data={samplePoints(mode)} series={series} variant={variant === "smooth" || variant === "step" ? variant : "linear"} caption="A rhythm taking shape" description="Missing observations remain gaps in the line." /></div>;
}
export function PieChartExample({ variant = "pie" }: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  return <div style={{ display: "grid", gap: 20 }}><DatasetControl value={mode} onChange={setMode} /><PieChart data={sampleSlices(mode)} variant={variant === "donut" ? "donut" : "pie"} caption="Room for different kinds of work" description="How a sample week was shared across four activities." /></div>;
}
export function RadarChartExample({ variant = "polygon" }: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const data: ChartPoint[] = [{ label: "Focus", notes: 72, ideas: 56 }, { label: "Learning", notes: 82, ideas: 64 }, { label: "Making", notes: 60, ideas: 84 }, { label: "Rest", notes: 58, ideas: 72 }, { label: "Connection", notes: 76, ideas: 66 }];
  return <div style={{ display: "grid", gap: 20 }}><DatasetControl value={mode} onChange={setMode} /><RadarChart data={samplePoints(mode, data)} series={[{ key: "notes", label: "This month", color: "pink" }, { key: "ideas", label: "Last month", color: "olive" }]} max={100} variant={variant === "rounded" || variant === "grid" ? variant : "polygon"} caption="A little more balance" description="Five sample measures, each on a scale of one hundred." /></div>;
}
export function RadialChartExample({ variant = "full" }: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const data: ChartSlice[] = [{ label: "Weekly review", value: 82, color: "pink" }, { label: "Reading goal", value: 64, color: "blue" }, { label: "Project notes", value: 74, color: "olive" }];
  return <div style={{ display: "grid", gap: 20 }}><DatasetControl value={mode} onChange={setMode} /><RadialChart data={sampleSlices(mode, data)} max={100} variant={variant === "semicircle" ? "semicircle" : "full"} caption="Progress with room to grow" description="Three independent goals, each measured against one hundred." /></div>;
}
export function ChartTooltipExample() {
  const tooltipId = React.useId();
  const [active, setActive] = React.useState<number | null>(null);
  const [position, setPosition] = React.useState({ x: 30, y: 30 });
  const [width, setWidth] = React.useState(320);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => { const node = ref.current; if (!node) return; const resize = () => setWidth(node.clientWidth); resize(); const observer = new ResizeObserver(resize); observer.observe(node); return () => observer.disconnect(); }, []);
  const inspect = (index: number) => { setActive(index); setPosition({ x: width * (index + .5) / 3, y: 45 }); };
  return <Card><CardHeader className="grid gap-2"><CardTitle>Details, close to the data</CardTitle><CardDescription>Hover or focus a moment to inspect its values. Escape closes the tooltip.</CardDescription></CardHeader><CardContent><div ref={ref} style={{ position: "relative", height: 240 }} onPointerLeave={() => setActive(null)} onKeyDown={event => { if (event.key === "Escape") setActive(null); }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["Morning", "Afternoon", "Evening"].map((label, index) => <Button key={label} variant={active === index ? "default" : "ghost"} onPointerEnter={() => inspect(index)} onPointerMove={event => { const bounds = ref.current!.getBoundingClientRect(); setPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }} onFocus={() => inspect(index)} onBlur={() => setActive(null)} aria-describedby={active === index ? tooltipId : undefined}>{label}</Button>)}</div>
    <ChartTooltip id={tooltipId} active={active === null ? null : { label: ["Morning", "Afternoon", "Evening"][active], items: [{ label: "Notes kept", value: [12, 18, 8][active], color: "pink" }, { label: "Ideas explored", value: [8, 14, 12][active], color: "blue" }] }} position={position} bounds={{ width, height: 240 }} />
  </div></CardContent></Card>;
}
