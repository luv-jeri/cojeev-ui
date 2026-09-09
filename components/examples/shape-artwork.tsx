"use client";

import * as React from "react";
import { ShapeArtwork, shapeArtworkCode, type ShapeArtworkOptions } from "@/registry/cojeev/ui/shape-artwork";
import { type SignatureShapeName } from "@/registry/cojeev/ui/shape";
import { ToggleGroup, ToggleGroupItem } from "@/registry/cojeev/ui/toggle-group";
import { Slider } from "@/registry/cojeev/ui/slider";
import { Switch } from "@/registry/cojeev/ui/switch";
import { Label } from "@/registry/cojeev/ui/label";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
import { Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

function ArtworkDemo({ variant }: ExampleProps) {
  const [name, setName] = React.useState<SignatureShapeName>("daisy-12");
  const [rotation, setRotation] = React.useState(0);
  const [shadow, setShadow] = React.useState(variant !== "outline");
  const [echo, setEcho] = React.useState(true);
  const id = React.useId();
  const options: ShapeArtworkOptions = { name, tone: "pink", rotation, filled: variant !== "outline", shadow, shadowAngle: 45, echo, echoAngle: -18, label: "An original organic shape" };
  return <div style={{ display: "grid", gap: 24, width: "100%", maxWidth: 520, marginInline: "auto", minWidth: 0 }}>
    <ShapeArtwork {...options} style={{ maxWidth: 320, marginInline: "auto" }} />
    <ToggleGroup className="v-seg" type="single" value={name} aria-label="Artwork shape" onValueChange={value => { if (value) setName(value as SignatureShapeName); }}>
      <ToggleGroupItem value="daisy-12">Daisy</ToggleGroupItem><ToggleGroupItem value="clover-soft">Clover</ToggleGroupItem><ToggleGroupItem value="seed-wing">Seed</ToggleGroupItem>
    </ToggleGroup>
    <div style={{ display: "grid", gap: 12 }}><Label id={`${id}-rotation`} size="sm">Rotation · {rotation}°</Label><Slider aria-labelledby={`${id}-rotation`} thumbLabel="Artwork rotation" min={-180} max={180} value={[rotation]} onValueChange={([value]) => setRotation(value)} /></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <Label htmlFor={`${id}-shadow`} size="sm" style={{ display: "flex", alignItems: "center", gap: 12 }}>Cast shadow<Switch id={`${id}-shadow`} checked={shadow} onCheckedChange={setShadow} /></Label>
      <Label htmlFor={`${id}-echo`} size="sm" style={{ display: "flex", alignItems: "center", gap: 12 }}>Rear outline<Switch id={`${id}-echo`} checked={echo} onCheckedChange={setEcho} /></Label>
    </div>
    <Meta>All three layers share one morphing contour. This preview changes local artwork settings only.</Meta>
    <CodeBlock code={shapeArtworkCode(options)} language="tsx" title="ShapeArtwork usage" copyLabel="Copy React snippet" wrap />
  </div>;
}

export function ShapeArtworkExample({ variant = "default" }: ExampleProps) { return <ArtworkDemo key={variant} variant={variant} />; }
