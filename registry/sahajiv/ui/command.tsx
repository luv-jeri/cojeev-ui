"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Command as Primitive } from "cmdk";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  type DialogProps,
} from "@/registry/sahajiv/ui/dialog";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
import { Icon } from "@/registry/sahajiv/ui/icon";
export const commandVariants = cva(
  "v-cmd [background:var(--popover)] [width:min(520px,100%)] [overflow:hidden] [border:0] [box-shadow:var(--shadow-float),inset_0_0_0_1px_var(--v-border)] [border-radius:22px]",
);
export type CommandProps = React.ComponentProps<typeof Primitive>;
export function Command({ className, ...props }: CommandProps) {
  return (
    <Primitive
      data-slot="command"
      data-part="root"
      data-command=""
      className={cn(commandVariants(), className)}
      {...props}
    />
  );
}
export type CommandDialogProps = DialogProps & {
  title?: string;
  description?: string;
  className?: string;
};
export function CommandDialog({
  children,
  title = "Command palette",
  description = "Search for a command to run.",
  className,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className="p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Command className={className}>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}
export type CommandInputProps = React.ComponentProps<typeof Primitive.Input> & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};
export function CommandInput({
  className,
  leading,
  trailing,
  ...props
}: CommandInputProps) {
  return (
    <div data-slot="command-input-wrapper" className="v-cmd__input">
      {leading ?? <Icon name="search" />}
      <Primitive.Input
        data-slot="command-input"
        data-part="trigger"
        className={cn(
          "min-w-0 flex-1 bg-transparent border-0 outline-none text-[length:var(--fs-body)]",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  );
}
export type CommandListProps = React.ComponentProps<typeof Primitive.List>;
export function CommandList({ className, ref, ...props }: CommandListProps) {
  const groupRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: ".v-menu__item",
    activeSelector: "[aria-selected=true]",
  });
  return (
    <Primitive.List
      ref={groupRef}
      data-slot="command-list"
      data-part="content"
      className={cn("v-cmd__list", className)}
      {...props}
    />
  );
}
export type CommandEmptyProps = React.ComponentProps<typeof Primitive.Empty>;
export function CommandEmpty({ className, ...props }: CommandEmptyProps) {
  return (
    <Primitive.Empty
      data-slot="command-empty"
      data-part="empty"
      className={cn("v-cmd__empty", className)}
      {...props}
    />
  );
}
export type CommandGroupProps = React.ComponentProps<typeof Primitive.Group>;
export function CommandGroup({ className, ...props }: CommandGroupProps) {
  return (
    <Primitive.Group
      data-slot="command-group"
      data-part="group"
      className={className}
      {...props}
    />
  );
}
export type CommandItemProps = React.ComponentProps<typeof Primitive.Item> & {
  variant?: "default" | "danger";
};
export function CommandItem({
  className,
  variant,
  ...props
}: CommandItemProps) {
  return (
    <Primitive.Item
      data-slot="command-item"
      data-part="item"
      className={cn(
        "v-menu__item",
        variant === "danger" && "-danger",
        className,
      )}
      {...props}
    />
  );
}
export type CommandSeparatorProps = React.ComponentProps<
  typeof Primitive.Separator
>;
export function CommandSeparator({
  className,
  ...props
}: CommandSeparatorProps) {
  return (
    <Primitive.Separator
      data-slot="command-separator"
      data-part="separator"
      className={cn("v-menu__sep", className)}
      {...props}
    />
  );
}
export type CommandShortcutProps = React.ComponentProps<"span">;
export function CommandShortcut({ className, ...props }: CommandShortcutProps) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("v-kbd ml-auto", className)}
      {...props}
    />
  );
}
