"use client";

import * as React from "react";
import { ScrollArea, ScrollBar, type ScrollbarVariant } from "@/registry/cojeev/ui/scroll-area";
import { Body, Meta, Title } from "@/registry/cojeev/ui/typography";
import { Label } from "@/registry/cojeev/ui/label";
import { Slider, SliderOutput, SliderRow, SliderWrapper } from "@/registry/cojeev/ui/slider";
import { NativeSelect, NativeSelectOption } from "@/registry/cojeev/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/registry/cojeev/ui/radio-group";
import { Input } from "@/registry/cojeev/ui/input";
import type { ExampleProps } from "./types";

const colors = {
  grove: "#53683c",
  rose: "#bd4c75",
  sky: "#276b96",
} as const;

export function ScrollAppearanceExample({ variant: surfaceVariant = "default" }: ExampleProps) {
  const [size, setSize] = React.useState(6);
  const [color, setColor] = React.useState<string>(colors.grove);
  const [variant, setVariant] = React.useState<ScrollbarVariant>("organic");
  const id = React.useId();
  return <div style={{ display: "grid", gap: 20, width: "100%" }}>
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
      <SliderWrapper>
        <SliderRow><Label id={`${id}-size`}>Thumb thickness</Label><SliderOutput>{size}px</SliderOutput></SliderRow>
        <Slider aria-labelledby={`${id}-size`} min={2} max={16} step={1} value={[size]} onValueChange={([next]) => setSize(next ?? 6)} />
      </SliderWrapper>
      <div style={{ display: "grid", gap: 8 }}>
        <Label htmlFor={`${id}-color`}>Thumb color</Label>
        <NativeSelect id={`${id}-color`} value={Object.entries(colors).find(([, value]) => value === color)?.[0] ?? "custom"} onChange={event => event.target.value !== "custom" && setColor(colors[event.target.value as keyof typeof colors])}>
          <NativeSelectOption value="grove">Grove</NativeSelectOption>
          <NativeSelectOption value="rose">Rose</NativeSelectOption>
          <NativeSelectOption value="sky">Sky</NativeSelectOption>
          <NativeSelectOption value="custom">Custom color</NativeSelectOption>
        </NativeSelect>
      </div>
      <div style={{ display: "grid", gap: 8 }}><Label htmlFor={`${id}-picker`}>Custom color</Label><Input id={`${id}-picker`} type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Custom thumb color" style={{ width: "100%", minHeight: 40 }} /></div>
    </div>
    <RadioGroup aria-label="Scrollbar style" orientation="horizontal" value={variant} onValueChange={value => setVariant(value as ScrollbarVariant)} style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      <RadioGroupItem value="organic">Organic</RadioGroupItem>
      <RadioGroupItem value="rounded">Rounded</RadioGroupItem>
      <RadioGroupItem value="minimal">Minimal</RadioGroupItem>
    </RadioGroup>
    <ScrollArea variant={surfaceVariant as React.ComponentProps<typeof ScrollArea>["variant"]} scrollbarSize={size} scrollbarColor={color} scrollbarVariant={variant} style={{ height: 220 }} aria-label="Scrollbar appearance preview">
      <div style={{ display: "grid", gap: 20, padding: 20 }}>
        {Array.from({ length: 10 }, (_, index) => <div key={index}><Title as="h4">A small place to pause {index + 1}</Title><Body>A real scroll surface: drag the 24px rail, then change its visible paint.</Body></div>)}
      </div>
    </ScrollArea>
    <ScrollArea variant={surfaceVariant as React.ComponentProps<typeof ScrollArea>["variant"]} scrollbarSize={size} scrollbarColor={color} scrollbarVariant={variant} style={{ height: 88 }} aria-label="Horizontal scrollbar appearance preview" viewportWrapper={viewport => <>{viewport}<ScrollBar orientation="horizontal" /></>}>
      <div style={{ display: "flex", gap: 36, width: "max-content", padding: "20px 32px" }}>
        {Array.from({ length: 8 }, (_, index) => <Title as="h4" key={index}>Make room {index + 1}</Title>)}
      </div>
    </ScrollArea>
    <Meta role="status">{variant} · {size}px · {color}</Meta>
  </div>;
}
