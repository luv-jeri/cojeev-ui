"use client";

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/registry/cojeev/ui/accordion";
import { Icon } from "@/registry/cojeev/ui/icon";
import {
  ShapeMorph,
  type SignatureShapeName,
} from "@/registry/cojeev/ui/shape";
import type { ExampleProps } from "./types";
import {
  Card,
  CardCover,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
  CardAction,
} from "@/registry/cojeev/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/registry/cojeev/ui/collapsible";

const chapters = [
  {
    id: "local",
    title: "Where do my notes live?",
    subtitle: "A home for your own ideas",
    detail:
      "Keep your own data and choose where it belongs. These examples run locally in the page — no account, upload, or hidden sync.",
    icon: "book-open",
    caption: "Your notebook, your rules",
    tag: "01 / Ownership",
  },
  {
    id: "compose",
    title: "Can I compose the pieces?",
    subtitle: "Small parts, more possibilities",
    detail:
      "Each part is a React component. Add your content, state, and event handlers. Use a quiet list for quick answers, connected chapters for a guide, or a visual preview when the detail benefits from a little more room.",
    icon: "layers",
    caption: "Build something of your own",
    tag: "02 / Composition",
  },
  {
    id: "keyboard",
    title: "Does it work with a keyboard?",
    subtitle: "A clear path through the details",
    detail:
      "Tab to a trigger, use the arrow keys to move, and press Enter or Space to open it. Focus stays with the summary, and hidden detail stays out of the keyboard path. Reduced motion reveals the same content immediately.",
    icon: "keyboard",
    caption: "Every detail within reach",
    tag: "03 / Access",
  },
];

export function AccordionExample({ variant = "faq" }: ExampleProps) {
  const appearance =
    variant === "chapters" || variant === "editorial" ? variant : "faq";
  const [open, setOpen] = React.useState("local");
  const [engaged, setEngaged] = React.useState<string | null>(null);
  const silhouettes: SignatureShapeName[] = [
    "clover-soft",
    "scalloped-square",
    "petal-7",
  ];
  return (
    <Accordion
      type="single"
      collapsible
      value={open}
      onValueChange={setOpen}
      appearance={appearance}
    >
      {chapters.map((chapter, index) => (
        <AccordionItem
          key={chapter.id}
          value={chapter.id}
          onPointerEnter={() => setEngaged(chapter.id)}
          onPointerLeave={() => setEngaged(null)}
          onFocusCapture={() => setEngaged(chapter.id)}
          onBlurCapture={() => setEngaged(null)}
        >
          <AccordionTrigger>
            {appearance !== "faq" && (
              <span className="v-acc__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            )}
            <span className="v-acc__summary">
              <span>{chapter.title}</span>
              {appearance !== "faq" && <small>{chapter.subtitle}</small>}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {appearance === "editorial" && (
              <div className="v-acc__preview" aria-hidden="true">
                <ShapeMorph
                  className="v-acc__preview-echo"
                  name={silhouettes[index]}
                  variant="outline"
                />
                <ShapeMorph
                  className="v-acc__preview-shape"
                  name={engaged === chapter.id ? silhouettes[index] : "cushion"}
                />
                <span className="v-acc__preview-letter">
                  {index === 0 ? (
                    "Aa"
                  ) : (
                    <Icon name={chapter.icon} feedback={false} />
                  )}
                </span>
                <span className="v-acc__preview-caption">
                  {chapter.caption}
                </span>
              </div>
            )}
            <div className="v-acc__detail">
              {appearance !== "faq" && (
                <span className="v-acc__eyebrow">{chapter.tag}</span>
              )}
              <p>{chapter.detail}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const savedNotes = [
  {
    title: "Leave room for a little wonder",
    detail: "An unexpected turn on the way home. A thought worth returning to.",
    label: "Field note / 01",
  },
  {
    title: "Small things, carefully made",
    detail:
      "A collection of everyday details that make the work feel personal.",
    label: "Field note / 02",
  },
  {
    title: "An idea for tomorrow",
    detail: "One next step is enough. Keep it where you can find it again.",
    label: "Field note / 03",
  },
];

export function CardExample({
  variant = "editorial",
  tone = "default",
  size = "default",
}: ExampleProps) {
  const appearance =
    variant === "project" || variant === "collection" ? variant : "editorial";
  const [saved, setSaved] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [noteIndex, setNoteIndex] = React.useState(0);
  const note = savedNotes[noteIndex];
  return (
    <Card
      appearance={appearance}
      variant={tone}
      size={size === "sm" ? "sm" : "default"}
    >
      {appearance === "editorial" ? (
        <>
          <CardCover aria-hidden="true">
            <span className="v-card__cover-label">
              FIELD
              <br />
              NOTES
            </span>
            <span className="v-card__cover-orbit" />
          </CardCover>
          <CardContent>
            <span className="v-card__eyebrow">
              On paying attention · 4 min read
            </span>
            <CardTitle>
              Small things,
              <br />
              carefully made.
            </CardTitle>
            <CardDescription>
              A collection of everyday details that make the work feel personal.
            </CardDescription>
            <CardFooter>
              <CardAction aria-pressed={saved} onClick={() => setSaved(!saved)}>
                {saved ? "Article saved" : "Save article"}
              </CardAction>
            </CardFooter>
          </CardContent>
        </>
      ) : appearance === "project" ? (
        <>
          <div className="v-card__project-head">
            <span className="v-card__eyebrow">Your next small project</span>
            <span className="v-card__project-number" aria-hidden="true">
              0{step}
            </span>
          </div>
          <CardContent>
            <CardTitle>A home for your ideas</CardTitle>
            <CardDescription>
              Turn a rough outline into something you can share.
            </CardDescription>
          </CardContent>
          <ol className="v-card__steps" aria-label="Project progress">
            {["Find the idea", "Make a first draft", "Share the work"].map(
              (label, index) => (
                <li key={label} data-complete={index < step}>
                  <span aria-hidden="true">
                    {index < step ? "✓" : index + 1}
                  </span>
                  {label}
                  <span className="sr-only">
                    {index < step ? " — complete" : " — remaining"}
                  </span>
                </li>
              ),
            )}
          </ol>
          <CardFooter>
            <span role="status" className="v-card__eyebrow">
              {step} of 3 steps complete
            </span>
            <CardAction onClick={() => setStep(step === 3 ? 0 : step + 1)}>
              {step === 3 ? "Start again" : "Complete next step"}
            </CardAction>
          </CardFooter>
        </>
      ) : (
        <>
          <CardCover aria-hidden="true">
            <span className="v-card__stack-page">
              A thought
              <br />
              worth keeping.
            </span>
          </CardCover>
          <CardContent>
            <span className="v-card__eyebrow">{note.label}</span>
            <CardTitle>{note.title}</CardTitle>
            <CardDescription>{note.detail}</CardDescription>
          </CardContent>
          <CardFooter>
            <span role="status" className="v-card__eyebrow">
              Note {noteIndex + 1} of {savedNotes.length}
            </span>
            <CardAction
              onClick={() => setNoteIndex((noteIndex + 1) % savedNotes.length)}
            >
              Next note
            </CardAction>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

export function CollapsibleExample({ variant = "inline" }: ExampleProps) {
  const appearance =
    variant === "checklist" || variant === "inspector" ? variant : "inline";
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible appearance={appearance} open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger>
        {appearance === "inline" ? (
          "A little more about this note"
        ) : (
          <span className="v-collapsible__summary">
            <span>
              {appearance === "checklist"
                ? "Before you share"
                : "Behind this file"}
            </span>
            <small>
              {appearance === "checklist"
                ? "A three-point handoff checklist"
                : "Details, without leaving your work"}
            </small>
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {appearance === "inline" ? (
          <p>
            A useful note carries just enough context: what you noticed, why it
            matters, and one thing to try next. The rest can stay tucked away
            until you need it.
          </p>
        ) : appearance === "checklist" ? (
          <ol className="v-collapsible__checklist">
            {[
              "Give the work a clear title",
              "Add a little context for the reader",
              "Leave one useful next step",
            ].map((label, index) => (
              <li key={label}>
                <span aria-hidden="true">0{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        ) : (
          <dl className="v-collapsible__inspector">
            <div>
              <dt>Document</dt>
              <dd>Field notes.md</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>Plain Markdown</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>This example only</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>Local, not uploaded</dd>
            </div>
          </dl>
        )}
        <a className="v-collapsible__link" href="#usage-heading">
          Read the usage guide{" "}
          <Icon name="arrow-up-right" size="sm" aria-hidden="true" />
        </a>
      </CollapsibleContent>
    </Collapsible>
  );
}
