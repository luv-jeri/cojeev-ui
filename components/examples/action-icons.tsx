"use client";
import * as React from "react";
import {
  Icon,
  iconNames,
  iconActionNames,
  getIconMotionDescription,
  type IconProps,
} from "@/registry/cojeev/ui/icon";
import {
  AnimatedIcon,
  type IconMotion,
} from "@/registry/cojeev/ui/animated-icon";
import { Button } from "@/registry/cojeev/ui/button";
import { CopyButton } from "@/registry/cojeev/ui/code-block";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/registry/cojeev/ui/input-group";
import { Label } from "@/registry/cojeev/ui/label";
import { Slider } from "@/registry/cojeev/ui/slider";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/registry/cojeev/ui/collapsible";
import type { ExampleProps } from "./types";

const label = (name: string) =>
  name
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
const pageSize = 24;
const catalogue = [...new Set([...iconActionNames, ...iconNames])];
const presets: IconMotion[] = [
  "auto",
  "tremor",
  "draw",
  "spin",
  "bounce",
  "validation",
  "pulse",
  "none",
];
const treatments = ["outline", "duotone", "organic"] as const;
const tones = ["current", "pink", "blue", "olive", "yellow"] as const;
const inks = {
  current: "currentColor",
  pink: "var(--v-accent-ink)",
  blue: "var(--status-info-ink)",
  olive: "var(--v-olive-ink)",
  yellow: "var(--status-warn-ink)",
};
function IconExplorer({
  animated = false,
  variant = "default",
  size = "default",
  compact = false,
}: ExampleProps & { animated?: boolean }) {
  const [query, setQuery] = React.useState(""),
    [page, setPage] = React.useState(0),
    [selected, setSelected] = React.useState("camera");
  const [disabled, setDisabled] = React.useState(false);
  const [treatment, setTreatment] = React.useState<
    NonNullable<IconProps["treatment"]>
  >(
    treatments.includes(variant as (typeof treatments)[number])
      ? (variant as (typeof treatments)[number])
      : "outline",
  );
  const [tone, setTone] =
    React.useState<NonNullable<IconProps["tone"]>>("pink");
  const [replay, setReplay] = React.useState(0),
    [duration, setDuration] = React.useState(0.7),
    [ease, setEase] = React.useState<"gentle" | "settle">("gentle");
  const searchRef = React.useRef<HTMLInputElement>(null),
    id = React.useId();
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = catalogue.filter((name) =>
    terms.every((term) =>
      (name + " " + getIconMotionDescription(name))
        .toLowerCase()
        .includes(term),
    ),
  );
  const pages = Math.max(1, Math.ceil(matches.length / pageSize)),
    currentPage = Math.min(page, pages - 1),
    visible = matches.slice(
      currentPage * pageSize,
      (currentPage + 1) * pageSize,
    );
  const preset =
    animated && presets.includes(variant as IconMotion)
      ? (variant as IconMotion)
      : "auto";
  const iconSize = size === "sm" || size === "lg" ? size : "default";
  const ink = inks[tone];
  const iconStyle = {
    width: iconSize === "sm" ? 20 : iconSize === "lg" ? 40 : 30,
    height: iconSize === "sm" ? 20 : iconSize === "lg" ? 40 : 30,
    color: ink,
  };
  const timing = animated
    ? ` duration={${duration}} ease="${ease}"`
    : ` feedbackDuration={${duration}} feedbackEase="${ease}"`;
  const snippet = `<${animated ? "AnimatedIcon" : "Icon"} name="${selected}"${treatment !== "outline" ? ` treatment="${treatment}" tone="${tone}"` : ""}${tone !== "current" ? ` style={{ color: "${ink}" }}` : ""}${animated && preset !== "auto" ? ` preset="${preset}"` : ""}${timing} />`;
  if (compact)
    return (
      <div className="v-icon-studio__compact">
        {["heart", "camera", "leaf"].map((name) => (
          <Button key={name} variant="ghost" aria-label={`Try ${name}`}>
            <AnimatedIcon
              name={name}
              size={iconSize}
              style={iconStyle}
              preset={preset}
              treatment={treatment}
              tone={tone}
            />
          </Button>
        ))}
      </div>
    );
  return (
    <div
      data-icon-explorer={animated ? "animated" : "native"}
      className="v-icon-studio"
    >
      <header className="v-icon-studio__heading">
        <span className="v-icon-studio__eyebrow">THE ICON TYPECASE</span>
        <h3>
          A small sign.
          <br />A clear idea.
        </h3>
        <p>
          {iconNames.length.toLocaleString("en-US")} names, three ways to draw
          them.
          <br />
          Choose a mark. See what moves. Make it yours.
        </p>
      </header>
      <section
        data-icon-inspector=""
        className="v-icon-studio__inspector"
        aria-label="Selected icon inspector"
      >
        <div className="v-icon-studio__proof">
          <span className="v-icon-studio__eyebrow">LIVE SPECIMEN</span>
          <Button
            data-icon-replay-control=""
            className="v-icon-studio__replay"
            shape="card"
            variant="ghost"
            aria-label={`Replay ${selected} animation`}
            disabled={disabled}
            onClick={() => setReplay((value) => value + 1)}
          >
            <AnimatedIcon
              key={`${selected}:${treatment}:${tone}:${replay}`}
              name={selected}
              treatment={treatment}
              tone={tone}
              style={{ width: 84, height: 84, color: ink }}
              preset={preset}
              duration={duration}
              ease={ease}
              active={replay > 0 ? true : undefined}
            />
          </Button>
          <span className="v-icon-studio__proof-label">
            <Icon name="refresh" size="sm" />
            Click to replay
          </span>
        </div>
        <div className="v-icon-studio__details">
          <div className="v-icon-studio__name">
            <code data-icon-selected="" title={selected}>
              {selected}
            </code>
            <CopyButton code={snippet} size="sm" variant="ghost">
              Copy JSX
            </CopyButton>
          </div>
          <p data-icon-description="">{getIconMotionDescription(selected)}</p>
          <div className="v-icon-studio__control">
            <span className="v-icon-studio__control-label">Drawing</span>
            <div
              role="group"
              aria-label="Icon treatment"
              className="v-icon-studio__choices"
            >
              {treatments.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={treatment === value ? "secondary" : "ghost"}
                  aria-pressed={treatment === value}
                  onClick={() => setTreatment(value)}
                >
                  {label(value)}
                </Button>
              ))}
            </div>
          </div>
          <div className="v-icon-studio__control">
            <span className="v-icon-studio__control-label">Colour</span>
            <div
              role="group"
              aria-label="Accent color"
              className="v-icon-studio__tones"
            >
              {tones.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant="ghost"
                  aria-label={`${label(value)} accent`}
                  aria-pressed={tone === value}
                  onClick={() => setTone(value)}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      background:
                        value === "current"
                          ? "var(--v-text)"
                          : `var(--v-${value})`,
                    }}
                  />
                  {label(value)}
                </Button>
              ))}
            </div>
            <small>
              Legible ink for Outline; a coloured wash or contour for Duotone
              and Organic.
            </small>
          </div>
        </div>
      </section>
      <Collapsible className="v-icon-studio__timing">
        <CollapsibleTrigger asChild>
          <Button variant="ghost">
            <Icon name="settings" />
            Motion timing
            <Icon name="chevron-down" size="sm" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div
            role="group"
            aria-label="Motion timing"
            className="v-icon-studio__timing-controls"
          >
            <Label size="sm" id={`${id}-duration`}>
              Duration
            </Label>
            <Slider
              aria-labelledby={`${id}-duration`}
              aria-label="Icon motion duration"
              min={0.3}
              max={2}
              step={0.1}
              value={[duration]}
              onValueChange={(value) => setDuration(value[0] ?? 0.7)}
              appearance="line"
            />
            <output>{duration.toFixed(1)}s</output>
            <div className="v-icon-studio__choices">
              {(["gentle", "settle"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={ease === value ? "secondary" : "ghost"}
                  aria-pressed={ease === value}
                  onClick={() => setEase(value)}
                >
                  {label(value)}
                </Button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="v-icon-studio__search">
        <Label size="sm" htmlFor={id}>
          Find an icon
        </Label>
        <InputGroup aria-label="Find an icon">
          <InputGroupAddon aria-hidden="true">
            <Icon name="search" size="sm" feedback={false} />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            id={id}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Try camera, folder, or arrow"
          />
          {query && (
            <InputGroupButton
              shape="card"
              size="sm"
              variant="ghost"
              aria-label="Clear icon search"
              onClick={() => {
                setQuery("");
                setPage(0);
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
            >
              <Icon name="x" size="sm" />
            </InputGroupButton>
          )}
        </InputGroup>
        {animated && (
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={disabled}
            onClick={() => setDisabled((value) => !value)}
          >
            {disabled ? "Enable actions" : "Disable actions"}
          </Button>
        )}
      </div>
      <p role="status" aria-atomic="true" className="v-icon-studio__status">
        {matches.length
          ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, matches.length)} of ${matches.length.toLocaleString("en-US")} icons · hover, focus or select to animate`
          : "No matching icons. Try a different name or action."}
      </p>
      <div data-icon-grid="" className="v-icon-studio__grid">
        {visible.map((name) => (
          <Button
            key={name}
            data-icon-option={name}
            shape="card"
            variant={selected === name ? "secondary" : "ghost"}
            disabled={disabled}
            aria-label={label(name)}
            aria-pressed={selected === name}
            onClick={() => {
              setSelected(name);
              setReplay((value) => value + 1);
            }}
          >
            {animated ? (
              <AnimatedIcon
                name={name}
                size={iconSize}
                style={iconStyle}
                preset={preset}
                treatment={treatment}
                tone={tone}
                duration={duration}
                ease={ease}
              />
            ) : (
              <Icon
                name={name}
                size={iconSize}
                style={iconStyle}
                treatment={treatment}
                tone={tone}
                feedbackDuration={duration}
                feedbackEase={ease}
              />
            )}
            <span>{label(name)}</span>
          </Button>
        ))}
      </div>
      <nav aria-label="Icon result pages" className="v-icon-studio__pages">
        <Button
          size="sm"
          variant="ghost"
          disabled={currentPage === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        >
          <Icon name="arrow-left" size="sm" />
          Previous icons
        </Button>
        <span>
          Page {currentPage + 1} of {pages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={currentPage === pages - 1}
          onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
        >
          Next icons
          <Icon name="arrow-right" size="sm" />
        </Button>
      </nav>
      <p className="v-icon-studio__credit">
        Based on{" "}
        <a href="https://lucide.dev/" target="_blank" rel="noreferrer">
          Lucide
        </a>
        , with Cojeev ink and motion. Action icons have tailored moving parts;
        the wider collection uses shared motion families. Every gesture respects
        reduced motion.
      </p>
    </div>
  );
}
export function IconExample(props: ExampleProps) {
  return <IconExplorer {...props} />;
}
export function AnimatedIconExample(props: ExampleProps) {
  return <IconExplorer {...props} animated />;
}
