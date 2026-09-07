"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import {
  useFlowAppearance,
  useFlowGroup,
} from "@/registry/sahajiv/motion/use-flow";

export type DropdownMenuProps = React.ComponentProps<typeof Primitive.Root>;
export function DropdownMenu(props: DropdownMenuProps) {
  return <Primitive.Root {...props} />;
}
export type DropdownMenuPortalProps = React.ComponentProps<
  typeof Primitive.Portal
>;
export function DropdownMenuPortal(props: DropdownMenuPortalProps) {
  return <Primitive.Portal {...props} />;
}
export type DropdownMenuGroupProps = React.ComponentProps<
  typeof Primitive.Group
>;
export function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  return <Primitive.Group data-slot="dropdown-menu-group" {...props} />;
}
export type DropdownMenuRadioGroupProps = React.ComponentProps<
  typeof Primitive.RadioGroup
>;
export function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  return (
    <Primitive.RadioGroup data-slot="dropdown-menu-radiogroup" {...props} />
  );
}
export type DropdownMenuSubProps = React.ComponentProps<typeof Primitive.Sub>;
export function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <Primitive.Sub {...props} />;
}
export type DropdownMenuTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function DropdownMenuTrigger({
  className,
  ref,
  ...props
}: DropdownMenuTriggerProps) {
  return (
    <Primitive.Trigger
      ref={ref}
      data-slot="dropdown-menu-trigger"
      data-part="trigger"
      data-menu=""
      className={cn("", className)}
      {...props}
    />
  );
}
export const dropdownmenuContentVariants = cva(
  "v-menu [background:var(--popover)] [border-radius:var(--r-card-sm)] [padding:var(--s-2)] [min-width:200px] [box-shadow:var(--shadow-float)] [border:1px_solid_var(--v-border)] [display:grid] [gap:2px]",
);
export type DropdownMenuContentProps = React.ComponentProps<
  typeof Primitive.Content
>;
export function DropdownMenuContent({
  className,
  ref,
  children,
  sideOffset = 6,
  ...props
}: DropdownMenuContentProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[data-highlighted]",
  });
  const flowRef = useFlowAppearance<HTMLDivElement>(true, groupRef, "grow");
  return (
    <Primitive.Portal>
      <Primitive.Content
        ref={flowRef}
        data-slot="dropdown-menu-content"
        data-part="content"
        sideOffset={sideOffset}
        className={cn(dropdownmenuContentVariants(), className)}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export type DropdownMenuSubContentProps = React.ComponentProps<
  typeof Primitive.SubContent
>;
export function DropdownMenuSubContent({
  className,
  ref,
  ...props
}: DropdownMenuSubContentProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[data-highlighted]",
  });
  const flowRef = useFlowAppearance<HTMLDivElement>(true, groupRef, "grow");
  return (
    <Primitive.Portal>
      <Primitive.SubContent
        ref={flowRef}
        data-slot="dropdown-menu-sub-content"
        data-part="content"
        className={cn(dropdownmenuContentVariants(), className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
export type DropdownMenuItemProps = React.ComponentProps<
  typeof Primitive.Item
> & { variant?: "default" | "danger"; inset?: boolean };
export function DropdownMenuItem({
  className,
  variant,
  inset,
  ...props
}: DropdownMenuItemProps) {
  return (
    <Primitive.Item
      data-slot="dropdown-menu-item"
      data-part="item"
      data-inset={inset || undefined}
      className={cn(
        "v-menu__item flex items-center gap-[var(--s-3)] min-h-10 px-[var(--s-3)] rounded-[var(--r-md)] text-[length:var(--fs-control)] w-full text-left whitespace-nowrap outline-none",
        variant === "danger" && "-danger",
        className,
      )}
      {...props}
    />
  );
}
export type DropdownMenuSubTriggerProps = React.ComponentProps<
  typeof Primitive.SubTrigger
> & { inset?: boolean };
export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <Primitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-part="item"
      data-inset={inset || undefined}
      className={cn("v-menu__item", className)}
      {...props}
    >
      {children}
      <span aria-hidden="true" className="ml-auto">
        ›
      </span>
    </Primitive.SubTrigger>
  );
}
export type DropdownMenuCheckboxItemProps = React.ComponentProps<
  typeof Primitive.CheckboxItem
>;
export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <Primitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      <Primitive.ItemIndicator
        data-slot="dropdown-menu-item-indicator"
        data-part="indicator"
      >
        ✓
      </Primitive.ItemIndicator>
      {children}
    </Primitive.CheckboxItem>
  );
}
export type DropdownMenuRadioItemProps = React.ComponentProps<
  typeof Primitive.RadioItem
>;
export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <Primitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      <Primitive.ItemIndicator
        data-slot="dropdown-menu-item-indicator"
        data-part="indicator"
      >
        ●
      </Primitive.ItemIndicator>
      {children}
    </Primitive.RadioItem>
  );
}
export type DropdownMenuLabelProps = React.ComponentProps<
  typeof Primitive.Label
>;
export function DropdownMenuLabel({
  className,
  ...props
}: DropdownMenuLabelProps) {
  return (
    <Primitive.Label
      data-slot="dropdown-menu-label"
      data-part="group"
      className={cn("v-menu__group", className)}
      {...props}
    />
  );
}
export type DropdownMenuSeparatorProps = React.ComponentProps<
  typeof Primitive.Separator
>;
export function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuSeparatorProps) {
  return (
    <Primitive.Separator
      data-slot="dropdown-menu-separator"
      data-part="separator"
      className={cn("v-menu__sep", className)}
      {...props}
    />
  );
}
export type DropdownMenuShortcutProps = React.ComponentProps<"span">;
export function DropdownMenuShortcut({
  className,
  ...props
}: DropdownMenuShortcutProps) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-[11px] text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
