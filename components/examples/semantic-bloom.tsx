"use client";

import * as React from "react";
import { SemanticBloom, type SemanticBloomControls, type SemanticBloomProps } from "@/registry/cojeev/ui/semantic-bloom";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { Label } from "@/registry/cojeev/ui/label";
import { Slider, SliderOutput } from "@/registry/cojeev/ui/slider";
import { NativeSelect } from "@/registry/cojeev/ui/native-select";
import { Switch } from "@/registry/cojeev/ui/switch";
import { Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

function BloomDial({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const id = React.useId();
  return <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <Label as="span" id={id}>{label}</Label><SliderOutput>{Number(value.toFixed(2))}</SliderOutput>
    </div>
    <Slider min={min} max={max} step={step} value={[value]} aria-labelledby={id} onValueChange={values => onChange(values[0] ?? min)} />
  </div>;
}

export function SemanticBloomExample({ variant = "default" }: ExampleProps) {
  const initialTone = variant === "memory" || variant === "together" || variant === "ink" ? variant : "signature";
  const [tone, setTone] = React.useState<SemanticBloomProps["tone"]>(initialTone);
  const [text, setText] = React.useState("Cojeev");
  const [paused, setPaused] = React.useState(false);
  const [interactive, setInteractive] = React.useState(true);
  const [size, setSize] = React.useState(1);
  const [opacity, setOpacity] = React.useState(0.9);
  const [softness, setSoftness] = React.useState(12);
  const [texture, setTexture] = React.useState(20);
  const [connectionWidth, setConnectionWidth] = React.useState(4);
  const [physics, setPhysics] = React.useState({ particleCount: 50, radius: 15, speed: 1, wander: 0.5, damping: 0.95, pointerAttraction: 1, pointerRadius: 400, textAttraction: 1, textRadius: 200, connectionDistance: 150 });
  const [notice, setNotice] = React.useState("");
  const controls = React.useRef<SemanticBloomControls>(null);
  const id = React.useId();
  const dials: { key: keyof typeof physics; label: string; min: number; max: number; step: number }[] = [
    { key: "particleCount", label: "Particles", min: 8, max: 100, step: 1 },
    { key: "radius", label: "Particle size", min: 6, max: 28, step: 1 },
    { key: "speed", label: "Pace", min: 0, max: 2, step: 0.1 },
    { key: "wander", label: "Wander", min: 0, max: 1, step: 0.05 },
    { key: "damping", label: "Glide", min: 0.8, max: 0.98, step: 0.01 },
    { key: "pointerAttraction", label: "Cursor pull", min: 0, max: 3, step: 0.1 },
    { key: "pointerRadius", label: "Cursor reach", min: 0, max: 600, step: 10 },
    { key: "textAttraction", label: "Word pull", min: 0, max: 3, step: 0.1 },
    { key: "textRadius", label: "Word reach", min: 0, max: 400, step: 10 },
    { key: "connectionDistance", label: "Connection reach", min: 0, max: 240, step: 10 },
  ];
  function reset() {
    setTone(initialTone); setText("Cojeev"); setPaused(false); setInteractive(true);
    setSize(1); setOpacity(0.9); setSoftness(12); setTexture(20); setConnectionWidth(4);
    setPhysics({ particleCount: 50, radius: 15, speed: 1, wander: 0.5, damping: 0.95, pointerAttraction: 1, pointerRadius: 400, textAttraction: 1, textRadius: 200, connectionDistance: 150 });
    controls.current?.reset(); setNotice("Original settings restored.");
  }
  return <div style={{ display: "grid", gap: 24, width: "100%", minWidth: 0 }}>
    <div style={{ overflow: "hidden", borderRadius: "var(--r-panel)", background: "var(--v-canvas)", border: "1px solid var(--v-border)" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between", padding: "20px 24px 0" }}>
        <Meta>Living identity</Meta><Meta>{tone === "memory" ? "Memory · olive" : tone === "together" ? "Together · four colors" : tone === "ink" ? "Ink · monochrome" : "Signature · pink"}</Meta>
      </div>
      <SemanticBloom text={text} tone={tone} physics={physics} size={size} opacity={opacity} softness={softness}
        edgeTexture={texture} connectionWidth={connectionWidth} paused={paused} interactive={interactive} controlsRef={controls} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "0 24px 20px" }}>
        <Meta>Move closer. Let the pieces find each other.</Meta><Meta>Interactive visual demo</Meta>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}><Label htmlFor={`${id}-text`}>Wordmark</Label><Input id={`${id}-text`} value={text} onChange={event => setText(event.target.value)} /></div>
      <div style={{ display: "grid", gap: 8 }}><Label htmlFor={`${id}-tone`}>Palette</Label><NativeSelect id={`${id}-tone`} value={tone} onChange={event => setTone(event.target.value as SemanticBloomProps["tone"])}>
        <option value="signature">Signature · pink</option><option value="memory">Memory · olive</option><option value="together">Together · four colors</option><option value="ink">Ink · monochrome</option>
      </NativeSelect></div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <Button size="sm" variant="accent" onClick={() => { controls.current?.gather(); setNotice("Gathering around the wordmark."); }}>Gather</Button>
      <Button size="sm" variant="secondary" onClick={() => { controls.current?.scatter(); setNotice("Particles scattered. Use Gather to bring them back."); }}>Scatter</Button>
      <Button size="sm" variant="outline" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume" : "Pause"}</Button>
      <Button size="sm" variant="ghost" onClick={() => { controls.current?.reset(); setNotice("Bloom replayed with the current settings."); }}>Replay</Button>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginInlineStart: "auto" }}><Switch id={`${id}-pointer`} checked={interactive} onCheckedChange={setInteractive} /><Label htmlFor={`${id}-pointer`}>Follow cursor</Label></div>
    </div>
    <details style={{ borderTop: "1px solid var(--v-border)", paddingTop: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 500, paddingBlock: 8 }}>Tune the motion and edges</summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "28px 32px", paddingBlock: 24 }}>
        {dials.map(dial => <BloomDial key={dial.key} label={dial.label} value={physics[dial.key]} min={dial.min} max={dial.max} step={dial.step} onChange={value => setPhysics(current => ({ ...current, [dial.key]: value }))} />)}
        <BloomDial label="Wordmark size" value={size} min={0.55} max={1.6} step={0.05} onChange={setSize} />
        <BloomDial label="Opacity" value={opacity} min={0} max={1} step={0.05} onChange={setOpacity} />
        <BloomDial label="Edge softness" value={softness} min={0} max={20} onChange={setSoftness} />
        <BloomDial label="Edge texture" value={texture} min={0} max={40} onChange={setTexture} />
        <BloomDial label="Connection width" value={connectionWidth} min={0} max={8} step={0.5} onChange={setConnectionWidth} />
      </div>
      <Button size="sm" variant="secondary" onClick={reset}>Restore original settings</Button>
    </details>
    <Meta role="status" style={{ minHeight: "1.3em" }}>{notice}</Meta>
  </div>;
}
