"use client";

import * as React from "react";
import {
  SelectorGlyph,
  selectorStyle,
  type SelectorShape,
  type SelectorTone,
} from "@/registry/sahajiv/lib/selector";
export type {
  SelectorShape,
  SelectorTone,
} from "@/registry/sahajiv/lib/selector";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-checkbox";
export const checkboxVariants = cva(
  "v-check [display:inline-flex] [cursor:pointer] [background:none] [gap:12px] [align-items:center] [font-size:var(--fs-body)] [box-shadow:none] [border:0]",
);
export type CheckboxProps = React.ComponentProps<typeof Primitive.Root> & {
  shape?: SelectorShape;
  tone?: SelectorTone;
};
export function Checkbox({
  className,
  children,
  ref,
  shape = "organic",
  tone = "pink",
  style,
  checked: controlled,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const [local, setLocal] = React.useState<boolean | "indeterminate">(
    defaultChecked,
  );
  const checked = controlled ?? local;
  return (
    <Primitive.Root
      ref={ref}
      data-slot="checkbox"
      data-part="root"
      data-selector-shape={shape}
      style={selectorStyle(tone, style)}
      checked={checked}
      onCheckedChange={(next) => {
        if (controlled === undefined) setLocal(next);
        onCheckedChange?.(next);
      }}
      className={cn(checkboxVariants(), className)}
      {...props}
    >
      <span data-slot="checkbox-indicator" data-part="indicator">
        <SelectorGlyph
          shape={shape}
          tone={tone}
          state={checked}
          kind="checkbox"
          disabled={props.disabled}
        />
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
