"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/cojeev/lib/utils"

/* Label type scale is the handoff's, not a step lower. `components.css:98`
   declares `.v-label{font-size:var(--fs-lead);font-weight:600;line-height:1.2}`
   with `.v-label.-sm{font-size:var(--fs-control)}` — 17px/1.2, and 14px for the
   small size. The candidate ran 14px/1.5 and 13px, so every label was a size
   small and half a line tall. `-sm` now takes its size from the authored class
   in label.css rather than restating a literal here. */
const LabelVariants=cva("v-label [font-size:var(--fs-lead)] [font-weight:600] [line-height:1.2] [box-shadow:none] [border:0] [background:none]",{variants:{variant:{"default":""},size:{"default":"","sm":"-sm"}},defaultVariants:{variant:"default",size:"default"}})
export type LabelProps=React.ComponentProps<"label"> & VariantProps<typeof LabelVariants> & { as?:React.ElementType }
export function Label({as:Tag="label",className,variant,size,...props}:LabelProps){return <Tag data-slot="label" data-part="root" className={cn(LabelVariants({variant,size}),className)} {...props}/>}

const StatsVariants=cva("v-stats [display:flex] [gap:var(--s-5)_var(--s-5)] [flex-wrap:wrap] [margin-top:var(--s-4)] [max-width:100%]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type StatsProps=React.ComponentProps<"div"> & VariantProps<typeof StatsVariants> & { as?:React.ElementType }
export function Stats({as:Tag="div",className,variant,size,...props}:StatsProps){return <Tag data-slot="label-stats" data-part="stats" className={cn(StatsVariants({variant,size}),className)} {...props}/>}

const StatVariants=cva("v-stat [display:grid] [gap:4px] [min-width:0]",{variants:{variant:{"default":"","ul":"-ul [padding-bottom:8px] [border-bottom:2px_solid_var(--wm,var(--v-text))]"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type StatProps=React.ComponentProps<"div"> & VariantProps<typeof StatVariants> & { as?:React.ElementType }
export function Stat({as:Tag="div",className,variant,size,...props}:StatProps){return <Tag data-slot="label-stat" data-part="stat" className={cn(StatVariants({variant,size}),className)} {...props}/>}
