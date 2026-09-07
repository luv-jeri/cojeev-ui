"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-checkbox";
export const checkboxVariants = cva(
  "v-check [display:inline-flex] [cursor:pointer] [background:none] [gap:12px] [align-items:center] [font-size:var(--fs-body)] [box-shadow:none] [border:0]",
);
export type CheckboxProps = React.ComponentProps<typeof Primitive.Root>;
export function Checkbox({
  className,
  children,
  ref,
  ...props
}: CheckboxProps) {
  const morphRef = useMorph<HTMLButtonElement>("controls", ref);
  return (
    <Primitive.Root
      ref={morphRef}
      data-slot="checkbox"
      data-part="root"
      className={cn(checkboxVariants(), className)}
      {...props}
    >
      <span data-slot="checkbox-indicator" data-part="indicator">
        <Primitive.Indicator data-slot="checkbox-mark" hidden forceMount />
      </span>
      {children}
    </Primitive.Root>
  );
}
export type CheckboxGroupProps = React.ComponentProps<"div">;
export function CheckboxGroup({ className, ...props }: CheckboxGroupProps) {
  return (
    <div
      data-slot="checkbox-group"
      className={cn("v-checks grid gap-2", className)}
      {...props}
    />
  );
}
export type CheckboxBodyProps = React.ComponentProps<"span">;
export function CheckboxBody({ className, ...props }: CheckboxBodyProps) {
  return (
    <span
      data-slot="checkbox-body"
      className={cn("v-check__body grid gap-0.5 min-w-0", className)}
      {...props}
    />
  );
}
