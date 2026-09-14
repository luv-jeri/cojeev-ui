"use client";

import * as React from "react";
import { DotsBackground } from "@/registry/cojeev/ui/dots-background";
import { GridBackground } from "@/registry/cojeev/ui/grid-background";
import { ContoursBackground } from "@/registry/cojeev/ui/contours-background";
import { WeaveBackground } from "@/registry/cojeev/ui/weave-background";
import { PebblesBackground } from "@/registry/cojeev/ui/pebbles-background";
import { SunwashBackground } from "@/registry/cojeev/ui/sunwash-background";
import { FoldsBackground } from "@/registry/cojeev/ui/folds-background";
import { SproutsBackground } from "@/registry/cojeev/ui/sprouts-background";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Slider, SliderWrapper, SliderRow, SliderOutput } from "@/registry/cojeev/ui/slider";
import { Label } from "@/registry/cojeev/ui/label";
import { Title, BodySecondary, Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

type BackgroundRenderer = React.ComponentType<{ spacing?: number; opacity?: number }>;

function SubtleBackgroundDemo({ Background, name, description, compact }: {
  Background: BackgroundRenderer;
  name: string;
  description: string;
  compact?: boolean;
}) {
  const [spacing, setSpacing] = React.useState(24);
  const [strength, setStrength] = React.useState(16);
  const [notes, setNotes] = React.useState(0);
  const id = React.useId();
  return <div style={{ display: "grid", gap: 24, width: "100%", minWidth: 0 }}>
    <section aria-label={`${name} background sample`} style={{ position: "relative", isolation: "isolate", overflow: "hidden", minHeight: compact ? 220 : 280, display: "grid", alignContent: "center", padding: "clamp(20px, 5vw, 36px)", border: "1px solid var(--v-border)", borderRadius: "var(--r-card-sm)", background: "var(--v-paper)" }}>
      <Background spacing={spacing} opacity={strength / 100} />
      <div style={{ position: "relative", zIndex: 1, display: "grid", justifyItems: "start", gap: 12, maxWidth: 360, minWidth: 0 }}>
        <Title style={{ margin: 0 }}>Room for your next thought.</Title>
        {!compact && <BodySecondary style={{ margin: 0, color: "var(--v-text-2)" }}>{description}</BodySecondary>}
        <Button size="sm" onClick={() => setNotes(value => value + 1)}><Icon name="plus" size="sm" aria-hidden="true" />Add a note</Button>
        <Meta role="status" aria-live="polite" style={{ display: "block", minHeight: 20, color: "var(--v-text-2)" }}>{notes} {notes === 1 ? "note" : "notes"} added.</Meta>
      </div>
    </section>
    {!compact && <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <SliderWrapper style={{ flex: "1 1 200px", maxWidth: 360, minWidth: 0 }}>
        <SliderRow><Label id={`${id}-spacing`}>Pattern spacing</Label><SliderOutput>{spacing} px</SliderOutput></SliderRow>
        <Slider aria-labelledby={`${id}-spacing`} value={[spacing]} min={8} max={80} step={4} onValueChange={([value]) => setSpacing(value)} />
      </SliderWrapper>
      <SliderWrapper style={{ flex: "1 1 200px", maxWidth: 360, minWidth: 0 }}>
        <SliderRow><Label id={`${id}-strength`}>Pattern strength</Label><SliderOutput>{strength}%</SliderOutput></SliderRow>
        <Slider aria-labelledby={`${id}-strength`} value={[strength]} min={0} max={40} onValueChange={([value]) => setStrength(value)} />
      </SliderWrapper>
    </div>}
  </div>;
}

export function DotsBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={DotsBackground} name="Dots" description="A light rhythm of dots leaves your notes in focus." compact={compact} />;
}

export function GridBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={GridBackground} name="Grid" description="Fine rules give everyday work a little structure." compact={compact} />;
}

export function ContoursBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={ContoursBackground} name="Contours" description="Quiet contour lines make space for ideas to take shape." compact={compact} />;
}

export function WeaveBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={WeaveBackground} name="Weave" description="Softly woven lines bring a little texture to the page." compact={compact} />;
}

export function PebblesBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={PebblesBackground} name="Pebbles" description="Scattered organic outlines keep the surface gently irregular." compact={compact} />;
}

export function SunwashBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={SunwashBackground} name="Sunwash" description="A broad wash of light sits quietly behind your work." compact={compact} />;
}

export function FoldsBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={FoldsBackground} name="Folds" description="Subtle paper folds add depth without getting in the way." compact={compact} />;
}

export function SproutsBackgroundExample({ compact }: ExampleProps) {
  return <SubtleBackgroundDemo Background={SproutsBackground} name="Sprouts" description="Small botanical marks give new thoughts room to grow." compact={compact} />;
}
