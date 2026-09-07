"use client";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
export const tableVariants = cva("v-table w-full border-collapse text-[13px]");
export type TableContainerProps = React.ComponentProps<"div">;
export function TableContainer({
  ref,
  className,
  onScroll,
  ...props
}: TableContainerProps) {
  const element = React.useRef<HTMLDivElement>(null);
  const mark = React.useCallback(() => {
    const el = element.current;
    if (!el) return;
    const room = el.scrollWidth - el.clientWidth;
    if (room < 2) el.removeAttribute("data-scrollable");
    else el.dataset.scrollable = el.scrollLeft >= room - 14 ? "end" : "more";
  }, []);
  React.useLayoutEffect(() => {
    const el = element.current;
    if (!el) return;
    const resize = new ResizeObserver(mark);
    const observe = () => {
      resize.disconnect();
      resize.observe(el);
      Array.from(el.children).forEach((child) => resize.observe(child));
      mark();
    };
    const mutation = new MutationObserver(observe);
    mutation.observe(el, { childList: true, subtree: true });
    observe();
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [mark]);
  const ownedMorphRef = useMorph<HTMLDivElement>("cards", (node) => {
        element.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      });
  return (
    <div
      ref={ownedMorphRef}
      data-slot="table-container"
      data-part="viewport"
      tabIndex={0}
      className={cn(
        "v-table-wrap overflow-x-auto overflow-y-hidden rounded-[20px] bg-[var(--card)] pt-[6px] px-[10px] pb-[12px]",
        className,
      )}
      onScroll={(event) => {
        mark();
        onScroll?.(event);
      }}
      {...props}
    />
  );
}
export type TableProps = React.ComponentProps<"table">;
export function Table({ className, ...props }: TableProps) {
  return (
    <table
      data-slot="table"
      data-part="root"
      className={cn(tableVariants(), className)}
      {...props}
    />
  );
}
export type TableHeaderProps = React.ComponentProps<"thead">;
export function TableHeader(props: TableHeaderProps) {
  return <thead data-slot="table-header" {...props} />;
}
export type TableBodyProps = React.ComponentProps<"tbody">;
export function TableBody(props: TableBodyProps) {
  return <tbody data-slot="table-body" {...props} />;
}
export type TableFooterProps = React.ComponentProps<"tfoot">;
export function TableFooter(props: TableFooterProps) {
  return <tfoot data-slot="table-footer" {...props} />;
}
export type TableRowProps = React.ComponentProps<"tr">;
export function TableRow(props: TableRowProps) {
  return <tr data-slot="table-row" {...props} />;
}
export type TableHeadProps = React.ComponentProps<"th"> & { numeric?: boolean };
export function TableHead({ className, numeric, ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        "h-[44px] px-[12px] py-0 text-left text-[11px] font-semibold tracking-[.07em] uppercase text-[color:var(--v-text-2)] whitespace-nowrap",
        numeric && "-num text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
export type TableCellProps = React.ComponentProps<"td"> & { numeric?: boolean };
export function TableCell({ className, numeric, ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-[60px] px-[12px] py-0 align-middle text-[14px] whitespace-nowrap",
        numeric && "-num text-right tabular-nums font-semibold",
        className,
      )}
      {...props}
    />
  );
}
export type TableCaptionProps = React.ComponentProps<"caption">;
export function TableCaption({ className, ...props }: TableCaptionProps) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "text-[length:var(--fs-meta)] text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    />
  );
}
