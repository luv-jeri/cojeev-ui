"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-switch";
export const switchVariants = cva(
  "v-switch [position:relative] [display:inline-block] [border-radius:var(--r-pill)] [flex:none] [cursor:pointer] [width:48px] [height:28px] [background:var(--v-beige)] [box-shadow:inset_0_0_0_1px_var(--v-edge)]",
);
export type SwitchProps = React.ComponentProps<typeof Primitive.Root>;
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <Primitive.Root
      data-slot="switch"
      data-part="root"
      className={cn(switchVariants(), className)}
      {...props}
    >
      <Primitive.Thumb data-slot="switch-thumb" data-part="thumb" />
    </Primitive.Root>
  );
}
export type SwitchRowProps = React.ComponentProps<"label">;
export function SwitchRow({ className, ...props }: SwitchRowProps) {
  return (
    <label
      data-slot="switch-row"
      className={cn("v-switchrow", className)}
      {...props}
    />
  );
}
