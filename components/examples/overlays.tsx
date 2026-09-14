"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/registry/cojeev/ui/tooltip";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/registry/cojeev/ui/hover-card";
import { Avatar, AvatarFallback } from "@/registry/cojeev/ui/avatar";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { ChartTooltip } from "@/registry/cojeev/ui/chart-tooltip";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/registry/cojeev/ui/collapsible";

export function TooltipExample({ variant = "callout" }: ExampleProps) {
  const appearance =
    variant === "shortcut" || variant === "annotation" ? variant : "callout";
  const [saved, setSaved] = React.useState(0);
  return (
    <section
      className="v-tooltip-example"
      aria-label="Tooltip example"
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          setSaved((n) => n + 1);
        }
      }}
    >
      <span className="v-tooltip-example__label">A note in the margin</span>
      <h3>A small hint. Right on time.</h3>
      <p>
        The note stays in this example. Hover or focus Save note to see a{" "}
        {appearance} hint; Escape dismisses it.
      </p>
      <div className="v-tooltip-example__actions">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                onClick={() => setSaved((n) => n + 1)}
              >
                <Icon name="check" aria-hidden="true" />
                Save note
              </Button>
            </TooltipTrigger>
            <TooltipContent appearance={appearance} side="top" sideOffset={12}>
              {appearance === "shortcut" ? (
                <>
                  <span>Save this note</span>
                  <kbd>⌘ / Ctrl S</kbd>
                </>
              ) : appearance === "annotation" ? (
                <>
                  <strong>One small detail</strong>Only this local example is
                  updated. Nothing is sent.
                </>
              ) : (
                "Keep this note in the local preview."
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span role="status">
          {saved
            ? `Saved locally ${saved} ${saved === 1 ? "time" : "times"}`
            : "Not saved yet"}
        </span>
      </div>
    </section>
  );
}

const previewNotes = [
  "Look for the detail that earns its place. A line can connect ideas; a colour can help you find the next action.",
  "Leave enough room around the important thing. Quiet space is part of the composition, not an unfinished area.",
  "Motion should answer a gesture or explain a change. The text and the target should stay easy to follow.",
  "Keep the same meaning in light and dark. A mark, a label and a clear state should tell the same story.",
];
export function HoverCardExample({ variant = "identity" }: ExampleProps) {
  const appearance =
    variant === "preview" || variant === "media" ? variant : "identity";
  const [open, setOpen] = React.useState(false),
    [long, setLong] = React.useState(false),
    [read, setRead] = React.useState(false);
  const detail = (
    <div className="v-hovercard-detail">
      {appearance === "identity" ? (
        <>
          <div className="v-hovercard-detail__top">
            <Avatar variant="pink" shape="pebble">
              <AvatarFallback>MS</AvatarFallback>
            </Avatar>
            <div>
              <h3>Mira Sen</h3>
              <span className="v-hovercard-detail__meta">
                Design · Sample author
              </span>
            </div>
          </div>
          <p>
            Collecting useful little discoveries about type, motion and everyday
            interfaces.
          </p>
        </>
      ) : appearance === "preview" ? (
        <>
          <span className="v-hovercard-detail__meta">Excerpt · 01 / 12</span>
          <h3>Make room for the small things.</h3>
          <p className="v-hovercard-detail__excerpt">
            A useful interface does not need to shout. One considered detail can
            make the next step feel obvious.
          </p>
        </>
      ) : (
        <>
          <svg
            className="v-hovercard-detail__art"
            viewBox="0 0 320 160"
            role="img"
            aria-label="An abstract notebook study with a pink flower and a winding ink line"
          >
            <rect width="320" height="160" fill="var(--v-blue-soft)" />
            <path
              d="M-10 150Q70 40 160 112T340 30V170H-10Z"
              fill="var(--v-olive-soft)"
            />
            <path
              d="M75 90C39 87 38 55 65 47C58 12 98 1 109 30C140 10 161 44 138 63C169 82 146 115 121 99C107 133 72 119 75 90Z"
              fill="var(--v-pink)"
            />
            <path
              d="M28 131C104 59 169 160 280 35"
              stroke="var(--v-text)"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="248" cy="51" r="7" fill="var(--v-yellow)" />
          </svg>
          <h3>A little field study</h3>
          <p>Authored shapes, one ink line and room to breathe.</p>
        </>
      )}
      {long && previewNotes.map((note, index) => <p key={index}>{note}</p>)}
      <div className="v-hovercard-detail__footer">
        <span className="v-hovercard-detail__meta">12 sample notes</span>
        <span className="v-hovercard-detail__meta">Local preview</span>
      </div>
    </div>
  );
  return (
    <section className="v-hovercard-example" aria-label="Hover card example">
      <span className="v-hovercard-detail__meta">From the studio notebook</span>
      <h3>There is a little more to this.</h3>
      <p>
        Meet the maker, read an excerpt, or take a closer look. Hover, focus or
        tap the button—or read the same detail below.
      </p>
      <HoverCard open={open} onOpenChange={setOpen}>
        <HoverCardTrigger asChild>
          <Button
            variant="secondary"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            About this notebook
            <Icon name="chevron-down" aria-hidden="true" />
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          appearance={appearance}
          side="bottom"
          align="start"
          aria-label="Notebook preview"
        >
          {detail}
        </HoverCardContent>
      </HoverCard>
      <div className="v-hovercard-example__actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLong((value) => !value)}
        >
          {long ? "Use short preview" : "Use long preview"}
        </Button>
      </div>
      <Collapsible
        open={read}
        onOpenChange={(value) => {
          setRead(value);
          setOpen(false);
        }}
      >
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            {read ? "Hide readable preview" : "Read preview"}
            <Icon name="chevron-down" aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className="v-hovercard-inline"
          role="region"
          aria-label="Readable notebook preview"
        >
          {detail}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

const moments = [
  {
    label: "Morning",
    items: [
      { label: "Notes kept", value: 12, color: "pink" as const },
      { label: "Ideas explored", value: 8, color: "blue" as const },
    ],
  },
  {
    label: "Afternoon",
    items: [
      { label: "Notes kept", value: 18, color: "pink" as const },
      { label: "Ideas explored", value: 14, color: "blue" as const },
    ],
  },
  {
    label: "Evening",
    items: [
      { label: "Notes kept", value: 8, color: "pink" as const },
      { label: "Ideas explored", value: null, color: "blue" as const },
    ],
  },
];
export function ChartTooltipExample({ variant = "compare" }: ExampleProps) {
  const presentation =
    variant === "summary" || variant === "ranked" ? variant : "compare";
  const [active, setActive] = React.useState<number | null>(null),
    [position, setPosition] = React.useState({ x: 30, y: 70 }),
    [width, setWidth] = React.useState(320);
  const host = React.useRef<HTMLDivElement>(null),
    id = React.useId();
  React.useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const inspect = (index: number) => {
    setActive(index);
    setPosition({ x: (width * (index + 0.5)) / 3, y: 74 });
  };
  return (
    <section
      className="v-chart-tooltip-example"
      aria-label="Chart tooltip example"
    >
      <h3>Details that stay with the data.</h3>
      <p>
        Focus or hover a moment. Left and right move between moments; Escape
        closes the detail. Evening includes a missing observation.
      </p>
      <div
        ref={host}
        className="v-chart-tooltip-example__plot"
        onPointerLeave={() => {
          if (!host.current?.contains(document.activeElement)) setActive(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActive(null);
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const index =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 2
                  : Math.max(
                      0,
                      Math.min(
                        2,
                        (active ?? 0) + (event.key === "ArrowRight" ? 1 : -1),
                      ),
                    );
            host.current
              ?.querySelectorAll<HTMLButtonElement>("button")
              [index]?.focus();
            inspect(index);
          }
        }}
      >
        <div className="v-chart-tooltip-example__points">
          {moments.map((point, index) => (
            <Button
              key={point.label}
              variant="ghost"
              data-morph="none"
              data-flow="off"
              data-stable-hit=""
              aria-describedby={active === index ? id : undefined}
              onPointerEnter={() => inspect(index)}
              onFocus={() => inspect(index)}
              onClick={() => inspect(index)}
              onBlur={(event) => {
                if (!host.current?.contains(event.relatedTarget as Node))
                  setActive(null);
              }}
            >
              {point.label}
            </Button>
          ))}
        </div>
        <div className="v-chart-tooltip-example__guide" aria-hidden="true">
          <svg viewBox="0 0 400 100" preserveAspectRatio="none">
            <path
              d="M10 66L200 12L390 84"
              fill="none"
              stroke="var(--v-pink)"
              strokeWidth="3"
            />
            <path
              d="M10 85L200 42"
              fill="none"
              stroke="var(--v-blue)"
              strokeWidth="3"
            />
          </svg>
        </div>
        <ChartTooltip
          id={id}
          presentation={presentation}
          active={active === null ? null : moments[active]}
          position={position}
          bounds={{ width, height: 280 }}
        />
      </div>
      <p>
        Compare keeps series order. Summary adds the known subtotal. Ranked
        orders observations by value without changing their colours.
      </p>
    </section>
  );
}
