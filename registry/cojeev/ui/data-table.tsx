"use client";
import * as React from "react";
import { cn } from "@/registry/cojeev/lib/utils";
import {
  Table,
  TableContainer,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  type TableContainerProps,
} from "@/registry/cojeev/ui/table";
import {
  Pagination,
  type PaginationProps,
} from "@/registry/cojeev/ui/pagination";
import { Button } from "@/registry/cojeev/ui/button";
import { MotionPresence, MotionSurface } from "@/registry/cojeev/ui/presence";
import { motionTokens } from "@/registry/cojeev/motion/choreography";
import { useFlowGroup } from "@/registry/cojeev/motion/use-flow";
export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  numeric?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
};
export type DataTableFilter<T> = {
  id: string;
  label: React.ReactNode;
  predicate: (row: T) => boolean;
};
export type DataTableProps<T> = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  data: T[];
  columns: DataTableColumn<T>[];
  /** The index is the row's position in data, before filtering or sorting. */
  getRowId?: (row: T, index: number) => string;
  filters?: DataTableFilter<T>[];
  filter?: string;
  defaultFilter?: string;
  onFilterChange?: (filter: string) => void;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  emptyMessage?: React.ReactNode;
  caption?: string;
  onRowClick?: (row: T) => void;
};
export function DataTable<T>({
  data,
  columns,
  getRowId,
  filters = [],
  filter,
  defaultFilter = "all",
  onFilterChange,
  page,
  defaultPage = 1,
  onPageChange,
  pageSize = 10,
  emptyMessage = "No matching records",
  caption,
  onRowClick,
  className,
  ...props
}: DataTableProps<T>) {
  const [localFilter, setLocalFilter] = React.useState(defaultFilter);
  const [localPage, setLocalPage] = React.useState(defaultPage);
  const [sort, setSort] = React.useState<{
    id: string;
    direction: "asc" | "desc";
  } | null>(null);
  const activeFilter = filter ?? localFilter;
  const selectedFilter = filters.find((f) => f.id === activeFilter);
  // Membership must retain a row's identity across filters, sorting and pages.
  // Consumers that insert/reorder source data should supply getRowId.
  const rows = React.useMemo(
    () =>
      data.map((row, sourceIndex) => ({
        row,
        id: getRowId?.(row, sourceIndex) ?? sourceIndex,
      })),
    [data, getRowId],
  );
  const filtered = React.useMemo(
    () =>
      selectedFilter
        ? rows.filter(({ row }) => selectedFilter.predicate(row))
        : rows,
    [rows, selectedFilter],
  );
  const sorted = React.useMemo(() => {
    const col = columns.find((c) => c.id === sort?.id);
    if (!sort || !col?.sortValue) return filtered;
    const value = col.sortValue;
    return [...filtered].sort((a, b) => {
      const av = value(a.row),
        bv = value(b.row);
      const delta =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? delta : -delta;
    });
  }, [filtered, columns, sort]);
  const size = Math.max(
    1,
    Math.floor(Number.isFinite(pageSize) ? pageSize : 10),
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.max(
    1,
    Math.min(
      totalPages,
      Math.floor(Number.isFinite(page ?? localPage) ? (page ?? localPage) : 1),
    ),
  );
  const visible = sorted.slice((current - 1) * size, current * size);
  const setPage = (next: number) => {
    if (page === undefined) setLocalPage(next);
    onPageChange?.(next);
  };
  const setFilter = (next: string) => {
    if (filter === undefined) setLocalFilter(next);
    onFilterChange?.(next);
    setPage(1);
  };
  return (
    <div
      data-slot="data-table"
      data-state={filtered.length ? "full" : "filtered-empty"}
      className={cn("grid gap-[16px]", className)}
      {...props}
    >
      {filters.length > 0 && (
        <DataTableFilters aria-label="Filter records">
          <DataTableFilterButton
            pressed={activeFilter === "all"}
            onClick={() => setFilter("all")}
          >
            All <span>{data.length}</span>
          </DataTableFilterButton>
          {filters.map((f) => (
            <DataTableFilterButton
              key={f.id}
              pressed={activeFilter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label} <span>{data.filter(f.predicate).length}</span>
            </DataTableFilterButton>
          ))}
        </DataTableFilters>
      )}
      <DataTableViewport>
        <Table>
          {caption && <caption className="v-sr">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  numeric={col.numeric}
                  className={col.className}
                  aria-sort={
                    sort?.id === col.id
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortValue
                        ? "none"
                        : undefined
                  }
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      className="text-inherit uppercase tracking-inherit"
                      onClick={() =>
                        setSort((old) => ({
                          id: col.id,
                          direction:
                            old?.id === col.id && old.direction === "asc"
                              ? "desc"
                              : "asc",
                        }))
                      }
                    >
                      {col.header}
                      {sort?.id === col.id &&
                        (sort.direction === "asc" ? " ↑" : " ↓")}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <MotionPresence>
              {visible.map(({ row, id }, index) => (
                <MotionSurface
                  key={id}
                  asChild
                  preset="fade"
                  delay={Math.min(index, 5) * motionTokens.stagger}
                >
                  <TableRow
                    data-row-id={id}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={(event) => {
                      if (event.defaultPrevented) return;
                      const target = event.target as Element;
                      if (
                        target.closest(
                          "button,a,input,select,textarea,summary,[role='button'],[role='link'],[role='checkbox'],[role='switch'],[role='radio'],[contenteditable='true'],[data-row-action]",
                        )
                      )
                        return;
                      onRowClick?.(row);
                    }}
                    onKeyDown={(event) => {
                      if (
                        onRowClick &&
                        !event.defaultPrevented &&
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.id}
                        numeric={col.numeric}
                        className={col.className}
                      >
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey === undefined
                            ? null
                            : String(row[col.accessorKey] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                </MotionSurface>
              ))}
            </MotionPresence>
          </TableBody>
        </Table>
      </DataTableViewport>
      <MotionPresence>
        {!filtered.length && (
          <MotionSurface key="empty" asChild preset="rise">
            <DataTableEmpty>
              <b className="v-state__word">{emptyMessage}</b>
              <span className="v-state__why">
                Try another filter to see more records.
              </span>
              {activeFilter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Clear filters
                </Button>
              )}
            </DataTableEmpty>
          </MotionSurface>
        )}
      </MotionPresence>
      <div className="flex items-center justify-between gap-[12px] flex-wrap">
        <span className="v-meta" role="status">
          {filtered.length} of {data.length} records
        </span>
        <DataTablePagination
          page={current}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
export type DataTableViewportProps = TableContainerProps;
export function DataTableViewport(props: DataTableViewportProps) {
  return <TableContainer data-part="viewport" {...props} />;
}
export type DataTableFiltersProps = React.ComponentProps<"div">;
export function DataTableFilters({
  ref,
  className,
  ...props
}: DataTableFiltersProps) {
  const flowRef = useFlowGroup<HTMLDivElement>(ref);
  return (
    <div
      ref={flowRef}
      data-slot="data-table-filters"
      data-part="filters"
      data-filters=""
      role="group"
      className={cn("v-tabs -pills flex gap-[var(--s-2)]", className)}
      {...props}
    />
  );
}
export type DataTableFilterButtonProps = React.ComponentProps<"button"> & {
  pressed?: boolean;
};
export function DataTableFilterButton({
  className,
  pressed,
  ...props
}: DataTableFilterButtonProps) {
  return (
    <button
      data-slot="data-table-filter-button"
      className={cn(
        "v-tab shrink-0 h-[var(--ctl-sm)] px-[14px] rounded-[var(--r-pill)] bg-[var(--v-beige)] text-[13px] font-medium text-[color:var(--v-text)]",
        className,
      )}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      {...props}
    />
  );
}
export type DataTablePaginationProps = PaginationProps;
export function DataTablePagination(props: DataTablePaginationProps) {
  return <Pagination data-part="pagination" {...props} />;
}
export type DataTableEmptyProps = React.ComponentProps<"div">;
export function DataTableEmpty({ className, ...props }: DataTableEmptyProps) {
  return (
    <div
      data-slot="data-table-empty"
      data-part="empty"
      className={cn(
        "v-state -filtered grid content-center justify-items-start gap-[var(--s-3)] p-[var(--s-6)] rounded-[var(--r-card)] bg-transparent border border-dashed border-[var(--v-border)] min-h-[160px]",
        className,
      )}
      role="status"
      {...props}
    />
  );
}
