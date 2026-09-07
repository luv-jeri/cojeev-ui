"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { AmbientBackground, type AmbientBackgroundProps } from "@/registry/sahajiv/ui/ambient-background";
import { Marquee, type MarqueeDirection, type MarqueeSpeed } from "@/registry/sahajiv/ui/marquee";
import { Button } from "@/registry/sahajiv/ui/button";
import { Label } from "@/registry/sahajiv/ui/label";
import { NativeSelect, NativeSelectOption } from "@/registry/sahajiv/ui/native-select";
import { Shape } from "@/registry/sahajiv/ui/shape";
import { Title, BodySecondary, Meta } from "@/registry/sahajiv/ui/typography";

export function AmbientBackgroundExample({ variant: initialVariant = "default" }: ExampleProps) {
  const [variant, setVariant] = React.useState<NonNullable<AmbientBackgroundProps["variant"]>>(initialVariant === "default" ? "drift" : initialVariant as NonNullable<AmbientBackgroundProps["variant"]>);
  const [paused, setPaused] = React.useState(false);
  const id = React.useId();
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-variant`}>Composition</Label>
          <NativeSelect id={`${id}-variant`} value={variant} onChange={(event) => setVariant(event.target.value as typeof variant)}>
            <NativeSelectOption value="drift">Drift</NativeSelectOption>
            <NativeSelectOption value="orbit">Orbit</NativeSelectOption>
            <NativeSelectOption value="contour">Contour</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button variant="secondary" onClick={() => setPaused(!paused)}>{paused ? "Resume background" : "Pause background"}</Button>
      </div>
      <AmbientBackground variant={variant} paused={paused}>
        <div className="grid gap-3">
          <Title as="h3">A little space to begin.</Title>
          <BodySecondary>A quiet setting for a welcome, an introduction, or the start of something new.</BodySecondary>
          <Meta>Take it at your own pace.</Meta>
        </div>
      </AmbientBackground>
    </div>
  );
}



export function MarqueeExample() {
  const topics = [
    { title: "Make something useful", note: "Ideas into everyday tools", shape: "star-8", color: "var(--v-blue)" },
    { title: "Leave room to explore", note: "Small experiments welcome", shape: "blob-4", color: "var(--v-olive)" },
    { title: "Share what you learn", note: "A good idea travels", shape: "star-4", color: "var(--v-pink)" },
    { title: "Find your own rhythm", note: "Steady is a good speed", shape: "circle", color: "var(--v-yellow)" },
  ];
  const [direction, setDirection] = React.useState<MarqueeDirection>("left");
  const [speed, setSpeed] = React.useState<MarqueeSpeed>("slow");
  const id = React.useId();
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-direction`}>Direction</Label>
          <NativeSelect id={`${id}-direction`} value={direction} onChange={(event) => setDirection(event.target.value as MarqueeDirection)}>
            <NativeSelectOption value="left">Left</NativeSelectOption>
            <NativeSelectOption value="right">Right</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-speed`}>Pace</Label>
          <NativeSelect id={`${id}-speed`} value={speed} onChange={(event) => setSpeed(event.target.value as MarqueeSpeed)}>
            <NativeSelectOption value="slow">Slow</NativeSelectOption>
            <NativeSelectOption value="normal">Normal</NativeSelectOption>
            <NativeSelectOption value="fast">Fast</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      <Marquee label="Ideas to carry with you" direction={direction} speed={speed}>
        {topics.map((topic) => (
          <div key={topic.title} className="flex min-w-0 items-center gap-4 rounded-[var(--r-card)] bg-[var(--card)] px-5 py-4">
            <Shape name={topic.shape} className="size-12" style={{ "--c": topic.color } as React.CSSProperties} />
            <div className="grid min-w-0 gap-1"><Title as="h4" className="text-base">{topic.title}</Title><BodySecondary className="text-sm">{topic.note}</BodySecondary></div>
          </div>
        ))}
      </Marquee>
    </div>
  );
}
