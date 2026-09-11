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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/registry/cojeev/ui/card";
import { Button } from "@/registry/cojeev/ui/button";
import {
  ChartFrame,
  ChartDatasetSelect,
  type ChartPoint,
  type ChartSeries,
  type ChartSlice,
} from "@/registry/cojeev/ui/chart";

const week: ChartPoint[] = [
  { label: "Mon", notes: 18, ideas: 10 },
  { label: "Tue", notes: 26, ideas: 14 },
  { label: "Wed", notes: 22, ideas: 18 },
  { label: "Thu", notes: 38, ideas: 16 },
  { label: "Fri", notes: 32, ideas: 24 },
  { label: "Sat", notes: 46, ideas: 28 },
  { label: "Sun", notes: 42, ideas: 22 },
];
const series: ChartSeries[] = [
  { key: "notes", label: "Notes", color: "pink" },
  { key: "ideas", label: "Ideas", color: "blue" },
];
const slices: ChartSlice[] = [
  { label: "Making", value: 38, color: "pink" },
  { label: "Reading", value: 27, color: "blue" },
  { label: "Reflecting", value: 20, color: "olive" },
  { label: "Exploring", value: 15, color: "yellow" },
];
type Dataset = "current" | "updated" | "zero" | "missing" | "empty";
function DatasetControl({
  value,
  onChange,
}: {
  value: Dataset;
  onChange: (value: Dataset) => void;
}) {
  const options = [
    { value: "current", label: "This week" },
    { value: "updated", label: "Next week" },
    { value: "zero", label: "All zero" },
    { value: "missing", label: "Missing observations" },
    { value: "empty", label: "Empty dataset" },
  ];
  return (
    <div className="v-chart-example__tools">
      <ChartDatasetSelect
        value={value}
        onValueChange={(next) => onChange(next as Dataset)}
        options={options}
      />
      <span role="status">
        Local demonstration ·{" "}
        {value === "updated"
          ? "Next week loaded"
          : value === "empty"
            ? "No data loaded"
            : value === "missing"
              ? "Missing observations loaded"
              : value === "zero"
                ? "Zero values loaded"
                : "Sample data loaded"}
      </span>
    </div>
  );
}
function samplePoints(
  mode: Dataset,
  source = week,
  maximum = Infinity,
): ChartPoint[] {
  if (mode === "empty") return [];
  return source.map(
    (point, index) =>
      Object.fromEntries(
        Object.entries(point).map(([key, value]) => [
          key,
          typeof value !== "number"
            ? value
            : mode === "zero"
              ? 0
              : mode === "missing" && index % 3 === 1
                ? null
                : mode === "updated"
                  ? Math.min(
                      maximum,
                      Math.round(value * (index % 2 ? 1.25 : 0.78)),
                    )
                  : value,
        ]),
      ) as ChartPoint,
  );
}
function sampleSlices(mode: Dataset, source = slices): ChartSlice[] {
  if (mode === "empty") return [];
  return source.map((point, index) => ({
    ...point,
    value:
      mode === "zero"
        ? 0
        : mode === "missing" && index % 2
          ? null
          : mode === "updated"
            ? Math.round((point.value ?? 0) * (index % 2 ? 1.3 : 0.7))
            : point.value,
  }));
}
function chartPresentation(variant: string): "analysis" | "brief" | "ledger" {
  return variant === "brief" || variant === "ledger" ? variant : "analysis";
}
function observedSummary(
  values: (number | null)[],
  label: string,
  average = false,
) {
  const observed = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  const total = observed.reduce((sum, value) => sum + value, 0);
  return {
    label,
    value: observed.length
      ? (average ? total / observed.length : total).toLocaleString(undefined, {
          maximumFractionDigits: 1,
        })
      : "—",
    detail: `${observed.length} of ${values.length} source observations. Missing values are not counted.`,
  };
}
export function AreaChartExample({
  variant = "analysis",
  chartMode,
}: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const requested = chartMode ?? variant,
    geometry =
      requested === "step" || requested === "stacked" ? requested : "linear";
  const data = samplePoints(mode);
  return (
    <div className="v-chart-example" data-chart-mode={geometry}>
      <DatasetControl value={mode} onChange={setMode} />
      <AreaChart
        data={data}
        series={series}
        variant={geometry}
        appearance={chartPresentation(variant)}
        summary={observedSummary(
          data.map((point) =>
            typeof point.notes === "number" ? point.notes : null,
          ),
          "Notes gathered this week",
        )}
        caption="A week of useful ideas"
        description="Explore the trend, lead with a weekly total, or compare the plot with its exact values."
      />
    </div>
  );
}
export function BarChartExample({
  variant = "analysis",
  chartMode,
}: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const requested = chartMode ?? variant,
    geometry =
      requested === "stacked" || requested === "horizontal"
        ? requested
        : "grouped";
  const data = samplePoints(mode);
  return (
    <div className="v-chart-example" data-chart-mode={geometry}>
      <DatasetControl value={mode} onChange={setMode} />
      <BarChart
        data={data}
        series={series}
        variant={geometry}
        appearance={chartPresentation(variant)}
        summary={observedSummary(
          data.map((point) =>
            typeof point.ideas === "number" ? point.ideas : null,
          ),
          "Ideas in the collection",
        )}
        caption="Small things, kept"
        description="Compare collections with grouped bars, stacked contributions or a horizontal reading."
      />
    </div>
  );
}
export function LineChartExample({
  variant = "analysis",
  chartMode,
}: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const requested = chartMode ?? variant,
    geometry =
      requested === "smooth" || requested === "step" ? requested : "linear";
  const data = samplePoints(mode),
    latest = data.at(-1);
  return (
    <div className="v-chart-example" data-chart-mode={geometry}>
      <DatasetControl value={mode} onChange={setMode} />
      <LineChart
        data={data}
        series={series}
        variant={geometry}
        appearance={chartPresentation(variant)}
        summary={{
          label: latest ? `Notes on ${latest.label}` : "Latest observation",
          value: typeof latest?.notes === "number" ? latest.notes : "—",
          detail: "The final source observation, not a smoothed estimate.",
        }}
        caption="A rhythm taking shape"
        description="Missing observations remain gaps. Use the ledger to compare exact values with the line."
      />
    </div>
  );
}
export function PieChartExample({
  variant = "analysis",
  chartMode,
}: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const geometry = (chartMode ?? variant) === "donut" ? "donut" : "pie",
    data = sampleSlices(mode);
  return (
    <div className="v-chart-example" data-chart-mode={geometry}>
      <DatasetControl value={mode} onChange={setMode} />
      <PieChart
        data={data}
        variant={geometry}
        appearance={chartPresentation(variant)}
        summary={observedSummary(
          data.map((point) => point.value),
          "Observed activity total",
        )}
        caption="Room for different kinds of work"
        description="A whole and its contributions. Keep exact amounts beside the share chart in Ledger."
      />
    </div>
  );
}
export function RadarChartExample({
  variant = "analysis",
  chartMode,
}: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const data: ChartPoint[] = [
    { label: "Focus", notes: 72, ideas: 56 },
    { label: "Learning", notes: 82, ideas: 64 },
    { label: "Making", notes: 60, ideas: 84 },
    { label: "Rest", notes: 58, ideas: 72 },
    { label: "Connection", notes: 76, ideas: 66 },
  ];
  const requested = chartMode ?? variant,
    geometry =
      requested === "rounded" || requested === "grid" ? requested : "polygon",
    observed = samplePoints(mode, data, 100);
  return (
    <div className="v-chart-example" data-chart-mode={geometry}>
      <DatasetControl value={mode} onChange={setMode} />
      <RadarChart
        data={observed}
        series={[
          { key: "notes", label: "This month", color: "pink" },
          { key: "ideas", label: "Last month", color: "olive" },
        ]}
        max={100}
        variant={geometry}
        appearance={chartPresentation(variant)}
        summary={observedSummary(
          observed.map((point) =>
            typeof point.notes === "number" ? point.notes : null,
          ),
          "This month · observed mean",
          true,
        )}
        caption="A little more balance"
        description="Five measures on a shared scale of one hundred. Inspect the table when an observation is missing."
      />
    </div>
  );
}
export function RadialChartExample({
  variant = "analysis",
  chartMode,
}: ExampleProps) {
  const [mode, setMode] = React.useState<Dataset>("current");
  const data: ChartSlice[] = [
    { label: "Weekly review", value: 82, color: "pink" },
    { label: "Reading goal", value: 64, color: "blue" },
    { label: "Project notes", value: 74, color: "olive" },
  ];
  const geometry =
      (chartMode ?? variant) === "semicircle" ? "semicircle" : "full",
    observed = sampleSlices(mode, data);
  return (
    <div className="v-chart-example" data-chart-mode={geometry}>
      <DatasetControl value={mode} onChange={setMode} />
      <RadialChart
        data={observed}
        max={100}
        variant={geometry}
        appearance={chartPresentation(variant)}
        summary={{
          label: "Weekly review",
          value:
            observed[0]?.value === null || !observed.length
              ? "—"
              : `${observed[0].value}%`,
          detail:
            "This goal has its own target of 100. Other rings are independent goals.",
        }}
        caption="Progress with room to grow"
        description="Three independent goals, each measured against one hundred; their percentages must not be added."
      />
    </div>
  );
}

export function ChartExample() {
  const data: ChartPoint[] = [
    { label: "Mon", minutes: 12 },
    { label: "Tue", minutes: 28 },
    { label: "Wed", minutes: 0 },
    { label: "Thu", minutes: 36 },
    { label: "Fri", minutes: 24 },
  ];
  return (
    <div className="v-chart-introduction">
      <ol aria-label="Chart composition" className="v-chart-anatomy">
        <li>
          <span>01</span>
          <strong>A frame with a purpose</strong>
          <p>Start with a title, units and an honest scale.</p>
        </li>
        <li>
          <span>02</span>
          <strong>A plot you can inspect</strong>
          <p>Toggle the legend; focus the plot and use the arrow keys.</p>
        </li>
        <li>
          <span>03</span>
          <strong>The values behind it</strong>
          <p>Open the data table. Wednesday is a real zero.</p>
        </li>
      </ol>
      <ChartFrame
        data={data}
        series={[{ key: "minutes", label: "Focus minutes", color: "blue" }]}
        caption="Focus minutes by weekday"
        description="One complete composition: frame, legend, plot, inspector and accessible data."
        appearance="analysis"
      >
        {(plot) => (
          <>
            <g className="v-chart-grid" aria-hidden="true">
              {[0, 20, 40].map((value) => {
                const y = plot.bottom - (value / 40) * (plot.bottom - plot.top);
                return (
                  <g key={value}>
                    <line x1={plot.left} x2={plot.right} y1={y} y2={y} />
                    <text x={plot.left - 8} y={y + 4} textAnchor="end">
                      {value}
                    </text>
                  </g>
                );
              })}
            </g>
            {plot.data.map((point, index) => {
              const cell = (plot.right - plot.left) / plot.data.length,
                height =
                  (Number(point.minutes) / 40) * (plot.bottom - plot.top),
                x = plot.left + cell * index;
              return (
                <g key={point.label}>
                  <rect
                    data-slot="chart-mark"
                    x={x + cell * 0.2}
                    y={plot.bottom - height}
                    width={cell * 0.6}
                    height={height}
                    rx={3}
                    fill="var(--v-blue)"
                    opacity={
                      plot.active === null || plot.active === index ? 1 : 0.35
                    }
                  />
                  <text
                    className="v-chart-note"
                    x={x + cell / 2}
                    y={plot.bottom + 22}
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </ChartFrame>
    </div>
  );
}
export function ChartTooltipExample() {
  const tooltipId = React.useId();
  const [active, setActive] = React.useState<number | null>(null);
  const [position, setPosition] = React.useState({ x: 30, y: 30 });
  const [width, setWidth] = React.useState(320);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const resize = () => setWidth(node.clientWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const inspect = (index: number) => {
    setActive(index);
    setPosition({ x: (width * (index + 0.5)) / 3, y: 45 });
  };
  return (
    <Card>
      <CardHeader className="grid gap-2">
        <CardTitle>Details, close to the data</CardTitle>
        <CardDescription>
          Hover or focus a moment to inspect its values. Escape closes the
          tooltip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={ref}
          style={{ position: "relative", height: 240 }}
          onPointerLeave={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setActive(null);
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Morning", "Afternoon", "Evening"].map((label, index) => (
              <Button
                key={label}
                variant={active === index ? "default" : "ghost"}
                onPointerEnter={() => inspect(index)}
                onPointerMove={(event) => {
                  const bounds = ref.current!.getBoundingClientRect();
                  setPosition({
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                  });
                }}
                onFocus={() => inspect(index)}
                onBlur={() => setActive(null)}
                aria-describedby={active === index ? tooltipId : undefined}
              >
                {label}
              </Button>
            ))}
          </div>
          <ChartTooltip
            id={tooltipId}
            active={
              active === null
                ? null
                : {
                    label: ["Morning", "Afternoon", "Evening"][active],
                    items: [
                      {
                        label: "Notes kept",
                        value: [12, 18, 8][active],
                        color: "pink",
                      },
                      {
                        label: "Ideas explored",
                        value: [8, 14, 12][active],
                        color: "blue",
                      },
                    ],
                  }
            }
            position={position}
            bounds={{ width, height: 240 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
