"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import {
  controlRadiusStyle,
  type ControlAppearanceProps,
} from "../lib/control-appearance";
import {
  numberInputText,
  parseNumberInput,
  stepNumber,
} from "../lib/number-motion";
import { AnimatedNumber, type AnimatedNumberProps } from "./animated-number";
import { Icon } from "./icon";
import { Button } from "./button";

export type NumberInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "min" | "max" | "step" | "size"
> &
  ControlAppearanceProps & {
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
    /** Arrangement, independent from field surface, radius and number animation. */
    presentation?: "stepper" | "quantity" | "scrub";
    scrubLabel?: string;
  };

/** A formatted stepper that leaves the native input, caret and selection visible while editing. */
export function NumberInput({
  radius,
  appearance,
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  locale = "en-US",
  format,
  treatment = "roll",
  duration,
  decrementLabel = "Decrease value",
  incrementLabel = "Increase value",
  presentation = "stepper",
  scrubLabel = "Drag to adjust value",
  className,
  style,
  ref,
  disabled,
  readOnly,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onCompositionEnd,
  placeholder = "—",
  ...props
}: NumberInputProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = React.useState<number | null>(defaultValue);
  const current = controlled ? value : internal;
  const finite = current !== null && Number.isFinite(current) ? current : null;
  const [draft, setDraft] = React.useState(() =>
    finite === null ? "" : numberInputText(finite, locale),
  );
  const [focused, setFocused] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  const previous = React.useRef({ value: finite, locale });
  const displayText =
    finite === null
      ? placeholder
      : new Intl.NumberFormat(locale, format).format(finite);
  const gesture = React.useRef<{
    x: number;
    value: number | null;
    steps: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = React.useRef(false);
  const [scrubbing, setScrubbing] = React.useState(false);
  const commit = (next: number | null) => {
    if (!controlled) setInternal(next);
    if (!Object.is(next, finite)) onValueChange?.(next);
  };
  const clamp = (next: number) =>
    Math.max(
      Number.isFinite(min) ? min! : -Infinity,
      Math.min(Number.isFinite(max) ? max! : Infinity, next),
    );
  const raw = React.useCallback(
    (next: number | null) =>
      next === null ? "" : numberInputText(next, locale),
    [locale],
  );
  React.useEffect(() => {
    if (
      !Object.is(previous.current.value, finite) ||
      previous.current.locale !== locale
    ) {
      if (
        !focused ||
        !Object.is(parseNumberInput(draft, locale), finite) ||
        previous.current.locale !== locale
      ) {
        setDraft(raw(finite));
        setInvalid(false);
      }
      previous.current = { value: finite, locale };
    }
  }, [finite, locale, focused, draft, raw]);
  React.useEffect(() => {
    const parsed = parseNumberInput(draft, locale);
    input.current?.setCustomValidity(
      parsed === undefined ? "Enter a number." : "",
    );
  }, [draft, locale]);
  const stepValue = (direction: 1 | -1) => {
    if (disabled || readOnly) return;
    const parsed = parseNumberInput(draft, locale);
    const next = stepNumber(
      focused && typeof parsed === "number" ? parsed : finite,
      direction,
      step,
      min,
      max,
    );
    commit(next);
    setDraft(raw(controlled ? finite : next));
    setInvalid(false);
  };
  React.useEffect(() => {
    const form = input.current?.form;
    if (!form || controlled) return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const reset = (event: Event) => {
      clearTimeout(pending);
      // Native target listeners can run before a React parent cancels reset.
      // Wait until dispatch/default actions finish before restoring our draft.
      pending = setTimeout(() => {
        if (event.defaultPrevented) return;
        const next =
          defaultValue !== null && Number.isFinite(defaultValue)
            ? defaultValue
            : null;
        setInternal(next);
        setDraft(next === null ? "" : numberInputText(next, locale));
        setInvalid(false);
      }, 0);
    };
    form.addEventListener("reset", reset);
    return () => {
      form.removeEventListener("reset", reset);
      clearTimeout(pending);
    };
  }, [controlled, defaultValue, locale]);
  const ownedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    <span
      className={cn("v-number-input", className)}
      style={{ ...style, ...controlRadiusStyle(radius) }}
      data-appearance={appearance}
      data-presentation={presentation}
      data-scrubbing={scrubbing || undefined}
      data-slot="number-input"
      data-focused={focused}
      data-disabled={Boolean(disabled)}
      data-readonly={Boolean(readOnly)}
      data-invalid={
        invalid ||
        props["aria-invalid"] === true ||
        props["aria-invalid"] === "true"
      }
    >
      <Button
        variant="ghost"
        data-stable-hit=""
        className="v-number-input__step v-number-input__decrease"
        type="button"
        disabled={
          disabled ||
          readOnly ||
          (finite !== null && Number.isFinite(min) && finite <= min!)
        }
        aria-label={decrementLabel}
        onClick={() => stepValue(-1)}
      >
        <Icon name="minus" size="sm" />
      </Button>
      <span className="v-number-input__field">
        <input
          {...props}
          ref={ownedRef}
          className="v-number-input__control"
          type="text"
          inputMode="decimal"
          role="spinbutton"
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-valuenow={finite ?? undefined}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-invalid={invalid || props["aria-invalid"] || undefined}
          onChange={(event) => {
            onChange?.(event);
            if (event.defaultPrevented) return;
            const text = event.currentTarget.value;
            setDraft(text);
            const parsed = parseNumberInput(text, locale);
            setInvalid(false);
            if (
              parsed !== undefined &&
              !(event.nativeEvent as InputEvent).isComposing
            )
              commit(parsed);
          }}
          onCompositionEnd={(event) => {
            onCompositionEnd?.(event);
            if (event.defaultPrevented) return;
            const parsed = parseNumberInput(event.currentTarget.value, locale);
            if (parsed !== undefined) commit(parsed);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            const parsed = parseNumberInput(event.currentTarget.value, locale);
            const next =
              typeof parsed === "number"
                ? clamp(parsed)
                : parsed === null
                  ? null
                  : finite;
            if (parsed !== undefined) commit(next);
            setDraft(raw(controlled ? finite : next));
            setInvalid(false);
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (
              event.defaultPrevented ||
              disabled ||
              readOnly ||
              event.nativeEvent.isComposing ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey
            )
              return;
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              stepValue(event.key === "ArrowUp" ? 1 : -1);
            } else if (event.key === "Enter") {
              const parsed = parseNumberInput(draft, locale);
              if (parsed === undefined) setInvalid(true);
              else {
                const next = parsed === null ? null : clamp(parsed);
                commit(next);
                setDraft(raw(controlled ? finite : next));
              }
            } else if (event.key === "Escape") {
              setDraft(raw(finite));
              setInvalid(false);
            }
          }}
        />
        <span
          className="v-number-input__display"
          aria-hidden="true"
          title={displayText}
          style={
            {
              "--number-length": Math.max(1, Array.from(displayText).length),
            } as React.CSSProperties
          }
        >
          <AnimatedNumber
            value={finite ?? NaN}
            fallback={placeholder}
            locale={locale}
            format={format}
            treatment={treatment}
            duration={duration}
          />
        </span>
      </span>
      <Button
        variant="secondary"
        data-stable-hit=""
        className="v-number-input__step v-number-input__increase"
        type="button"
        disabled={
          disabled ||
          readOnly ||
          (finite !== null && Number.isFinite(max) && finite >= max!)
        }
        aria-label={incrementLabel}
        onClick={() => stepValue(1)}
      >
        <Icon name="plus" size="sm" />
      </Button>
      {presentation === "scrub" && (
        <Button
          variant="ghost"
          data-stable-hit=""
          className="v-number-input__scrub"
          disabled={disabled || readOnly}
          aria-label={scrubLabel}
          aria-describedby={props["aria-describedby"]}
          onPointerDown={(event) => {
            if (disabled || readOnly || event.button !== 0 || !event.isPrimary)
              return;
            // Capture only the dedicated grip; native text selection is never hijacked.
            event.currentTarget.setPointerCapture(event.pointerId);
            suppressClick.current = false;
            gesture.current = {
              x: event.clientX,
              value: finite,
              steps: 0,
              moved: false,
            };
            setScrubbing(true);
          }}
          onPointerMove={(event) => {
            const drag = gesture.current;
            if (!drag || disabled || readOnly) return;
            const steps = Math.trunc((event.clientX - drag.x) / 8);
            const delta = steps - drag.steps;
            if (!delta) return;
            drag.moved = true;
            let next = drag.value;
            // Bound work even for synthetic/extreme pointer coordinates.
            for (let n = 0; n < Math.min(Math.abs(delta), 1000); n++) {
              const stepped = stepNumber(
                next,
                delta > 0 ? 1 : -1,
                step,
                min,
                max,
              );
              if (stepped === next) break;
              next = stepped;
            }
            drag.steps = steps;
            drag.value = next;
            commit(next);
            setDraft(raw(controlled ? finite : next));
            setInvalid(false);
          }}
          onPointerUp={(event) => {
            suppressClick.current = Boolean(gesture.current?.moved);
            gesture.current = null;
            setScrubbing(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            gesture.current = null;
            suppressClick.current = true;
            setScrubbing(false);
          }}
          onLostPointerCapture={() => {
            gesture.current = null;
            setScrubbing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              stepValue(event.key === "ArrowRight" ? 1 : -1);
            }
            if (event.key === "Escape") {
              gesture.current = null;
              setScrubbing(false);
              input.current?.focus();
            }
          }}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            input.current?.focus();
          }}
        >
          <span className="v-number-input__ruler" aria-hidden="true">
            {Array.from({ length: 17 }, (_, index) => (
              <i key={index} />
            ))}
          </span>
          <span className="v-number-input__grip" aria-hidden="true">
            <Icon name="arrow-left" size="sm" />
            <span>Drag to adjust</span>
            <Icon name="arrow-right" size="sm" />
          </span>
        </Button>
      )}
    </span>
  );
}
