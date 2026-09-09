"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import * as Primitive from "@radix-ui/react-toggle";
import { useMorph } from "@/registry/cojeev/motion/use-morph";
import { useFlowPress } from "@/registry/cojeev/motion/flow-press";
export const toggleVariants = cva(
  "v-toggle [place-items:center] [border-radius:var(--r-pill)] [font-size:var(--fs-control)] [display:inline-flex] [align-items:center] [justify-content:center] [height:40px] [min-width:40px] [padding:0_16px] [gap:8px] [background:var(--v-canvas)] [color:var(--v-text-2)] [font-weight:500] [box-shadow:inset_0_0_0_1px_var(--v-edge)] [cursor:pointer]",
  {
    variants: {
      variant: {
        default: "",
        pressed: "-pressed",
        pink: "-pink",
        circle: "-circle w-10 px-0 rounded-full text-[12.5px] font-semibold",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export type ToggleProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof toggleVariants>;
export function Toggle({ ref, className, variant, ...props }: ToggleProps) {
  const morphRef = useMorph<HTMLButtonElement>("buttons", ref);
  const flowRef = useFlowPress(morphRef);
  return (
    <Primitive.Root
      ref={flowRef}
      data-slot="toggle"
      data-part="root"
      data-toggle=""
      className={cn(toggleVariants({ variant }), className)}
      {...props}
    />
  );
}
export type ToggleWellProps = React.ComponentProps<"div">;
export function ToggleWell({ className, ...props }: ToggleWellProps) {
  return (
    <div
      data-slot="toggle-well"
      className={cn("v-togglewell", className)}
      {...props}
    />
  );
}
