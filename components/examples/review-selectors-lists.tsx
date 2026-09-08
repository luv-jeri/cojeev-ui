"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { Checkbox, type SelectorIndicator, type SelectorShape, type SelectorSize } from "@/registry/sahajiv/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/registry/sahajiv/ui/radio-group";
import { Questionnaire, QuestionnaireQuestion, QuestionnaireOptions, QuestionnaireOption, QuestionnaireOptionBody } from "@/registry/sahajiv/ui/questionnaire";
import { ItemAdornment, type ItemAdornmentOptions } from "@/registry/sahajiv/ui/item-adornment";
import { MultiSelect } from "@/registry/sahajiv/ui/multi-select";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/registry/sahajiv/ui/select";
import { Label } from "@/registry/sahajiv/ui/label";
import { Meta } from "@/registry/sahajiv/ui/typography";

function reviewShape(variant?: string): SelectorShape {
  return variant === "pebble" || variant === "rounded" || variant === "circle" || variant === "leaf" || variant === "flower" ? variant : "organic";
}
function SelectorControls({ indicator, onIndicatorChange, showIndicator, onShowIndicatorChange }: { indicator: SelectorIndicator; onIndicatorChange: (value: SelectorIndicator) => void; showIndicator: boolean; onShowIndicatorChange: (value: boolean) => void }) {
  const id = React.useId();
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
    <div style={{ display: "grid", gap: 6 }}><Label htmlFor={id}>Selected mark</Label><Select value={indicator} onValueChange={value => onIndicatorChange(value as SelectorIndicator)}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>
      <SelectItem value="auto">Automatic</SelectItem><SelectItem value="dot">Dot</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="diamond">Diamond</SelectItem><SelectItem value="flower">Flower</SelectItem>
    </SelectContent></Select></div>
    <Checkbox checked={showIndicator} onCheckedChange={value => onShowIndicatorChange(value === true)}>Show selected mark</Checkbox>
  </div>;
}
export function ReviewCheckboxExample({ variant, size = "default" }: ExampleProps) {
  const [checked, setChecked] = React.useState(true);
  const [indicator, setIndicator] = React.useState<SelectorIndicator>("auto");
  const [showIndicator, setShowIndicator] = React.useState(true);
  return <div style={{ display: "grid", gap: 20 }}>
    <SelectorControls indicator={indicator} onIndicatorChange={setIndicator} showIndicator={showIndicator} onShowIndicatorChange={setShowIndicator} />
    <Checkbox shape={reviewShape(variant)} size={size as SelectorSize} indicator={indicator} showIndicator={showIndicator} checked={checked} onCheckedChange={value => setChecked(value === true)}>Keep this idea in my collection</Checkbox>
    <Meta role="status">{checked ? "Idea included." : "Idea excluded."} The outer shape carries selection when the mark is hidden.</Meta>
  </div>;
}
export function ReviewRadioGroupExample({ variant, size = "default" }: ExampleProps) {
  const [value, setValue] = React.useState("quiet");
  const [indicator, setIndicator] = React.useState<SelectorIndicator>("auto");
  const [showIndicator, setShowIndicator] = React.useState(true);
  return <div style={{ display: "grid", gap: 20 }}>
    <SelectorControls indicator={indicator} onIndicatorChange={setIndicator} showIndicator={showIndicator} onShowIndicatorChange={setShowIndicator} />
    <RadioGroup aria-label="Working rhythm" shape={reviewShape(variant)} size={size as SelectorSize} indicator={indicator} showIndicator={showIndicator} value={value} onValueChange={setValue}>
      <RadioGroupItem value="quiet">Quiet focus</RadioGroupItem><RadioGroupItem value="together">Think together</RadioGroupItem><RadioGroupItem value="managed" disabled>Managed by your workspace</RadioGroupItem>
    </RadioGroup><Meta role="status">{value === "quiet" ? "Quiet focus selected." : "Thinking together selected."}</Meta>
  </div>;
}
export function ReviewQuestionnaireExample({ variant, size = "default" }: ExampleProps) {
  const [value, setValue] = React.useState("plan");
  const [indicator, setIndicator] = React.useState<SelectorIndicator>("auto");
  const [showIndicator, setShowIndicator] = React.useState(false);
  return <div style={{ display: "grid", gap: 20 }}><SelectorControls indicator={indicator} onIndicatorChange={setIndicator} showIndicator={showIndicator} onShowIndicatorChange={setShowIndicator} /><Questionnaire><QuestionnaireQuestion><legend>Where should we begin?</legend>
    <QuestionnaireOptions aria-label="First step" selectorShape={reviewShape(variant)} selectorSize={size as SelectorSize} selectorIndicator={indicator} showSelectorIndicator={showIndicator} value={value} onValueChange={setValue}>
      <QuestionnaireOption value="plan"><QuestionnaireOptionBody><b>Make a little room</b><small>A clear plan, with just enough structure.</small></QuestionnaireOptionBody></QuestionnaireOption>
      <QuestionnaireOption value="try"><QuestionnaireOptionBody><b>Try something small</b><small>A small experiment, with room to change your mind.</small></QuestionnaireOptionBody></QuestionnaireOption>
    </QuestionnaireOptions></QuestionnaireQuestion><Meta role="status">{value === "plan" ? "A clear plan selected." : "A small experiment selected."}</Meta></Questionnaire></div>;
}
export function reviewAdornment(variant = "both"): ItemAdornmentOptions {
  return { icon: "file-text", showIcon: variant !== "blob-only" && variant !== "none", showBackground: variant !== "icon-only" && variant !== "none" };
}
export function ReviewItemAdornmentExample({ variant = "both", size = "default" }: ExampleProps) {
  const [showIcon, setShowIcon] = React.useState(reviewAdornment(variant).showIcon !== false);
  const [showBackground, setShowBackground] = React.useState(reviewAdornment(variant).showBackground !== false);
  return <div style={{ display: "grid", gap: 20 }}><div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
    <Checkbox checked={showIcon} onCheckedChange={value => setShowIcon(value === true)}>Show icon</Checkbox><Checkbox checked={showBackground} onCheckedChange={value => setShowBackground(value === true)}>Show blob background</Checkbox>
  </div><div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}><ItemAdornment identity="Project notes" size={size as "sm" | "default" | "lg"} value={{ icon: "file-text", showIcon, showBackground }} /><span>Project notes</span></div>
    <Meta>Choose both, either, or neither. The text and action stay available.</Meta></div>;
}
export function ReviewMultiSelectExample({ variant = "both" }: ExampleProps) {
  const [value, setValue] = React.useState(["space-1"]);
  const options = Array.from({ length: 24 }, (_, index) => ({ value: `space-${index + 1}`, label: `Workspace ${String(index + 1).padStart(2, "0")}`, disabled: index === 4 }));
  return <MultiSelect label="Shared workspaces" options={options} value={value} onValueChange={setValue} adornment={reviewAdornment(variant)} description="Search, select several workspaces, or use the custom scroll thumb to reach the full list." />;
}
