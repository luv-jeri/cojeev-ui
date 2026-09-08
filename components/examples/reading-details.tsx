"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { ReadingTrail } from "@/registry/sahajiv/ui/reading-trail";
import { LivingLink } from "@/registry/sahajiv/ui/living-link";

export function ReadingTrailExample() {
  const prefix = React.useId();
  const [scrollRoot, setScrollRoot] = React.useState<HTMLDivElement | null>(null);
  const sections = [
    { id: `${prefix}-notice`, label: "Notice what matters", text: "A useful note starts with something specific: a question, an observation, a small detail you want to remember.", detail: "Keep enough context for your future self. Where were you? What changed? What deserves another look?" },
    { id: `${prefix}-connect`, label: "Make a connection", text: "Ideas become more useful when they can find one another. Connect this thought to a person, a project, or a previous decision.", detail: "A short link can carry more context than another long explanation. Let the surrounding words explain where it leads." },
    { id: `${prefix}-return`, label: "Leave a way back", text: "Finish with one next step. A clear place to return helps turn a passing thought into work you can continue.", detail: "Scroll back through the note, or use the reading trail to move directly to a section. Its marker follows the part you are reading." },
  ];
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: "var(--s-6)", width: "100%", minWidth: 0, alignItems: "start" }}>
    <ReadingTrail items={sections} scrollRoot={scrollRoot} label="A note worth keeping" />
    <div ref={setScrollRoot} role="region" aria-label="Example article" tabIndex={0} style={{ height: 360, overflowY: "auto", overscrollBehavior: "contain", scrollbarGutter: "stable", borderRadius: "var(--r-card)", background: "var(--v-beige)", padding: "var(--s-5)", scrollPaddingBlockStart: "var(--s-5)" }}>
      {sections.map((section, index) => <section key={section.id} id={section.id} style={{ minHeight: 320, paddingBlockEnd: "var(--s-8)" }}>
        <span style={{ fontSize: "var(--fs-meta)", color: "var(--v-text-2)", fontVariantNumeric: "tabular-nums" }}>0{index + 1} / FIELD NOTES</span>
        <h3 style={{ marginBlock: "var(--s-3) var(--s-4)", fontFamily: "var(--font-display)", fontSize: "var(--fs-title)", fontWeight: "var(--fw-title)" }}>{section.label}</h3>
        <p style={{ marginBlockEnd: "var(--s-4)", lineHeight: 1.6 }}>{section.text}</p>
        <p style={{ color: "var(--v-text-2)", lineHeight: 1.6 }}>{section.detail}</p>
      </section>)}
    </div>
  </div>;
}

export function LivingLinkExample({ variant = "default" }: ExampleProps) {
  const destination = `${React.useId()}-destination`;
  const treatment = ["underline-start", "underline-end", "underline-center", "wash-up", "wash-across"].includes(variant) ? variant as React.ComponentProps<typeof LivingLink>["treatment"] : "contour";
  return <div style={{ display: "grid", gap: "var(--s-6)", width: "100%", minWidth: 0, justifyItems: "start" }}>
    <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-title)", lineHeight: 1.6 }}>Small details make a place feel alive. <LivingLink href={`#${destination}`} direction={variant === "up-right" ? "up-right" : "forward"} treatment={treatment} disabled={variant === "disabled"}>Follow this thought</LivingLink></p>
    <LivingLink href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a" target="_blank" rel="noreferrer noopener">Read about native links</LivingLink>
    <LivingLink href={`#${destination}`} disabled>Next chapter, coming soon</LivingLink>
    <p id={destination} style={{ margin: 0, padding: "var(--s-4)", borderRadius: "var(--r-md)", background: "var(--v-beige)", color: "var(--v-text-2)" }}>You arrived at the thought: a link should always lead somewhere real.</p>
  </div>;
}
