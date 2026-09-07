"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-navigation-menu";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
export const navigationMenuVariants = cva("v-nav [display:grid] [gap:2px]");
export type NavigationMenuProps = React.ComponentProps<typeof Primitive.Root>;
export function NavigationMenu({
  className,
  ref,
  orientation = "vertical",
  ...props
}: NavigationMenuProps) {
  const flowRef = useFlowGroup<HTMLElement>(ref, {
    itemSelector: ".v-nav__item",
    activeSelector: '[aria-current="page"]',
  });
  return (
    <Primitive.Root
      ref={flowRef}
      orientation={orientation}
      data-slot="navigation-menu"
      data-part="root"
      className={cn(navigationMenuVariants(), className)}
      {...props}
    />
  );
}
export type NavigationMenuListProps = React.ComponentProps<
  typeof Primitive.List
>;
export function NavigationMenuList({
  className,
  ...props
}: NavigationMenuListProps) {
  return (
    <Primitive.List
      data-slot="navigation-menu-list"
      className={cn("grid", className)}
      {...props}
    />
  );
}
export type NavigationMenuItemProps = React.ComponentProps<
  typeof Primitive.Item
>;
export function NavigationMenuItem(props: NavigationMenuItemProps) {
  return <Primitive.Item data-slot="navigation-menu-item" {...props} />;
}
export type NavigationMenuLinkProps = React.ComponentProps<
  typeof Primitive.Link
>;
export function NavigationMenuLink({
  className,
  active,
  ref,
  ...props
}: NavigationMenuLinkProps) {
  const morphRef = useMorph<HTMLAnchorElement>("nav", ref);
  return (
    <Primitive.Link
      ref={morphRef}
      data-slot="navigation-menu-link"
      data-part="item"
      active={active}
      aria-current={active ? "page" : undefined}
      className={cn("v-nav__item", className)}
      {...props}
    />
  );
}
export type NavigationMenuGroupProps = React.ComponentProps<"div">;
export function NavigationMenuGroup({
  className,
  ...props
}: NavigationMenuGroupProps) {
  return (
    <div
      data-slot="navigation-menu-group"
      data-part="group"
      className={cn("v-nav__group", className)}
      {...props}
    />
  );
}
export type NavigationMenuCountProps = React.ComponentProps<"span">;
export function NavigationMenuCount({
  className,
  ref,
  ...props
}: NavigationMenuCountProps) {
  const morphRef = useMorph<HTMLSpanElement>("pills", ref);
  return (
    <span
      ref={morphRef}
      data-slot="navigation-menu-count"
      data-part="indicator"
      className={cn("v-nav__count", className)}
      {...props}
    />
  );
}
export type NavigationMenuTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function NavigationMenuTrigger({
  className,
  ...props
}: NavigationMenuTriggerProps) {
  return (
    <Primitive.Trigger
      data-slot="navigation-menu-trigger"
      data-part="trigger"
      className={cn("v-nav__item", className)}
      {...props}
    />
  );
}
export type NavigationMenuContentProps = React.ComponentProps<
  typeof Primitive.Content
>;
export function NavigationMenuContent(props: NavigationMenuContentProps) {
  return (
    <Primitive.Content
      data-slot="navigation-menu-content"
      data-part="content"
      {...props}
    />
  );
}
export type NavigationMenuViewportProps = React.ComponentProps<
  typeof Primitive.Viewport
>;
export function NavigationMenuViewport(props: NavigationMenuViewportProps) {
  return (
    <Primitive.Viewport
      data-slot="navigation-menu-viewport"
      data-part="viewport"
      {...props}
    />
  );
}
export type NavigationMenuIndicatorProps = React.ComponentProps<
  typeof Primitive.Indicator
>;
export function NavigationMenuIndicator(props: NavigationMenuIndicatorProps) {
  return (
    <Primitive.Indicator
      data-slot="navigation-menu-indicator"
      data-part="indicator"
      {...props}
    />
  );
}

export type NavigationMenuLabelProps = React.ComponentProps<"span">;
export function NavigationMenuLabel({
  className,
  ...props
}: NavigationMenuLabelProps) {
  return (
    <span
      data-slot="navigation-menu-label"
      className={cn("v-nav__label", className)}
      {...props}
    />
  );
}
