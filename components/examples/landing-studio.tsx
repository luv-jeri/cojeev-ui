"use client";

import * as React from "react";
import {
  HeroButton,
  heroButtonAppearances,
  type HeroButtonAppearance,
} from "@/registry/cojeev/ui/hero-button";
import {
  DepthBackground,
  type DepthBackgroundProps,
} from "@/registry/cojeev/ui/depth-background";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { Card, CardContent, CardTitle } from "@/registry/cojeev/ui/card";
import { Shape } from "@/registry/cojeev/ui/shape";
import { Meta, Body } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

const heroConcepts: Record<string, { label: string; cue: string }> = {
  organic: {
    label: "Make something yours",
    cue: "The original living contour and coiling arrow.",
  },
  capsule: {
    label: "Take the next step",
    cue: "The same drawing arrow, inside a regular resting rim.",
  },
  "split-arrow": {
    label: "Start something",
    cue: "The arrow has its own sliding tab.",
  },
  "paper-fold": {
    label: "Open a new chapter",
    cue: "A folded corner lifts from the paper.",
  },
  "pressed-key": {
    label: "Make it happen",
    cue: "A raised key settles under your pointer.",
  },
  ribbon: {
    label: "Follow your curiosity",
    cue: "A directional ribbon pulls its trailing stripes.",
  },
  ticket: {
    label: "Keep my place",
    cue: "A perforated admission ticket with a moving stub.",
  },
  seal: { label: "Made for you", cue: "An organic seal turns its inner rim." },
  "ink-sweep": {
    label: "Leave your mark",
    cue: "A stroke of ink grows behind the words.",
  },
  orbit: {
    label: "Explore an idea",
    cue: "A small satellite follows the arrow's orbit.",
  },
  "sliding-window": {
    label: "A fresh perspective",
    cue: "The words roll through a clipped window.",
  },
  "stacked-paper": {
    label: "Start a collection",
    cue: "Two offset sheets fan beneath the top page.",
  },
  spotlight: {
    label: "Find your focus",
    cue: "A quiet pool of light follows the pointer.",
  },
};

export function HeroButtonExample({
  variant = "organic",
  size,
  compact,
}: ExampleProps) {
  const [count, setCount] = React.useState(0);
  const appearance = heroButtonAppearances.includes(
    variant as HeroButtonAppearance,
  )
    ? (variant as HeroButtonAppearance)
    : "liquid";
  const concept = heroConcepts[variant] ?? heroConcepts.organic;
  return (
    <div className="v-hero-demo" data-compact={compact || undefined}>
      <HeroButton
        appearance={appearance}
        shape={variant === "capsule" ? "capsule" : "organic"}
        size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
        onClick={() => setCount((n) => n + 1)}
      >
        {concept.label}
      </HeroButton>
      <Meta>{concept.cue}</Meta>
      <Meta role="status" aria-live="polite">
        {count
          ? `${count} ${count === 1 ? "local action" : "local actions"}.`
          : "Hover, focus or activate to try it."}
      </Meta>
    </div>
  );
}

export function DepthBackgroundExample({ variant }: ExampleProps) {
  const atmosphere: DepthBackgroundProps["variant"] =
    variant === "contour" || variant === "orbital" ? variant : "pollen";
  return (
    <div
      style={{
        position: "relative",
        isolation: "isolate",
        minHeight: 330,
        display: "grid",
        placeItems: "center",
        borderRadius: 24,
        overflow: "clip",
        padding: 24,
      }}
    >
      <DepthBackground
        variant={atmosphere}
        seed="documentation"
        density={1.2}
      />
      <Card style={{ position: "relative", width: "min(100%, 290px)" }}>
        <CardContent>
          <CardTitle>A little atmosphere.</CardTitle>
          <Body>
            Move your pointer. Scroll the page. The layers move at their own
            pace.
          </Body>
        </CardContent>
      </Card>
    </div>
  );
}

export function FloatLayerExample({ variant }: ExampleProps) {
  return (
    <div
      style={{
        minHeight: 310,
        display: "grid",
        placeItems: "center",
        padding: 40,
      }}
    >
      <FloatLayer depth={80} drift={variant === "scroll-only" ? 0 : 9}>
        <Card variant="pink" style={{ width: "min(100%, 260px)" }}>
          <CardContent>
            <Shape
              name="clover-soft"
              style={
                {
                  color: "var(--v-on-accent)",
                  "--c": "var(--v-on-accent)",
                  width: 56,
                  height: 56,
                } as React.CSSProperties
              }
            />
            <CardTitle>A different plane.</CardTitle>
            <Body>
              Scroll to feel the depth. The card keeps its own hover response.
            </Body>
          </CardContent>
        </Card>
      </FloatLayer>
    </div>
  );
}
