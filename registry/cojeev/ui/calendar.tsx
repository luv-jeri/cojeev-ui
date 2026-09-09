"use client";

import * as React from "react";
import { useMorph } from "@/registry/cojeev/motion/use-morph";
import {
  DayPicker,
  useDayPicker,
  type PropsBase,
  type Matcher,
  type DayButtonProps,
  type MonthCaptionProps,
  type MonthGridProps,
  type WeekNumberProps,
  type WeekdayProps,
  type WeekNumberHeaderProps,
  type RootProps,
} from "react-day-picker";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import { Icon, IconButton } from "@/registry/cojeev/ui/icon";
import { useFlowGroup } from "@/registry/cojeev/motion/use-flow";
import {
  motionTokens,
  useChoreography,
} from "@/registry/cojeev/motion/choreography";
import { assignMotionRef } from "@/registry/cojeev/motion/refs";
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
    animate = true,
    style,
    ...props
  } = calendarProps;
  const { quiet } = useChoreography();
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
        animate={animate && !quiet}
        data-slot="calendar"
        data-part="root"
        data-cal=""
        className={cn(calendarVariants(), className)}
        style={
          {
            ...style,
            "--v-calendar-duration": `${quiet ? 0 : motionTokens.duration.enter}s`,
            "--v-calendar-ease": `cubic-bezier(${motionTokens.ease.enter.join(",")})`,
          } as React.CSSProperties
        }
        classNames={{
          months: "v-cal__months",
          month: "v-cal__month-wrap",
          month_caption: "v-cal__head",
          month_grid: "v-cal__grid",
          weekday: "v-cal__wd",
          week_number: "v-cal__wk",
          week_number_header: "v-cal__wd -wk",
          day_button: "v-cal__d",
          weeks_before_enter: "v-cal__weeks-before-enter",
          weeks_after_enter: "v-cal__weeks-after-enter",
          weeks_before_exit: "v-cal__weeks-before-exit",
          weeks_after_exit: "v-cal__weeks-after-exit",
          caption_before_enter: "v-cal__caption-enter",
          caption_after_enter: "v-cal__caption-enter",
          caption_before_exit: "v-cal__caption-exit",
          caption_after_exit: "v-cal__caption-exit",
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
          Root: CalendarRoot,
          MonthCaption: CalendarCaption,
          DayButton: CalendarDayButton,
          MonthGrid: CalendarGrid,
          WeekNumber: CalendarWeekNumber,
          Weekday: CalendarWeekday,
          WeekNumberHeader: CalendarWeekNumberHeader,
          ...components,
        }}
        {...props}
      />
    </MarksContext.Provider>
  );
}

/** DayPicker retains an aria-hidden DOM snapshot during its finite month exit. */
function CalendarRoot({ rootRef, ...props }: RootProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      host.current = node;
      const release = assignMotionRef(rootRef, node);
      return () => {
        host.current = null;
        release();
      };
    },
    [rootRef],
  );
  React.useLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    const protectSnapshots = () =>
      root
        .querySelectorAll<HTMLElement>(
          '[data-animated-month][aria-hidden="true"]',
        )
        .forEach((snapshot) => {
          snapshot.inert = true;
          snapshot
            .querySelectorAll("[id]")
            .forEach((element) => element.removeAttribute("id"));
        });
    const observer = new MutationObserver(protectSnapshots);
    observer.observe(root, { childList: true, subtree: true });
    protectSnapshots();
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} {...props} />;
}
export function CalendarCaption({
  calendarMonth,
  displayIndex,
  className,
  ...props
}: MonthCaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useDayPicker();
  const month = calendarMonth.date;
  return (
    <div
      data-slot="calendar-header"
      data-month-index={displayIndex}
      data-part="header"
      className={cn("v-cal__head", className)}
      {...props}
    >
      <span
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
      data-today={modifiers.today || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      data-range-end={modifiers.range_end || undefined}
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
  const { isSelected } = useDayPicker();
  const active = week.days.some((day) => isSelected?.(day.date));
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

function CalendarWeekday(props: WeekdayProps) {
  return <th data-slot="calendar-weekday" {...props} />;
}

function CalendarWeekNumberHeader(props: WeekNumberHeaderProps) {
  return <th data-slot="calendar-week-number-header" {...props} />;
}
