"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbBack,
  BreadcrumbEllipsis,
} from "@/registry/cojeev/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/registry/cojeev/ui/dropdown-menu";
import {
  Stepper,
  StepperList,
  StepperItem,
  StepperIndicator,
  StepperTitle,
  StepperTrigger,
  StepperPrevious,
  StepperNext,
  StepperStatus,
} from "@/registry/cojeev/ui/stepper";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
} from "@/registry/cojeev/ui/field";
import { Input } from "@/registry/cojeev/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupBody,
} from "@/registry/cojeev/ui/radio-group";
import type { ExampleProps } from "./types";

export function BreadcrumbExample({ variant = "trail" }: ExampleProps) {
  const id = React.useId();
  const [depth, setDepth] = React.useState(3);
  const [notice, setNotice] = React.useState("");
  const title = React.useRef<HTMLHeadingElement>(null);
  const focusNext = React.useRef(false);
  const path = ["Library", "Projects", "Field notes", "Garden journal"];
  const presentation =
    variant === "pocket" || variant === "directory" ? variant : "trail";
  React.useEffect(() => {
    if (focusNext.current) {
      title.current?.focus();
      focusNext.current = false;
    }
  }, [depth]);
  const move = (index: number) => {
    if (index === depth) return;
    focusNext.current = true;
    setDepth(index);
    setNotice(`Opened ${path[index]} in this local folder preview.`);
  };
  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      move(index);
    }
  };
  const ancestor = (index: number) => (
    <BreadcrumbLink
      href={`#${id}-folder-${index}`}
      onClick={(event) => navigate(event, index)}
    >
      {path[index]}
    </BreadcrumbLink>
  );
  return (
    <div className="v-breadcrumb-example">
      <header className="v-breadcrumb-example__eyebrow">
        <Icon name="folder" size="sm" />
        <span>A place for every idea</span>
      </header>
      <Breadcrumb presentation={presentation}>
        {presentation === "pocket" && (
          <BreadcrumbBack
            aria-label={`Go to ${path[Math.max(0, depth - 1)]}`}
            disabled={depth === 0}
            onClick={() => move(depth - 1)}
          />
        )}
        <BreadcrumbList>
          {presentation === "pocket" && depth > 1 && (
            <>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="v-breadcrumb-overflow"
                      aria-label="Show ancestors"
                      data-stable-hit=""
                    >
                      <BreadcrumbEllipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Earlier in this path</DropdownMenuLabel>
                    {path.slice(0, depth - 1).map((label, index) => (
                      <DropdownMenuItem asChild key={label}>
                        <a
                          href={`#${id}-folder-${index}`}
                          onClick={(event) => navigate(event, index)}
                        >
                          {label}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {path.slice(0, depth + 1).map((label, index) => {
            if (presentation === "pocket" && index < depth - 1) return null;
            return (
              <React.Fragment key={label}>
                <BreadcrumbItem
                  id={`${id}-folder-${index}`}
                  style={{ "--crumb-depth": index } as React.CSSProperties}
                >
                  {index > 0 &&
                    (presentation !== "pocket" || index === depth) && (
                      <BreadcrumbSeparator asChild>
                        <span>
                          <Icon name="chevron-right" size="sm" />
                        </span>
                      </BreadcrumbSeparator>
                    )}
                  {index === depth ? (
                    <BreadcrumbPage>
                      <Icon name="file-text" size="sm" />
                      {label}
                    </BreadcrumbPage>
                  ) : (
                    ancestor(index)
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <section className="v-breadcrumb-example__document">
        <div>
          <p>Currently open</p>
          <h3 tabIndex={-1} ref={title}>
            {path[depth]}
          </h3>
          <p>
            {depth === 3
              ? "A few observations, gathered in one small place."
              : "Follow the path above to move through this collection."}
          </p>
        </div>
        <span className="v-breadcrumb-example__folio" aria-hidden="true">
          {String(depth + 1).padStart(2, "0")}
          <span>/ 04</span>
        </span>
      </section>
      <footer className="v-breadcrumb-example__footer">
        {presentation === "directory" && (
          <Button
            variant="outline"
            disabled={depth === 0}
            aria-label={`Go to ${path[Math.max(0, depth - 1)]}`}
            onClick={() => move(depth - 1)}
            data-stable-hit=""
          >
            <Icon name="arrow-left" size="sm" />
            Parent folder
          </Button>
        )}
        <Button variant="ghost" onClick={() => move(3)} disabled={depth === 3}>
          Reset path
        </Button>
        <p role="status">
          {notice || "Ancestor links navigate this local preview."}
        </p>
      </footer>
    </div>
  );
}

export function StepperExample({ variant = "rail" }: ExampleProps) {
  const id = React.useId();
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState("");
  const [rhythm, setRhythm] = React.useState("weekly");
  const [saved, setSaved] = React.useState("");
  const headings = React.useRef<Array<HTMLHeadingElement | null>>([]);
  const focusNext = React.useRef(false);
  const labels = ["Name", "Rhythm", "Review"];
  const details = [
    "Give it a beginning",
    "Make a little room",
    "Keep the essentials",
  ];
  const presentation =
    variant === "ledger" || variant === "compact" ? variant : "rail";
  React.useEffect(() => {
    if (focusNext.current) {
      headings.current[step - 1]?.focus();
      focusNext.current = false;
    }
  }, [step]);
  const move = (next: number) => {
    focusNext.current = next !== step;
    setStep(next);
    setSaved("");
  };
  const restart = () => {
    setName("");
    setRhythm("weekly");
    setSaved("");
    move(1);
  };
  const valid = Boolean(name.trim());
  return (
    <Stepper
      count={3}
      labels={labels}
      value={step}
      onValueChange={move}
      presentation={presentation}
      className="v-stepper-example"
    >
      <header className="v-stepper-example__intro">
        <p>A small start</p>
        <h3>Give an idea somewhere to grow.</h3>
        <StepperStatus />
      </header>
      <div className="v-stepper-example__layout">
        <StepperList
          orientation={presentation === "ledger" ? "vertical" : "horizontal"}
          aria-label="Draft stages"
        >
          {labels.map((label, index) => (
            <StepperItem key={label} step={index + 1}>
              <StepperTrigger
                step={index + 1}
                aria-label={`Return to ${label}`}
              >
                <StepperIndicator step={index + 1} />
                <StepperTitle>{label}</StepperTitle>
                <span className="v-stepper-example__checkpoint-detail">
                  {["Working title", "Working pace", "Your draft"][index]}
                </span>
                <span data-slot="stepper-progress-mark" aria-hidden="true" />
              </StepperTrigger>
            </StepperItem>
          ))}
        </StepperList>
        <form
          className="v-stepper-example__workspace"
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 3 && valid) move(step + 1);
            else if (valid)
              setSaved(
                `Saved here: ${name.trim()} · ${rhythm}. No account or server needed.`,
              );
          }}
        >
          {[1, 2, 3].map((stage) => (
            <section
              key={stage}
              data-step-panel=""
              hidden={step !== stage}
              inert={step !== stage}
              aria-labelledby={`${id}-stage-${stage}`}
            >
              <header className="v-stepper-example__stage-title">
                <span className="v-stepper-example__number" aria-hidden="true">
                  {String(stage).padStart(2, "0")}
                </span>
                <div>
                  <p>{details[stage - 1]}</p>
                  <h4
                    id={`${id}-stage-${stage}`}
                    data-step-heading=""
                    ref={(node) => {
                      headings.current[stage - 1] = node;
                    }}
                    tabIndex={-1}
                  >
                    {stage === 1
                      ? "What is taking shape?"
                      : stage === 2
                        ? "Find a rhythm that fits."
                        : "A little plan, ready to keep."}
                  </h4>
                </div>
              </header>
              {stage === 1 ? (
                <Field controlId={`${id}-name`}>
                  <FieldLabel>Name your idea</FieldLabel>
                  <FieldControl>
                    <Input
                      required
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setSaved("");
                      }}
                      placeholder="A small garden…"
                      autoComplete="off"
                    />
                  </FieldControl>
                  <FieldDescription>
                    A working title is enough. You can come back and change it.
                  </FieldDescription>
                </Field>
              ) : stage === 2 ? (
                <RadioGroup
                  value={rhythm}
                  onValueChange={(value) => {
                    setRhythm(value);
                    setSaved("");
                  }}
                  aria-label="Working rhythm"
                  appearance="card"
                  shape="pebble"
                  tone="blue"
                >
                  <RadioGroupItem value="daily" aria-label="Daily">
                    <RadioGroupBody>
                      <b>Daily</b>
                      <small>A few minutes, often.</small>
                    </RadioGroupBody>
                  </RadioGroupItem>
                  <RadioGroupItem value="weekly" aria-label="Weekly">
                    <RadioGroupBody>
                      <b>Weekly</b>
                      <small>One unhurried session.</small>
                    </RadioGroupBody>
                  </RadioGroupItem>
                </RadioGroup>
              ) : (
                <dl className="v-stepper-example__summary">
                  <div>
                    <dt>Your idea</dt>
                    <dd>{name.trim() || "Untitled idea"}</dd>
                  </div>
                  <div>
                    <dt>Your rhythm</dt>
                    <dd>
                      {rhythm === "weekly"
                        ? "Once a week"
                        : "A little every day"}
                    </dd>
                  </div>
                </dl>
              )}
            </section>
          ))}
          <footer className="v-stepper-example__actions">
            <StepperPrevious>
              <Icon name="arrow-left" size="sm" />
              Back
            </StepperPrevious>
            {step < 3 ? (
              <StepperNext disabled={!valid} aria-label="Next step">
                Continue
                <Icon name="arrow-right" size="sm" />
              </StepperNext>
            ) : (
              <Button
                type="submit"
                variant="accent"
                disabled={!valid}
                data-stable-hit=""
              >
                Save draft
                <Icon name="check" size="sm" />
              </Button>
            )}
          </footer>
        </form>
      </div>
      <footer className="v-stepper-example__ending">
        <p role="status">
          {saved ||
            (step === 1 && !valid
              ? "Start with a name to unlock the next step."
              : "Your entries stay here when you go back.")}
        </p>
        <Button variant="ghost" onClick={restart}>
          Start again
        </Button>
      </footer>
    </Stepper>
  );
}
