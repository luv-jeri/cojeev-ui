"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-context-menu";
import {
  useFlowAppearance,
  useFlowGroup,
} from "@/registry/sahajiv/motion/use-flow";

export type ContextMenuProps = React.ComponentProps<typeof Primitive.Root>;
export function ContextMenu(props: ContextMenuProps) {
  return <Primitive.Root {...props} />;
}
export type ContextMenuPortalProps = React.ComponentProps<
  typeof Primitive.Portal
>;
export function ContextMenuPortal(props: ContextMenuPortalProps) {
  return <Primitive.Portal {...props} />;
}
export type ContextMenuGroupProps = React.ComponentProps<
  typeof Primitive.Group
>;
export function ContextMenuGroup(props: ContextMenuGroupProps) {
  return <Primitive.Group data-slot="context-menu-group" {...props} />;
}
export type ContextMenuRadioGroupProps = React.ComponentProps<
  typeof Primitive.RadioGroup
>;
export function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps) {
  return (
    <Primitive.RadioGroup data-slot="context-menu-radiogroup" {...props} />
  );
}
export type ContextMenuSubProps = React.ComponentProps<typeof Primitive.Sub>;
export function ContextMenuSub(props: ContextMenuSubProps) {
  return <Primitive.Sub {...props} />;
}
export type ContextMenuTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function ContextMenuTrigger({
  className,
  ref,
  onKeyDown,
  ...props
}: ContextMenuTriggerProps) {
  return (
    <Primitive.Trigger
      ref={ref}
      data-slot="context-menu-trigger"
      data-part="trigger"
      data-context=""
      tabIndex={0}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || props.disabled) return;
        if (
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        ) {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
            }),
          );
        }
      }}
      className={cn("", className)}
      {...props}
    />
  );
}
export const contextmenuContentVariants = cva(
  "v-menu [background:var(--popover)] [border-radius:var(--r-card-sm)] [padding:var(--s-2)] [min-width:200px] [box-shadow:var(--shadow-float)] [border:1px_solid_var(--v-border)] [display:grid] [gap:2px]",
);
export type ContextMenuContentProps = React.ComponentProps<
  typeof Primitive.Content
>;
export function ContextMenuContent({
  className,
  ref,
  children,
  ...props
}: ContextMenuContentProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[data-highlighted]",
  });
  const flowRef = useFlowAppearance<HTMLDivElement>(true, groupRef, "grow");
  return (
    <Primitive.Portal>
      <Primitive.Content
        ref={flowRef}
        data-slot="context-menu-content"
        data-part="content"
        className={cn(contextmenuContentVariants(), className)}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export type ContextMenuSubContentProps = React.ComponentProps<
  typeof Primitive.SubContent
>;
export function ContextMenuSubContent({
  className,
  ref,
  ...props
}: ContextMenuSubContentProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[data-highlighted]",
  });
  const flowRef = useFlowAppearance<HTMLDivElement>(true, groupRef, "grow");
  return (
    <Primitive.Portal>
      <Primitive.SubContent
        ref={flowRef}
        data-slot="context-menu-sub-content"
        data-part="content"
        className={cn(contextmenuContentVariants(), className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
export type ContextMenuItemProps = React.ComponentProps<
  typeof Primitive.Item
> & { variant?: "default" | "danger"; inset?: boolean };
export function ContextMenuItem({
  className,
  variant,
  inset,
  ...props
}: ContextMenuItemProps) {
  return (
    <Primitive.Item
      data-slot="context-menu-item"
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
export type ContextMenuSubTriggerProps = React.ComponentProps<
  typeof Primitive.SubTrigger
> & { inset?: boolean };
export function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuSubTriggerProps) {
  return (
    <Primitive.SubTrigger
      data-slot="context-menu-sub-trigger"
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
export type ContextMenuCheckboxItemProps = React.ComponentProps<
  typeof Primitive.CheckboxItem
>;
export function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: ContextMenuCheckboxItemProps) {
  return (
    <Primitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      <Primitive.ItemIndicator
        data-slot="context-menu-item-indicator"
        data-part="indicator"
      >
        ✓
      </Primitive.ItemIndicator>
      {children}
    </Primitive.CheckboxItem>
  );
}
export type ContextMenuRadioItemProps = React.ComponentProps<
  typeof Primitive.RadioItem
>;
export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ContextMenuRadioItemProps) {
  return (
    <Primitive.RadioItem
      data-slot="context-menu-radio-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      <Primitive.ItemIndicator
        data-slot="context-menu-item-indicator"
        data-part="indicator"
      >
        ●
      </Primitive.ItemIndicator>
      {children}
    </Primitive.RadioItem>
  );
}
export type ContextMenuLabelProps = React.ComponentProps<
  typeof Primitive.Label
>;
export function ContextMenuLabel({
  className,
  ...props
}: ContextMenuLabelProps) {
  return (
    <Primitive.Label
      data-slot="context-menu-label"
      data-part="group"
      className={cn("v-menu__group", className)}
      {...props}
    />
  );
}
export type ContextMenuSeparatorProps = React.ComponentProps<
  typeof Primitive.Separator
>;
export function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuSeparatorProps) {
  return (
    <Primitive.Separator
      data-slot="context-menu-separator"
      data-part="separator"
      className={cn("v-menu__sep", className)}
      {...props}
    />
  );
}
export type ContextMenuShortcutProps = React.ComponentProps<"span">;
export function ContextMenuShortcut({
  className,
  ...props
}: ContextMenuShortcutProps) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "ml-auto text-[11px] text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
