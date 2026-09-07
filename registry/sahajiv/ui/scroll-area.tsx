"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-scroll-area";
export const scrollAreaVariants = cva(
  "v-scroll [overflow:auto] [max-height:var(--h,240px)] [padding:6px_6px_6px_18px] [border-radius:20px] [box-shadow:inset_0_0_0_1px_var(--v-border)] [background:var(--v-canvas)] [padding-right:4px]",
  {
    variants: { variant: { default: "", ink: "-ink" } },
    defaultVariants: { variant: "default" },
  },
);
export type ScrollAreaProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof scrollAreaVariants> & { viewportClassName?: string };
export function ScrollArea({
  className,
  variant,
  children,
  viewportClassName,
  ...props
}: ScrollAreaProps) {
  return (
    <Primitive.Root
      data-slot="scroll-area"
      data-part="root"
      className={cn(scrollAreaVariants({ variant }), className)}
      {...props}
    >
      <Primitive.Viewport
        data-slot="scroll-area-viewport"
        data-part="viewport"
        className={cn(
          "size-full rounded-[inherit] max-h-[var(--h,240px)]",
          viewportClassName,
        )}
      >
        {children}
      </Primitive.Viewport>
      <ScrollBar />
      <Primitive.Corner data-slot="scroll-area-corner" />
    </Primitive.Root>
  );
}
export type ScrollBarProps = React.ComponentProps<typeof Primitive.Scrollbar>;
export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollBarProps) {
  return (
    <Primitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none",
        orientation === "vertical" ? "h-full w-3 p-1" : "h-3 flex-col p-1",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb
        data-slot="scroll-area-thumb"
        data-part="thumb"
        className="relative flex-1 rounded-full bg-[color-mix(in_oklab,var(--v-ink)_34%,transparent)]"
      />
    </Primitive.Scrollbar>
  );
}
