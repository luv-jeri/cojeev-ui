"use client";
import * as React from "react";
import { AnimatedNumber } from "@/registry/cojeev/ui/animated-number";
import { TextReveal } from "@/registry/cojeev/ui/text-reveal";
import { Button } from "@/registry/cojeev/ui/button";
import { BodySecondary, Display, Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

export function AnimatedNumberExample() {
  const [value, setValue] = React.useState(1240);
  return <div style={{ display: "grid", gap: 24, width: "100%", maxWidth: 520 }}>
    <Meta>Small steps add up</Meta>
    <Display as="div" style={{ fontSize: "clamp(48px, 9vw, 88px)" }}><AnimatedNumber value={value} /></Display>
    <BodySecondary>Update a metric without making the surrounding layout move.</BodySecondary>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <Button onClick={() => setValue((current) => current + 125)}>Add 125</Button>
      <Button variant="secondary" onClick={() => setValue((current) => Math.max(0, current - 75))}>Subtract 75</Button>
      <Button variant="ghost" onClick={() => setValue(1240)}>Reset count</Button>
    </div>
    <Meta role="status">Current value: {value.toLocaleString("en-US")}</Meta>
  </div>;
}

export function TextRevealExample({ variant = "default" }: ExampleProps) {
  const [replay, setReplay] = React.useState(0);
  return <div style={{ display: "grid", gap: 24, width: "100%", maxWidth: 560 }}>
    <Meta>A little room for expression</Meta>
    <TextReveal as="h2" text="Good things take shape." variant={variant === "fade" ? "fade" : "rise"} replayKey={replay} style={{ font: "500 clamp(40px, 6vw, 64px)/1.1 var(--font-display)", letterSpacing: "-.03em", margin: 0 }} />
    <BodySecondary>A short introduction, with every word available from the start. Replay when you want to feel it again.</BodySecondary>
    <Button variant="secondary" onClick={() => setReplay((current) => current + 1)} style={{ justifySelf: "start" }}>Replay reveal</Button>
    <Meta role="status">{replay ? `Replayed ${replay} ${replay === 1 ? "time" : "times"}.` : "Respects your motion settings."}</Meta>
  </div>;
}
