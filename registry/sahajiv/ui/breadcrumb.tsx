"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Icon, IconButton } from "@/registry/sahajiv/ui/icon";
export const breadcrumbVariants = cva(
  "v-crumbs flex flex-wrap items-center gap-[10px] text-[14.5px] text-[color:var(--v-text-2)]",
);
export type BreadcrumbProps = React.ComponentProps<"nav">;
export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
  return (
    <nav
      data-slot="breadcrumb"
      data-part="root"
      aria-label="Breadcrumb"
      className={cn(breadcrumbVariants(), className)}
      {...props}
    />
  );
}
export type BreadcrumbListProps = React.ComponentProps<"ol">;
export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("contents list-none", className)}
      {...props}
    />
  );
}
export type BreadcrumbItemProps = React.ComponentProps<"li">;
export function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-[10px]", className)}
      {...props}
    />
  );
}
export type BreadcrumbLinkProps = React.ComponentProps<"a"> & {
  asChild?: boolean;
};
export function BreadcrumbLink({
  asChild,
  className,
  ...props
}: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="breadcrumb-link"
      data-part="item"
      className={cn(
        "inline h-auto p-0 rounded-[4px] bg-transparent [box-shadow:none] text-[color:var(--v-text-2)] font-normal no-underline",
        className,
      )}
      {...props}
    />
  );
}
export type BreadcrumbPageProps = React.ComponentProps<"span">;
export function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
  return (
    <span
      data-slot="breadcrumb-page"
      data-part="page"
      aria-current="page"
      data-state="active"
      className={cn(
        "inline h-auto p-0 bg-transparent text-[color:var(--v-text)] font-semibold tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
export type BreadcrumbSeparatorProps = React.ComponentProps<"li">;
export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("list-none inline-flex", className)}
      {...props}
    >
      {children ?? <Icon name="chevron-right" />}
    </li>
  );
}
export type BreadcrumbEllipsisProps = React.ComponentProps<"span">;
export function BreadcrumbEllipsis(props: BreadcrumbEllipsisProps) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      {...props}
    >
      …
    </span>
  );
}
export type BreadcrumbBackProps = React.ComponentProps<"button">;
export function BreadcrumbBack({
  ref,
  className,
  children,
  ...props
}: BreadcrumbBackProps) {
  return (
    <IconButton
      ref={ref}
      data-slot="breadcrumb-back"
      type="button"
      aria-label="Back"
      className={cn(
        "v-ibtn inline-grid place-items-center shrink-0 [width:36px] [height:36px] mr-[4px] [border-radius:50%] [border:0] [background:var(--v-canvas)] [color:var(--v-text)] [box-shadow:inset_0_0_0_1px_var(--v-edge)]",
        className,
      )}
      {...props}
    >
      {children ?? <Icon name="arrow-left" />}
    </IconButton>
  );
}
