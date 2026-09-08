"use client";

import * as React from "react";
import { createMotionLane, motionTokens, useChoreography } from "@/registry/sahajiv/motion/choreography";
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
  const { quiet } = useChoreography();
  const quietRef = React.useRef(quiet);
  const settle = React.useRef<(() => void) | null>(null);
  React.useLayoutEffect(() => {
    quietRef.current = quiet;
    if (quiet) settle.current?.();
  }, [quiet]);
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const originalHeight = content.style.height;
    const originalHidden = content.getAttribute("aria-hidden");
    const originalInert = content.inert;
    const lane = createMotionLane(content.getBoundingClientRect().height, height => {
      content.style.height = `${Math.max(0, height)}px`;
    });
    let observed: Element | null = null;
    let opened = content.dataset.state === "open";
    let initialized = false;
    const target = () => opened
      ? content.querySelector<HTMLElement>('[data-slot="accordion-content-inner"]')?.offsetHeight ?? 0
      : 0;
    const sync = (animate = true) => {
      opened = content.dataset.state === "open";
      content.inert = !opened || originalInert;
      if (!opened) content.setAttribute("aria-hidden", "true");
      else if (originalHidden === null) content.removeAttribute("aria-hidden");
      else content.setAttribute("aria-hidden", originalHidden);
      content.style.setProperty("--acc-exit-duration", quietRef.current ? "0s" : `${motionTokens.duration.exit + .04}s`);
      if (!animate || quietRef.current) lane.jump(target());
      else lane.to(target(), {
        duration: opened ? motionTokens.duration.enter : motionTokens.duration.exit,
        ease: [...(opened ? motionTokens.ease.enter : motionTokens.ease.exit)],
      });
    };
    const resize = new ResizeObserver(() => sync(initialized));
    const observeInner = () => {
      const inner = content.querySelector('[data-slot="accordion-content-inner"]');
      if (inner === observed) return;
      if (observed) resize.unobserve(observed);
      observed = inner;
      if (inner) resize.observe(inner);
    };
    const changes = new MutationObserver(() => { observeInner(); sync(); });
    changes.observe(content, { attributes: true, attributeFilter: ["data-state"], childList: true });
    observeInner();
    sync(false);
    initialized = true;
    // Radix suppresses the first authored animation during its measurement.
    content.style.animationName = props.style?.animationName ?? "";
    settle.current = () => sync(false);
    return () => {
      settle.current = null;
      changes.disconnect();
      resize.disconnect();
      lane.dispose();
      content.style.height = originalHeight;
      content.style.removeProperty("--acc-exit-duration");
      content.inert = originalInert;
      if (originalHidden === null) content.removeAttribute("aria-hidden");
      else content.setAttribute("aria-hidden", originalHidden);
    };
  }, [props.style?.animationName]);
  return (
    <Primitive.Content
      ref={contentRef}
      data-slot="accordion-content"
      data-part="content"
      className={cn("v-acc__body", className)}
      {...props}
    >
      <div data-slot="accordion-content-inner">{children}</div>
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
