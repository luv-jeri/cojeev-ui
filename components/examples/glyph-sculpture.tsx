"use client";

import * as React from "react";
import { GlyphSculpture, loadSculptureFile, type GlyphForm, type GlyphTone, type GlyphSet, type SculptureGeometryInput } from "@/registry/sahajiv/ui/glyph-sculpture";
import { DitherSculpture, type DitherPattern } from "@/registry/sahajiv/ui/dither-sculpture";
import { InkSculpture, type InkTreatment } from "@/registry/sahajiv/ui/ink-sculpture";
import { SculptureOrbit } from "@/registry/sahajiv/ui/sculpture-orbit";
import { Button } from "@/registry/sahajiv/ui/button";
import { Card } from "@/registry/sahajiv/ui/card";
import { Input } from "@/registry/sahajiv/ui/input";
import { Label } from "@/registry/sahajiv/ui/label";
import { NativeSelect, NativeSelectOption } from "@/registry/sahajiv/ui/native-select";
import { Slider, SliderOutput } from "@/registry/sahajiv/ui/slider";
import { Switch } from "@/registry/sahajiv/ui/switch";
import { Meta, SectionTitle, BodySecondary } from "@/registry/sahajiv/ui/typography";
import type { ExampleProps } from "./types";

type SculptureStudioProps = { kind: "glyph" | "dither" | "ink"; initial?: string };
function SculptureStudio({ kind, initial = "default" }: SculptureStudioProps) {
  const [form, setForm] = React.useState<GlyphForm>(initial === "seed" || initial === "pebble" ? initial : "bloom"), [tone, setTone] = React.useState<GlyphTone>("ink");
  const [paused, setPaused] = React.useState(false), [tracking, setTracking] = React.useState(false), [edgeMatching, setEdgeMatching] = React.useState(true);
  const [glyphSet, setGlyphSet] = React.useState<GlyphSet>(initial === "digits" || initial === "letters" ? initial : "density");
  const [pattern, setPattern] = React.useState<DitherPattern>(initial === "halftone" || initial === "diffusion" || initial === "stipple" ? initial : "ordered");
  const [treatment, setTreatment] = React.useState<InkTreatment>(initial === "crosshatch" || initial === "contour" ? initial : "hatch");
  const [cellSize, setCellSize] = React.useState(10), [grainSize, setGrainSize] = React.useState(3), [markSize, setMarkSize] = React.useState(8), [angle, setAngle] = React.useState(-25), [relief, setRelief] = React.useState(.55);
  const [geometry, setGeometry] = React.useState<SculptureGeometryInput>(), [fileName, setFileName] = React.useState(""), [error, setError] = React.useState(""), [loading, setLoading] = React.useState(false);
  const importJob = React.useRef<AbortController | null>(null), id = React.useId();
  React.useEffect(() => () => { importJob.current?.abort(); }, []);
  async function importFile(file: File) {
    importJob.current?.abort(); const job = new AbortController(); importJob.current = job; setLoading(true); setError("");
    try { const mesh = await loadSculptureFile(file, { signal: job.signal }); if (!job.signal.aborted) { setGeometry(mesh); setFileName(file.name); } }
    catch (error) { if (!job.signal.aborted) setError(error instanceof Error ? error.message : "The file could not be imported."); }
    finally { if (!job.signal.aborted) setLoading(false); }
  }
  function clearFile() { importJob.current?.abort(); importJob.current = null; setGeometry(undefined); setFileName(""); setError(""); setLoading(false); }
  const title = kind === "glyph" ? "A thought, in characters." : kind === "dither" ? "A form, a thousand small dots." : "Light finds a line.";
  const description = kind === "glyph" ? "Characters gather around a real surface. Turn it and watch the outline find new marks." : kind === "dither" ? "A small print study: the shadows become dots and the light leaves room for paper." : "Lines follow the depth of the sculpture, opening into delicate breaks as they meet the light.";
  const controlStyle: React.CSSProperties = { display: "grid", gap: 8, minWidth: 0 };
  return <div style={{ display: "grid", gap: 24, width: "100%", minWidth: 0 }}>
    <Card style={{ display: "grid", gap: 16, padding: "clamp(18px, 4vw, 32px)", background: "var(--card)" }}>
      <div style={{ display: "grid", gap: 10, maxWidth: 560 }}><SectionTitle as="h3" style={{ margin: 0 }}>{title}</SectionTitle><BodySecondary style={{ margin: 0 }}>{description}</BodySecondary></div>
      <SculptureOrbit label="Print sculpture">
        {({ turn, pitch, zoom, interacting }) => kind === "glyph" ? <GlyphSculpture form={form} tone={tone} geometry={geometry} cellSize={cellSize} glyphSet={glyphSet} edgeMatching={edgeMatching} turn={turn} pitch={pitch} zoom={zoom} paused={paused || interacting} pointerTracking={tracking} /> : kind === "dither" ? <DitherSculpture form={form} tone={tone} geometry={geometry} pattern={pattern} grainSize={grainSize} turn={turn} pitch={pitch} zoom={zoom} paused={paused || interacting} pointerTracking={tracking} /> : <InkSculpture form={form} tone={tone} geometry={geometry} treatment={treatment} markSize={markSize} angle={angle} relief={relief} turn={turn} pitch={pitch} zoom={zoom} paused={paused || interacting} pointerTracking={tracking} />}
      </SculptureOrbit>
    </Card>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "end" }}>
      <div style={controlStyle}><Label htmlFor={`${id}-form`}>Form</Label><NativeSelect id={`${id}-form`} value={form} disabled={!!geometry} onChange={event => setForm(event.target.value as GlyphForm)}><NativeSelectOption value="bloom">Bloom</NativeSelectOption><NativeSelectOption value="seed">Seed</NativeSelectOption><NativeSelectOption value="pebble">Pebble</NativeSelectOption></NativeSelect></div>
      <div style={controlStyle}><Label htmlFor={`${id}-tone`}>Ink color</Label><NativeSelect id={`${id}-tone`} value={tone} onChange={event => setTone(event.target.value as GlyphTone)}><NativeSelectOption value="ink">Ink</NativeSelectOption><NativeSelectOption value="rose">Rose</NativeSelectOption><NativeSelectOption value="moss">Moss</NativeSelectOption><NativeSelectOption value="sky">Sky</NativeSelectOption></NativeSelect></div>
      {kind === "glyph" && <div style={controlStyle}><Label htmlFor={`${id}-set`}>Characters</Label><NativeSelect id={`${id}-set`} value={glyphSet} onChange={event => setGlyphSet(event.target.value as GlyphSet)}><NativeSelectOption value="density">Density</NativeSelectOption><NativeSelectOption value="digits">Digits</NativeSelectOption><NativeSelectOption value="letters">Letters</NativeSelectOption></NativeSelect></div>}
      {kind === "dither" && <div style={controlStyle}><Label htmlFor={`${id}-pattern`}>Print pattern</Label><NativeSelect id={`${id}-pattern`} value={pattern} onChange={event => setPattern(event.target.value as DitherPattern)}><NativeSelectOption value="ordered">Ordered dots</NativeSelectOption><NativeSelectOption value="halftone">Halftone</NativeSelectOption><NativeSelectOption value="diffusion">Error diffusion</NativeSelectOption><NativeSelectOption value="stipple">Stipple</NativeSelectOption></NativeSelect></div>}
      {kind === "ink" && <div style={controlStyle}><Label htmlFor={`${id}-treatment`}>Linework</Label><NativeSelect id={`${id}-treatment`} value={treatment} onChange={event => setTreatment(event.target.value as InkTreatment)}><NativeSelectOption value="hatch">Hatch</NativeSelectOption><NativeSelectOption value="crosshatch">Crosshatch</NativeSelectOption><NativeSelectOption value="contour">Contour</NativeSelectOption></NativeSelect></div>}
      <Button size="sm" variant="secondary" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume sculpture" : "Pause sculpture"}</Button>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
      <div style={controlStyle}><Label as="span" id={`${id}-size`}>{kind === "glyph" ? "Character size" : kind === "dither" ? "Grain size" : "Line spacing"}</Label><div style={{ display: "flex", alignItems: "center", gap: 12 }}><Slider min={kind === "glyph" ? 7 : kind === "dither" ? 1.5 : 4} max={kind === "glyph" ? 20 : kind === "dither" ? 9 : 16} step={kind === "dither" ? .5 : 1} value={[kind === "glyph" ? cellSize : kind === "dither" ? grainSize : markSize]} onValueChange={value => (kind === "glyph" ? setCellSize : kind === "dither" ? setGrainSize : setMarkSize)(value[0] ?? 8)} aria-labelledby={`${id}-size`} style={{ width: 120 }} /><SliderOutput style={{ minWidth: "4ch" }}>{kind === "glyph" ? cellSize : kind === "dither" ? grainSize : markSize}px</SliderOutput></div></div>
      {kind === "ink" && <><div style={controlStyle}><Label as="span" id={`${id}-angle`}>Line angle</Label><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Slider min={-90} max={90} step={5} disabled={treatment === "contour"} value={[angle]} onValueChange={value => setAngle(value[0] ?? -25)} aria-labelledby={`${id}-angle`} style={{ width: 120 }} /><SliderOutput>{angle}°</SliderOutput></div></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Switch id={`${id}-relief`} checked={relief > 0} disabled={treatment === "contour"} onCheckedChange={checked => setRelief(checked ? .55 : 0)} /><Label htmlFor={`${id}-relief`}>Follow the surface</Label></div></>}
      {kind === "glyph" && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Switch id={`${id}-edges`} checked={edgeMatching} disabled={glyphSet !== "density"} onCheckedChange={setEdgeMatching} /><Label htmlFor={`${id}-edges`}>Contour marks</Label></div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Switch id={`${id}-tracking`} checked={tracking} onCheckedChange={setTracking} /><Label htmlFor={`${id}-tracking`}>Follow pointer</Label></div>
    </div>
    <div style={{ display: "grid", gap: 10, minWidth: 0, borderTop: "1px solid var(--v-border)", paddingTop: 20 }}>
      <Label htmlFor={`${id}-file`}>Try your own shape</Label><Input id={`${id}-file`} type="file" accept=".glb,.svg,.png,.jpg,.jpeg" aria-describedby={`${id}-file-help`} onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ""; }} style={{ maxWidth: 440, height: "auto", padding: 12, cursor: "pointer" }} />
      <Meta id={`${id}-file-help`}>Local only. GLB, filled SVG, PNG or JPEG. Up to 8 MiB and 4 million image pixels. Images become a shallow luminance relief; model materials are replaced by ink.</Meta>
      <div role="status" aria-live="polite" style={{ minHeight: 20, overflowWrap: "anywhere" }}>{loading ? <Meta>Reading the local shape…</Meta> : error ? <BodySecondary style={{ margin: 0 }}>{error} The current sculpture is unchanged.</BodySecondary> : fileName ? <Meta>Showing {fileName}</Meta> : null}</div>
      {(geometry || loading) && <Button size="sm" variant="ghost" style={{ justifySelf: "start" }} onClick={clearFile}>{loading ? "Cancel import" : "Return to the built-in forms"}</Button>}
    </div>
  </div>;
}

export function GlyphSculptureExample({ variant = "default" }: ExampleProps) { return <SculptureStudio key={`glyph:${variant}`} kind="glyph" initial={variant} />; }
export function DitherSculptureExample({ variant = "default" }: ExampleProps) { return <SculptureStudio key={`dither:${variant}`} kind="dither" initial={variant} />; }
export function InkSculptureExample({ variant = "default" }: ExampleProps) { return <SculptureStudio key={`ink:${variant}`} kind="ink" initial={variant} />; }
export function SculptureOrbitExample({ variant = "default" }: ExampleProps) { return <SculptureStudio key={`orbit:${variant}`} kind="ink" initial="crosshatch" />; }
