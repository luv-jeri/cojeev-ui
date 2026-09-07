"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-slider";
export const sliderVariants = cva(
  "v-slider [-webkit-appearance:none] [appearance:none] [width:100%] [height:10px] [border-radius:var(--r-pill)] [background:var(--v-beige)] [outline-offset:6px] [cursor:pointer] relative flex items-center touch-none select-none",
  {
    variants: { variant: { default: "", pink: "-pink" } },
    defaultVariants: { variant: "default" },
  },
);
export type SliderProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof sliderVariants> & {
    thumbLabel?: string | ((index: number) => string);
  };
export function Slider({
  className,
  variant,
  value,
  defaultValue = [50],
  min = 0,
  max = 100,
  thumbLabel,
  onValueChange,
  style,
  ...props
}: SliderProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const values = value ?? uncontrolledValue;
  const percent = max > min ? Math.min(100, Math.max(0, ((values[0] ?? min) - min) / (max - min) * 100)) : 0;
  const range = values.length > 1 || props.orientation === "vertical";
  const handleValueChange = (next: number[]) => {
    if (value === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  };
  return (
    <Primitive.Root
      data-slot="slider"
      data-part="track"
      data-range={range || undefined}
      className={cn(sliderVariants({ variant }), className)}
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      onValueChange={handleValueChange}
      style={{ "--p": `${percent}%`, ...style } as React.CSSProperties}
      {...props}
    >
      <Primitive.Track
        data-slot="slider-track"
        className="relative grow h-full rounded-full"
      >
        <Primitive.Range
          data-slot="slider-range"
          className="absolute h-full rounded-full"
        />
      </Primitive.Track>
      {values.map((_, index) => (
        <Primitive.Thumb
          key={index}
          data-slot="slider-thumb"
          data-part="thumb"
          aria-label={
            typeof thumbLabel === "function"
              ? thumbLabel(index)
              : (thumbLabel ??
                (values.length > 1 ? `Value ${index + 1}` : undefined))
          }
        />
      ))}
    </Primitive.Root>
  );
}
export type SliderWrapperProps = React.ComponentProps<"div">;
export function SliderWrapper({ className, ...props }: SliderWrapperProps) {
  return (
    <div
      data-slot="slider-wrapper"
      data-part="root"
      className={cn("v-sliderwrap grid gap-3", className)}
      {...props}
    />
  );
}
export type SliderRowProps = React.ComponentProps<"div">;
export function SliderRow({ className, ...props }: SliderRowProps) {
  return (
    <div
      data-slot="slider-row"
      className={cn("v-sliderwrap__row", className)}
      {...props}
    />
  );
}
export type SliderOutputProps = React.ComponentProps<"output">;
export function SliderOutput({ className, ...props }: SliderOutputProps) {
  return (
    <output
      data-slot="slider-output"
      data-part="indicator"
      className={className}
      {...props}
    />
  );
}
