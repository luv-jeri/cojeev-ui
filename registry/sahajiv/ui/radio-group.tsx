"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-radio-group";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
export const radioGroupVariants = cva("v-radios grid gap-2", {
  variants: { pictographic: { true: "v-iradios", false: "" } },
  defaultVariants: { pictographic: false },
});
const RadioStyleContext = React.createContext(false);
export type RadioGroupProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof radioGroupVariants>;
export function RadioGroup({
  className,
  pictographic = false,
  ref,
  children,
  ...props
}: RadioGroupProps) {
  const flowRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: '[data-slot="radio-group-item"]',
    activeSelector: '[data-state="checked"]',
  });
  return (
    <RadioStyleContext.Provider value={!!pictographic}>
      <Primitive.Root
        ref={flowRef}
        data-slot="radio-group"
        data-part="root"
        data-flow-group={pictographic ? "" : undefined}
        data-flow={pictographic ? undefined : "off"}
        className={cn(radioGroupVariants({ pictographic }), className)}
        {...props}
      >
        {children}
      </Primitive.Root>
    </RadioStyleContext.Provider>
  );
}
export type RadioGroupItemProps = React.ComponentProps<
  typeof Primitive.Item
> & { pictographic?: boolean };
export function RadioGroupItem({
  className,
  pictographic,
  children,
  ref,
  ...props
}: RadioGroupItemProps) {
  const morphRef = useMorph<HTMLButtonElement>("controls", ref);
  const inherited = React.useContext(RadioStyleContext);
  const icon = pictographic ?? inherited;
  return (
    <Primitive.Item
      ref={morphRef}
      data-slot="radio-group-item"
      data-part="item"
      data-pictographic={icon || undefined}
      className={cn(
        icon ? "v-iradio" : "v-radio inline-flex items-center gap-[var(--s-3)]",
        className,
      )}
      {...props}
    >
      <span data-slot="radio-group-indicator" data-part="indicator">
        <Primitive.Indicator data-slot="radio-group-dot" hidden />
      </span>
      {children}
    </Primitive.Item>
  );
}
export type RadioGroupBodyProps = React.ComponentProps<"span">;
export function RadioGroupBody({ className, ...props }: RadioGroupBodyProps) {
  return (
    <span
      data-slot="radio-group-body"
      className={cn("v-radio__body", className)}
      {...props}
    />
  );
}
