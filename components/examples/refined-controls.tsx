"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { Button, type ButtonProps } from "@/registry/sahajiv/ui/button";
import { Calendar } from "@/registry/sahajiv/ui/calendar";
import { DatePicker } from "@/registry/sahajiv/ui/date-picker";
import { Dropzone } from "@/registry/sahajiv/ui/dropzone";
import {
  Checkbox,
  CheckboxBody,
  CheckboxGroup,
  type SelectorShape,
} from "@/registry/sahajiv/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupBody,
} from "@/registry/sahajiv/ui/radio-group";
import {
  Questionnaire,
  QuestionnaireQuestion,
  QuestionnaireLabel,
  QuestionnaireOptions,
  QuestionnaireOption,
  QuestionnaireOptionBody,
  QuestionnaireProgress,
} from "@/registry/sahajiv/ui/questionnaire";
import { Disk, Icon } from "@/registry/sahajiv/ui/icon";
import { Meta } from "@/registry/sahajiv/ui/typography";

function selectorShape(variant?: string): SelectorShape {
  return variant === "pebble" ||
    variant === "rounded" ||
    variant === "circle" ||
    variant === "leaf" ||
    variant === "flower"
    ? variant
    : "organic";
}
export function RefinedButtonExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  const [busy, setBusy] = React.useState(false),
    [saved, setSaved] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
        }}
      >
        <Button
          variant={variant as ButtonProps["variant"]}
          size={size as ButtonProps["size"]}
          loading={busy}
          onClick={() => {
            setSaved(false);
            setBusy(true);
            timer.current = setTimeout(() => {
              setBusy(false);
              setSaved(true);
            }, 1200);
          }}
        >
          {busy
            ? "Saving your note"
            : saved
              ? "Saved locally"
              : "Save your note"}
        </Button>
        <Button
          variant={variant as ButtonProps["variant"]}
          size={size as ButtonProps["size"]}
          disabled
        >
          Unavailable
        </Button>
      </div>
      <Meta role="status">
        {busy
          ? "Local demonstration · saving…"
          : saved
            ? "Your example note is saved. Try it again."
            : "Try the button to see its busy and completed states."}
      </Meta>
    </div>
  );
}
export function RefinedCheckboxExample({ variant }: ExampleProps) {
  const [checked, setChecked] = React.useState(false),
    shape = selectorShape(variant);
  return (
    <CheckboxGroup>
      <Checkbox
        shape={shape}
        checked={checked}
        onCheckedChange={(next) => setChecked(next === true)}
      >
        <CheckboxBody>
          <b>Keep a daily note</b>
          <small>
            {checked
              ? "Daily notes are on for this example."
              : "Make room for one small thought."}
          </small>
        </CheckboxBody>
      </Checkbox>
      <Checkbox shape={shape} tone="blue" defaultChecked="indeterminate">
        Some collections selected
      </Checkbox>
      <Checkbox shape={shape} tone="olive" defaultChecked>
        Keep drafts on this device
      </Checkbox>
      <Checkbox shape={shape} tone="yellow" disabled defaultChecked>
        Managed by your workspace
      </Checkbox>
    </CheckboxGroup>
  );
}
export function RefinedRadioGroupExample({ variant }: ExampleProps) {
  const [value, setValue] = React.useState("daily"),
    shape = selectorShape(variant);
  return (
    <div style={{ display: "grid", gap: 22 }}>
      <RadioGroup
        shape={shape}
        value={value}
        onValueChange={setValue}
        aria-label="Reflection frequency"
      >
        <RadioGroupItem value="daily">
          <RadioGroupBody>
            <b>A little every day</b>
            <small>A steady, gentle rhythm.</small>
          </RadioGroupBody>
        </RadioGroupItem>
        <RadioGroupItem value="weekly" tone="blue">
          <RadioGroupBody>
            <b>Once a week</b>
            <small>Room to gather your thoughts.</small>
          </RadioGroupBody>
        </RadioGroupItem>
        <RadioGroupItem value="monthly" disabled>
          Monthly · unavailable
        </RadioGroupItem>
      </RadioGroup>
      <RadioGroup
        pictographic
        shape={shape}
        defaultValue="make"
        aria-label="Creative focus"
      >
        <RadioGroupItem value="learn" tone="blue">
          <Icon name="brain" />
          <small>Learn</small>
        </RadioGroupItem>
        <RadioGroupItem value="make" tone="olive">
          <Icon name="sparkles" />
          <small>Make</small>
        </RadioGroupItem>
        <RadioGroupItem value="rest" tone="yellow">
          <Icon name="sun" />
          <small>Rest</small>
        </RadioGroupItem>
      </RadioGroup>
      <Meta role="status">Selected rhythm: {value}.</Meta>
    </div>
  );
}
export function RefinedCalendarExample() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 8, 12),
  );
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 360 }}>
      <Calendar
        selected={date}
        onSelect={setDate}
        defaultMonth={new Date(2026, 8, 1)}
        today={new Date(2026, 8, 8)}
        marks={{ "2026-09-18": "olive", "2026-09-24": "blue" }}
      />
      <Meta role="status">
        {date
          ? `Selected: ${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}`
          : "Choose a day above."}
      </Meta>
    </div>
  );
}
export function RefinedDatePickerExample() {
  const [date, setDate] = React.useState<Date | undefined>();
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <DatePicker
        date={date}
        onDateChange={setDate}
        calendarProps={{
          defaultMonth: new Date(2026, 8, 1),
          today: new Date(2026, 8, 8),
        }}
        triggerProps={{ "aria-label": "Choose a reminder date" }}
      />
      <Meta role="status">
        {date
          ? `Reminder set for ${date.toLocaleDateString("en-GB")}.`
          : "Choose when this example reminder should appear."}
      </Meta>
    </div>
  );
}
export function RefinedDropzoneExample({ variant }: ExampleProps) {
  const [count, setCount] = React.useState(0);
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 480 }}>
      <Dropzone
        variant={variant === "compact" ? "compact" : "default"}
        accept="image/*,.pdf,.txt"
        maxSize={5 * 1024 * 1024}
        onFilesSelected={(files) => setCount(files.length)}
      />
      <Meta role="status">
        {count
          ? `${count} file${count === 1 ? "" : "s"} available to this example.`
          : "Files stay in this local example; nothing is uploaded."}
      </Meta>
    </div>
  );
}
export function RefinedQuestionnaireExample({ variant }: ExampleProps) {
  const [value, setValue] = React.useState("");
  return (
    <Questionnaire>
      <QuestionnaireProgress value={value ? 1 : 0} total={1} />
      <QuestionnaireQuestion>
        <QuestionnaireLabel as="legend">
          What would you like more room for?
        </QuestionnaireLabel>
        <QuestionnaireOptions
          selectorShape={selectorShape(variant)}
          value={value}
          onValueChange={setValue}
          aria-label="Room for"
        >
          {(["Learning", "Making", "Resting"] as const).map((label, index) => (
            <QuestionnaireOption
              key={label}
              value={label}
              selectorTone={(["blue", "pink", "olive"] as const)[index]}
            >
              <Disk variant={(["blue", "pink", "olive"] as const)[index]}>
                <Icon name={(["brain", "sparkles", "sun"] as const)[index]} />
              </Disk>
              <QuestionnaireOptionBody>
                <b>{label}</b>
                <small>
                  {
                    [
                      "Follow a good question.",
                      "Give an idea a little space.",
                      "Leave room for yourself.",
                    ][index]
                  }
                </small>
              </QuestionnaireOptionBody>
            </QuestionnaireOption>
          ))}
        </QuestionnaireOptions>
      </QuestionnaireQuestion>
      <Meta role="status">
        {value
          ? `${value} has a place in your example plan.`
          : "One choice is enough to begin."}
      </Meta>
    </Questionnaire>
  );
}
