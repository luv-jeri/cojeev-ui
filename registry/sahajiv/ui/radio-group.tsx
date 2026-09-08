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
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-radio-group";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
export const radioGroupVariants = cva("v-radios grid gap-2", {
  variants: { pictographic: { true: "v-iradios", false: "" } },
  defaultVariants: { pictographic: false },
});
const RadioStyleContext = React.createContext<{
  pictographic: boolean;
  shape: SelectorShape;
  tone: SelectorTone;
  value?: string;
  disabled?: boolean;
}>({ pictographic: false, shape: "organic", tone: "pink" });
export type RadioGroupProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof radioGroupVariants> & {
    shape?: SelectorShape;
    tone?: SelectorTone;
  };
export function RadioGroup({
  className,
  pictographic = false,
  ref,
  children,
  shape = "organic",
  tone = "pink",
  value: controlled,
  defaultValue,
  onValueChange,
  ...props
}: RadioGroupProps) {
  const [local, setLocal] = React.useState(defaultValue);
  const value = controlled ?? local;
  const flowRef = useFlowGroup<HTMLDivElement>(ref, {
    itemSelector: '[data-slot="radio-group-item"]',
    activeSelector: '[data-state="checked"]',
  });
  return (
    <RadioStyleContext.Provider
      value={{
        pictographic: !!pictographic,
        shape,
        tone,
        value,
        disabled: props.disabled,
      }}
    >
      <Primitive.Root
        ref={flowRef}
        data-slot="radio-group"
        data-part="root"
        value={value}
        onValueChange={(next) => {
          if (controlled === undefined) setLocal(next);
          onValueChange?.(next);
        }}
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
> & { pictographic?: boolean; shape?: SelectorShape; tone?: SelectorTone };
export function RadioGroupItem({
  className,
  pictographic,
  shape,
  tone,
  style,
  children,
  ref,
  ...props
}: RadioGroupItemProps) {
  const inherited = React.useContext(RadioStyleContext);
  const icon = pictographic ?? inherited.pictographic;
  const selectedShape = shape ?? inherited.shape;
  const selectedTone = tone ?? inherited.tone;
  return (
    <Primitive.Item
      ref={ref}
      data-slot="radio-group-item"
      data-part="item"
      data-selector-shape={selectedShape}
      style={selectorStyle(selectedTone, style)}
      data-pictographic={icon || undefined}
      className={cn(
        icon ? "v-iradio" : "v-radio inline-flex items-center gap-[var(--s-3)]",
        className,
      )}
      {...props}
    >
      <span data-slot="radio-group-indicator" data-part="indicator">
        <SelectorGlyph
          shape={selectedShape}
          tone={selectedTone}
          state={inherited.value === props.value}
          disabled={props.disabled || inherited.disabled}
        />
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
