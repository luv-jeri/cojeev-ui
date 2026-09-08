"use client";

import * as React from "react";
import { PigmentField } from "@/registry/sahajiv/ui/pigment-field";
import { ContourField } from "@/registry/sahajiv/ui/contour-field";
import { Button } from "@/registry/sahajiv/ui/button";
import { Card } from "@/registry/sahajiv/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/registry/sahajiv/ui/toggle-group";
import { Slider, SliderOutput } from "@/registry/sahajiv/ui/slider";
import { Label } from "@/registry/sahajiv/ui/label";
import { Meta, SectionTitle, BodySecondary } from "@/registry/sahajiv/ui/typography";
import type { ExampleProps } from "./types";

function FieldExample({ kind, variant = "default" }: ExampleProps & { kind: "pigment" | "contour" }) {
  const [paused, setPaused] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [tone, setTone] = React.useState<"balanced" | "warm" | "cool">(variant === "warm" || variant === "cool" ? variant : kind === "contour" ? "cool" : "balanced");
  const [saved, setSaved] = React.useState(false);
  const id = React.useId();
  const Field = kind === "pigment" ? PigmentField : ContourField;
  return <div style={{ display: "grid", gap: 18, width: "100%", minWidth: 0 }}>
    <div style={{ position: "relative", isolation: "isolate", overflow: "hidden", minHeight: 320, borderRadius: "var(--r-card, 28px)", display: "grid", alignItems: "center", padding: "clamp(24px, 6vw, 52px)" }}>
      <Field tone={tone} speed={speed} paused={paused} />
      <Card style={{ position: "relative", width: "100%", maxWidth: 420, display: "grid", gap: 16, background: "var(--card)" }}>
        <Meta>{kind === "pigment" ? "Room for a fresh thought" : "Find your next direction"}</Meta>
        <SectionTitle as="h3" style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: 0 }}>{kind === "pigment" ? "Let the idea take shape." : "A little space. A clearer path."}</SectionTitle>
        <BodySecondary style={{ margin: 0, maxWidth: 320 }}>{kind === "pigment" ? "Soft color, an open page, and one thing worth beginning." : "Follow the small details until the way forward feels familiar."}</BodySecondary>
        <div><Button size="sm" onClick={() => setSaved(value => !value)}>{saved ? "Saved to your space" : "Keep this thought"}</Button></div>
        <Meta role="status" style={{ minHeight: 18 }}>{saved ? "Your thought is saved in this demo." : ""}</Meta>
      </Card>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
      <Button size="sm" variant="secondary" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume field" : "Pause field"}</Button>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}><Label as="span" id={`${id}-tone`} size="sm">Tone</Label><ToggleGroup type="single" value={tone} aria-labelledby={`${id}-tone`} onValueChange={value => { if (value === "balanced" || value === "warm" || value === "cool") setTone(value); }}><ToggleGroupItem value="balanced">Balanced</ToggleGroupItem><ToggleGroupItem value="warm">Warm</ToggleGroupItem><ToggleGroupItem value="cool">Cool</ToggleGroupItem></ToggleGroup></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200 }}><Label as="span" id={`${id}-speed`} size="sm">Pace</Label><Slider min={0} max={3} step={0.25} value={[speed]} onValueChange={value => setSpeed(value[0] ?? 0)} aria-labelledby={`${id}-speed`} style={{ width: 110 }} /><SliderOutput style={{ minWidth: "3ch" }}>{speed}×</SliderOutput></div>
    </div>
  </div>;
}

export function PigmentFieldExample(props: ExampleProps) { return <FieldExample {...props} kind="pigment" />; }
export function ContourFieldExample(props: ExampleProps) { return <FieldExample {...props} kind="contour" />; }
