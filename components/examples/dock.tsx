"use client";

import * as React from "react";
import { Dock, type DockItem, type DockVariant } from "@/registry/cojeev/ui/dock";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Label } from "@/registry/cojeev/ui/label";
import { Slider, SliderOutput, SliderRow, SliderWrapper } from "@/registry/cojeev/ui/slider";
import { BodySecondary, Meta, Title } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

const destinations = [
  { value: "focus", label: "Focus", icon: "sparkles", detail: "Keep one live thread in view and let everything else wait." },
  { value: "work", label: "Work", icon: "briefcase", detail: "See current tasks, their owners and the next useful action." },
  { value: "automations", label: "Automations", icon: "bot", detail: "Scheduled work is unavailable in this local specimen.", disabled: true },
  { value: "memory", label: "Memory", icon: "brain", detail: "Return to four ideas that Cojeev kept close.", badge: 4 },
  { value: "settings", label: "Settings", icon: "settings-2", detail: "Tune this workspace without leaving the current context." },
] as const;

const initialSize = (size?: string) => size === "sm" || size === "small" ? 42 : size === "lg" || size === "large" ? 62 : 52;

export function DockExample({ variant = "default", size, compact }: ExampleProps) {
  const resolvedVariant: DockVariant = variant === "shelf" || variant === "rail" ? variant : "glass";
  const [active, setActive] = React.useState("focus");
  const [itemSize, setItemSize] = React.useState(initialSize(size));
  const [magnification, setMagnification] = React.useState(1.65);
  const [receipt, setReceipt] = React.useState("Focus is open.");
  const controlId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const selected = destinations.find(item => item.value === active) ?? destinations[0];
  const items = React.useMemo<DockItem[]>(() => destinations.map(item => ({
    value: item.value,
    label: item.label,
    disabled: "disabled" in item ? item.disabled : undefined,
    badge: "badge" in item ? item.badge : undefined,
    icon: <Icon name={item.icon} feedback={false} aria-hidden="true" />,
    onSelect: () => setReceipt(`${item.label} is open.`),
  })), []);

  const dock = <Dock
    items={items}
    variant={resolvedVariant}
    value={active}
    onValueChange={setActive}
    itemSize={itemSize}
    magnification={magnification}
    aria-label="Cojeev workspace"
  />;

  const content = <section aria-label="Open workspace" style={{ display: "grid", alignContent: "center", gap: 10, minWidth: 0, minHeight: compact ? 142 : 178, padding: compact ? 18 : 24, borderRadius: 16, background: "var(--v-paper)", color: "var(--v-text)", boxShadow: "inset 0 0 0 1px var(--v-border)" }}>
    <Meta>{resolvedVariant === "rail" ? "OPEN PLACE" : "COJEEV / LOCAL"}</Meta>
    <Title as="h3" style={{ margin: 0, overflowWrap: "anywhere" }}>{selected.label}</Title>
    {!compact && <BodySecondary style={{ margin: 0, maxWidth: 480, color: "var(--v-text-2)" }}>{selected.detail}</BodySecondary>}
    <Meta role="status" aria-live="polite" style={{ display: "block", minHeight: 20, color: "var(--v-text-2)" }}>{receipt}</Meta>
  </section>;

  return <div data-example="dock" data-example-variant={resolvedVariant} style={{ display: "grid", gap: 20, width: "100%", minWidth: 0, containerType: "inline-size" }}>
    {resolvedVariant === "glass" && <div style={{ display: "grid", alignContent: "space-between", justifyItems: "center", gap: 24, minWidth: 0, minHeight: compact ? 280 : 350, padding: compact ? 18 : 28, overflow: "hidden", borderRadius: 20, background: "radial-gradient(circle at 18% 15%, var(--v-pink-soft), transparent 42%), var(--v-beige)" }}>
      <div style={{ width: "min(100%, 560px)" }}>{content}</div>
      {dock}
    </div>}
    {resolvedVariant === "shelf" && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", alignContent: "space-between", gap: 26, minWidth: 0, minHeight: compact ? 280 : 350, padding: compact ? 18 : 28, overflow: "hidden", borderRadius: 20, background: "linear-gradient(180deg,var(--v-beige-2),var(--v-beige))" }}>
      {content}
      <div style={{ display: "grid", justifyItems: "center", justifySelf: "stretch", width: "100%", maxWidth: "100%", minWidth: 0 }}>{dock}</div>
    </div>}
    {resolvedVariant === "rail" && <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0,1fr)" : "repeat(auto-fit,minmax(min(100%,210px),1fr))", alignItems: "stretch", gap: 16, minWidth: 0, minHeight: compact ? 410 : 350, padding: compact ? 14 : 20, overflow: "hidden", borderRadius: 20, background: "var(--v-beige)" }}>
      <div style={{ minWidth: 0 }}>{dock}</div>
      {content}
    </div>}
    {!compact && <div aria-label="Dock controls" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 20, width: "min(100%,540px)" }}>
      <SliderWrapper>
        <SliderRow><Label htmlFor={`${controlId}-size`}>Item size</Label><SliderOutput htmlFor={`${controlId}-size`}>{itemSize}px</SliderOutput></SliderRow>
        <Slider id={`${controlId}-size`} aria-label="Item size" min={32} max={72} step={2} value={[itemSize]} onValueChange={([next]) => setItemSize(next)} />
      </SliderWrapper>
      <SliderWrapper>
        <SliderRow><Label htmlFor={`${controlId}-magnification`}>Magnification</Label><SliderOutput htmlFor={`${controlId}-magnification`}>{magnification.toFixed(2)}×</SliderOutput></SliderRow>
        <Slider id={`${controlId}-magnification`} aria-label="Magnification" min={1} max={2} step={.05} value={[magnification]} onValueChange={([next]) => setMagnification(next)} />
      </SliderWrapper>
    </div>}
  </div>;
}
