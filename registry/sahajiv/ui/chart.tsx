"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/registry/sahajiv/ui/table";
export type ChartDatum = {
  label: string;
  value: number | null;
  note?: string;
  variant?: "default" | "ink" | "dash" | "pink";
};
export type ChartContainerProps = React.ComponentProps<"figure">;
export function ChartContainer({ className, ...props }: ChartContainerProps) {
  return (
    <figure
      data-slot="chart-container"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}
export const chartVariants = cva(
  "v-bars flex items-end gap-[8px] h-[var(--h,88px)]",
);
export type ChartProps = React.ComponentProps<"div"> & {
  data?: ChartDatum[];
  max?: number;
  showTable?: boolean;
  caption?: string;
};
export function Chart({
  data,
  max,
  showTable = true,
  caption = "Chart data",
  className,
  children,
  ...props
}: ChartProps) {
  const ceiling =
    max ??
    Math.max(
      1,
      ...(data ?? []).map((d) => (Number.isFinite(d.value) ? d.value! : 0)),
    );
  return (
    <>
      <div
        data-slot="chart"
        data-part="root"
        className={cn(chartVariants(), className)}
        aria-label={data ? caption : undefined}
        role={data ? "img" : undefined}
        {...props}
      >
        {children ??
          data?.map((item, index) => (
            <ChartBar
              key={index}
              value={item.value ?? 0}
              max={ceiling}
              variant={item.value === null ? "dash" : item.variant}
              aria-label={`${item.label}: ${item.value ?? "missing"}`}
              title={`${item.label}: ${item.value ?? "missing"}`}
            />
          ))}
      </div>
      {data && showTable && <ChartDataTable data={data} caption={caption} />}
    </>
  );
}
export const chartBarVariants = cva(
  "flex-1 max-w-[16px] rounded-[var(--r-pill)] bg-[var(--wm,var(--v-beige))] h-[var(--p)] min-h-[8px]",
  {
    variants: {
      variant: {
        default: "",
        ink: "-ink bg-[var(--v-ink)]",
        dash: "-dash bg-transparent border border-dashed border-[var(--v-ink)]",
        pink: "-pink bg-[var(--v-pink)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export type ChartBarProps = React.ComponentProps<"i"> &
  VariantProps<typeof chartBarVariants> & { value: number; max?: number };
export function ChartBar({
  value,
  max = 100,
  variant,
  className,
  style,
  ...props
}: ChartBarProps) {
  return (
    <i
      data-slot="chart-bar"
      data-part="item"
      data-missing={variant === "dash" ? "" : undefined}
      className={cn(chartBarVariants({ variant }), className)}
      style={
        {
          "--p": `${Math.max(0, Math.min(100, max > 0 && Number.isFinite(value) && Number.isFinite(max) ? (value / max) * 100 : 0))}%`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
export type ChartAxisProps = React.ComponentProps<"div">;
export function ChartAxis({ className, ...props }: ChartAxisProps) {
  return (
    <div
      data-slot="chart-axis"
      data-part="label"
      className={cn(
        "v-axis flex justify-between text-[11px] text-[color:var(--muted-foreground)] mt-[8px] tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
export type ChartLineProps = React.ComponentProps<"svg"> & {
  data?: ChartDatum[];
  showTable?: boolean;
  caption?: string;
};
export function ChartLine({
  className,
  data,
  showTable = true,
  caption = "Line chart data",
  children,
  ...props
}: ChartLineProps) {
  const titleId = React.useId();
  return (
    <>
      <svg
        data-slot="chart-line"
        data-part="root"
        className={cn("v-line w-full h-[var(--h,120px)]", className)}
        viewBox="0 0 300 100"
        role="img"
        aria-labelledby={titleId}
        {...props}
      >
        <title id={titleId}>{caption}</title>
        {children}
      </svg>
      {data && showTable && <ChartDataTable caption={caption} data={data} />}
    </>
  );
}
export type ChartLinePathProps = React.ComponentProps<"path"> & {
  variant?: "hist" | "next" | "cross";
};
export function ChartLinePath({
  variant = "hist",
  className,
  ...props
}: ChartLinePathProps) {
  return (
    <path
      data-slot="chart-line-path"
      className={cn(`-${variant}`, className)}
      {...props}
    />
  );
}
export type ChartRingSegment = {
  label: string;
  value: number;
  color: "yellow" | "pink" | "blue" | "olive" | "ink" | "beige";
};
export type ChartRingProps = React.ComponentProps<"div"> & {
  segments: ChartRingSegment[];
  strokeWidth?: number;
  gap?: number;
  unit?: string;
  showTable?: boolean;
  draw?: boolean;
  caption?: string;
};
export function ChartRing({
  segments,
  strokeWidth = 12,
  gap = 6,
  unit = "",
  showTable = true,
  draw,
  className,
  children,
  caption = "Ring chart",
  ...props
}: ChartRingProps) {
  const clean = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = clean.reduce((sum, s) => sum + s.value, 0);
  const width = Math.max(
    1,
    Math.min(49, Number.isFinite(strokeWidth) ? strokeWidth : 12),
  );
  const r = 50 - width / 2;
  const circumference = 2 * Math.PI * r;
  const arcs = clean.map((segment, index) => ({
    segment,
    offset:
      (clean.slice(0, index).reduce((sum, s) => sum + s.value, 0) / total) *
      circumference,
    length: Math.max(
      0,
      (circumference * segment.value) / total -
        (Number.isFinite(gap) ? Math.max(0, gap) : 6),
    ),
  }));
  return (
    <>
      <div
        data-slot="chart-ring"
        data-part="root"
        data-empty={total ? undefined : ""}
        data-segs={clean.map((s) => `${s.color}:${s.value}`).join(",")}
        data-sw={width}
        className={cn(
          "v-ring relative grid place-items-center w-[min(100%,var(--sz,240px))] max-w-full h-auto aspect-square min-w-0 shrink",
          draw && "-draw",
          className,
        )}
        {...props}
      >
        {total > 0 ? (
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`${caption} — total ${total.toFixed(total % 1 ? 1 : 0)} ${unit}; a data table follows`}
          >
            <circle
              className="-track"
              cx="50"
              cy="50"
              r={r}
              style={{ "--sw": width } as React.CSSProperties}
            />
            {arcs.map(({ segment, offset, length }, index) => (
              <circle
                key={index}
                cx="50"
                cy="50"
                r={r}
                stroke={`var(--v-${segment.color})`}
                style={{ "--sw": width } as React.CSSProperties}
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
              />
            ))}
          </svg>
        ) : (
          <p className="v-meta">No data to plot.</p>
        )}
        {children ?? (
          <ChartRingCenter>
            <span data-total="" className="v-hero">
              {total ? total.toFixed(total % 1 ? 1 : 0) : "—"}
            </span>
            {unit && <span className="v-caption">{unit}</span>}
          </ChartRingCenter>
        )}
      </div>
      {showTable && (
        <ChartDataTable
          caption={`${caption} — ${unit}`}
          data={clean.map((s) => ({
            label: s.label,
            value: s.value,
            note: `${Math.round((s.value / total) * 100)}%`,
          }))}
        />
      )}
    </>
  );
}
export type ChartRingCenterProps = React.ComponentProps<"div">;
export function ChartRingCenter({ className, ...props }: ChartRingCenterProps) {
  return (
    <div
      data-slot="chart-ring-center"
      className={cn(
        "v-ring__c absolute grid justify-items-center gap-[2px]",
        className,
      )}
      {...props}
    />
  );
}
export type ChartRankedRowProps = React.ComponentProps<"div">;
export function ChartRankedRow({ className, ...props }: ChartRankedRowProps) {
  return (
    <div
      data-slot="chart-ranked-row"
      className={cn(
        "v-prow flex items-center gap-[var(--s-4)] min-h-[var(--utility)]",
        className,
      )}
      {...props}
    />
  );
}
export type ChartRankedLabelProps = React.ComponentProps<"div">;
export function ChartRankedLabel({
  className,
  ...props
}: ChartRankedLabelProps) {
  return (
    <div
      data-slot="chart-ranked-label"
      className={cn("v-prow__lab flex-1 min-w-0 grid gap-[6px]", className)}
      {...props}
    />
  );
}
export type ChartRankedValueProps = React.ComponentProps<"span">;
export function ChartRankedValue({
  className,
  ...props
}: ChartRankedValueProps) {
  return (
    <span
      data-slot="chart-ranked-value"
      className={cn(
        "v-prow__val text-[20px] font-bold tabular-nums whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}
export type ChartDataTableProps = {
  data: ChartDatum[];
  caption?: string;
  visuallyHidden?: boolean;
};
export function ChartDataTable({
  data,
  caption = "Chart data",
  visuallyHidden = true,
}: ChartDataTableProps) {
  return (
    <Table
      data-slot="chart-data-table"
      className={visuallyHidden ? "v-sr" : undefined}
    >
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead numeric>Value</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.label}</TableCell>
            <TableCell numeric>{item.value ?? "—"}</TableCell>
            <TableCell>
              {item.note ?? (item.value === null ? "Not observed" : "")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
