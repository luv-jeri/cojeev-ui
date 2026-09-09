"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { numberInputText, parseNumberInput, stepNumber } from "../lib/number-motion";
import { AnimatedNumber, type AnimatedNumberProps } from "./animated-number";
import { Icon } from "./icon";
import { useFlowPress } from "../motion/flow-press";

export type NumberInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "defaultValue" | "min" | "max" | "step" | "size"> & {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  locale?: string;
  format?: Intl.NumberFormatOptions;
  treatment?: AnimatedNumberProps["treatment"];
  duration?: number;
  /** Accessible labels for the two native step buttons. */
  decrementLabel?: string;
  incrementLabel?: string;
};

/** A formatted stepper that leaves the native input, caret and selection visible while editing. */
export function NumberInput({ value, defaultValue = null, onValueChange, min, max, step = 1, locale = "en-US", format, treatment = "roll", duration, decrementLabel = "Decrease value", incrementLabel = "Increase value", className, style, ref, disabled, readOnly, onChange, onFocus, onBlur, onKeyDown, onCompositionEnd, placeholder = "—", ...props }: NumberInputProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = React.useState<number | null>(defaultValue);
  const current = controlled ? value : internal;
  const finite = current !== null && Number.isFinite(current) ? current : null;
  const [draft, setDraft] = React.useState(() => finite === null ? "" : numberInputText(finite, locale));
  const [focused, setFocused] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  const previous = React.useRef({ value: finite, locale });
  const displayText = finite === null ? placeholder : new Intl.NumberFormat(locale, format).format(finite);
  const decreaseRef = useFlowPress<HTMLButtonElement>(), increaseRef = useFlowPress<HTMLButtonElement>();
  const commit = (next: number | null) => { if (!controlled) setInternal(next); if (!Object.is(next, finite)) onValueChange?.(next); };
  const clamp = (next: number) => Math.max(Number.isFinite(min) ? min! : -Infinity, Math.min(Number.isFinite(max) ? max! : Infinity, next));
  const raw = React.useCallback((next: number | null) => next === null ? "" : numberInputText(next, locale), [locale]);
  React.useEffect(() => {
    if (!Object.is(previous.current.value, finite) || previous.current.locale !== locale) {
      if (!focused || !Object.is(parseNumberInput(draft, locale), finite) || previous.current.locale !== locale) { setDraft(raw(finite)); setInvalid(false); }
      previous.current = { value: finite, locale };
    }
  }, [finite, locale, focused, draft, raw]);
  React.useEffect(() => {
    const parsed = parseNumberInput(draft, locale);
    input.current?.setCustomValidity(parsed === undefined ? "Enter a number." : "");
  }, [draft, locale]);
  const stepValue = (direction: 1 | -1) => {
    if (disabled || readOnly) return;
    const parsed = parseNumberInput(draft, locale);
    const next = stepNumber(focused && typeof parsed === "number" ? parsed : finite, direction, step, min, max);
    commit(next); setDraft(raw(controlled ? finite : next)); setInvalid(false);
  };
  React.useEffect(() => {
    const form = input.current?.form;
    if (!form || controlled) return;
    const reset = (event: Event) => { queueMicrotask(() => { if (event.defaultPrevented) return; const next = defaultValue !== null && Number.isFinite(defaultValue) ? defaultValue : null; setInternal(next); setDraft(next === null ? "" : numberInputText(next, locale)); setInvalid(false); }); };
    form.addEventListener("reset", reset); return () => form.removeEventListener("reset", reset);
  }, [controlled, defaultValue, locale]);
  const ownedRef = React.useCallback((node: HTMLInputElement | null) => { input.current = node; if (typeof ref === "function") return ref(node); if (ref) ref.current = node; }, [ref]);
  return <span className={cn("v-number-input", className)} style={style} data-slot="number-input" data-focused={focused} data-disabled={Boolean(disabled)} data-readonly={Boolean(readOnly)} data-invalid={invalid || props["aria-invalid"] === true || props["aria-invalid"] === "true"}>
    <button ref={decreaseRef} className="v-number-input__step" type="button" disabled={disabled || readOnly || (finite !== null && Number.isFinite(min) && finite <= min!)} aria-label={decrementLabel} onClick={() => stepValue(-1)}><Icon name="minus" size="sm" /></button>
    <span className="v-number-input__field">
      <input {...props} ref={ownedRef} className="v-number-input__control" type="text" inputMode="decimal" role="spinbutton" value={draft} placeholder={placeholder} disabled={disabled} readOnly={readOnly} aria-valuenow={finite ?? undefined} aria-valuemin={Number.isFinite(min) ? min : undefined} aria-valuemax={Number.isFinite(max) ? max : undefined} aria-invalid={invalid || props["aria-invalid"] || undefined}
        onChange={event => { onChange?.(event); if (event.defaultPrevented) return; const text = event.currentTarget.value; setDraft(text); const parsed = parseNumberInput(text, locale); setInvalid(false); if (parsed !== undefined && !(event.nativeEvent as InputEvent).isComposing) commit(parsed); }}
        onCompositionEnd={event => { onCompositionEnd?.(event); if (event.defaultPrevented) return; const parsed = parseNumberInput(event.currentTarget.value, locale); if (parsed !== undefined) commit(parsed); }}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); const parsed = parseNumberInput(event.currentTarget.value, locale); const next = typeof parsed === "number" ? clamp(parsed) : parsed === null ? null : finite; if (parsed !== undefined) commit(next); setDraft(raw(controlled ? finite : next)); setInvalid(false); onBlur?.(event); }}
        onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented || disabled || readOnly || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return; if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); stepValue(event.key === "ArrowUp" ? 1 : -1); } else if (event.key === "Enter") { const parsed = parseNumberInput(draft, locale); if (parsed === undefined) setInvalid(true); else { const next = parsed === null ? null : clamp(parsed); commit(next); setDraft(raw(controlled ? finite : next)); } } else if (event.key === "Escape") { setDraft(raw(finite)); setInvalid(false); } }} />
      <span className="v-number-input__display" aria-hidden="true" title={displayText} style={{ "--number-length": Math.max(1, Array.from(displayText).length) } as React.CSSProperties}><AnimatedNumber value={finite ?? NaN} fallback={placeholder} locale={locale} format={format} treatment={treatment} duration={duration} /></span>
    </span>
    <button ref={increaseRef} className="v-number-input__step" type="button" disabled={disabled || readOnly || (finite !== null && Number.isFinite(max) && finite >= max!)} aria-label={incrementLabel} onClick={() => stepValue(1)}><Icon name="plus" size="sm" /></button>
  </span>;
}
