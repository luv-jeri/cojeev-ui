"use client";
import * as React from "react";
import { TextRibbon } from "@/registry/cojeev/ui/text-ribbon";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { Label } from "@/registry/cojeev/ui/label";
import { Switch } from "@/registry/cojeev/ui/switch";
import { Slider } from "@/registry/cojeev/ui/slider";
import { NativeSelect, NativeSelectOption } from "@/registry/cojeev/ui/native-select";
import { Meta, BodySecondary } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

export function TextRibbonExample({ variant = "default" }: ExampleProps) {
  const [text, setText] = React.useState("A little room for wonder");
  const [paused, setPaused] = React.useState(false);
  const [reverse, setReverse] = React.useState(false);
  const [guide, setGuide] = React.useState(true);
  const [curvature, setCurvature] = React.useState(1);
  const [hoverBehavior, setHoverBehavior] = React.useState<"pause" | "slow" | "quicken" | "none">("pause");
  const id = React.useId();
  const shape = ["loop","circle","arch","line","figure-eight"].includes(variant) ? variant as "loop" | "circle" | "arch" | "line" | "figure-eight" : "wave";
  return <div style={{ display:"grid", gap:24, width:"100%", maxWidth:720 }}>
    <Meta>Words taking the scenic route</Meta>
    <TextRibbon text={text} shape={shape} auto paused={paused} direction={reverse ? "backward" : "forward"} onDirectionChange={value => setReverse(value === "backward")} draggable curvature={curvature} hoverBehavior={hoverBehavior} tone="pink" guide={guide} />
    <div style={{ display:"grid", gap:8 }}><Label htmlFor={`${id}-words`}>Your phrase</Label><Input id={`${id}-words`} value={text} onChange={event => setText(event.target.value)} maxLength={180} /></div>
    <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
      <div style={{ display:"grid", gap:8, flex:"1 1 180px" }}><Label htmlFor={`${id}-hover`}>On hover</Label><NativeSelect id={`${id}-hover`} value={hoverBehavior} onChange={event => setHoverBehavior(event.target.value as typeof hoverBehavior)}><NativeSelectOption value="pause">Hold still</NativeSelectOption><NativeSelectOption value="slow">Slow down</NativeSelectOption><NativeSelectOption value="quicken">Quicken gently</NativeSelectOption><NativeSelectOption value="none">Keep the pace</NativeSelectOption></NativeSelect></div>
      {(shape === "wave" || shape === "arch") && <div style={{ display:"grid", gap:12, flex:"1 1 180px" }}><Label>Curve · {Math.round(curvature * 100)}%</Label><Slider aria-label="Ribbon curve" value={[curvature]} onValueChange={([value]) => setCurvature(value)} min={0} max={1} step={.05} /></div>}
    </div>
    <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:16 }}>
      <Button onClick={() => setPaused(value => !value)}>{paused ? "Resume ribbon" : "Pause ribbon"}</Button>
      <Button variant="secondary" aria-pressed={reverse} onClick={() => setReverse(value => !value)}>Reverse direction</Button>
      <Label htmlFor={`${id}-guide`} style={{ display:"flex", alignItems:"center", gap:8 }}><Switch id={`${id}-guide`} checked={guide} onCheckedChange={setGuide} />Show the path</Label>
    </div>
    <BodySecondary>Drag sideways to choose a direction. Focus the ribbon and use arrow keys to move it, or Home to reset. Vertical touch gestures keep the page scrolling.</BodySecondary>
  </div>;
}
