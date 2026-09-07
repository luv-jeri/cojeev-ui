"use client"
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/sahajiv/lib/utils"

const ProgressVariants=cva("v-track [position:relative] [height:var(--track-h)] [border-radius:var(--r-pill)] [background:var(--v-beige)] [overflow:hidden] [flex:1]",{variants:{variant:{"default":"","cream":"-cream [background:var(--v-canvas)]","unavail":"-unavail [background:repeating-linear-gradient(135deg,var(--v-border)_0_6px,transparent_6px_12px)] [box-shadow:inset_0_0_0_1px_var(--v-skel-edge)] [background-color:var(--v-canvas)] [background-image:none]"},size:{"default":"","lg":"-lg [height:var(--track-h-lg)] [background:var(--v-canvas)]","sm":"-sm [height:var(--track-h-sm)]"}},defaultVariants:{variant:"default",size:"default"}})
export type ProgressProps=React.ComponentProps<"div"> & VariantProps<typeof ProgressVariants> & {value?:number|null; max?:number}
export function Progress({ref: externalMorphRef, className,variant,size,value,max=100,children,style,...props}:ProgressProps){
 const total=Number.isFinite(max)&&max>0?max:100;
 const supplied=value??props["aria-valuenow"];
 const current=typeof supplied==="number"&&Number.isFinite(supplied)?Math.max(0,Math.min(supplied,total)):undefined;
 const unavailable=variant==="unavail"||current===undefined;
 const ownedMorphRef = useMorph<HTMLDivElement>("controls", externalMorphRef);
  return <div ref={ownedMorphRef} data-slot="progress" data-part="root" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={unavailable?undefined:current} aria-valuetext={unavailable?"Unavailable":undefined} data-state={unavailable?"unavailable":"determinate"} className={cn(ProgressVariants({variant:unavailable?"unavail":variant,size}),className)} style={style} {...props}>{children??<ProgressIndicator style={{"--p":`${unavailable?0:current/total*100}%`} as React.CSSProperties}/>}</div>
}
export type ProgressIndicatorProps=React.ComponentProps<"i">
export function ProgressIndicator(props:ProgressIndicatorProps){return <i data-slot="progress-indicator" data-part="indicator" {...props}/>}
