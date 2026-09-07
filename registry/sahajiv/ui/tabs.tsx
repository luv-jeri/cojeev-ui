"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-tabs";
import {
  useFlowGroup,
  useFlowAppearance,
} from "@/registry/sahajiv/motion/use-flow";
import { useFlowPress } from "@/registry/sahajiv/motion/flow-press";
export const tabsVariants = cva("v-tabs [display:flex] [gap:var(--s-6)]", {
  variants: {
    variant: {
      default: "-pills gap-[var(--s-2)]",
      underline: "-underline gap-[var(--s-6)]",
      lenses: "-lenses gap-[var(--s-6)]",
    },
  },
  defaultVariants: { variant: "default" },
});
const TabsVariantContext =
  React.createContext<VariantProps<typeof tabsVariants>["variant"]>("default");
export type TabsProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof tabsVariants>;
export function Tabs({
  className,
  variant = "default",
  children,
  ...props
}: TabsProps) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <Primitive.Root data-slot="tabs" className={className} {...props}>
        {children}
      </Primitive.Root>
    </TabsVariantContext.Provider>
  );
}
export type TabsListProps = React.ComponentProps<typeof Primitive.List> &
  VariantProps<typeof tabsVariants>;
export function TabsList({ className, variant, ref, ...props }: TabsListProps) {
  const morphRef = useMorph<HTMLDivElement>("nav", ref);
  const inherited = React.useContext(TabsVariantContext);
  const resolved = variant ?? inherited;
  const flowRef = useFlowGroup<HTMLDivElement>(morphRef, {
    kind: resolved === "underline" ? "bar" : "pill",
    itemSelector: '[data-slot="tabs-trigger"]',
    activeSelector: '[aria-selected="true"]',
  });
  return (
    <Primitive.List
      ref={flowRef}
      data-slot="tabs-list"
      data-part="root"
      data-flow-group=""
      className={cn(tabsVariants({ variant: resolved }), className)}
      {...props}
    />
  );
}
export type TabsTriggerProps = React.ComponentProps<typeof Primitive.Trigger>;
export function TabsTrigger({ className, ref, ...props }: TabsTriggerProps) {
  const morphRef = useMorph<HTMLButtonElement>("nav", ref);
  const flowRef = useFlowPress<HTMLButtonElement>(morphRef);
  return (
    <Primitive.Trigger
      ref={flowRef}
      data-slot="tabs-trigger"
      data-part="trigger"
      className={cn("v-tab shrink-0", className)}
      {...props}
    />
  );
}
export type TabsContentProps = React.ComponentProps<typeof Primitive.Content>;
export function TabsContent({ className, ref, ...props }: TabsContentProps) {
  const flowRef = useFlowAppearance<HTMLDivElement>(true, ref, "enter");
  return (
    <Primitive.Content
      ref={flowRef}
      data-slot="tabs-content"
      data-part="content"
      className={className}
      {...props}
    />
  );
}
