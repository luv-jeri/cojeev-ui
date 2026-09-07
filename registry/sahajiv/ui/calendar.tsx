"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import {
  DayPicker,
  useDayPicker,
  type PropsBase,
  type Matcher,
  type DayButtonProps,
  type MonthCaptionProps,
  type MonthGridProps,
  type WeekNumberProps,
} from "react-day-picker";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Icon, IconButton } from "@/registry/sahajiv/ui/icon";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
export type CalendarMark = "pink" | "blue" | "olive" | "yellow" | "ink";
const MarksContext = React.createContext<Record<string, CalendarMark>>({});
export const calendarVariants = cva("v-cal [display:grid] [gap:14px]");
export type CalendarProps = Omit<
  PropsBase,
  "mode" | "onSelect" | "selected" | "disabled" | "required"
> & {
  mode?: "single";
  selected?: Date;
  defaultSelected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: Matcher | Matcher[];
  marks?: Record<string, CalendarMark>;
  required?: boolean;
};
export function Calendar(calendarProps: CalendarProps) {
  const {
    className,
    selected,
    defaultSelected,
    onSelect,
    marks = {},
    classNames,
    components,
    mode = "single",
    required = false,
    ...props
  } = calendarProps;
  const [internalSelected, setInternalSelected] =
    React.useState(defaultSelected);
  const controlled = Object.prototype.hasOwnProperty.call(
    calendarProps,
    "selected",
  );
  const current = controlled ? selected : internalSelected;
  return (
    <MarksContext.Provider value={marks}>
      <DayPicker
        mode={mode}
        selected={current}
        onSelect={(date) => {
          if (required && !date) return;
          setInternalSelected(date);
          onSelect?.(date);
        }}
        showWeekNumber
        weekStartsOn={1}
        ISOWeek
        showOutsideDays={false}
        hideNavigation
        data-slot="calendar"
        data-part="root"
        data-cal=""
        className={cn(calendarVariants(), className)}
        classNames={{
          months: "v-cal__months",
          month: "v-cal__month-wrap",
          month_caption: "v-cal__head",
          month_grid: "v-cal__grid",
          weekday: "v-cal__wd",
          week_number: "v-cal__wk",
          week_number_header: "v-cal__wd -wk",
          day_button: "v-cal__d",
          ...classNames,
        }}
        formatters={{
          formatWeekdayName: (date) =>
            date
              .toLocaleDateString("en", { weekday: "short" })
              .slice(0, 2)
              .toUpperCase(),
          formatWeekNumberHeader: () => "WK",
        }}
        components={{
          MonthCaption: CalendarCaption,
          DayButton: CalendarDayButton,
          MonthGrid: CalendarGrid,
          WeekNumber: CalendarWeekNumber,
          ...components,
        }}
        {...props}
      />
    </MarksContext.Provider>
  );
}
export function CalendarCaption({
  calendarMonth,
  displayIndex,
  className,
  ...props
}: MonthCaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();
  const month = calendarMonth.date;
  const monthRef = useMorph<HTMLSpanElement>("buttons");
  return (
    <div
      data-slot="calendar-header"
      data-month-index={displayIndex}
      data-part="header"
      className={cn("v-cal__head", className)}
      {...props}
    >
      <span
        ref={monthRef}
        data-slot="calendar-caption"
        className="v-cal__month"
        aria-live="polite"
      >
        <b>{month.toLocaleDateString("en", { month: "long" })}</b>
        <span>{month.getFullYear()}</span>
      </span>
      <span data-slot="calendar-nav" className="v-cal__nav">
        <IconButton
          data-slot="calendar-previous"
          data-part="trigger"
          size="sm"
          aria-label="Previous month"
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
        >
          <Icon name="chevron-left" />
        </IconButton>
        <IconButton
          data-slot="calendar-next"
          data-part="trigger"
          size="sm"
          aria-label="Next month"
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
        >
          <Icon name="chevron-right" />
        </IconButton>
      </span>
    </div>
  );
}
export function CalendarGrid({ className, ...props }: MonthGridProps) {
  const flowRef = useFlowGroup<HTMLTableElement>(undefined, {
    itemSelector: ".v-cal__d",
    activeSelector: '[data-state="active"]',
  });
  return (
    <table
      ref={flowRef}
      data-slot="calendar-grid"
      data-part="viewport"
      className={cn("v-cal__grid", className)}
      {...props}
    />
  );
}
export function CalendarDayButton({
  day,
  modifiers,
  className,
  children,
  ...props
}: DayButtonProps) {
  const marks = React.useContext(MarksContext);
  const ref = React.useRef<HTMLButtonElement>(null);
  const morphRef = useMorph<HTMLButtonElement>("nav", ref);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  const date = day.date;
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const mark = marks[iso];
  return (
    <button
      ref={morphRef}
      data-slot="calendar-day"
      data-part="item"
      data-d={date.getDate()}
      data-state={modifiers.selected ? "active" : "inactive"}
      aria-pressed={modifiers.selected || undefined}
      className={cn(
        "v-cal__d",
        (date.getDay() === 0 || date.getDay() === 6) && "-off",
        modifiers.today && "-today",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {mark && (
        <i
          data-slot="calendar-mark"
          className={`v-cal__mark -${mark}`}
          aria-label="Marked day"
        />
      )}
    </button>
  );
}
export function CalendarWeekNumber({
  week,
  className,
  ...props
}: WeekNumberProps) {
  const { getModifiers } = useDayPicker();
  const active = week.days.some((day) => getModifiers(day).selected);
  const weekRef = useMorph<HTMLTableCellElement>("pills");
  return (
    <th
      ref={weekRef}
      data-slot="calendar-week-number"
      className={cn("v-cal__wk", active && "-on", className)}
      {...props}
    />
  );
}
