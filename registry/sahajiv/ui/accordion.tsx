"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Icon } from "@/registry/sahajiv/ui/icon";
import * as Primitive from "@radix-ui/react-accordion";
export const accordionVariants = cva("v-acc [display:grid] [gap:8px]");
export type AccordionProps = React.ComponentProps<typeof Primitive.Root>;
export function Accordion({ className, ...props }: AccordionProps) {
  return (
    <Primitive.Root
      data-slot="accordion"
      data-part="root"
      className={cn(accordionVariants(), className)}
      {...props}
    />
  );
}
export type AccordionItemProps = React.ComponentProps<typeof Primitive.Item>;
export function AccordionItem({
  className,
  ref,
  ...props
}: AccordionItemProps) {
  const morphRef = useMorph<HTMLDivElement>("cards", ref);
  return (
    <Primitive.Item
      ref={morphRef}
      data-slot="accordion-item"
      data-part="item"
      className={cn(
        "overflow-hidden rounded-[18px] bg-[var(--card)]",
        className,
      )}
      {...props}
    />
  );
}
export type AccordionTriggerProps = React.ComponentProps<
  typeof Primitive.Trigger
> & { indicator?: React.ReactNode };
export function AccordionTrigger({
  className,
  children,
  indicator,
  ...props
}: AccordionTriggerProps) {
  return (
    <Primitive.Header className="contents">
      <Primitive.Trigger
        data-slot="accordion-trigger"
        data-part="trigger"
        className={cn(
          "flex w-full items-center text-left min-h-[60px] py-3 pl-3 pr-4 gap-3.5 rounded-[18px] font-semibold text-[length:var(--fs-body)] leading-[1.3]",
          className,
        )}
        {...props}
      >
        {children}
        {indicator ?? <AccordionIndicator />}
      </Primitive.Trigger>
    </Primitive.Header>
  );
}
export type AccordionContentProps = React.ComponentProps<
  typeof Primitive.Content
>;
export function AccordionContent({
  className,
  ref,
  children,
  ...props
}: AccordionContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => contentRef.current!);
  React.useEffect(() => {
    const content = contentRef.current;
    // Radix suppresses the first entrance while measuring. Restore the authored
    // animation once that measurement has finished, including initially open items.
    if (content?.dataset.state === "open" && content.style.animationName === "none") {
      content.style.animationName = props.style?.animationName ?? "";
    }
  }, [props.style?.animationName]);
  return (
    <Primitive.Content
      ref={contentRef}
      data-slot="accordion-content"
      data-part="content"
      className={cn("v-acc__body", className)}
      {...props}
    >
      {children}
    </Primitive.Content>
  );
}
export type AccordionIndicatorProps = React.ComponentProps<"svg">;
export function AccordionIndicator({
  className,
  ...props
}: AccordionIndicatorProps) {
  return (
    <Icon
      name="chevron-down"
      data-slot="accordion-indicator"
      data-part="indicator"
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("v-icon v-chev ml-auto", className)}
      {...props}
    />
  );
}
