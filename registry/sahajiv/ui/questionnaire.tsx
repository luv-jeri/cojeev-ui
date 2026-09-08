"use client";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import {
  SelectorGlyph,
  selectorStyle,
  type SelectorShape,
  type SelectorTone,
} from "@/registry/sahajiv/lib/selector";
export type {
  SelectorShape,
  SelectorTone,
} from "@/registry/sahajiv/lib/selector";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Label, type LabelProps } from "@/registry/sahajiv/ui/label";
import { Progress } from "@/registry/sahajiv/ui/progress";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
export const questionnaireVariants = cva("v-quest grid gap-[28px]");
export type QuestionnaireProps = React.ComponentProps<"div">;
export function Questionnaire({ className, ...props }: QuestionnaireProps) {
  return (
    <div
      data-slot="questionnaire"
      data-part="root"
      className={cn(questionnaireVariants(), className)}
      {...props}
    />
  );
}
export type QuestionnaireProgressProps = React.ComponentProps<"div"> & {
  value: number;
  total: number;
};
export function QuestionnaireProgress({
  value,
  total,
  className,
  children,
  ...props
}: QuestionnaireProgressProps) {
  const maximum = Math.max(0, Number.isFinite(total) ? total : 0);
  const current = Math.max(
    0,
    Math.min(maximum, Number.isFinite(value) ? value : 0),
  );
  return (
    <div
      data-slot="questionnaire-progress"
      className={cn(
        "v-quest__progress flex items-center gap-[12px] text-[13px] text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <b>
            {current} of {maximum}
          </b>
          <Progress value={maximum > 0 ? (current / maximum) * 100 : 0} />
        </>
      )}
    </div>
  );
}
export type QuestionnaireQuestionProps = React.ComponentProps<"fieldset">;
export function QuestionnaireQuestion({
  className,
  ...props
}: QuestionnaireQuestionProps) {
  return (
    <fieldset
      data-slot="questionnaire-question"
      className={cn(
        "v-quest__q grid min-w-0 gap-[12px] [border:0] p-0 bg-transparent [box-shadow:none]",
        className,
      )}
      {...props}
    />
  );
}
export type QuestionnaireLabelProps = LabelProps;
export function QuestionnaireLabel({
  className,
  ...props
}: QuestionnaireLabelProps) {
  return (
    <Label
      data-slot="questionnaire-label"
      className={cn("[font-size:17px] [font-weight:600]", className)}
      {...props}
    />
  );
}
type ChoiceContext = {
  name: string;
  selectorShape: SelectorShape;
  selectorTone: SelectorTone;
  value?: string;
  change: (value: string) => void;
};
const ChoiceContext = React.createContext<ChoiceContext | null>(null);
export type QuestionnaireOptionsProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue"
> & {
  name?: string;
  selectorShape?: SelectorShape;
  selectorTone?: SelectorTone;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};
export function QuestionnaireOptions({
  ref,
  className,
  name,
  selectorShape = "organic",
  selectorTone = "pink",
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: QuestionnaireOptionsProps) {
  const id = React.useId();
  const [local, setLocal] = React.useState(defaultValue);
  const flowRef = useFlowGroup<HTMLDivElement>(ref);
  return (
    <ChoiceContext.Provider
      value={{
        name: name ?? id,
        selectorShape,
        selectorTone,
        value: value ?? local,
        change: (next) => {
          if (value === undefined) setLocal(next);
          onValueChange?.(next);
        },
      }}
    >
      <div
        ref={flowRef}
        data-slot="questionnaire-options"
        className={cn("v-quest__opts grid gap-[8px]", className)}
        role="radiogroup"
        {...props}
      >
        {children}
      </div>
    </ChoiceContext.Provider>
  );
}
export type QuestionnaireOptionProps = React.ComponentProps<"label"> & {
  value: string;
  disabled?: boolean;
  selectorShape?: SelectorShape;
  selectorTone?: SelectorTone;
  inputProps?: Omit<React.ComponentProps<"input">, "value" | "type">;
};
export function QuestionnaireOption({
  ref: externalMorphRef,
  value,
  disabled,
  selectorShape,
  selectorTone,
  style,
  inputProps,
  className,
  children,
  ...props
}: QuestionnaireOptionProps) {
  const context = React.useContext(ChoiceContext);
  if (!context)
    throw new Error("QuestionnaireOption must be inside QuestionnaireOptions");
  const ownedMorphRef = useMorph<HTMLLabelElement>("cards", externalMorphRef);
  const shape = selectorShape ?? context.selectorShape;
  const tone = selectorTone ?? context.selectorTone;
  return (
    <label
      ref={ownedMorphRef}
      style={selectorStyle(tone, style)}
      data-selector-shape={shape}
      data-slot="questionnaire-option"
      data-state={context.value === value ? "checked" : "unchecked"}
      className={cn(
        "v-quest__opt grid grid-cols-[36px_minmax(0,1fr)_28px] items-center gap-[14px] min-h-[64px] pt-[14px] pr-[16px] pb-[14px] pl-[14px] rounded-[20px] bg-[var(--v-canvas)] cursor-pointer",
        className,
      )}
      {...props}
    >
      <input
        data-slot="questionnaire-option-input"
        type="radio"
        name={context.name}
        value={value}
        checked={context.value === value}
        disabled={disabled}
        {...inputProps}
        onChange={(event) => {
          inputProps?.onChange?.(event);
          if (!event.defaultPrevented && event.target.checked)
            context.change(value);
        }}
      />
      <span data-slot="questionnaire-selector">
        <SelectorGlyph
          shape={shape}
          tone={tone}
          state={context.value === value}
          disabled={disabled || inputProps?.disabled}
        />
      </span>
      {children}
    </label>
  );
}
export type QuestionnaireOptionBodyProps = React.ComponentProps<"span">;
export function QuestionnaireOptionBody({
  className,
  ...props
}: QuestionnaireOptionBodyProps) {
  return (
    <span
      data-slot="questionnaire-option-body"
      className={cn(
        "v-quest__opt-body order-2 grid gap-[2px] min-w-0",
        className,
      )}
      {...props}
    />
  );
}

export type QuestionnaireWeekdaysProps = React.ComponentProps<"div">;
export function QuestionnaireWeekdays({
  ref,
  className,
  ...props
}: QuestionnaireWeekdaysProps) {
  const flowRef = useFlowGroup<HTMLDivElement>(ref);
  return (
    <div
      ref={flowRef}
      data-slot="questionnaire-weekdays"
      className={cn("v-weekdays flex gap-[6px]", className)}
      {...props}
    />
  );
}
export type QuestionnaireWeekdayProps = React.ComponentProps<"label">;
export function QuestionnaireWeekday({
  className,
  ...props
}: QuestionnaireWeekdayProps) {
  return (
    <label
      data-slot="questionnaire-weekday"
      className={cn(
        "relative grid place-items-center size-[40px] [border-radius:50%] text-[11.5px] font-semibold bg-[var(--card)] text-[color:var(--v-text-2)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
