"use client";

/**
 * The live specimen inspector.
 *
 * Exactly one real registry component is mounted at a time, on explicit request.
 * Every example here is the shipped component — the same source the catalogue
 * installs — so "the component behaves well" is demonstrated rather than
 * described. The sculpted assembly is deliberately not a component gallery: the
 * live examples are here so the chapter never asks anyone to take polish on
 * trust.
 */
import * as React from "react";
import Link from "next/link";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { Checkbox } from "@/registry/cojeev/ui/checkbox";
import { Switch } from "@/registry/cojeev/ui/switch";
import { Slider } from "@/registry/cojeev/ui/slider";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Progress } from "@/registry/cojeev/ui/progress";
import { Spinner } from "@/registry/cojeev/ui/spinner";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";
import { PatternBackground } from "@/registry/cojeev/ui/pattern-background";
import { Badge } from "@/registry/cojeev/ui/badge";
import { Kbd } from "@/registry/cojeev/ui/kbd";
import { experience } from "./experience-store";

export type SpecimenId =
  | "button"
  | "input"
  | "checkbox"
  | "switch"
  | "slider"
  | "animated-icon"
  | "progress"
  | "spinner"
  | "shape-artwork"
  | "pattern-background"
  | "badge"
  | "kbd";

type SpecimenProps = { specimen: string };

const EXAMPLES: Record<
  SpecimenId,
  { caption: string; render: (props: SpecimenProps) => React.ReactNode }
> = {
  button: {
    caption: "The variant set, one press behaviour, one radius decision.",
    render: () => (
      <div className="asm-example__row">
        <Button>Default</Button>
        <Button variant="accent">Create</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    ),
  },
  input: {
    caption: "A field with a real clear affordance and an affix that stays put.",
    render: () => (
      <div className="asm-example__column">
        <Input placeholder="Name the thing" aria-label="Name the thing" />
        <Input defaultValue="000h" aria-label="Project" />
      </div>
    ),
  },
  checkbox: {
    caption: "Independent state, visible focus, no decorative churn.",
    render: () => <CheckboxExample />,
  },
  switch: {
    caption: "Three appearances, one motion system underneath.",
    render: () => <SwitchExample />,
  },
  slider: {
    caption: "Organic rail, momentum on release, keyboard-reachable thumb.",
    render: () => <SliderExample />,
  },
  "animated-icon": {
    caption: "State changes are announced, not merely decorated.",
    render: () => (
      <div className="asm-example__row">
        <AnimatedIcon name="chevron-right" />
        <AnimatedIcon name="check" />
        <AnimatedIcon name="plus" />
      </div>
    ),
  },
  progress: {
    caption: "Determinate progress that reports its own value.",
    render: () => (
      <div className="asm-example__column">
        <Progress value={32} />
        <Progress value={78} />
      </div>
    ),
  },
  spinner: {
    caption: "Busy state with a text equivalent and no layout shift.",
    render: () => <Spinner label="Loading specimens" />,
  },
  "shape-artwork": {
    caption: "The same contour language the sculpted face is extruded from.",
    render: () => (
      <ShapeArtwork name="daisy-12" tone="pink" ambient shadow morphTo="cushion" />
    ),
  },
  "pattern-background": {
    caption: "A generated field, kept behind the content it serves.",
    render: () => (
      <div className="asm-example__frame">
        <PatternBackground />
      </div>
    ),
  },
  badge: {
    caption: "Status that survives colour-blind viewing and small text.",
    render: () => (
      <div className="asm-example__row">
        <Badge>New</Badge>
        <Badge>Stable</Badge>
      </div>
    ),
  },
  kbd: {
    caption: "Keycaps that match the platform reading order.",
    render: () => (
      <p className="asm-example__text">
        Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search the catalogue.
      </p>
    ),
  },
};

function CheckboxExample() {
  const [checked, setChecked] = React.useState(true);
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next === true);
        experience.announce(next ? "Checkbox checked" : "Checkbox unchecked");
      }}
    >
      Show only what I can install
    </Checkbox>
  );
}

function SwitchExample() {
  const [checked, setChecked] = React.useState(false);
  return (
    <div className="asm-example__row">
      <Switch
        checked={checked}
        onCheckedChange={(next) => {
          setChecked(next);
          experience.announce(next ? "Switch on" : "Switch off");
        }}
        aria-label="Ambient motion"
      />
      <Switch appearance="rocker" aria-label="Rocker" />
      <Switch appearance="latch" aria-label="Latch" />
    </div>
  );
}

function SliderExample() {
  const [values, setValues] = React.useState([46]);
  return (
    <Slider
      value={values}
      onValueChange={setValues}
      thumbLabel="Tension"
      aria-label="Tension"
    />
  );
}

const isSpecimen = (value: string): value is SpecimenId => value in EXAMPLES;

export function LiveSpecimen({
  specimen,
  docsHref,
  command,
}: {
  specimen: string;
  docsHref: string;
  command: string;
}) {
  const [copied, setCopied] = React.useState<"idle" | "done" | "failed">("idle");
  const example = isSpecimen(specimen) ? EXAMPLES[specimen] : null;

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied("done");
      experience.emit({ type: "copy" });
      experience.announce("Install command copied");
    } catch {
      setCopied("failed");
      experience.emit({ type: "copyFailed", what: "install command" });
      experience.announce("Copy failed. The command is shown below and can be selected.");
    }
  }, [command]);

  if (!example) return null;

  return (
    <div className="asm-live" data-specimen={specimen}>
      <div className="asm-live__stage">{example.render({ specimen })}</div>
      <p className="asm-live__caption">{example.caption}</p>
      <div className="asm-live__actions">
        <Link className="asm-link" href={docsHref}>
          View {specimen} docs
        </Link>
        <button type="button" className="asm-link" onClick={() => void onCopy()}>
          {copied === "done"
            ? "Command copied"
            : copied === "failed"
              ? "Copy failed — select below"
              : "Copy install command"}
        </button>
      </div>
      <code className="asm-live__command">{command}</code>
    </div>
  );
}
