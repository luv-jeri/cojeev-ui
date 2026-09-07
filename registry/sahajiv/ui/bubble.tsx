"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/sahajiv/lib/utils"

const BubbleVariants=cva("v-chat [display:grid] [gap:4px] [padding:18px_20px_16px] [border-radius:24px] [background:var(--v-ink)] [--bubble-surface:var(--v-ink)]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type BubbleProps=React.ComponentProps<"div"> & VariantProps<typeof BubbleVariants> & { as?:React.ElementType }
export function Bubble({as:Tag="div",className,variant,size,...props}:BubbleProps){return <Tag data-slot="bubble" data-part="root" className={cn(BubbleVariants({variant,size}),className)} {...props}/>}

const BubbleRowVariants=cva("v-chat__row [display:flex] [align-items:flex-end] [gap:10px] [max-width:82%] [justify-self:start]",{variants:{variant:{"default":"","me":"-me [justify-self:end] [flex-direction:row-reverse]"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type BubbleRowProps=React.ComponentProps<"div"> & VariantProps<typeof BubbleRowVariants> & { as?:React.ElementType }
export function BubbleRow({as:Tag="div",className,variant,size,...props}:BubbleRowProps){return <Tag data-slot="bubble-item" data-part="item" className={cn(BubbleRowVariants({variant,size}),className)} {...props}/>}

const BubbleContentVariants=cva("v-bubble [display:inline-block] [max-width:min(80%,52ch)] [padding:10px_14px_11px] [border-radius:18px_18px_18px_4px] [background:var(--v-canvas)] [color:var(--v-text)] [font-size:var(--fs-control)] [line-height:1.4] [overflow-wrap:anywhere] [position:relative]",{variants:{variant:{"default":"","me":"-me [background:var(--v-pink)] [border-radius:18px_18px_4px_18px] [color:var(--v-on-accent)]","tail":"-tail [border-bottom-left-radius:18px]"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type BubbleContentProps=React.ComponentProps<"div"> & VariantProps<typeof BubbleContentVariants> & { as?:React.ElementType }
export function BubbleContent({as:Tag="div",className,variant,size,...props}:BubbleContentProps){return <Tag data-slot="bubble-content" data-part="content" className={cn(BubbleContentVariants({variant,size}),className)} {...props}/>}

const BubbleGapVariants=cva("v-chat__gap [height:10px]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type BubbleGapProps=React.ComponentProps<"div"> & VariantProps<typeof BubbleGapVariants> & { as?:React.ElementType }
export function BubbleGap({as:Tag="div",className,variant,size,...props}:BubbleGapProps){return <Tag data-slot="bubble-gap" data-part="gap" className={cn(BubbleGapVariants({variant,size}),className)} {...props}/>}

const BubbleTimeVariants=cva("v-chat__time [font-size:11px] [color:var(--structure-text)] [opacity:.7] [padding:6px_0_2px_38px] [font-variant-numeric:tabular-nums]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type BubbleTimeProps=React.ComponentProps<"div"> & VariantProps<typeof BubbleTimeVariants> & { as?:React.ElementType }
export function BubbleTime({as:Tag="div",className,variant,size,...props}:BubbleTimeProps){return <Tag data-slot="bubble-time" data-part="time" className={cn(BubbleTimeVariants({variant,size}),className)} {...props}/>}
