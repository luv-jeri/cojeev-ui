"use client"
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/sahajiv/lib/utils"

const AspectRatioVariants=cva("v-ratio [position:relative] [width:100%] [aspect-ratio:var(--ar,16/9)] [overflow:hidden] [border-radius:var(--r-card-sm)] [background:var(--card)] [display:grid] [place-items:center] [box-shadow:inset_0_0_0_1px_var(--v-border)] [color:var(--v-text-2)] [font-size:13px] [font-weight:500] [font-variant-numeric:tabular-nums]",{variants:{variant:{"default":"","pink":"-pink [background:var(--v-pink)] [--wm:var(--v-pink-deep)] [color:var(--v-on-accent)] [box-shadow:none]","yellow":"-yellow [background:var(--v-yellow)] [--wm:var(--v-yellow-deep)] [color:var(--v-on-accent)] [box-shadow:none]","blue":"-blue [background:var(--v-blue)] [--wm:var(--v-blue-deep)] [color:var(--v-on-accent)] [box-shadow:none]","olive":"-olive [background:var(--v-olive)] [--wm:var(--v-olive-deep)] [color:var(--v-on-accent)] [box-shadow:none]"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type AspectRatioProps=React.ComponentProps<"div"> & VariantProps<typeof AspectRatioVariants> & { ratio?:number }
export function AspectRatio({ref: externalMorphRef, className,variant,size,ratio=16/9,style,...props}:AspectRatioProps){const ownedMorphRef = useMorph<HTMLDivElement>("controls", externalMorphRef);
  const resolvedRatio=Number.isFinite(ratio)&&ratio>0?ratio:16/9;
  return <div ref={ownedMorphRef} data-slot="aspect-ratio" data-part="root" style={{"--ar":resolvedRatio,...style} as React.CSSProperties} className={cn(AspectRatioVariants({variant,size}),className)} {...props}/>}
