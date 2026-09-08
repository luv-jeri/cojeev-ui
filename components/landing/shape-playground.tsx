"use client";

import * as React from "react";
import { Button } from "@/registry/sahajiv/ui/button";
import { CodeBlock } from "@/registry/sahajiv/ui/code-block";
import { DepthBackground } from "@/registry/sahajiv/ui/depth-background";
import { FloatLayer } from "@/registry/sahajiv/ui/float-layer";
import { Label } from "@/registry/sahajiv/ui/label";
import { ShapeMorph, signatureShapeNames, type SignatureShapeName } from "@/registry/sahajiv/ui/shape";
import { ShapeArtwork, shapeArtworkCode, shapeArtworkSvg, type ShapeArtworkOptions, type ShapeArtworkColors, type ShapeArtworkTone } from "@/registry/sahajiv/ui/shape-artwork";
import { Slider } from "@/registry/sahajiv/ui/slider";
import { Switch } from "@/registry/sahajiv/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/registry/sahajiv/ui/toggle-group";
import { Body, Meta, SectionTitle, Title } from "@/registry/sahajiv/ui/typography";
import { MarketingLink } from "./marketing-shell";

const shapeLabels: Record<SignatureShapeName, string> = {
  "daisy-12": "Daisy", "petal-7": "Petal", "aster-9": "Aster", "sunburst-24": "Sunburst",
  "clover-soft": "Clover", "cloud-3": "Cloud", "pebble-soft": "Pebble", "pebble-tall": "Tall pebble",
  "ribbon-soft": "Ribbon", "scalloped-square": "Scallop", cushion: "Cushion", "seed-wing": "Seed",
};
const tones: ShapeArtworkTone[] = ["pink", "olive", "blue", "yellow"];

function AngleControl({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  const id = React.useId();
  return <div className="shape-workbench-angle" data-disabled={disabled || undefined}>
    <div className="shape-workbench-control-label"><Label id={id} size="sm">{label}</Label><output aria-labelledby={id}>{value}°</output></div>
    <Slider aria-labelledby={id} thumbLabel={label} min={-180} max={180} step={1} value={[value]} disabled={disabled} onValueChange={([angle]) => onChange(angle)} />
  </div>;
}

/** The landing workbench uses the exact SVG layer model exported by ShapeArtwork. */
export function ShapePlayground() {
  const [name, setName] = React.useState<SignatureShapeName>("daisy-12");
  const [tone, setTone] = React.useState<ShapeArtworkTone>("pink");
  const [rotation, setRotation] = React.useState(0);
  const [filled, setFilled] = React.useState(true);
  const [shadow, setShadow] = React.useState(true);
  const [shadowAngle, setShadowAngle] = React.useState(45);
  const [echo, setEcho] = React.useState(true);
  const [echoAngle, setEchoAngle] = React.useState(-18);
  const [receipt, setReceipt] = React.useState("");
  const [downloadError, setDownloadError] = React.useState(false);
  const artwork = React.useRef<SVGSVGElement>(null);
  const downloads = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const id = React.useId();
  const options: ShapeArtworkOptions = { name, tone, rotation, filled, shadow, shadowAngle, echo, echoAngle, label: `${shapeLabels[name]} artwork` };
  React.useEffect(() => {
    const pending = downloads.current;
    return () => { pending.forEach((timer, url) => { clearTimeout(timer); URL.revokeObjectURL(url); }); pending.clear(); };
  }, []);
  const download = () => {
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      const colors: Partial<ShapeArtworkColors> = {};
      for (const key of ["fill", "shadow", "echo"] as const) {
        const path = artwork.current?.querySelector(`g[data-artwork-layer="${key}"] > path`);
        if (path) { const paint = getComputedStyle(path); colors[key] = paint.fill === "none" ? paint.stroke : paint.fill; }
      }
      url = URL.createObjectURL(new Blob([shapeArtworkSvg(options, colors)], { type: "image/svg+xml;charset=utf-8" }));
      link = document.createElement("a");
      link.href = url;
      link.download = `sahajiv-${name}.svg`;
      document.body.append(link);
      link.click();
      const downloadUrl = url;
      downloads.current.set(downloadUrl, setTimeout(() => { URL.revokeObjectURL(downloadUrl); downloads.current.delete(downloadUrl); }, 1000));
      setDownloadError(false);
      setReceipt("SVG download started. All selected layers and palette colors are included.");
    } catch {
      if (url) URL.revokeObjectURL(url);
      setDownloadError(true);
      setReceipt("The SVG could not be downloaded. Please try again.");
    } finally { link?.remove(); }
  };
  return <section className="shape-workbench-section story-section" aria-labelledby="shapes-title">
    <FloatLayer depth={0} drift={0} replay revealDuration={1.05} className="shape-workbench-heading">
      <div><Meta>An alphabet of organic shapes</Meta><SectionTitle id="shapes-title">Anything<br />but square.</SectionTitle></div>
      <div><Body>A little character, made yours. Turn the form, cast a shadow, leave an outline behind.</Body><MarketingLink href="/docs/shape-artwork/">Use ShapeArtwork</MarketingLink></div>
    </FloatLayer>
    <div className="shape-workbench-editor">
      <div className="shape-workbench-library">
        <Label as="p" size="sm" id={`${id}-shapes`}>Choose a shape</Label>
        <ToggleGroup type="single" value={name} onValueChange={value => { if (value) setName(value as SignatureShapeName); }} aria-labelledby={`${id}-shapes`} className="v-seg shape-workbench-shapes">
          {signatureShapeNames.map(shape => <ToggleGroupItem key={shape} value={shape} aria-label={shapeLabels[shape]} title={shapeLabels[shape]} className="shape-workbench-choice"><ShapeMorph name={shape} /><span>{shape === "pebble-tall" ? "Tall" : shapeLabels[shape]}</span></ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      <div className="shape-workbench-stage">
        <DepthBackground variant="pollen" density={.35} intensity={.3} seed={41} />
        <ShapeArtwork {...options} ref={artwork} className="shape-workbench-artwork" />
        <Meta className="shape-workbench-caption">{shapeLabels[name]} <span aria-hidden="true">·</span> Original SVG contours</Meta>
      </div>
      <div className="shape-workbench-settings">
        <div className="shape-workbench-color-control"><Label as="p" size="sm" id={`${id}-tones`}>Color</Label>
          <ToggleGroup type="single" value={tone} onValueChange={value => { if (value) setTone(value as ShapeArtworkTone); }} aria-labelledby={`${id}-tones`} className="v-seg shape-workbench-tones">
            {tones.map(color => <ToggleGroupItem value={color} key={color} aria-label={color[0].toUpperCase() + color.slice(1)} title={color} className="shape-workbench-swatch"><span style={{ background: `var(--v-${color})` }} /></ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <AngleControl label="Rotation" value={rotation} onChange={setRotation} />
        <div className="shape-workbench-switch"><Label htmlFor={`${id}-filled`} size="sm">Solid fill</Label><Switch id={`${id}-filled`} checked={filled} onCheckedChange={setFilled} /></div>
        <div className="shape-workbench-layer-control"><div className="shape-workbench-switch"><Label htmlFor={`${id}-shadow`} size="sm">Cast shadow</Label><Switch id={`${id}-shadow`} checked={shadow} onCheckedChange={setShadow} /></div><AngleControl label="Shadow direction" value={shadowAngle} onChange={setShadowAngle} disabled={!shadow} /></div>
        <div className="shape-workbench-layer-control"><div className="shape-workbench-switch"><Label htmlFor={`${id}-echo`} size="sm">Rear outline</Label><Switch id={`${id}-echo`} checked={echo} onCheckedChange={setEcho} /></div><AngleControl label="Outline angle" value={echoAngle} onChange={setEchoAngle} disabled={!echo} /></div>
      </div>
    </div>
    <div className="shape-workbench-export">
      <div className="shape-workbench-export-intro"><Title>Take it with you.</Title><Body>Download a transparent SVG, or copy the React component with your exact settings.</Body><Button onClick={download}>Download SVG</Button><Meta role="status" aria-live="polite" data-export-error={downloadError || undefined}>{receipt || "Your SVG includes the fill, shadow and outline you choose above."}</Meta></div>
      <CodeBlock code={shapeArtworkCode(options)} language="tsx" title="Your ShapeArtwork" copyLabel="Copy React snippet" wrap />
    </div>
  </section>;
}
