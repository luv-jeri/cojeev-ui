"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-hover-card";
import { useFlowAppearance } from "@/registry/sahajiv/motion/use-flow";
export type HoverCardProps = React.ComponentProps<typeof Primitive.Root>;
export function HoverCard(props: HoverCardProps) {
  return <Primitive.Root openDelay={300} closeDelay={100} {...props} />;
}
export type HoverCardTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function HoverCardTrigger(props: HoverCardTriggerProps) {
  return (
    <Primitive.Trigger
      data-slot="hover-card-trigger"
      data-part="trigger"
      {...props}
    />
  );
}
export type HoverCardPortalProps = React.ComponentProps<
  typeof Primitive.Portal
>;
export function HoverCardPortal(props: HoverCardPortalProps) {
  return <Primitive.Portal {...props} />;
}
export const hoverCardContentVariants = cva(
  "v-popover [background:var(--popover)] [border-radius:var(--r-card)] [padding:var(--s-5)] [box-shadow:var(--shadow-float)] [border:1px_solid_var(--v-border)]",
);
export type HoverCardContentProps = React.ComponentProps<
  typeof Primitive.Content
> & { portal?: boolean };
export function HoverCardContent({
  className,
  ref,
  children,
  sideOffset = 6,
  portal = true,
  ...props
}: HoverCardContentProps) {
  const flowRef = useFlowAppearance<HTMLDivElement>(true, ref, "grow");
  const content = (
    <Primitive.Content
      ref={flowRef}
      data-slot="hover-card-content"
      data-part="content"
      sideOffset={sideOffset}
      className={cn(hoverCardContentVariants(), className)}
      {...props}
    >
      {children}
    </Primitive.Content>
  );
  return portal ? <Primitive.Portal>{content}</Primitive.Portal> : content;
}
