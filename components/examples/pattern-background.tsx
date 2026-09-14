"use client";
import * as React from "react";
import { PatternBackground } from "@/registry/cojeev/ui/pattern-background";
import { subtleBackgrounds } from "@/registry/cojeev/lib/subtle-backgrounds";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Slider, SliderWrapper, SliderRow, SliderOutput } from "@/registry/cojeev/ui/slider";
import { Label } from "@/registry/cojeev/ui/label";
import { Title, BodySecondary, Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

export function PatternBackgroundExample({ variant = "dots", compact }: ExampleProps) {
  const [spacing, setSpacing] = React.useState(24);
  const [strength, setStrength] = React.useState(16);
  const [notes, setNotes] = React.useState(0);
  const id = React.useId();
  const pattern = variant === "none" ? "none" : subtleBackgrounds.find(background => background.value === variant)?.value ?? "dots";
  return <div style={{ display: "grid", gap: 24, width: "100%", minWidth: 0 }}>
    <div aria-label="Pattern sample" style={{ position: "relative", isolation: "isolate", overflow: "hidden", minHeight: compact ? 220 : 280, display: "grid", alignContent: "center", padding: "clamp(20px, 5vw, 36px)", border: "1px solid var(--v-border)", borderRadius: "var(--r-card-sm)", background: "var(--v-paper)" }}>
      <PatternBackground variant={pattern} spacing={spacing} opacity={strength / 100} />
      <div style={{ position: "relative", zIndex: 1, display: "grid", justifyItems: "start", gap: 12, maxWidth: 360, minWidth: 0 }}>
        <Title style={{ margin: 0 }}>A quieter canvas.</Title>
        {!compact && <BodySecondary style={{ margin: 0, color: "var(--v-text-2)" }}>Just enough texture to frame your work. The content stays in focus.</BodySecondary>}
        <Button size="sm" onClick={() => setNotes(value => value + 1)}><Icon name="plus" size="sm" aria-hidden="true" />Add a note</Button>
        <Meta role="status" aria-live="polite" style={{ display: "block", minHeight: 20, color: "var(--v-text-2)" }}>{notes} {notes === 1 ? "note" : "notes"} added.</Meta>
      </div>
    </div>
    {!compact && <>
    <SliderWrapper style={{ maxWidth: 360, width: "100%" }}>
      <SliderRow><Label id={`${id}-spacing`}>Pattern spacing</Label><SliderOutput>{spacing} px</SliderOutput></SliderRow>
      <Slider aria-labelledby={`${id}-spacing`} value={[spacing]} min={8} max={80} step={4} disabled={pattern === "none"} onValueChange={([value]) => setSpacing(value)} />
    </SliderWrapper>
    <SliderWrapper style={{ maxWidth: 360, width: "100%" }}>
      <SliderRow><Label id={`${id}-strength`}>Pattern strength</Label><SliderOutput>{strength}%</SliderOutput></SliderRow>
      <Slider aria-labelledby={`${id}-strength`} value={[strength]} min={0} max={40} disabled={pattern === "none"} onValueChange={([value]) => setStrength(value)} />
    </SliderWrapper>
    </>}
  </div>;
}
