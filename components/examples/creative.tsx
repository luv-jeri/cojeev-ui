"use client"

import * as React from "react"
import { ShapeScene } from "@/registry/cojeev/ui/shape-scene"
import { Button } from "@/registry/cojeev/ui/button"
import { Label } from "@/registry/cojeev/ui/label"
import { NativeSelect, NativeSelectOption } from "@/registry/cojeev/ui/native-select"
import { Meta } from "@/registry/cojeev/ui/typography"

export function ShapeSceneExample() {
  const [animate, setAnimate] = React.useState(true)
  const [palette, setPalette] = React.useState<"cojeev" | "warm" | "cool">("cojeev")
  const id = React.useId()
  return (
    <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
      <ShapeScene palette={palette} animate={animate} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button size="sm" variant="secondary" aria-pressed={!animate} onClick={() => setAnimate(value => !value)}>{animate ? "Pause sculpture" : "Animate sculpture"}</Button>
        <Label htmlFor={id}>Palette</Label>
        <NativeSelect id={id} value={palette} onChange={event => setPalette(event.target.value as typeof palette)}>
          <NativeSelectOption value="cojeev">Cojeev</NativeSelectOption>
          <NativeSelectOption value="warm">Warm</NativeSelectOption>
          <NativeSelectOption value="cool">Cool</NativeSelectOption>
        </NativeSelect>
      </div>
      <Meta>Move your pointer gently across the sculpture. Global motion Off and reduced motion keep it still; touch leaves scrolling free.</Meta>
    </div>
  )
}
