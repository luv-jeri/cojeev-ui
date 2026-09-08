"use client";
import { ScrollAreaList } from "@/registry/sahajiv/ui/scroll-area";

import * as React from "react";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Button } from "@/registry/sahajiv/ui/button";
import { Checkbox } from "@/registry/sahajiv/ui/checkbox";
import { ItemAdornment, type ItemAdornmentValue } from "@/registry/sahajiv/ui/item-adornment";
import { StateChevron } from "@/registry/sahajiv/ui/animated-icon";
import { Icon } from "@/registry/sahajiv/ui/icon";
import { Input } from "@/registry/sahajiv/ui/input";
import { Label } from "@/registry/sahajiv/ui/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/registry/sahajiv/ui/popover";

export type MultiSelectOption = {
  /** Stable, unique value submitted with the form. */
  value: string;
  label: string;
  /** A disabled option cannot be selected or removed. */
  disabled?: boolean;
  adornment?: ItemAdornmentValue;
};

export type MultiSelectProps = {
  /** Visible accessible label for the trigger and its choices. */
  label: string;
  options: readonly MultiSelectOption[];
  /** Per-option adornments take precedence over this shared default. */
  adornment?: ItemAdornmentValue;
  /** Controlled selected values. Values absent from options remain removable. */
  value?: readonly string[];
  /** Initial selection when value is omitted. */
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Submits one hidden form entry per selected value. */
  name?: string;
  id?: string;
  disabled?: boolean;
  description?: string;
  /** Sets the trigger's invalid state and announces the error. */
  error?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
  className?: string;
};

const unique = (values: readonly string[]) => [...new Set(values)];

export function MultiSelect({
  label,
  options,
  adornment = "auto",
  value,
  defaultValue = [],
  onValueChange,
  name,
  id,
  disabled = false,
  description,
  error,
  placeholder = "Choose options",
  searchPlaceholder = "Search options…",
  emptyMessage = "No options available.",
  noResultsMessage = "No matching options.",
  className,
}: MultiSelectProps) {
  const generatedId = React.useId();
  const controlId = id ?? `multi-select-${generatedId}`;
  const [internalValue, setInternalValue] = React.useState(() => unique(defaultValue));
  const [popover, setPopover] = React.useState({ open: false, disabled });
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const choicesRef = React.useRef<HTMLDivElement>(null);
  const selected = unique(value ?? internalValue);
  const indexed = [...new Map(options.map(option => [option.value, option])).values()];
  const selectedSet = new Set(selected);
  const term = query.trim().toLocaleLowerCase();
  const filtered = indexed.filter(option => option.label.toLocaleLowerCase().includes(term));
  // Disabling a field closes it; re-enabling must not reopen a stale popup.
  if (popover.disabled !== disabled) {
    setPopover({ open: false, disabled });
    if (query) setQuery("");
  }
  React.useEffect(() => {
    const form = triggerRef.current?.form;
    if (!form || value !== undefined) return;
    const reset = (event: Event) => queueMicrotask(() => {
      if (!event.defaultPrevented) setInternalValue(unique(defaultValue));
    });
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, value]);
  const descriptions = [description && `${controlId}-description`, error && `${controlId}-error`, `${controlId}-status`].filter(Boolean).join(" ");

  const change = (next: string[]) => {
    if (disabled) return;
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  const toggle = (option: MultiSelectOption) => {
    if (disabled || option.disabled) return;
    change(selectedSet.has(option.value) ? selected.filter(item => item !== option.value) : [...selected, option.value]);
  };
  const changeOpen = (next: boolean) => {
    setPopover({ open: next && !disabled, disabled });
    if (!next) setQuery("");
  };
  const focusChoice = (index: number) => {
    const choices = choicesRef.current?.querySelectorAll<HTMLButtonElement>('[role="checkbox"]:not(:disabled)');
    if (choices?.length) choices[(index + choices.length) % choices.length]?.focus();
  };
  const remove = (item: string) => {
    const index = selected.indexOf(item);
    change(selected.filter(value => value !== item));
    requestAnimationFrame(() => {
      const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-slot="multi-select-remove"]:not(:disabled)');
      (buttons?.[Math.min(index, buttons.length - 1)] ?? triggerRef.current)?.focus();
    });
  };

  return (
    <div ref={rootRef} data-slot="multi-select" data-disabled={disabled || undefined} data-invalid={!!error || undefined} className={cn("v-multi-select", className)}>
      <Label id={`${controlId}-label`} htmlFor={controlId} size="sm">{label}</Label>
      <Popover open={popover.open && !disabled} onOpenChange={changeOpen}>
        {/* Anchor sizing stays stable while the trigger's press feedback scales its paint. */}
        <PopoverAnchor asChild>
          <div>
            <PopoverTrigger asChild>
              <Button ref={triggerRef} id={controlId} data-motion="off" variant="outline" disabled={disabled} aria-labelledby={`${controlId}-label`} aria-describedby={descriptions} aria-invalid={!!error || undefined} className="v-multi-select__trigger">
                <span>{selected.length ? `${selected.length} selected` : placeholder}</span>
                <StateChevron open={popover.open && !disabled} />
              </Button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent className="v-multi-select__popover" aria-labelledby={`${controlId}-label`} onOpenAutoFocus={event => { event.preventDefault(); searchRef.current?.focus(); }}>
          <Input ref={searchRef} type="search" size="sm" value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={`Search ${label}`} autoComplete="off" onKeyDown={event => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); focusChoice(event.key === "ArrowDown" ? 0 : -1); }
            if (event.key === "Enter") event.preventDefault();
          }} />
          <ScrollAreaList maxHeight="min(280px,40dvh)">
          <div ref={choicesRef} data-slot="multi-select-options" className="v-multi-select__options" role="group" aria-label={`${label} choices`} onKeyDown={event => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            const choices = [...(choicesRef.current?.querySelectorAll<HTMLButtonElement>('[role="checkbox"]:not(:disabled)') ?? [])];
            const current = choices.indexOf(event.target as HTMLButtonElement);
            if (current < 0) return;
            event.preventDefault();
            focusChoice(event.key === "Home" ? 0 : event.key === "End" ? -1 : current + (event.key === "ArrowDown" ? 1 : -1));
          }}>
            {filtered.map(option => {
              const optionId = `${controlId}-option-${indexed.indexOf(option)}`;
              return <div key={option.value} className="v-multi-select__option" data-disabled={option.disabled || undefined} data-selected={selectedSet.has(option.value) || undefined}>
                <Checkbox id={optionId} checked={selectedSet.has(option.value)} disabled={disabled || option.disabled} onCheckedChange={() => toggle(option)} />
                <label htmlFor={optionId}><ItemAdornment identity={option.value} value={option.adornment ?? adornment} /><span>{option.label}</span></label>
              </div>;
            })}
            {!filtered.length && <p className="v-multi-select__empty" role="status">{indexed.length ? noResultsMessage : emptyMessage}</p>}
          </div>
          </ScrollAreaList>
          <p className="v-multi-select__hint">Choose any number. Escape closes the list.</p>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && <ul className="v-multi-select__tokens" aria-label={`Selected ${label}`}>
        {selected.map(item => {
          const option = indexed.find(option => option.value === item);
          const text = option?.label ?? item;
          return <li key={item}>
            <Badge size="sm" className="v-multi-select__token">
              <span className="v-multi-select__token-label">{text}</span>
              <Button data-slot="multi-select-remove" variant="ghost" size="sm" className="v-multi-select__remove" aria-label={`Remove ${text}`} disabled={disabled || option?.disabled} onClick={() => remove(item)}><Icon name="x" aria-hidden="true" /></Button>
            </Badge>
          </li>;
        })}
      </ul>}
      {description && <p id={`${controlId}-description`} className="v-multi-select__description">{description}</p>}
      {error && <p id={`${controlId}-error`} className="v-multi-select__error" role="alert">{error}</p>}
      <span id={`${controlId}-status`} className="v-sr" role="status">{selected.length} selected.</span>
      {name && selected.map(item => <input key={item} type="hidden" name={name} value={item} disabled={disabled} />)}
    </div>
  );
}
