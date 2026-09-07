"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-menubar";
import {
  useFlowAppearance,
  useFlowGroup,
} from "@/registry/sahajiv/motion/use-flow";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";

export type MenubarProps = React.ComponentProps<typeof Primitive.Root>;
export function Menubar({ className, ...props }: MenubarProps) {
  return (
    <Primitive.Root
      data-slot="menubar"
      data-part="root"
      className={cn(
        "v-menubar inline-flex gap-[var(--s-1)] p-1 bg-[var(--card)] rounded-[var(--r-pill)]",
        className,
      )}
      {...props}
    />
  );
}
export type MenubarMenuProps = React.ComponentProps<typeof Primitive.Menu>;
export function MenubarMenu(props: MenubarMenuProps) {
  return <Primitive.Menu {...props} />;
}
export type MenubarPortalProps = React.ComponentProps<typeof Primitive.Portal>;
export function MenubarPortal(props: MenubarPortalProps) {
  return <Primitive.Portal {...props} />;
}
export type MenubarGroupProps = React.ComponentProps<typeof Primitive.Group>;
export function MenubarGroup(props: MenubarGroupProps) {
  return <Primitive.Group data-slot="menubar-group" {...props} />;
}
export type MenubarRadioGroupProps = React.ComponentProps<
  typeof Primitive.RadioGroup
>;
export function MenubarRadioGroup(props: MenubarRadioGroupProps) {
  return <Primitive.RadioGroup data-slot="menubar-radiogroup" {...props} />;
}
export type MenubarSubProps = React.ComponentProps<typeof Primitive.Sub>;
export function MenubarSub(props: MenubarSubProps) {
  return <Primitive.Sub {...props} />;
}
export type MenubarTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function MenubarTrigger({
  className,
  ref,
  ...props
}: MenubarTriggerProps) {
  const morphRef = useMorph<HTMLButtonElement>("buttons", ref);
  return (
    <Primitive.Trigger
      ref={morphRef}
      data-slot="menubar-trigger"
      data-part="trigger"
      data-menu=""
      className={cn(
        "v-menubar__trigger h-8 px-[var(--s-4)] rounded-[var(--r-pill)] text-[length:var(--fs-control)] font-medium",
        className,
      )}
      {...props}
    />
  );
}
export const menubarContentVariants = cva(
  "v-menu [background:var(--popover)] [border-radius:var(--r-card-sm)] [padding:var(--s-2)] [min-width:200px] [box-shadow:var(--shadow-float)] [border:1px_solid_var(--v-border)] [display:grid] [gap:2px]",
);
export type MenubarContentProps = React.ComponentProps<
  typeof Primitive.Content
>;
export function MenubarContent({
  className,
  ref,
  children,
  sideOffset = 6,
  ...props
}: MenubarContentProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[data-highlighted]",
  });
  const flowRef = useFlowAppearance<HTMLDivElement>(true, groupRef, "grow");
  return (
    <Primitive.Portal>
      <Primitive.Content
        ref={flowRef}
        data-slot="menubar-content"
        data-part="content"
        sideOffset={sideOffset}
        className={cn(menubarContentVariants(), className)}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export type MenubarSubContentProps = React.ComponentProps<
  typeof Primitive.SubContent
>;
export function MenubarSubContent({
  className,
  ref,
  ...props
}: MenubarSubContentProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[data-highlighted]",
  });
  const flowRef = useFlowAppearance<HTMLDivElement>(true, groupRef, "grow");
  return (
    <Primitive.Portal>
      <Primitive.SubContent
        ref={flowRef}
        data-slot="menubar-sub-content"
        data-part="content"
        className={cn(menubarContentVariants(), className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
export type MenubarItemProps = React.ComponentProps<typeof Primitive.Item> & {
  variant?: "default" | "danger";
  inset?: boolean;
};
export function MenubarItem({
  className,
  variant,
  inset,
  ...props
}: MenubarItemProps) {
  return (
    <Primitive.Item
      data-slot="menubar-item"
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
export type MenubarSubTriggerProps = React.ComponentProps<
  typeof Primitive.SubTrigger
> & { inset?: boolean };
export function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenubarSubTriggerProps) {
  return (
    <Primitive.SubTrigger
      data-slot="menubar-sub-trigger"
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
export type MenubarCheckboxItemProps = React.ComponentProps<
  typeof Primitive.CheckboxItem
>;
export function MenubarCheckboxItem({
  className,
  children,
  ...props
}: MenubarCheckboxItemProps) {
  return (
    <Primitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      <Primitive.ItemIndicator
        data-slot="menubar-item-indicator"
        data-part="indicator"
      >
        ✓
      </Primitive.ItemIndicator>
      {children}
    </Primitive.CheckboxItem>
  );
}
export type MenubarRadioItemProps = React.ComponentProps<
  typeof Primitive.RadioItem
>;
export function MenubarRadioItem({
  className,
  children,
  ...props
}: MenubarRadioItemProps) {
  return (
    <Primitive.RadioItem
      data-slot="menubar-radio-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      <Primitive.ItemIndicator
        data-slot="menubar-item-indicator"
        data-part="indicator"
      >
        ●
      </Primitive.ItemIndicator>
      {children}
    </Primitive.RadioItem>
  );
}
export type MenubarLabelProps = React.ComponentProps<typeof Primitive.Label>;
export function MenubarLabel({ className, ...props }: MenubarLabelProps) {
  return (
    <Primitive.Label
      data-slot="menubar-label"
      data-part="group"
      className={cn("v-menu__group", className)}
      {...props}
    />
  );
}
export type MenubarSeparatorProps = React.ComponentProps<
  typeof Primitive.Separator
>;
export function MenubarSeparator({
  className,
  ...props
}: MenubarSeparatorProps) {
  return (
    <Primitive.Separator
      data-slot="menubar-separator"
      data-part="separator"
      className={cn("v-menu__sep", className)}
      {...props}
    />
  );
}
export type MenubarShortcutProps = React.ComponentProps<"span">;
export function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn(
        "ml-auto text-[11px] text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
