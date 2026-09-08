"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { AmbientBackground, type AmbientBackgroundProps } from "@/registry/sahajiv/ui/ambient-background";
import { Marquee, type MarqueeDirection, type MarqueeSpeed } from "@/registry/sahajiv/ui/marquee";
import { Button } from "@/registry/sahajiv/ui/button";
import { Label } from "@/registry/sahajiv/ui/label";
import { NativeSelect, NativeSelectOption } from "@/registry/sahajiv/ui/native-select";
import { Shape } from "@/registry/sahajiv/ui/shape";
import { ScrollArea } from "@/registry/sahajiv/ui/scroll-area";
import { Slider } from "@/registry/sahajiv/ui/slider";
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



function CardMarqueeExample() {
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

function WordMarqueeExample({ variant }: { variant: string }) {
  const scroll = React.useRef<HTMLDivElement>(null);
  const [direction, setDirection] = React.useState<MarqueeDirection>("left");
  const [depth, setDepth] = React.useState(.65);
  const words = ["A little wonder", "Room to grow", "Ideas in motion"];
  const isDepth = variant === "depth", followsScroll = variant === "scroll";
  return <div className="grid min-w-0 gap-6 w-full">
    <div className="flex flex-wrap gap-5 items-center">
      <Button variant="secondary" onClick={() => setDirection(value => value === "left" ? "right" : "left")}>Reverse direction</Button>
      {isDepth && <div className="grid gap-3 flex-1 min-w-40"><Label>Depth · {Math.round(depth * 100)}%</Label><Slider aria-label="Marquee depth" value={[depth]} onValueChange={([value]) => setDepth(value)} min={0} max={1} step={.05} /></div>}
    </div>
    <Marquee label={isDepth ? "Words with a little perspective" : followsScroll ? "A pace that follows you" : "Drawn in ink"} direction={direction} pixelsPerSecond={32} presentation={isDepth ? "depth" : "flat"} depth={depth} respondToScroll={followsScroll} scrollTarget={scroll}>
      {words.map((word, index) => <div key={word} className="flex items-center gap-6 py-3"><Title as="span" style={{ fontSize:"clamp(32px,5vw,60px)", whiteSpace:"nowrap", ...(variant === "outline" ? { WebkitTextStroke:"1.2px var(--v-text)", color:"transparent" } : {}) }}>{word}</Title><Shape name={index === 1 ? "clover-soft" : "petal-7"} className="size-10 shrink-0" style={{ "--c":`var(--v-${index === 0 ? "pink" : index === 1 ? "olive" : "blue"})` } as React.CSSProperties} /></div>)}
    </Marquee>
    {followsScroll && <>
      <Marquee label="A second point of view" direction={direction === "left" ? "right" : "left"} pixelsPerSecond={24} respondToScroll scrollTarget={scroll}>
        {["Make space", "Take your time", "Keep exploring"].map(word => <Title key={word} as="span" style={{ fontSize:32 }}>{word}</Title>)}
      </Marquee>
      <ScrollArea style={{ height:220, borderRadius:24, background:"var(--v-beige)" }} viewportProps={{ ref:scroll, "aria-label":"Scroll to change the rhythm", tabIndex:0 }}>
        <div className="grid gap-12 p-6"><Meta>Scroll here to change the rhythm</Meta>{["Make a little space.","Find a direction.","Let the idea breathe.","Return with something new."].map(text => <div key={text} className="grid gap-3 py-4"><Title as="h4">{text}</Title><BodySecondary>Small steps can take a thought somewhere unexpected.</BodySecondary></div>)}</div>
      </ScrollArea>
    </>}
    <BodySecondary>{followsScroll ? "Scroll the reading area in either direction. Both rows ease into the new rhythm without moving the page for you." : "Hover to hold the words. Pause keeps their place; quiet motion turns the ribbon into a readable list."}</BodySecondary>
  </div>;
}

export function MarqueeExample({ variant = "default" }: ExampleProps) {
  return ["depth", "scroll", "outline"].includes(variant) ? <WordMarqueeExample key={variant} variant={variant} /> : <CardMarqueeExample />;
}
