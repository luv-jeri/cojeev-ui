"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "react-resizable-panels";
export const resizableVariants = cva(
  "v-resizable [height:var(--h,240px)] [background:var(--card)] [border-radius:22px] [overflow:hidden] [box-shadow:inset_0_0_0_1px_var(--v-border)] [isolation:isolate] flex",
  {
    variants: { variant: { default: "", v: "-v" } },
    defaultVariants: { variant: "default" },
  },
);
export type ResizablePanelGroupProps = React.ComponentProps<
  typeof Primitive.Group
> &
  VariantProps<typeof resizableVariants> & {
    direction?: "horizontal" | "vertical";
  };
export function ResizablePanelGroup({
  className,
  variant,
  direction,
  orientation,
  elementRef,
  style,
  ...props
}: ResizablePanelGroupProps) {
  const morphRef = useMorph<HTMLDivElement>("cards", elementRef);
  const resolved =
    orientation ?? direction ?? (variant === "v" ? "vertical" : "horizontal");
  return (
    <Primitive.Group
      elementRef={morphRef}
      data-slot="resizable"
      data-part="root"
      data-resizable=""
      orientation={resolved}
      style={{ height: "var(--h,240px)", ...style }}
      className={cn(
        resizableVariants({ variant: resolved === "vertical" ? "v" : "default" }),
        className,
      )}
      {...props}
    />
  );
}
export type ResizablePanelProps = React.ComponentProps<typeof Primitive.Panel>;
export function ResizablePanel({
  className,
  minSize = "15%",
  maxSize = "85%",
  ...props
}: ResizablePanelProps) {
  return (
    <Primitive.Panel
      data-slot="resizable-panel"
      data-part="content"
      minSize={minSize}
      maxSize={maxSize}
      className={cn(
        "v-resizable__pane min-w-0 overflow-auto",
        className,
      )}
      {...props}
    />
  );
}
export type ResizableHandleProps = React.ComponentProps<
  typeof Primitive.Separator
> & { withHandle?: boolean };
export function ResizableHandle({
  className,
  withHandle = true,
  children,
  ...props
}: ResizableHandleProps) {
  return (
    <Primitive.Separator
      data-slot="resizable-handle"
      data-part="thumb"
      data-with-handle={withHandle || undefined}
      className={cn(
        "v-resizable__handle grid place-items-center touch-none shrink-0 basis-2",
        className,
      )}
      {...props}
    >
      {children}
    </Primitive.Separator>
  );
}
