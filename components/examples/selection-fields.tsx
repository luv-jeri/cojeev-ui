"use client";

import * as React from "react";
import { MultiSelect } from "@/registry/cojeev/ui/multi-select";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/registry/cojeev/ui/select";
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "@/registry/cojeev/ui/native-select";
import { Label } from "@/registry/cojeev/ui/label";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import {
  controlRadiusStyle,
  type FieldAppearance,
} from "@/registry/cojeev/lib/control-appearance";
import type { ItemAdornmentValue } from "@/registry/cojeev/ui/item-adornment";
import type { ExampleProps } from "./types";

const workspaceOptions = [
  { value: "writing", label: "Writing" },
  { value: "research", label: "Research" },
  { value: "design", label: "Design" },
  { value: "archive", label: "Archive", disabled: true },
  ...Array.from({ length: 20 }, (_, index) => ({
    value: `project-${index + 1}`,
    label: `Project ${index + 1}`,
  })),
];
const rhythmOptions = [
  {
    value: "daily",
    label: "Daily",
    description: "A small reflection at the end of each day.",
    icon: "sun",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "Leave room for work; review the week together.",
    icon: "calendar",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Not available in this demonstration.",
    icon: "calendar",
    disabled: true,
  },
  {
    value: "off",
    label: "Off",
    description: "Review only when you choose to.",
    icon: "pause",
  },
];
function fieldSurface(value: ExampleProps["fieldAppearance"]): FieldAppearance {
  return value === "editorial" || value === "inset" ? value : "contour";
}
function SelectionIntro({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="v-form-example__intro">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function MultiSelectExample({
  variant,
  compact,
  fieldAppearance,
  radius,
  adornment,
}: ExampleProps) {
  const presentation =
    variant === "summary" || variant === "checklist" ? variant : "tokens";
  const [selected, setSelected] = React.useState<string[]>(["writing"]);
  const [receipt, setReceipt] = React.useState("");
  const art =
    adornment ??
    (["both", "icon-only", "blob-only", "none"].includes(variant ?? "")
      ? variant
      : "none");
  const itemArt: ItemAdornmentValue =
    art === "none"
      ? "none"
      : { showIcon: art !== "blob-only", showBackground: art !== "icon-only" };
  const titles = {
    tokens: "Collect the places that matter",
    summary: "A selection without the sprawl",
    checklist: "See the list. Shape your selection.",
  };
  const cues = {
    tokens: "Add workspaces, then remove one directly from its token.",
    summary:
      "Chosen names stay compact; open the summary to edit the full collection.",
    checklist:
      "Search and compare in place. No popup between you and the choices.",
  };
  return (
    <div
      className="v-form-example"
      data-form-example="multi-select"
      style={controlRadiusStyle(radius)}
    >
      {!compact && (
        <SelectionIntro title={titles[presentation]}>
          {cues[presentation]}
        </SelectionIntro>
      )}
      <MultiSelect
        label="Workspaces"
        name="workspaces"
        presentation={presentation}
        appearance={fieldSurface(fieldAppearance)}
        radius={radius}
        options={workspaceOptions}
        value={selected}
        onValueChange={setSelected}
        adornment={itemArt}
        description="Choose any number. Archived workspaces cannot be added."
        noResultsMessage="No matching workspaces."
      />
      <div className="v-form-example__footer">
        <Button
          data-stable-hit
          variant="secondary"
          onClick={() =>
            setReceipt(
              selected.length
                ? `Saved locally: ${selected.map((value) => workspaceOptions.find((item) => item.value === value)?.label ?? value).join(", ")}.`
                : "Saved locally: no workspaces selected.",
            )
          }
        >
          Save selection
          <Icon name="arrow-up-right" size="sm" />
        </Button>
      </div>
      <p role="status" className="v-form-example__status">
        {receipt || "Changes stay in this example until you save."}
      </p>
    </div>
  );
}

export function SelectExample({
  variant,
  compact,
  fieldAppearance,
  radius,
}: ExampleProps) {
  const approach =
    variant === "action" || variant === "rich" ? variant : "field";
  const [value, setValue] = React.useState("daily");
  const [receipt, setReceipt] = React.useState("");
  const id = React.useId();
  const selected = rhythmOptions.find((option) => option.value === value)!;
  const titles = {
    field: "A rhythm that fits your work",
    action: "Choose, then make it count",
    rich: "The choice comes with context",
  };
  const cues = {
    field:
      "A familiar field with keyboard navigation and a clear selected value.",
    action: "Keep a small setting beside the action it changes.",
    rich: "Compare what each choice means before committing to it.",
  };
  return (
    <div
      className="v-form-example"
      data-form-example="select"
      style={controlRadiusStyle(radius)}
    >
      {!compact && (
        <SelectionIntro title={titles[approach]}>
          {cues[approach]}
        </SelectionIntro>
      )}
      <div
        className={
          approach === "action" ? "v-form-example__selection-action" : undefined
        }
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <Label htmlFor={id}>Review rhythm</Label>
          <Select value={value} onValueChange={setValue} name="rhythm">
            <SelectTrigger
              id={id}
              appearance={fieldSurface(fieldAppearance)}
              radius={radius}
              aria-describedby={`${id}-help`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Reflection schedule</SelectLabel>
                {rhythmOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    description={
                      approach === "rich" ? option.description : undefined
                    }
                    adornment={
                      approach === "rich"
                        ? { icon: option.icon, showBackground: false }
                        : "none"
                    }
                    showIndicator
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {approach === "action" && (
          <Button
            data-stable-hit
            aria-label="Apply rhythm"
            onClick={() => setReceipt(`Applied locally: ${selected.label}.`)}
          >
            Apply
            <Icon name="check" size="sm" />
          </Button>
        )}
      </div>
      <p id={`${id}-help`} className="v-form-example__hint">
        {selected.description}
      </p>
      <p role="status" className="v-form-example__status">
        {receipt || `Selected: ${selected.label}.`}
      </p>
    </div>
  );
}

export function NativeSelectExample({
  variant,
  compact,
  fieldAppearance,
  radius,
}: ExampleProps) {
  const approach =
    variant === "toolbar" || variant === "listbox" ? variant : "field";
  const [value, setValue] = React.useState("daily");
  const [receipt, setReceipt] = React.useState("");
  const id = React.useId();
  const selected = rhythmOptions.find((option) => option.value === value)!;
  const titles = {
    field: "Native, with a familiar home",
    toolbar: "One setting. One clear action.",
    listbox: "All choices, already in view",
  };
  const cues = {
    field: "Your browser opens the menu. Your form keeps its native behavior.",
    toolbar: "A compact native choice and its Apply action share one row.",
    listbox:
      "A native listbox keeps the alternatives visible without opening a menu.",
  };
  return (
    <div
      className="v-form-example"
      data-form-example="native-select"
      style={controlRadiusStyle(radius)}
    >
      {!compact && (
        <SelectionIntro title={titles[approach]}>
          {cues[approach]}
        </SelectionIntro>
      )}
      <div
        className={
          approach === "toolbar"
            ? "v-form-example__selection-action"
            : undefined
        }
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <Label htmlFor={id}>Review rhythm</Label>
          <NativeSelect
            id={id}
            name="rhythm"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            size={approach === "listbox" ? 4 : undefined}
            appearance={
              variant === "ink" && !fieldAppearance
                ? undefined
                : fieldSurface(fieldAppearance)
            }
            variant={variant === "ink" ? "ink" : undefined}
            radius={radius}
            aria-describedby={`${id}-help`}
          >
            <NativeSelectOptGroup label="Reflection schedule">
              {rhythmOptions.map((option) => (
                <NativeSelectOption
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
        </div>
        {approach === "toolbar" && (
          <Button
            data-stable-hit
            aria-label="Apply rhythm"
            onClick={() => setReceipt(`Applied locally: ${selected.label}.`)}
          >
            Apply
            <Icon name="check" size="sm" />
          </Button>
        )}
      </div>
      <p id={`${id}-help`} className="v-form-example__hint">
        Native menus and listbox scrollbars follow the browser and operating
        system.
      </p>
      <p role="status" className="v-form-example__status">
        {receipt || `Selected: ${selected.label}.`}
      </p>
    </div>
  );
}
