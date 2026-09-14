"use client";
import { scrollAreaListChildren } from "@/registry/cojeev/ui/scroll-area";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import * as Primitive from "@radix-ui/react-menubar";
import {
  useFlowAppearance,
  useFlowGroup,
} from "@/registry/cojeev/motion/use-flow";
import { useMorph } from "@/registry/cojeev/motion/use-morph";
import { assignMotionRef } from "@/registry/cojeev/motion/refs";

function useRetainedMenuContentRef(ref?: React.Ref<HTMLDivElement>) {
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const composedRef = React.useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
    const release = assignMotionRef(ref, node);
    return () => {
      nodeRef.current = null;
      release();
    };
  }, [ref]);
  return { nodeRef, composedRef };
}

import { adornItem, adornMenuItem, itemText, type ItemAdornmentItemProps } from "@/registry/cojeev/ui/item-adornment";
import { StateChevron, AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";

export type MenubarProps = React.ComponentProps<typeof Primitive.Root>;
export function Menubar({ className, ref, ...props }: MenubarProps) {
  const morphRef = useMorph<HTMLDivElement>("nav", ref);
  return (
    <Primitive.Root
      ref={morphRef}
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
> & { chevron?: boolean };
export function MenubarTrigger({
  className,
  children,
  chevron = true,
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
    >{adornItem(children, false, "", props.asChild, chevron ? <StateChevron /> : null)}</Primitive.Trigger>
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
  onInteractOutside,
  ...props
}: MenubarContentProps) {
  const { nodeRef, composedRef } = useRetainedMenuContentRef(ref);
  const morphRef = useMorph<HTMLDivElement>("surfaces", composedRef);
  const groupRef = useFlowGroup<HTMLDivElement>(morphRef, {
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
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          // A retained closing menu must not dismiss the next menu when its
          // keyboard focus enters that sibling before the old exit finishes.
          if (nodeRef.current?.dataset.state === "closed") event.preventDefault();
        }}
      >
        {scrollAreaListChildren(children, props.asChild)}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export type MenubarSubContentProps = React.ComponentProps<
  typeof Primitive.SubContent
>;
export function MenubarSubContent({
  className,
  children,
  ref,
  onInteractOutside,
  ...props
}: MenubarSubContentProps) {
  const { nodeRef, composedRef } = useRetainedMenuContentRef(ref);
  const morphRef = useMorph<HTMLDivElement>("surfaces", composedRef);
  const groupRef = useFlowGroup<HTMLDivElement>(morphRef, {
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
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          if (nodeRef.current?.dataset.state === "closed") event.preventDefault();
        }}
      >{scrollAreaListChildren(children, props.asChild)}</Primitive.SubContent>
    </Primitive.Portal>
  );
}
export type MenubarItemProps = React.ComponentProps<typeof Primitive.Item> & {
  variant?: "default" | "danger";
  inset?: boolean;
} & ItemAdornmentItemProps;
export function MenubarItem({
  className,
  children,
  adornment,
  adornmentId,
  variant,
  inset,
  ref,
  ...props
}: MenubarItemProps) {
  const morphRef = useMorph<HTMLDivElement>("nav", ref);
  return (
    <Primitive.Item
      ref={morphRef}
      data-slot="menubar-item"
      data-part="item"
      data-inset={inset || undefined}
      className={cn(
        "v-menu__item flex items-center gap-[var(--s-3)] min-h-10 px-[var(--s-3)] rounded-[var(--r-md)] text-[length:var(--fs-control)] w-full text-left whitespace-nowrap outline-none",
        variant === "danger" && "-danger",
        className,
  children,
  adornment,
  adornmentId,
      )}
      {...props}
    >{adornMenuItem(children, adornment, adornmentId ?? props.textValue ?? props.id ?? itemText(children), props.asChild)}</Primitive.Item>
  );
}
export type MenubarSubTriggerProps = React.ComponentProps<
  typeof Primitive.SubTrigger
> & { inset?: boolean } & ItemAdornmentItemProps;
export function MenubarSubTrigger({
  className,
  adornment,
  adornmentId,
  inset,
  children,
  ref,
  ...props
}: MenubarSubTriggerProps) {
  const morphRef = useMorph<HTMLDivElement>("nav", ref);
  return (
    <Primitive.SubTrigger
      ref={morphRef}
      data-slot="menubar-sub-trigger"
      data-part="item"
      data-inset={inset || undefined}
      className={cn("v-menu__item", className)}
      {...props}
    >
      {adornMenuItem(children, adornment, adornmentId ?? props.textValue ?? props.id ?? itemText(children), props.asChild, <StateChevron direction="right" />)}
    </Primitive.SubTrigger>
  );
}
export type MenubarCheckboxItemProps = React.ComponentProps<
  typeof Primitive.CheckboxItem
> & ItemAdornmentItemProps;
export function MenubarCheckboxItem({
  className,
  adornment,
  adornmentId,
  children,
  ref,
  ...props
}: MenubarCheckboxItemProps) {
  const morphRef = useMorph<HTMLDivElement>("nav", ref);
  return (
    <Primitive.CheckboxItem
      ref={morphRef}
      data-slot="menubar-checkbox-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      {adornMenuItem(children, adornment, adornmentId ?? props.textValue ?? props.id ?? itemText(children), props.asChild, <span className="v-menu__check" aria-hidden="true"><Primitive.ItemIndicator data-slot="menubar-item-indicator" data-part="indicator"><AnimatedIcon name="check" preset="validation" /></Primitive.ItemIndicator></span>)}
    </Primitive.CheckboxItem>
  );
}
export type MenubarRadioItemProps = React.ComponentProps<
  typeof Primitive.RadioItem
> & ItemAdornmentItemProps;
export function MenubarRadioItem({
  className,
  adornment,
  adornmentId,
  children,
  ref,
  ...props
}: MenubarRadioItemProps) {
  const morphRef = useMorph<HTMLDivElement>("nav", ref);
  return (
    <Primitive.RadioItem
      ref={morphRef}
      data-slot="menubar-radio-item"
      data-part="item"
      className={cn("v-menu__item", className)}
      {...props}
    >
      {adornMenuItem(children, adornment, adornmentId ?? props.textValue ?? props.id ?? itemText(children), props.asChild, <span className="v-menu__check" aria-hidden="true"><Primitive.ItemIndicator data-slot="menubar-item-indicator" data-part="indicator"><AnimatedIcon name="dot" preset="validation" /></Primitive.ItemIndicator></span>)}
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
