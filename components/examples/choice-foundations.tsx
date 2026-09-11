"use client";

import * as React from "react";
import { Checkbox, CheckboxBody } from "@/registry/cojeev/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupBody,
} from "@/registry/cojeev/ui/radio-group";
import { Switch, SwitchRow } from "@/registry/cojeev/ui/switch";
import type { ExampleProps } from "./types";

const approachFor = (variant?: string) =>
  variant === "card" || variant === "chip" ? variant : "row";
const choices = [
  {
    id: "notes",
    label: "Working notes",
    description: "A useful trail of decisions, questions, and next steps.",
  },
  {
    id: "sketches",
    label: "Quick sketches",
    description: "Make space for rough ideas before the details settle.",
  },
  {
    id: "links",
    label: "Reading list",
    description: "Keep the sources you want to return to close at hand.",
  },
];
export function CheckboxExample({
  variant,
  size,
  radius,
  shape = "organic",
  indicator = "auto",
  showIndicator = true,
}: ExampleProps) {
  const appearance = approachFor(variant);
  const [selected, setSelected] = React.useState(["notes"]);
  return (
    <section className="v-choice-example" data-choice-example="checkbox">
      <header>
        <strong>Pack your project notebook</strong>
        <p>Choose any tools you want to bring.</p>
      </header>
      <div className="v-choice-options" data-approach={appearance}>
        {choices.map((choice) => (
          <Checkbox
            key={choice.id}
            appearance={appearance}
            radius={radius}
            size={size === "sm" || size === "lg" ? size : "default"}
            shape={shape}
            indicator={indicator}
            showIndicator={showIndicator}
            checked={selected.includes(choice.id)}
            onCheckedChange={(checked) =>
              setSelected((current) =>
                checked
                  ? [...current, choice.id]
                  : current.filter((id) => id !== choice.id),
              )
            }
          >
            <CheckboxBody>
              <b>{choice.label}</b>
              {appearance !== "chip" && <small>{choice.description}</small>}
            </CheckboxBody>
          </Checkbox>
        ))}
      </div>
      <p className="v-choice-result" role="status">
        {selected.length
          ? `${selected.length} packed · ${choices
              .filter((choice) => selected.includes(choice.id))
              .map((choice) => choice.label)
              .join(", ")}`
          : "Nothing packed yet. Choose any tool to begin."}
      </p>
    </section>
  );
}
export function RadioGroupExample({
  variant,
  size,
  radius,
  shape = "organic",
  indicator = "auto",
  showIndicator = true,
}: ExampleProps) {
  const appearance = approachFor(variant);
  const [selected, setSelected] = React.useState("notes");
  return (
    <section className="v-choice-example" data-choice-example="radio-group">
      <header>
        <strong>Choose a starting point</strong>
        <p>Choose one way to open your next project.</p>
      </header>
      <RadioGroup
        className="v-choice-options"
        data-approach={appearance}
        appearance={appearance}
        radius={radius}
        size={size === "sm" || size === "lg" ? size : "default"}
        shape={shape}
        indicator={indicator}
        showIndicator={showIndicator}
        value={selected}
        onValueChange={setSelected}
        aria-label="Project starting point"
      >
        {choices.map((choice) => (
          <RadioGroupItem key={choice.id} value={choice.id}>
            <RadioGroupBody>
              <b>{choice.label}</b>
              {appearance !== "chip" && <small>{choice.description}</small>}
            </RadioGroupBody>
          </RadioGroupItem>
        ))}
      </RadioGroup>
      <p className="v-choice-result" role="status">
        Your project opens with{" "}
        {choices.find((choice) => choice.id === selected)?.label.toLowerCase()}.
      </p>
    </section>
  );
}
export function SwitchExample({ variant, radius }: ExampleProps) {
  const appearance =
    variant === "rocker" || variant === "latch" ? variant : "capsule";
  const [enabled, setEnabled] = React.useState(true);
  const id = React.useId();
  return (
    <section className="v-choice-example" data-choice-example="switch">
      <header>
        <strong>Make room for focus</strong>
        <p>One setting, applied immediately.</p>
      </header>
      <SwitchRow htmlFor={id}>
        <b>Quiet hours</b>
        <small>Pause non-essential alerts while you work.</small>
        <Switch
          id={id}
          appearance={appearance}
          radius={radius}
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </SwitchRow>
      <p className="v-choice-result" role="status">
        {enabled
          ? "On · Non-essential alerts are paused."
          : "Off · All alerts can come through."}
      </p>
    </section>
  );
}
