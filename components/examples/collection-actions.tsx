"use client";

import * as React from "react";
import { Toggle, ToggleWell } from "@/registry/cojeev/ui/toggle";
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemTrailing,
} from "@/registry/cojeev/ui/item";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import type { ExampleProps } from "./types";

export function ToggleExample({ variant = "tool", radius }: ExampleProps) {
  const [pressed, setPressed] = React.useState(false);
  const appearance =
    variant === "bookmark" || variant === "preference" ? variant : "tool";
  return (
    <section
      className="v-toggle-example"
      data-appearance={appearance}
      aria-label="Keep a note close"
    >
      <header>
        <span className="v-toggle-example__eyebrow">
          A small everyday action
        </span>
        <h3>Keep this one close.</h3>
        <p>
          Pin a useful thought without leaving your reading. The same choice,
          three ways to keep it within reach.
        </p>
      </header>
      <div className="v-toggle-example__scene">
        <Toggle
          appearance={appearance}
          radius={radius}
          pressed={pressed}
          onPressedChange={setPressed}
          aria-label="Pin note"
        >
          <span className="v-toggle-example__stamp" aria-hidden="true">
            <Icon name={pressed ? "check" : "pin"} />
          </span>
          <span className="v-toggle-example__word">
            <strong>Pin note</strong>
            {appearance === "preference" && (
              <span>Keep it at the top of your notebook.</span>
            )}
          </span>
          <span className="v-toggle-example__state" aria-hidden="true">
            {pressed ? "Pinned" : "Not pinned"}
          </span>
        </Toggle>
        <article>
          <span>FIELD NOTE · 01</span>
          <h4>Notice the little things.</h4>
          <p>
            One good detail can change the feeling of a whole day. Leave a
            little space to find it.
          </p>
          <div className="v-toggle-example__rule" aria-hidden="true" />
        </article>
      </div>
      <p role="status">
        {pressed
          ? "Pinned in this example. Press again to unpin."
          : "Not pinned. Press Pin note to keep it close."}
      </p>
      <details className="v-toggle-example__legacy">
        <summary>Original toggle treatments</summary>
        <ToggleWell>
          {(["default", "pink", "circle"] as const).map((t) => (
            <Toggle
              key={t}
              variant={t}
              pressed={pressed}
              onPressedChange={setPressed}
              aria-label={`Legacy ${t} pin`}
            >
              {t === "circle" ? (
                <Icon name="pin" />
              ) : t === "pink" ? (
                "Pink"
              ) : (
                "Default"
              )}
            </Toggle>
          ))}
        </ToggleWell>
        <Toggle
          variant="pressed"
          defaultPressed
          disabled
          aria-label="Unavailable pin"
        >
          Unavailable
        </Toggle>
        <p>
          Pressed is state; pink and circle remain independent legacy
          treatments.
        </p>
      </details>
    </section>
  );
}

const notes = [
  {
    title: "Morning plan",
    description: "A little room for the work that matters.",
    kind: "Daily note",
    count: "3 intentions",
    colour: "pink",
  },
  {
    title: "Small discoveries",
    description: "Details worth noticing, and ideas worth returning to.",
    kind: "Field notes",
    count: "8 observations",
    colour: "blue",
  },
  {
    title: "Weekend ideas",
    description: "Good places, quiet walks and things to make.",
    kind: "Collection",
    count: "5 possibilities",
    colour: "olive",
  },
] as const;
function NoteCover({ index }: { index: number }) {
  return (
    <svg
      className="v-item-example__cover"
      viewBox="0 0 160 110"
      fill="none"
      aria-hidden="true"
    >
      <rect
        width="160"
        height="110"
        rx="12"
        fill={`var(--v-${notes[index].colour}-soft)`}
      />
      {index === 0 ? (
        <>
          <circle cx="47" cy="39" r="23" fill="var(--v-pink)" />
          <path
            d="M20 94Q65 28 143 70"
            stroke="var(--v-text)"
            strokeWidth="2"
          />
          <path d="M105 16L119 39L91 39Z" fill="var(--v-yellow)" />
        </>
      ) : index === 1 ? (
        <>
          <path
            d="M30 72C-4 22 58-10 83 38C128-3 167 60 111 76C95 127 45 118 30 72Z"
            fill="var(--v-blue)"
          />
          <path d="M14 95L143 25" stroke="var(--v-text)" strokeWidth="2" />
          <circle cx="118" cy="85" r="9" fill="var(--v-yellow)" />
        </>
      ) : (
        <>
          <path
            d="M17 94C27 42 100 13 143 18C130 66 69 108 17 94Z"
            fill="var(--v-olive)"
          />
          <path
            d="M14 100Q72 67 142 18"
            stroke="var(--v-text)"
            strokeWidth="2"
          />
          <circle cx="36" cy="23" r="12" fill="var(--v-yellow)" />
        </>
      )}
    </svg>
  );
}
export function ItemExample({ variant = "ledger", radius }: ExampleProps) {
  const appearance =
    variant === "cover" || variant === "detail" ? variant : "ledger";
  const [selected, setSelected] = React.useState("Morning plan");
  const [kept, setKept] = React.useState<string[]>([]);
  return (
    <section
      className="v-item-example"
      data-appearance={appearance}
      aria-label="A small notebook collection"
    >
      <header>
        <span>FROM THE NOTEBOOK</span>
        <h3>Good things, kept together.</h3>
        <p>
          Choose a note. Its selection stays with you when you change the
          layout.
        </p>
      </header>
      <ItemGroup
        className="v-item-example__list"
        data-morph="none"
        data-flow="off"
      >
        {notes.map((note, index) => {
          const active = selected === note.title;
          const body = (
            <>
              <span className="v-item-example__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {appearance === "cover" && <NoteCover index={index} />}
              <ItemContent as="span">
                <span className="v-item-example__kind">{note.kind}</span>
                <ItemTitle as="span">{note.title}</ItemTitle>
                <ItemDescription as="span">{note.description}</ItemDescription>
                <span className="v-item-example__count">{note.count}</span>
              </ItemContent>
            </>
          );
          return appearance === "detail" ? (
            <Item
              key={note.title}
              as="article"
              appearance={appearance}
              radius={radius}
              variant={active ? "selected" : "default"}
            >
              <div className="v-item-example__detail-content">{body}</div>
              <div className="v-item-example__actions">
                <Button
                  variant={active ? "accent" : "outline"}
                  aria-label={`Select ${note.title}`}
                  aria-pressed={active}
                  onClick={() => setSelected(note.title)}
                >
                  <Icon name={active ? "check" : "arrow-right"} />
                    {active ? "Selected" : "Select note"}
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Keep ${note.title}`}
                  aria-pressed={kept.includes(note.title)}
                  onClick={() =>
                    setKept((old) =>
                      old.includes(note.title)
                        ? old.filter((n) => n !== note.title)
                        : [...old, note.title],
                    )
                  }
                >
                  <Icon
                    name={kept.includes(note.title) ? "check" : "bookmark"}
                  />
                  {kept.includes(note.title) ? "Kept" : "Keep"}
                </Button>
              </div>
            </Item>
          ) : (
            <Item
              key={note.title}
              appearance={appearance}
              radius={radius}
              variant={active ? "selected" : "default"}
              aria-label={`Select ${note.title}`}
              aria-pressed={active}
              onClick={() => setSelected(note.title)}
            >
              {body}
              <ItemTrailing
                className="v-item-example__mark"
                data-morph="none"
                aria-hidden="true"
              >
                <Icon name={active ? "check" : "arrow-right"} />
              </ItemTrailing>
            </Item>
          );
        })}
      </ItemGroup>
      <p role="status">
        Selected: {selected}
        {kept.length ? ` · ${kept.length} kept locally` : ""}
      </p>
      <details className="v-item-example__legacy">
        <summary>Original row and grouped treatments</summary>
        <ItemGroup variant="grouped" data-morph="none">
          <Item variant="flat" onClick={() => setSelected("Morning plan")}>
            <ItemContent as="span">
              <ItemTitle as="span">A flat row</ItemTitle>
              <ItemDescription as="span">
                The original compact treatment stays available.
              </ItemDescription>
            </ItemContent>
          </Item>
          <Item
            variant="selected"
            onClick={() => setSelected("Small discoveries")}
          >
            <ItemContent as="span">
              <ItemTitle as="span">A selected row</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>
      </details>
    </section>
  );
}
