"use client";
import * as React from "react";
import { AnimatedNumber } from "@/registry/sahajiv/ui/animated-number";
import { NumberInput } from "@/registry/sahajiv/ui/number-input";
import { Button } from "@/registry/sahajiv/ui/button";
import type { ExampleProps } from "./types";
import { BodySecondary, Display, Meta } from "@/registry/sahajiv/ui/typography";

export function AnimatedNumberExample({ variant = "default" }: ExampleProps) {
  const [value, setValue] = React.useState(1240.75);
  const [treatment, setTreatment] = React.useState<"count" | "roll" | "steps">(variant === "roll" || variant === "steps" ? variant : "count");
  const [locale, setLocale] = React.useState("en-US");
  const [replay, setReplay] = React.useState(0);
  const [previousVariant, setPreviousVariant] = React.useState(variant);
  if (previousVariant !== variant) { setPreviousVariant(variant); setTreatment(variant === "roll" || variant === "steps" ? variant : "count"); }
  return <div style={{ display: "grid", gap: 24, width: "100%", maxWidth: 560 }}>
    <Meta>Every little change counts</Meta>
    <Display as="div" style={{ fontSize: "clamp(30px, 7vw, 68px)", minHeight: "1.2em" }}><AnimatedNumber key={replay} value={value} from={0} treatment={treatment} locale={locale} format={{ style: "currency", currency: "USD" }} /></Display>
    <BodySecondary>Count each step, roll the digits, or let the total arrive in drawn poses.</BodySecondary>
    <div role="group" aria-label="Number treatment" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {(["count", "roll", "steps"] as const).map(mode => <Button key={mode} variant={treatment === mode ? "default" : "secondary"} aria-pressed={treatment === mode} onClick={() => setTreatment(mode)}>{mode === "steps" ? "Drawn steps" : mode === "roll" ? "Rolling digits" : "Smooth count"}</Button>)}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Button onClick={() => setValue(current => current + 125.25)}>Add 125.25</Button>
      <Button variant="secondary" onClick={() => setValue(current => current - 375.5)}>Subtract 375.50</Button>
      <Button variant="ghost" onClick={() => setReplay(current => current + 1)}>Replay entrance</Button>
    </div>
    <label style={{ display: "flex", alignItems: "center", gap: 12 }}>Number format <select value={locale} onChange={event => setLocale(event.target.value)} style={{ font: "inherit", color: "inherit", background: "var(--input)", border: "1px solid var(--v-edge)", borderRadius: "var(--r-pill)", padding: "8px 16px" }}><option value="en-US">English</option><option value="de-DE">Deutsch</option><option value="ar-EG">العربية</option><option value="hi-IN">हिन्दी</option></select></label>
  </div>;
}

export function NumberInputExample() {
  const [value, setValue] = React.useState<number | null>(24.5);
  return <div style={{ display: "grid", gap: 20, width: "100%", maxWidth: 420 }}>
    <Meta>A little more, a little less</Meta>
    <label htmlFor="numeric-example-value">Weekly contribution</label>
    <NumberInput id="numeric-example-value" value={value} onValueChange={setValue} min={0} max={500} step={.5} format={{ style: "currency", currency: "USD" }} aria-describedby="numeric-example-help" />
    <BodySecondary id="numeric-example-help">Type an amount, or adjust it by fifty cents with the buttons and arrow keys.</BodySecondary>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button variant="secondary" onClick={() => setValue(24.5)}>Reset amount</Button><Button variant="ghost" onClick={() => setValue(null)}>Clear amount</Button></div>
    <Meta>{value === null ? "No contribution entered." : `Contribution set to ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)}.`}</Meta>
  </div>;
}
