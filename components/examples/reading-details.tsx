"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { ReadingTrail } from "@/registry/cojeev/ui/reading-trail";
import { LivingLink } from "@/registry/cojeev/ui/living-link";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";

export function ReadingTrailExample({ variant = "spine" }: ExampleProps) {
  const presentation =
    variant === "bookmark" || variant === "overview" ? variant : "spine";
  const prefix = React.useId();
  const [scrollRoot, setScrollRoot] = React.useState<HTMLDivElement | null>(
    null,
  );
  const sections = [
    {
      id: `${prefix}-notice`,
      label: "Notice what matters",
      text: "A useful note starts with something specific: a question, an observation, a small detail you want to remember.",
      detail:
        "Keep enough context for your future self. Where were you? What changed? What deserves another look?",
    },
    {
      id: `${prefix}-connect`,
      label: "Make a connection",
      text: "Ideas become more useful when they can find one another. Connect this thought to a person, a project, or a previous decision.",
      detail:
        "A short link can carry more context than another long explanation. Let the surrounding words explain where it leads.",
    },
    {
      id: `${prefix}-return`,
      label: "Leave a way back",
      text: "Finish with one next step. A clear place to return helps turn a passing thought into work you can continue.",
      detail:
        "Scroll back through the note, or use the reading trail to move directly to a section. Its marker follows the part you are reading.",
    },
  ];
  const descriptions = [
    "Start with one useful detail.",
    "Give the thought some context.",
    "Keep the next step in sight.",
  ];
  return (
    <div className="v-reading-example" data-presentation={presentation}>
      <header className="v-reading-example__heading">
        <h3>A place to return to.</h3>
        <span>FIELD GUIDE / 03 CHAPTERS</span>
      </header>
      <div className="v-reading-example__layout">
        <ReadingTrail
          presentation={presentation}
          items={sections.map((section, index) => ({
            ...section,
            description: descriptions[index],
          }))}
          scrollRoot={scrollRoot}
          label="In this note"
        />
        <ScrollArea
          variant="plain"
          className="v-reading-example__reader"
          viewportProps={{
            ref: setScrollRoot,
            role: "region",
            "aria-label": "Example article",
            className: "v-reading-example__article",
          }}
        >
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="v-reading-example__section"
            >
              <div className="v-reading-example__edition">
                <span>THE PRACTICE OF NOTICING</span>
                <span>0{index + 1}</span>
              </div>
              <h4>{section.label}</h4>
              <p>{section.text}</p>
              <p>{section.detail}</p>
            </section>
          ))}
        </ScrollArea>
      </div>
      <p className="v-reading-example__hint">
        Scroll the note or choose a chapter. Your place stays with you when you
        change the layout.
      </p>
    </div>
  );
}

export function LivingLinkExample({ variant = "default" }: ExampleProps) {
  const destination = `${React.useId()}-destination`;
  const treatment = [
    "underline-start",
    "underline-end",
    "underline-center",
    "wash-up",
    "wash-across",
  ].includes(variant)
    ? (variant as React.ComponentProps<typeof LivingLink>["treatment"])
    : "contour";
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--s-6)",
        width: "100%",
        minWidth: 0,
        justifyItems: "start",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-title)",
          lineHeight: 1.6,
        }}
      >
        Small details make a place feel alive.{" "}
        <LivingLink
          href={`#${destination}`}
          direction={variant === "up-right" ? "up-right" : "forward"}
          treatment={treatment}
          disabled={variant === "disabled"}
        >
          Follow this thought
        </LivingLink>
      </p>
      <LivingLink
        href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a"
        target="_blank"
        rel="noreferrer noopener"
      >
        Read about native links
      </LivingLink>
      <LivingLink href={`#${destination}`} disabled>
        Next chapter, coming soon
      </LivingLink>
      <p
        id={destination}
        style={{
          margin: 0,
          padding: "var(--s-4)",
          borderRadius: "var(--r-md)",
          background: "var(--v-beige)",
          color: "var(--v-text-2)",
        }}
      >
        You arrived at the thought: a link should always lead somewhere real.
      </p>
    </div>
  );
}
