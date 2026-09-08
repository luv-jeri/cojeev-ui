"use client";

import * as React from "react";
import { Button } from "@/registry/sahajiv/ui/button";
import { AsyncContent, Skeleton, SkeletonGroup } from "@/registry/sahajiv/ui/skeleton";
import { RadioGroup, RadioGroupItem, RadioGroupBody } from "@/registry/sahajiv/ui/radio-group";
import { Input } from "@/registry/sahajiv/ui/input";
import { Field, FieldControl, FieldLabel, FieldDescription } from "@/registry/sahajiv/ui/field";
import { Stepper, StepperList, StepperItem, StepperIndicator, StepperTitle, StepperPrevious, StepperNext, StepperStatus } from "@/registry/sahajiv/ui/stepper";
import { Bubble, BubbleRow, BubbleContent, BubbleReaction, BubbleTyping } from "@/registry/sahajiv/ui/bubble";
import { MotionPresence, MotionSurface } from "@/registry/sahajiv/ui/presence";
import type { ExampleProps } from "./types";

export function LoadingContentExample({ variant = "default" }: ExampleProps) {
  const [loading, setLoading] = React.useState(true);
  const fallback = variant === "skel-group" ? <SkeletonGroup>
    <Skeleton variant="disk" style={{ width: 48, height: 48 }} />
    <Skeleton variant="line" style={{ width: "80%" }} />
    <Skeleton variant="line" style={{ width: "60%" }} />
  </SkeletonGroup> : variant === "default" ? undefined : <Skeleton
    variant={variant as React.ComponentProps<typeof Skeleton>["variant"]}
    style={{ width: variant === "disk" ? 56 : "min(100%, 320px)", height: variant === "line" ? 12 : variant === "card" ? 140 : 56 }}
  />;
  return <div className="grid gap-4 w-full min-w-0">
    <Button variant="secondary" aria-pressed={loading} onClick={() => setLoading(value => !value)}>{loading ? "Show content" : "Show placeholder"}</Button>
    <AsyncContent loading={loading} fallback={fallback}>
      <Field><FieldLabel>A note for later</FieldLabel><FieldControl><Input defaultValue="Make room for a thoughtful beginning." /></FieldControl><FieldDescription>Your edits stay here when the preview returns to loading.</FieldDescription></Field>
    </AsyncContent>
    <p className="v-quiet text-sm">A controlled preview of loading and ready states.</p>
  </div>;
}

export function HorizontalStepperExample() {
  const labels = ["A first thought", "Make it your own", "Ready to begin"];
  return <Stepper count={labels.length} labels={labels} className="grid gap-5 w-full min-w-0">
    <StepperList orientation="horizontal">{labels.map((label, index) => <StepperItem key={label} step={index + 1}><StepperIndicator step={index + 1} /><StepperTitle>{label}</StepperTitle></StepperItem>)}</StepperList>
    <div className="flex gap-3 items-center flex-wrap"><StepperPrevious /><StepperNext /><StepperStatus /></div>
  </Stepper>;
}

export function BubbleFeedbackExample() {
  const [reacted, setReacted] = React.useState(false);
  const [typing, setTyping] = React.useState(true);
  return <div className="grid gap-4 w-full min-w-0">
    <Bubble><BubbleRow><div className="grid min-w-0 gap-1"><BubbleContent>Small steps leave room for good ideas.</BubbleContent><BubbleReaction aria-label={reacted ? "Remove appreciation" : "Appreciate this thought"} aria-pressed={reacted} onClick={() => setReacted(value => !value)}><span aria-hidden="true">♥</span><span>{reacted ? 1 : 0}</span></BubbleReaction></div></BubbleRow>
      <MotionPresence>{typing && <MotionSurface key="typing" preset="rise"><BubbleRow><BubbleContent><BubbleTyping label="Typing preview" /></BubbleContent></BubbleRow></MotionSurface>}</MotionPresence>
    </Bubble>
    <Button variant="secondary" aria-pressed={typing} onClick={() => setTyping(value => !value)}>{typing ? "Hide typing preview" : "Show typing preview"}</Button>
  </div>;
}

export function PersistentOptionsExample() {
  const [value, setValue] = React.useState("steady");
  const options = [{id:"steady",label:"A steady pace",description:"Leave enough room between ideas."},{id:"together",label:"Think together",description:"Keep the next conversation close."},{id:"explore",label:"Follow a new thought",description:"Make space for a small experiment."}];
  return <div className="grid gap-4 w-full min-w-0"><RadioGroup aria-label="A rhythm for today" value={value} onValueChange={setValue} pictographic shape="pebble" indicator="check" style={{gridTemplateColumns:"minmax(0,1fr)",maxWidth:"none"}}>{options.map(option => <RadioGroupItem key={option.id} value={option.id} style={{justifyItems:"start",textAlign:"start",padding:"16px 36px 16px 16px"}}><RadioGroupBody><b>{option.label}</b><small>{option.description}</small></RadioGroupBody></RadioGroupItem>)}</RadioGroup><p role="status" className="v-quiet text-sm">{options.find(option => option.id === value)?.label} selected.</p></div>;
}
