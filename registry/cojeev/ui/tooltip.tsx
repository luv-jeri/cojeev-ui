"use client";

import * as React from "react";
import { useMorph } from "@/registry/cojeev/motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import * as Primitive from "@radix-ui/react-tooltip";
import { useFlowAppearance } from "@/registry/cojeev/motion/use-flow";
export type TooltipProps = React.ComponentProps<typeof Primitive.Root>;
export function Tooltip(props: TooltipProps) {
  return <Primitive.Root delayDuration={220} {...props} />;
}
export type TooltipProviderProps = React.ComponentProps<
  typeof Primitive.Provider
>;
export function TooltipProvider(props: TooltipProviderProps) {
  return <Primitive.Provider delayDuration={220} {...props} />;
}
export type TooltipTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function TooltipTrigger(props: TooltipTriggerProps) {
  return (
    <Primitive.Trigger
      data-slot="tooltip-trigger"
      data-part="trigger"
      {...props}
    />
  );
}
export type TooltipPortalProps = React.ComponentProps<typeof Primitive.Portal>;
export function TooltipPortal(props: TooltipPortalProps) {
  return <Primitive.Portal {...props} />;
}
export const tooltipContentVariants = cva(
  "v-tip -show bg-[var(--v-ink)] text-[color:var(--v-on-ink)] text-xs leading-[1.3] py-1.5 px-2.5 rounded-[var(--r-sm)] max-w-[260px] z-[var(--z-tooltip)]",
);
export type TooltipContentProps = React.ComponentProps<
  typeof Primitive.Content
> & { portal?: boolean };
export function TooltipContent({
  className,
  ref,
  children,
  sideOffset = 8,
  portal = true,
  ...props
}: TooltipContentProps) {
  const morphRef = useMorph<HTMLDivElement>("surfaces", ref);
  const flowRef = useFlowAppearance<HTMLDivElement>(true, morphRef, "grow");
  const content = (
    <Primitive.Content
      ref={flowRef}
      data-slot="tooltip-content"
      data-part="content"
      sideOffset={sideOffset}
      className={cn(tooltipContentVariants(), className)}
      {...props}
    >
      {children}
    </Primitive.Content>
  );
  return portal ? <Primitive.Portal>{content}</Primitive.Portal> : content;
}
