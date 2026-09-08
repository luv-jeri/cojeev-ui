"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Calendar, type CalendarProps } from "@/registry/sahajiv/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/registry/sahajiv/ui/popover";
import { Icon } from "@/registry/sahajiv/ui/icon";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { useFlowPress } from "@/registry/sahajiv/motion/flow-press";
export const datePickerVariants = cva("v-menuhost [display:inline-block]");
export type DatePickerProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  calendarProps?: Omit<CalendarProps, "selected" | "onSelect">;
  formatDate?: (date: Date) => string;
  triggerProps?: React.ComponentProps<"button">;
};
export function DatePicker(datePickerProps: DatePickerProps) {
  const {
    className,
    date,
    defaultDate,
    onDateChange,
    open,
    defaultOpen = false,
    onOpenChange,
    placeholder = "Pick a date",
    disabled,
    calendarProps,
    formatDate = (date) =>
      date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    triggerProps,
    ...props
  } = datePickerProps;
  const [internalDate, setInternalDate] = React.useState(defaultDate);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const value = Object.prototype.hasOwnProperty.call(datePickerProps, "date")
    ? date
    : internalDate;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Popover open={open ?? internalOpen} onOpenChange={setOpen}>
      <div
        data-slot="date-picker"
        data-part="root"
        data-datepicker=""
        className={cn(datePickerVariants(), className)}
        {...props}
      >
        <DatePickerTrigger disabled={disabled} {...triggerProps}>
          <Icon name="calendar" />
          <span data-value="">{value ? formatDate(value) : placeholder}</span>
          <Icon name="chevron-down" />
        </DatePickerTrigger>
        <DatePickerContent>
          <Calendar
            autoFocus
            defaultMonth={value}
            {...calendarProps}
            selected={value}
            onSelect={(next) => {
              setInternalDate(next);
              onDateChange?.(next);
              setOpen(false);
            }}
          />
        </DatePickerContent>
      </div>
    </Popover>
  );
}
export type DatePickerTriggerProps = React.ComponentProps<
  typeof PopoverTrigger
>;
export function DatePickerTrigger({
  className,
  ref,
  ...props
}: DatePickerTriggerProps) {
  const morphRef = useMorph<HTMLButtonElement>("buttons", ref);
  const pressRef = useFlowPress(morphRef);
  return (
    <PopoverTrigger
      ref={pressRef}
      data-slot="date-picker-trigger"
      data-part="trigger"
      className={cn("v-select -ink", className)}
      {...props}
    />
  );
}
export type DatePickerContentProps = React.ComponentProps<
  typeof PopoverContent
>;
export function DatePickerContent({
  className,
  ...props
}: DatePickerContentProps) {
  return (
    <PopoverContent
      data-slot="date-picker-content"
      data-part="content"
      align="start"
      sideOffset={8}
      collisionPadding={12}
      className={className}
      {...props}
    />
  );
}
