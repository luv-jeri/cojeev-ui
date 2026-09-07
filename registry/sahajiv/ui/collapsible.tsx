"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Icon } from "@/registry/sahajiv/ui/icon";
import * as Primitive from "@radix-ui/react-collapsible";
export const collapsibleVariants = cva("v-collapsible");
export type CollapsibleProps = React.ComponentProps<typeof Primitive.Root>;
export function Collapsible({ className, ...props }: CollapsibleProps) {
  return (
    <Primitive.Root
      data-slot="collapsible"
      data-part="root"
      className={cn(collapsibleVariants(), className)}
      {...props}
    />
  );
}
export type CollapsibleTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
>;
export function CollapsibleTrigger({
  className,
  children,
  ...props
}: CollapsibleTriggerProps) {
  return (
    <Primitive.Trigger
      data-slot="collapsible-trigger"
      data-part="trigger"
      className={cn(
        "inline-flex items-center gap-1.5 h-8 text-[length:var(--fs-control)] text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </Primitive.Trigger>
  );
}
export type CollapsibleContentProps = React.ComponentProps<
  typeof Primitive.Content
>;
export function CollapsibleContent({
  className,
  ref,
  ...props
}: CollapsibleContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => contentRef.current!);
  const morphRef = useMorph<HTMLDivElement>("cards", contentRef);
  React.useEffect(() => {
    const content = contentRef.current;
    // Restore the source CSS entrance after Radix's initial size measurement.
    if (content?.dataset.state === "open" && content.style.animationName === "none") {
      content.style.animationName = props.style?.animationName ?? "";
    }
  }, [props.style?.animationName]);
  return (
    <Primitive.Content
      ref={morphRef}
      data-slot="collapsible-content"
      data-part="content"
      className={cn(
        "v-collapsible__body mt-[var(--s-2)] py-[var(--s-3)] px-[var(--s-4)] bg-[var(--card)] rounded-[var(--r-md)] text-[13px]",
        className,
      )}
      {...props}
    />
  );
}
export type CollapsibleIndicatorProps = React.ComponentProps<"svg">;
export function CollapsibleIndicator({
  className,
  ...props
}: CollapsibleIndicatorProps) {
  return (
    <Icon
      name="chevron-down"
      data-slot="collapsible-indicator"
      data-part="indicator"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("v-icon v-chev", className)}
      {...props}
    />
  );
}
