"use client";

import * as React from "react";
import {
  Input,
  InputWrapper,
  InputControl,
  InputClear,
  InputAffix,
} from "@/registry/cojeev/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/registry/cojeev/ui/input-group";
import {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
} from "@/registry/cojeev/ui/field";
import {
  Textarea,
  TextareaCount,
  TextareaComposer,
  TextareaComposerBar,
  TextareaScrollArea,
} from "@/registry/cojeev/ui/textarea";
import { Button } from "@/registry/cojeev/ui/button";
import { Label } from "@/registry/cojeev/ui/label";
import { Icon } from "@/registry/cojeev/ui/icon";
import {
  controlRadiusStyle,
  type FieldAppearance,
} from "@/registry/cojeev/lib/control-appearance";
import type { ExampleProps } from "./types";

const approach = (variant?: string): FieldAppearance =>
  variant === "editorial" || variant === "inset" ? variant : "contour";
const descriptions = {
  contour: [
    "A clear place to begin",
    "A quiet edge keeps each entry easy to find.",
  ],
  editorial: [
    "Room for your words",
    "Open lines keep a writing task close to the page.",
  ],
  inset: [
    "Everything in its place",
    "Label and entry share one shallow, settled surface.",
  ],
} as const;
function Intro({ appearance }: { appearance: FieldAppearance }) {
  return (
    <div className="v-form-example__intro">
      <strong>{descriptions[appearance][0]}</strong>
      <p>{descriptions[appearance][1]}</p>
    </div>
  );
}

export function InputExample({ variant, size, compact, radius }: ExampleProps) {
  const appearance = approach(variant);
  const [query, setQuery] = React.useState("Morning ideas");
  const id = React.useId();
  const control = React.useRef<HTMLInputElement>(null);
  return (
    <div
      className="v-form-example"
      data-form-example="input"
      style={controlRadiusStyle(radius)}
    >
      {!compact && <Intro appearance={appearance} />}
      <Field appearance={appearance} controlId={id}>
        <FieldLabel>
          {appearance === "editorial"
            ? "Working title"
            : appearance === "inset"
              ? "Note title"
              : "Find a note"}
        </FieldLabel>
        <InputWrapper
          appearance={appearance === "inset" ? undefined : appearance}
          data-motion={appearance === "contour" ? undefined : "off"}
          variant={variant === "cream" ? "cream" : undefined}
          size={size === "sm" ? "sm" : "default"}
        >
          {appearance === "contour" && <InputAffix>Notes /</InputAffix>}
          <FieldControl>
            <InputControl
              ref={control}
              name="note"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Give this idea a name…"
            />
          </FieldControl>
          <InputClear
            disabled={!query}
            onClear={() => {
              setQuery("");
              control.current?.focus();
            }}
          />
        </InputWrapper>
        <FieldDescription>
          {appearance === "editorial"
            ? "A title can change as the idea grows."
            : "Your words stay here when the appearance changes."}
        </FieldDescription>
      </Field>
      {!compact && (
        <Field controlId={`${id}-locked`}>
          <FieldLabel>Shared workspace</FieldLabel>
          <FieldControl>
            <Input
              appearance={appearance}
              disabled
              defaultValue="Personal space · read only"
            />
          </FieldControl>
        </Field>
      )}
    </div>
  );
}

export function FieldExample({
  variant,
  compact,
  radius,
  fieldAppearance,
}: ExampleProps) {
  const layout =
    variant === "inline" || variant === "integrated" ? variant : "stacked";
  const appearance =
    fieldAppearance && fieldAppearance !== "default"
      ? fieldAppearance
      : layout === "integrated"
        ? "inset"
        : approach(variant);
  const [value, setValue] = React.useState(
    variant === "invalid" ? "ab" : "Personal space",
  );
  const [checked, setChecked] = React.useState(variant === "invalid");
  const invalid = checked && value.trim().length < 3;
  return (
    <form
      className="v-form-example"
      data-form-example="field"
      style={controlRadiusStyle(radius)}
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
      }}
      noValidate
    >
      {!compact && (
        <div className="v-form-example__intro">
          <strong>Give the field a voice</strong>
          <p>
            Input is the entry. Field connects its label, instructions and
            feedback.
          </p>
          <p>
            Try a two-letter name to see validation without losing your draft.
          </p>
        </div>
      )}
      <Field layout={layout} appearance={appearance} invalid={invalid}>
        <FieldLabel>Workspace name</FieldLabel>
        <FieldControl>
          <Input
            name="workspace"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setChecked(false);
            }}
            minLength={3}
            required
          />
        </FieldControl>
        <FieldDescription>
          Choose a name with at least three characters.
        </FieldDescription>
        {invalid && (
          <FieldError>
            Use at least three characters, then try again.
          </FieldError>
        )}
      </Field>
      <div className="v-form-example__footer">
        <Button type="submit" size="sm">
          Check name
        </Button>
        <p className="v-form-example__status" role="status">
          {checked && !invalid ? "This name is ready." : ""}
        </p>
      </div>
    </form>
  );
}

export function InputGroupExample({
  variant,
  compact,
  radius,
  fieldAppearance,
}: ExampleProps) {
  const composition =
    variant === "quantity" || variant === "composer" ? variant : "address";
  const appearance =
    fieldAppearance && fieldAppearance !== "default"
      ? fieldAppearance
      : approach(variant);
  const [address, setAddress] = React.useState("personal-space");
  const [copies, setCopies] = React.useState("2");
  const [message, setMessage] = React.useState(
    "A small thought, ready to share.",
  );
  const [receipt, setReceipt] = React.useState("");
  const validCopies =
    Number.isInteger(Number(copies)) &&
    Number(copies) >= 1 &&
    Number(copies) <= 99;
  const id = React.useId();
  return (
    <form
      className="v-form-example"
      data-form-example="input-group"
      data-composition={composition}
      style={controlRadiusStyle(radius)}
      onSubmit={(event) => {
        event.preventDefault();
        if (composition === "quantity") {
          if (validCopies)
            setReceipt(`Added ${copies} copies to this example.`);
        } else if (composition === "composer") {
          if (message.trim()) setReceipt(`Message kept locally: ${message}`);
        } else if (address.trim())
          setReceipt(`Saved notes / ${address} in this example.`);
      }}
    >
      {!compact && (
        <div className="v-form-example__intro">
          <strong>
            {composition === "address"
              ? "One address, one place"
              : composition === "quantity"
                ? "The number needs its unit"
                : "The action belongs to the thought"}
          </strong>
          <p>
            {composition === "address"
              ? "An uneditable prefix and a clear save action frame your entry."
              : composition === "quantity"
                ? "Set a quantity without separating the value from its meaning."
                : "Keep a message, its limit and its next action together."}
          </p>
        </div>
      )}
      <Field appearance={appearance}>
        <FieldLabel>
          {composition === "quantity"
            ? "Copies"
            : composition === "composer"
              ? "Message"
              : "Workspace address"}
        </FieldLabel>
        <InputGroup
          appearance={appearance === "inset" ? undefined : appearance}
          data-motion={appearance === "contour" ? undefined : "off"}
        >
          {composition === "address" && (
            <>
              <InputGroupAddon id={`${id}-prefix`}>notes /</InputGroupAddon>
              <FieldControl>
                <InputGroupInput
                  aria-describedby={`${id}-prefix ${id}-hint`}
                  name="address"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setReceipt("");
                  }}
                />
              </FieldControl>
              <InputGroupButton
                data-stable-hit=""
                type="submit"
                aria-label="Save address"
                disabled={!address.trim()}
              >
                Save <Icon name="arrow-right" />
              </InputGroupButton>
            </>
          )}
          {composition === "quantity" && (
            <>
              <FieldControl>
                <InputGroupInput
                  aria-describedby={`${id}-hint`}
                  name="copies"
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={copies}
                  onChange={(event) => {
                    setCopies(event.target.value);
                    setReceipt("");
                  }}
                />
              </FieldControl>
              <InputGroupAddon aria-hidden="true">copies</InputGroupAddon>
              <InputGroupButton
                data-stable-hit=""
                type="submit"
                aria-label="Add copies"
                disabled={!validCopies}
              >
                Add <Icon name="plus" />
              </InputGroupButton>
            </>
          )}
          {composition === "composer" && (
            <>
              <TextareaScrollArea>
                <FieldControl>
                  <InputGroupTextarea
                    name="message"
                    rows={3}
                    maxLength={240}
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setReceipt("");
                    }}
                  />
                </FieldControl>
              </TextareaScrollArea>
              <TextareaCount value={message} maxLength={240} />
              <InputGroupButton
                data-stable-hit=""
                type="submit"
                aria-label="Send message"
                disabled={!message.trim()}
              >
                Send <Icon name="arrow-up-right" />
              </InputGroupButton>
            </>
          )}
        </InputGroup>
        <FieldDescription id={`${id}-hint`}>
          {composition === "address"
            ? "Only edit the part after notes /."
            : composition === "quantity"
              ? "Choose a whole number from 1 to 99 copies."
              : "240 characters. This example sends nothing outside the page."}
        </FieldDescription>
      </Field>
      <p className="v-form-example__status" role="status">
        {receipt || "Changes are local to this example."}
      </p>
    </form>
  );
}

export function TextareaExample({
  variant,
  compact,
  radius,
  fieldAppearance,
}: ExampleProps) {
  const composition =
    variant === "composer" || variant === "response" ? variant : "writing";
  const appearance =
    fieldAppearance && fieldAppearance !== "default"
      ? fieldAppearance
      : approach(variant);
  const [value, setValue] = React.useState(
    "Leave a little room for the unexpected.",
  );
  const [saved, setSaved] = React.useState(false);
  const editor = (
    <TextareaScrollArea>
      <FieldControl>
        <Textarea
          name="note"
          rows={composition === "response" ? 3 : 5}
          value={value}
          maxLength={240}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
      </FieldControl>
    </TextareaScrollArea>
  );
  const save = (
    <Button data-stable-hit="" size="sm" type="submit" disabled={!value.trim()}>
      Keep note <Icon name="arrow-up-right" />
    </Button>
  );
  return (
    <form
      className="v-form-example"
      data-form-example="textarea"
      data-composition={composition}
      style={controlRadiusStyle(radius)}
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      {!compact && (
        <div className="v-form-example__intro">
          <strong>
            {composition === "writing"
              ? "Make room for a thought"
              : composition === "composer"
                ? "Write, then send it on"
                : "A little space. A clear thought."}
          </strong>
          <p>
            {composition === "writing"
              ? "A quiet writing surface; the label stays above your words."
              : composition === "composer"
                ? "The draft, character count and action share one frame."
                : "A visible allowance helps you finish without surprises."}
          </p>
        </div>
      )}
      <Field appearance={appearance}>
        <FieldLabel>Note for later</FieldLabel>
        {composition === "composer" ? (
          <TextareaComposer appearance={appearance}>
            <>{editor}</>
            <TextareaComposerBar>
              <TextareaCount value={value} maxLength={240} />
              {save}
            </TextareaComposerBar>
          </TextareaComposer>
        ) : (
          editor
        )}
        <FieldDescription>
          {composition === "response"
            ? `${240 - value.length} characters left. Keep the part that matters most.`
            : "Resize from the lower corner. Only stored in this example."}
        </FieldDescription>
      </Field>
      {composition === "response" && (
        <div className="v-form-example__allowance" aria-hidden="true">
          <span style={{ width: `${(value.length / 240) * 100}%` }} />
        </div>
      )}
      {composition !== "composer" && (
        <div className="v-form-example__footer">
          <TextareaCount value={value} maxLength={240} />
          {save}
        </div>
      )}
      <p className="v-form-example__status" role="status">
        {saved ? "Kept in this example." : ""}
      </p>
    </form>
  );
}

export function LabelExample({
  variant = "required",
  size = "default",
  compact,
}: ExampleProps) {
  const mode =
    variant === "optional" || variant === "help" ? variant : "required";
  const id = React.useId();
  const [value, setValue] = React.useState("Personal space");
  return (
    <div className="v-form-example" data-form-example="label">
      {!compact && (
        <div className="v-form-example__intro">
          <strong>A name is part of the interface</strong>
          <p>
            Click the label to focus its entry. Requirements and help stay
            visible.
          </p>
        </div>
      )}
      <div className="v-form-example__label-row">
        <Label htmlFor={id} size={size === "sm" ? "sm" : "default"}>
          Workspace name
        </Label>
        <span>
          {mode === "required"
            ? "Required"
            : mode === "optional"
              ? "Optional"
              : "Help below"}
        </span>
      </div>
      <Input
        id={id}
        appearance="contour"
        name="workspace"
        required={mode === "required"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby={`${id}-help`}
      />
      <p id={`${id}-help`} className="v-form-example__hint">
        {mode === "required"
          ? "A name is needed to create a workspace."
          : mode === "optional"
            ? "Leave this blank to use your account name."
            : "Choose a short, recognisable name. You can change it later."}
      </p>
    </div>
  );
}
