"use client";
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { Slider } from "@/registry/cojeev/ui/slider";
import { Label } from "@/registry/cojeev/ui/label";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";
import { SwarmCursor } from "@/registry/cojeev/ui/swarm-cursor";
import { GhostCursor } from "@/registry/cojeev/ui/ghost-cursor";
import { ClickSpark } from "@/registry/cojeev/ui/click-spark";
import { MagicRings } from "@/registry/cojeev/ui/magic-rings";
import { Strands } from "@/registry/cojeev/ui/strands";
import { MetaBalls } from "@/registry/cojeev/ui/meta-balls";
import { ElasticMesh } from "@/registry/cojeev/ui/elastic-mesh";
import { RippleDistortion } from "@/registry/cojeev/ui/ripple-distortion";
import { ImageTrail } from "@/registry/cojeev/ui/image-trail";
import { ScrollExpand } from "@/registry/cojeev/ui/scroll-expand";
import { TargetCursor } from "@/registry/cojeev/ui/target-cursor";
import { OrbitImages } from "@/registry/cojeev/ui/orbit-images";
import { PixelSwap } from "@/registry/cojeev/ui/pixel-swap";
import { signatureShapePaths } from "@/registry/cojeev/lib/signature-shapes";
import type { ReferenceFieldProps } from "@/registry/cojeev/lib/reference-field";
import type { ExampleProps } from "./types";

const studioImages = Object.entries(signatureShapePaths).slice(0, 6).map(([name, path], i) => ({
  alt: `${name.replaceAll("-", " ")} shape study`,
  src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="${["#F5B8DB", "#9AAB63", "#B6CAEB", "#F5D867"][i % 4]}"/><path transform="translate(10 25)" d="${path}" fill="#FBF4E6" stroke="#111" stroke-width=".7"/></svg>`)}`,
}));
function FieldStudy({ Component, variant, instruction }: { Component: React.ComponentType<ReferenceFieldProps>; variant?: string; instruction: string }) {
  const [paused, setPaused] = React.useState(false);
  const tone = ["pink", "olive", "blue", "yellow"].includes(variant ?? "") ? variant as "pink" | "olive" | "blue" | "yellow" : "pink";
  return <div style={{ width: "100%", minWidth: 0, display: "grid", gap: 20 }}>
    <Component paused={paused} tone={tone} images={studioImages.map(image => image.src)} />
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}><Button onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Resume effect" : "Pause effect"}</Button><p style={{ margin: 0, flex: "1 1 200px", color: "var(--v-text-2)", fontSize: 14 }}>{instruction}</p></div>
  </div>;
}
export function SwarmCursorExample({ variant }: ExampleProps) { return <FieldStudy Component={SwarmCursor} variant={variant} instruction="Move inside the field. Click or tap to scatter the seeds; they gather again around your pointer." />; }
export function GhostCursorExample({ variant }: ExampleProps) { return <FieldStudy Component={GhostCursor} variant={variant} instruction="Draw a slow curve. A translucent ink impression follows with a little delay." />; }
export function MagicRingsExample({ variant }: ExampleProps) { return <FieldStudy Component={MagicRings} variant={variant} instruction="Move through the rings to gently shift their center. Pause to study the composition." />; }
export function StrandsExample({ variant }: ExampleProps) { return <FieldStudy Component={Strands} variant={variant} instruction="A quiet bundle of colored threads. Use one as a section accent, with a still frame for reading." />; }
export function MetaBallsExample({ variant }: ExampleProps) { return <FieldStudy Component={MetaBalls} variant={variant} instruction="Move or tap to add a local body. Nearby shapes meet and separate through liquid contours." />; }
export function ElasticMeshExample({ variant }: ExampleProps) { return <FieldStudy Component={ElasticMesh} variant={variant} instruction="Move across the printed sheet to stretch its mesh. Leave the field and it settles back." />; }
export function RippleDistortionExample({ variant }: ExampleProps) { return <FieldStudy Component={RippleDistortion} variant={variant} instruction="Move or tap the print to send a ripple through it. The image itself bends as the wave travels." />; }
export function ImageTrailExample({ variant }: ExampleProps) { return <FieldStudy Component={ImageTrail} variant={variant} instruction="Move across the field to leave a trail of shape studies. Tap to place one impression." />; }
export function ClickSparkExample() {
  const [count, setCount] = React.useState(0);
  return <div style={{ display: "grid", width: "100%", gap: 16 }}><ClickSpark height={260} count={10}><Button onClick={() => setCount(value => value + 1)}>Make a small mark</Button></ClickSpark><p role="status">{count === 0 ? "Click, tap, or focus the button and press Enter." : `${count} ${count === 1 ? "mark" : "marks"} made in this demo.`}</p></div>;
}
export function ScrollExpandExample() {
  const [progress, setProgress] = React.useState(.25);
  const [native, setNative] = React.useState(false);
  return <div style={{ display: "grid", gap: 16, width: "100%" }}><ScrollExpand progress={native ? undefined : progress}><div style={{ minHeight: 300, display: "grid", placeItems: "center", padding: 24 }}><ShapeArtwork name="clover-soft" tone="pink" width={180} height={180} /><p style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>A little more room.</p></div></ScrollExpand><Label>Expansion · {Math.round(progress * 100)}%</Label><Slider aria-label="Expansion progress" min={0} max={1} step={.01} value={[progress]} disabled={native} onValueChange={([value]) => setProgress(value)} /><Button variant="secondary" aria-pressed={native} onClick={() => setNative(value => !value)}>{native ? "Use the progress control" : "Follow page scrolling"}</Button></div>;
}
export function TargetCursorExample() {
  const [choice, setChoice] = React.useState("Shapes");
  return <div style={{ width: "100%", display: "grid", gap: 16 }}><TargetCursor><div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", paddingBlock: 64 }}>{["Shapes", "Typography", "Motion"].map(label => <Button key={label} variant={choice === label ? "accent" : "secondary"} onClick={() => setChoice(label)} aria-pressed={choice === label}>{label}</Button>)}</div></TargetCursor><p role="status">{choice} selected. Hover or Tab between the buttons; press Enter to choose.</p></div>;
}
export function OrbitImagesExample() {
  const [paused, setPaused] = React.useState(false), [reverse, setReverse] = React.useState(false), [replaced, setReplaced] = React.useState(false);
  const images = replaced ? [...studioImages].reverse() : studioImages;
  return <div style={{ width: "100%", display: "grid", gap: 20 }}><OrbitImages images={images} paused={paused} reverse={reverse}><span style={{ fontFamily: "var(--font-display)", fontSize: 30, lineHeight: 1.1 }}>A family<br />of forms.</span></OrbitImages><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><Button onClick={() => setPaused(value => !value)}>{paused ? "Resume orbit" : "Pause orbit"}</Button><Button variant="secondary" aria-pressed={reverse} onClick={() => setReverse(value => !value)}>Reverse direction</Button><Button variant="secondary" aria-pressed={replaced} onClick={() => setReplaced(value => !value)}>Replace images</Button></div></div>;
}
export function PixelSwapExample() {
  const [active, setActive] = React.useState(false);
  return <div style={{ display: "grid", gap: 20, width: "100%" }}><PixelSwap active={active} first={<div style={{ display: "grid", placeItems: "center", padding: 32, minHeight: 320, background: "var(--v-pink)", color: "var(--v-on-accent)" }}><ShapeArtwork name="daisy-12" tone="yellow" width={180} height={180} /><strong>A seed of an idea.</strong></div>} second={<div style={{ display: "grid", placeItems: "center", padding: 32, minHeight: 320, background: "var(--v-blue)", color: "var(--v-on-accent)" }}><ShapeArtwork name="clover-soft" tone="olive" width={180} height={180} /><strong>Something taking shape.</strong></div>} /><Button onClick={() => setActive(value => !value)} aria-pressed={active}>Swap the study</Button></div>;
}
