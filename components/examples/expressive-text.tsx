"use client";
import * as React from "react";
import { WordRelay, type WordRelayHandle, type WordRelayProps } from "@/registry/cojeev/ui/word-relay";
import { TextReveal, type TextRevealProps } from "@/registry/cojeev/ui/text-reveal";
import { Button } from "@/registry/cojeev/ui/button";
import { NativeSelect, NativeSelectOption } from "@/registry/cojeev/ui/native-select";
import { Switch } from "@/registry/cojeev/ui/switch";
import { Label } from "@/registry/cojeev/ui/label";
import { BodySecondary, Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

export function WordRelayExample({ variant = "default" }: ExampleProps) {
  const [index, setIndex] = React.useState(0);
  const [auto, setAuto] = React.useState(false);
  const [split, setSplit] = React.useState<NonNullable<WordRelayProps["split"]>>("grapheme");
  const [order, setOrder] = React.useState<NonNullable<WordRelayProps["staggerFrom"]>>("first");
  const controls = React.useRef<WordRelayHandle>(null);
  const id = React.useId();
  const words = ["room to think", "a little wonder", "space to grow"];
  const tone = ["pink", "olive", "blue", "yellow"].includes(variant) ? variant as "pink" | "olive" | "blue" | "yellow" : "pink";
  return <div style={{ display:"grid", gap:24, width:"100%", maxWidth:600 }}>
    <Meta>Words with a little room to move</Meta>
    <h2 style={{ font:"500 clamp(32px,5vw,48px)/1.45 var(--font-display)", margin:0, letterSpacing:"-.025em" }}>Make <WordRelay words={words} index={index} onIndexChange={setIndex} auto={auto} tone={tone} split={split} staggerFrom={order} controlsRef={controls} />.</h2>
    <BodySecondary>Each phrase settles into the same space. Hover to hold a thought, or move at your own pace.</BodySecondary>
    <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"center" }}>
      <Button variant="secondary" onClick={() => controls.current?.previous()}>Previous</Button>
      <Button onClick={() => controls.current?.next()}>Next thought</Button>
      <Button variant="ghost" onClick={() => controls.current?.reset()}>Reset</Button>
      <Label htmlFor={id} style={{ display:"flex", alignItems:"center", gap:10 }}><Switch id={id} checked={auto} onCheckedChange={setAuto} />Cycle automatically</Label>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))", gap:16 }}>
      <div style={{ display:"grid", gap:8 }}><Label htmlFor={`${id}-units`}>Move by</Label><NativeSelect id={`${id}-units`} value={split} onChange={event => setSplit(event.target.value as NonNullable<WordRelayProps["split"]>)}><NativeSelectOption value="phrase">Phrase</NativeSelectOption><NativeSelectOption value="word">Word</NativeSelectOption><NativeSelectOption value="grapheme">Letter</NativeSelectOption></NativeSelect></div>
      <div style={{ display:"grid", gap:8 }}><Label htmlFor={`${id}-order`}>Begin from</Label><NativeSelect id={`${id}-order`} value={order} onChange={event => setOrder(event.target.value as NonNullable<WordRelayProps["staggerFrom"]>)}>{["first", "last", "center", "edges"].map(value => <NativeSelectOption key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</NativeSelectOption>)}</NativeSelect></div>
    </div>
  </div>;
}

const kinds = ["rise", "fade", "soften", "fold", "bloom", "scale", "settle"] as const;

export function ExpressiveTextExample({ variant = "default" }: ExampleProps) {
  const selected = kinds.includes(variant as typeof kinds[number]) ? variant as typeof kinds[number] : "rise";
  return <ExpressiveTextArrival key={selected} initialVariant={selected} />;
}

function ExpressiveTextArrival({ initialVariant }: { initialVariant: NonNullable<TextRevealProps["variant"]> }) {
  const [replay, setReplay] = React.useState(0);
  const [kind, setKind] = React.useState<NonNullable<TextRevealProps["variant"]>>(initialVariant);
  const [split, setSplit] = React.useState<NonNullable<TextRevealProps["split"]>>("word");
  const id = React.useId();
  return <div style={{ display:"grid", gap:24, width:"100%", maxWidth:560 }}>
    <Meta>A thought finding its form</Meta>
    <TextReveal as="h2" text="Good things take shape." variant={kind} split={split} duration={800} replayKey={replay} style={{ font:"500 clamp(36px,6vw,64px)/1.15 var(--font-display)", letterSpacing:"-.03em", margin:0 }} />
    <BodySecondary>A gentle reveal with readable text, natural wrapping and a still state whenever you need it.</BodySecondary>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))", gap:16 }}>
      <div style={{ display:"grid", gap:8 }}>
        <Label htmlFor={`${id}-style`}>Arrival</Label>
        <NativeSelect id={`${id}-style`} value={kind} onChange={event => setKind(event.target.value as NonNullable<TextRevealProps["variant"]>)}>
          {kinds.map(value => <NativeSelectOption key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        <Label htmlFor={`${id}-split`}>Reveal by</Label>
        <NativeSelect id={`${id}-split`} value={split} onChange={event => setSplit(event.target.value as NonNullable<TextRevealProps["split"]>)}>
          <NativeSelectOption value="word">Word</NativeSelectOption>
          <NativeSelectOption value="grapheme">Letter</NativeSelectOption>
          <NativeSelectOption value="text">Whole phrase</NativeSelectOption>
          <NativeSelectOption value="line">Wrapped line</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
    <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"center" }}>
      <Button onClick={() => setReplay(value => value + 1)}>Replay reveal</Button>
      <Meta role="status" aria-live="polite">{replay ? `Replayed ${replay} ${replay === 1 ? "time" : "times"}.` : "Ready when you are."}</Meta>
    </div>
  </div>;
}
