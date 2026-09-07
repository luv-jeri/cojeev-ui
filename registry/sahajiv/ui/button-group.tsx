"use client";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Button, type ButtonProps } from "@/registry/sahajiv/ui/button";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
import { IconButton } from "@/registry/sahajiv/ui/icon";
const ButtonGroupContext = React.createContext<{
  value?: string;
  change: (value: string) => void;
} | null>(null);
export const buttonGroupVariants = cva(
  "v-seg inline-flex flex-wrap gap-[2px] p-[3px] [border-radius:999px] bg-[var(--card)] [box-shadow:none]",
);
export type ButtonGroupProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};
export function ButtonGroup({
  ref,
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: ButtonGroupProps) {
  const [local, setLocal] = React.useState(defaultValue);
  const flowRef = useFlowGroup<HTMLDivElement>(ref);
  const change = (next: string) => {
    if (value === undefined) setLocal(next);
    onValueChange?.(next);
  };
  const ownedMorphRef = useMorph<HTMLDivElement>("nav", flowRef);
  return (
    <ButtonGroupContext.Provider value={{ value: value ?? local, change }}>
      <div
        ref={ownedMorphRef}
        data-slot="button-group"
        data-part="root"
        data-togglegroup=""
        role="group"
        className={cn(buttonGroupVariants(), className)}
        {...props}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}
export type ButtonGroupItemProps = ButtonProps & { value: string };
export function ButtonGroupItem({
  value,
  onClick,
  className,
  ...props
}: ButtonGroupItemProps) {
  const group = React.useContext(ButtonGroupContext);
  const pressed = group?.value === value;
  return (
    <Button
      data-slot="button-group-item"
      data-part="item"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      variant="default"
      size="sm"
      className={cn(
        "h-[36px] px-[14px] text-[13.5px] leading-none font-medium [border:0] [box-shadow:none] text-[color:var(--v-text-2)]",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) group?.change(value);
      }}
      {...props}
    />
  );
}
export type ButtonGroupUtilityProps = React.ComponentProps<"div"> & {
  shapes?: boolean;
};
export function ButtonGroupUtility({
  className,
  shapes,
  ...props
}: ButtonGroupUtilityProps) {
  return (
    <div
      data-slot="button-group-utility"
      data-shapes={shapes ? "" : undefined}
      role="group"
      className={cn(
        "v-utility inline-flex gap-[2px] p-[3px] [border-radius:999px] bg-[var(--card)] [box-shadow:none]",
        className,
      )}
      {...props}
    />
  );
}
export type ButtonGroupUtilityItemProps = React.ComponentProps<"button">;
export function ButtonGroupUtilityItem({
  ref,
  className,
  ...props
}: ButtonGroupUtilityItemProps) {
  return (
    <IconButton
      ref={ref}
      data-slot="button-group-utility-item"
      type="button"
      className={cn(
        "v-ibtn inline-grid place-items-center [width:38px] [height:38px] shrink-0 [border-radius:50%] [background:var(--v-ink)] [color:var(--v-on-accent)] [box-shadow:none]",
        className,
      )}
      {...props}
    />
  );
}
