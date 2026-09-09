"use client";

import * as React from "react";
import { HeroButton } from "@/registry/cojeev/ui/hero-button";
import { DepthBackground, type DepthBackgroundProps } from "@/registry/cojeev/ui/depth-background";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { Card, CardContent, CardTitle } from "@/registry/cojeev/ui/card";
import { Shape } from "@/registry/cojeev/ui/shape";
import { Meta, Body } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

export function HeroButtonExample({ variant, size }: ExampleProps) {
  const [count, setCount] = React.useState(0);
  return <div style={{ display: "grid", justifyItems: "center", gap: 20, padding: 24 }}>
    <HeroButton shape={variant === "capsule" ? "capsule" : "organic"} size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"} onClick={() => setCount(n => n + 1)}>Make something yours</HeroButton>
    <Meta aria-live="polite">{count ? `${count} little beginnings.` : "Hover or focus to let the arrow unfold."}</Meta>
  </div>;
}

export function DepthBackgroundExample({ variant }: ExampleProps) {
  const atmosphere: DepthBackgroundProps["variant"] = variant === "contour" || variant === "orbital" ? variant : "pollen";
  return <div style={{ position: "relative", isolation: "isolate", minHeight: 330, display: "grid", placeItems: "center", borderRadius: 24, overflow: "clip", padding: 24 }}>
    <DepthBackground variant={atmosphere} seed="documentation" density={1.2} />
    <Card style={{ position: "relative", width: "min(100%, 290px)" }}><CardContent><CardTitle>A little atmosphere.</CardTitle><Body>Move your pointer. Scroll the page. The layers move at their own pace.</Body></CardContent></Card>
  </div>;
}

export function FloatLayerExample({ variant }: ExampleProps) {
  return <div style={{ minHeight: 310, display: "grid", placeItems: "center", padding: 40 }}><FloatLayer depth={80} drift={variant === "scroll-only" ? 0 : 9}>
    <Card variant="pink" style={{ width: "min(100%, 260px)" }}><CardContent><Shape name="clover-soft" style={{ color: "var(--v-on-accent)", "--c": "var(--v-on-accent)", width: 56, height: 56 } as React.CSSProperties} /><CardTitle>A different plane.</CardTitle><Body>Scroll to feel the depth. The card keeps its own hover response.</Body></CardContent></Card>
  </FloatLayer></div>;
}
