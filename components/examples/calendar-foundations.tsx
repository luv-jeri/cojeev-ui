"use client";

import * as React from "react";
import { Calendar, type DateRange } from "@/registry/cojeev/ui/calendar";
import { DatePicker } from "@/registry/cojeev/ui/date-picker";
import { Button } from "@/registry/cojeev/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/registry/cojeev/ui/field";
import type { ExampleProps } from "./types";

const month = new Date(2026, 8, 1);
const today = new Date(2026, 8, 10);
const unavailable = new Date(2026, 8, 20);
const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const modeFor = (variant?: string) => variant === "range" || variant === "multiple" ? variant : "single";
const jobs = {
  single: { title: "Make time for a conversation", label: "Appointment day", use: "Use when one day anchors an appointment.", try: "Try choosing the 18th; it has a review pencilled in." },
  range: { title: "Leave room for a short break", label: "Time away", use: "Use when the days between two dates matter.", try: "Try 29 September to 3 October. The 20th is unavailable." },
  multiple: { title: "Find your weekly rhythm", label: "Focus days", use: "Use when a few separate days belong together.", try: "Try adding and removing dates. A sixth day starts a new set." },
} as const;
function Intro({ mode, compact }: { mode: keyof typeof jobs; compact?: boolean }) {
  return compact ? null : <div className="v-calendar-example__intro"><h3>{jobs[mode].title}</h3><p>{jobs[mode].use}</p><p>{jobs[mode].try}</p></div>;
}
function rangeText(range?: DateRange) {
  return range?.from ? `${day(range.from)} → ${range.to ? day(range.to) : "Choose an end date"}` : "Choose the first day of your break.";
}

export function CalendarExample({ variant, compact }: ExampleProps) {
  const mode = modeFor(variant);
  const [single, setSingle] = React.useState<Date | undefined>(new Date(2026, 8, 12));
  const [range, setRange] = React.useState<DateRange | undefined>({ from: new Date(2026, 8, 22), to: new Date(2026, 8, 25) });
  const [multiple, setMultiple] = React.useState<Date[] | undefined>([new Date(2026, 8, 8), new Date(2026, 8, 15), new Date(2026, 8, 24)]);
  const common = { defaultMonth: month, today, disabled: unavailable, showWeekNumber: false, numberOfMonths: 1 };
  return <div className="v-calendar-example" data-calendar-example={mode}>
    <Intro mode={mode} compact={compact} />
    {mode === "range" ? <Calendar {...common} mode="range" selected={range} onSelect={setRange} min={1} max={14} excludeDisabled resetOnSelect />
      : mode === "multiple" ? <Calendar {...common} mode="multiple" selected={multiple} onSelect={setMultiple} max={5} />
      : <Calendar {...common} selected={single} onSelect={setSingle} marks={{ "2026-09-18": "olive", "2026-09-24": "blue" }} />}
    <div className="v-calendar-example__summary" aria-live="polite">
      <p role="status">{mode === "range" ? rangeText(range) : mode === "multiple" ? `${multiple?.length ?? 0} focus days${multiple?.length ? ` · ${multiple.map(day).join(" · ")}` : " · Choose separate dates"}` : single ? `${day(single)}${single.getDate() === 18 && single.getMonth() === 8 ? " · Studio review" : " · Available for an appointment"}` : "Choose an appointment day."}</p>
      {mode === "single" && !compact && <p>Olive dot · Studio review on 18 September.</p>}
    </div>
    {!compact && <Button style={{ justifySelf: "start" }} variant="ghost" size="sm" onClick={() => { if (mode === "range") setRange(undefined); else if (mode === "multiple") setMultiple(undefined); else setSingle(undefined); }}>Clear selection</Button>}
  </div>;
}

export function DatePickerExample({ variant, compact }: ExampleProps) {
  const mode = modeFor(variant);
  const [single, setSingle] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [multiple, setMultiple] = React.useState<Date[] | undefined>();
  const id = React.useId();
  const calendarProps = { defaultMonth: month, today, disabled: unavailable, showWeekNumber: false, numberOfMonths: 1 };
  const shared = { formatDate: day, appearance: "contour" as const, triggerProps: { id, "aria-describedby": `${id}-help`, style: { width: "100%" } }, style: { width: "100%" } };
  return <div className="v-calendar-example" data-datepicker-example={mode}>
    <Intro mode={mode} compact={compact} />
    <Field controlId={id}>
      <FieldLabel>{jobs[mode].label}</FieldLabel>
      {mode === "range" ? <DatePicker {...shared} mode="range" date={range} onDateChange={setRange} placeholder="Choose dates for a break" calendarProps={{ ...calendarProps, min: 1, max: 14, excludeDisabled: true, resetOnSelect: true }} />
        : mode === "multiple" ? <DatePicker {...shared} mode="multiple" date={multiple} onDateChange={setMultiple} placeholder="Choose your focus days" calendarProps={{ ...calendarProps, max: 5 }} />
        : <DatePicker {...shared} date={single} onDateChange={setSingle} placeholder="Choose an appointment day" calendarProps={calendarProps} />}
      <FieldDescription id={`${id}-help`}>{mode === "multiple" ? "Choose separate days, then select Done." : mode === "range" ? "Choose a start and an end. At least one night." : "Choose one day. Escape closes without changing it."}</FieldDescription>
    </Field>
    <div className="v-calendar-example__summary"><p role="status">{mode === "range" ? rangeText(range) : mode === "multiple" ? multiple?.length ? `${multiple.length} focus days · ${multiple.map(day).join(" · ")}` : "No focus days chosen yet." : single ? `Appointment · ${day(single)}` : "No appointment day chosen yet."}</p></div>
  </div>;
}
