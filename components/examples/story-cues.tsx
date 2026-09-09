"use client";

import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { WritingCaret } from "@/registry/cojeev/ui/writing-caret";
import { GuidedPointer, type GuidedPointerPoint } from "@/registry/cojeev/ui/guided-pointer";
import type { ExampleProps } from "./types";

export function WritingCaretExample() {
  const [active, setActive] = React.useState(false);
  const [replay, setReplay] = React.useState(0);
  return <div className="grid gap-4 w-full min-w-0">
    <p style={{ margin: 0, padding: 24, borderRadius: 24, background: "var(--v-beige)", fontFamily: "var(--font-display)", fontSize: "clamp(22px, 3vw, 32px)", lineHeight: 1.4, overflowWrap: "anywhere" }}>
      A thoughtful beginning<WritingCaret active={active} replayKey={replay} style={{ marginInlineStart: ".14em" }} />
    </p>
    <div className="flex gap-3 flex-wrap"><Button onClick={() => { setActive(true); setReplay(value => value + 1); }}>Replay caret</Button><Button variant="secondary" aria-pressed={!active} onClick={() => setActive(false)}>Keep it still</Button></div>
    <p role="status" className="v-quiet text-sm">{active ? `A brief writing cue · replay ${replay}` : "A still writing mark"}</p>
  </div>;
}

const storyPoints: readonly GuidedPointerPoint[] = [{ id: "notice", x: .16, y: .19 }, { id: "choose", x: .79, y: .5, click: true }, { id: "hold", x: .45, y: .82, pressed: true }];
const storyLabels = ["Notice an idea", "Choose a direction", "Stay with it"];
function GuidedPointerDemo({ initialGlyph }: { initialGlyph: "arrow" | "hand" }) {
  const [step, setStep] = React.useState(0);
  const [glyph, setGlyph] = React.useState(initialGlyph);
  const [replay, setReplay] = React.useState(0);
  const card: React.CSSProperties = { position: "absolute", padding: "12px 16px", borderRadius: 19, background: "var(--v-canvas)", maxWidth: "70%", fontSize: 14, overflowWrap: "anywhere" };
  return <div className="grid gap-4 w-full min-w-0">
    <div style={{ position: "relative", height: 320, borderRadius: 28, background: "var(--v-beige)", overflow: "hidden" }}>
      <div style={{ ...card, top: 22, left: 20 }}>Notice an idea<small className="block v-quiet">Make a little room.</small></div>
      <div style={{ ...card, top: 123, right: 24, background: "var(--v-pink)", color: "var(--v-on-accent)" }}>Choose a direction<small className="block">One useful next step.</small></div>
      <div style={{ ...card, bottom: 24, left: "28%" }}>Stay with it<small className="block v-quiet">A moment to consider.</small></div>
      <GuidedPointer points={storyPoints} activeId={storyPoints[step].id} glyph={glyph} replayKey={replay} />
    </div>
    <div className="flex gap-3 flex-wrap"><Button variant="secondary" disabled={step === 0} onClick={() => setStep(value => value - 1)}>Previous</Button><Button disabled={step === storyPoints.length - 1} onClick={() => setStep(value => value + 1)}>Next moment</Button><Button variant="secondary" onClick={() => setReplay(value => value + 1)}>Replay cue</Button></div>
    <div className="flex gap-3 flex-wrap" role="group" aria-label="Pointer appearance"><Button variant="secondary" aria-pressed={glyph === "arrow"} onClick={() => setGlyph("arrow")}>Arrow</Button><Button variant="secondary" aria-pressed={glyph === "hand"} onClick={() => setGlyph("hand")}>Hand</Button></div>
    <p role="status" className="v-quiet text-sm">{storyLabels[step]} · moment {step + 1} of {storyPoints.length}</p>
    <p className="v-quiet text-sm">An illustrated pointer; the story cards are a preview.</p>
  </div>;
}
export function GuidedPointerExample({ variant = "default" }: ExampleProps) {
  return <GuidedPointerDemo key={variant} initialGlyph={variant === "hand" ? "hand" : "arrow"} />;
}
