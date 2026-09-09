"use client";
import * as React from "react";
import { ShapeScene, type SculptureMaterial } from "@/registry/cojeev/ui/shape-scene";
import { ScrollOrganism } from "@/registry/cojeev/ui/scroll-organism";
import { Button } from "@/registry/cojeev/ui/button";
import { Body } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";
export function ShapeSceneExample({ variant = "mixed" }: ExampleProps) {
  const [alternate, setAlternate] = React.useState(false);
  const material: SculptureMaterial = ["clay", "glazed", "grain", "ripple"].includes(variant) ? variant as SculptureMaterial : "mixed";
  return <div style={{ display: "grid", gap: 20 }}><ShapeScene material={material} density="full" shapes={alternate ? ["daisy-12", "pebble-tall", "scalloped-square", "seed-wing", "crescent", "cloud-3"] : undefined} /><Button variant="secondary" onClick={() => setAlternate(v => !v)}>Change the shapes</Button></div>;
}
export function ScrollOrganismExample() { return <div style={{ position: "relative", minHeight: 300, padding: 24 }}><Body>Scroll this page. The organism follows native scroll with a softly changing silhouette. Motion Off leaves it still.</Body><ScrollOrganism style={{ position: "absolute", top: "50%", right: "15%", opacity: .8 }} travel={20} /></div>; }
