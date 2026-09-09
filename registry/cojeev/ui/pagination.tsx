"use client";
import { useMorph } from "@/registry/cojeev/motion/use-morph";
import * as React from "react";
import { useIsPresent } from "motion/react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import { useFlowGroup } from "@/registry/cojeev/motion/use-flow";
import { MotionPresence, MotionSurface } from "@/registry/cojeev/ui/presence";
export const paginationVariants = cva(
  "v-pager flex items-center gap-[var(--s-2)] flex-wrap",
);
export type PaginationProps = React.ComponentProps<"nav"> & {
  page?: number;
  defaultPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};
export function Pagination({
  ref,
  className,
  page,
  defaultPage = 1,
  totalPages,
  onPageChange,
  children,
  ...props
}: PaginationProps) {
  const [local, setLocal] = React.useState(defaultPage);
  const total = Math.max(
    1,
    Math.floor(Number.isFinite(totalPages) ? totalPages! : 1),
  );
  const current = Math.min(
    total,
    Math.max(
      1,
      Math.floor(Number.isFinite(page ?? local) ? (page ?? local) : 1),
    ),
  );
  const flowRef = useFlowGroup<HTMLElement>(ref);
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const change = (next: number) => {
    const clamped = Math.max(1, Math.min(total, next));
    if (page === undefined) setLocal(clamped);
    if (clamped !== current) onPageChange?.(clamped);
  };
  return (
    <nav
      ref={flowRef}
      data-slot="pagination"
      data-part="root"
      data-pager=""
      data-pages={total}
      data-page={current}
      aria-label="Pagination"
      className={cn(paginationVariants(), className)}
      {...props}
    >
      {children ?? (
        <>
          <PaginationPrevious
            disabled={current === 1}
            onClick={() => change(current - 1)}
          />
          <MotionPresence>
            {pages.flatMap((n, i) => [
              ...(i > 0 && n - pages[i - 1] > 1
                ? [
                    <MotionSurface
                      key={`gap:${pages[i - 1]}:${n}`}
                      asChild
                      preset="fade"
                    >
                      <PaginationEllipsis />
                    </MotionSurface>,
                  ]
                : []),
              <MotionSurface key={`page:${n}`} asChild preset="scale">
                <PaginationLink
                  isActive={n === current}
                  onClick={() => change(n)}
                >
                  {n}
                </PaginationLink>
              </MotionSurface>,
            ])}
          </MotionPresence>
          <PaginationNext
            disabled={current === total}
            onClick={() => change(current + 1)}
          />
          <span className="v-pager__info" aria-live="polite">
            Page {current} of {total}
          </span>
        </>
      )}
    </nav>
  );
}
export type PaginationContentProps = React.ComponentProps<"ul">;
export function PaginationContent({
  className,
  ...props
}: PaginationContentProps) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("contents list-none", className)}
      {...props}
    />
  );
}
export type PaginationItemProps = React.ComponentProps<"li">;
export function PaginationItem({ className, ...props }: PaginationItemProps) {
  return (
    <li
      data-slot="pagination-item"
      className={cn("contents", className)}
      {...props}
    />
  );
}
export type PaginationLinkProps = React.ComponentProps<"button"> & {
  isActive?: boolean;
};
export function PaginationLink({
  ref: externalMorphRef,
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  const present = useIsPresent();
  const ownedMorphRef = useMorph<HTMLButtonElement>("pills", externalMorphRef);
  return (
    <button
      ref={ownedMorphRef}
      type="button"
      data-slot="pagination-link"
      data-part="item"
      aria-current={present && isActive ? "page" : undefined}
      data-state={present && isActive ? "active" : "inactive"}
      className={cn(
        "min-w-[36px] h-[36px] px-[10px] py-0 rounded-[var(--r-pill)] text-[13px] font-medium bg-[var(--card)]",
        className,
      )}
      {...props}
    />
  );
}
export type PaginationPreviousProps = PaginationLinkProps;
export function PaginationPrevious({
  children,
  ...props
}: PaginationPreviousProps) {
  return (
    <PaginationLink aria-label="Previous" {...props}>
      {children ?? "‹"}
    </PaginationLink>
  );
}
export type PaginationNextProps = PaginationLinkProps;
export function PaginationNext({ children, ...props }: PaginationNextProps) {
  return (
    <PaginationLink aria-label="Next" {...props}>
      {children ?? "›"}
    </PaginationLink>
  );
}
export type PaginationEllipsisProps = React.ComponentProps<"span">;
export function PaginationEllipsis({
  className,
  ...props
}: PaginationEllipsisProps) {
  return (
    <span
      data-slot="pagination-ellipsis"
      aria-hidden="true"
      className={cn(
        "v-ellipsis px-[4px] text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    >
      …
    </span>
  );
}
