"use client";
import { BentoGrid } from "@/registry/cojeev/ui/bento-grid";
import { BentoBuilder } from "@/registry/cojeev/ui/bento-builder";
import { generateBento } from "@/registry/cojeev/lib/bento-layout";
import type { ExampleProps } from "./types";

export function BentoExample({
  variant = "classic",
  compact = false,
}: ExampleProps) {
  const treatment = variant === "interlock" ? "interlock" : "classic";
  return compact ? (
    <BentoGrid layout={generateBento()} variant={treatment} />
  ) : (
    <BentoBuilder initialVariant={treatment} />
  );
}
