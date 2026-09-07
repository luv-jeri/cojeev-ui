"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/sahajiv/lib/utils"
import { cardVariants } from "@/registry/sahajiv/ui/card"
import { useMorph } from "@/registry/sahajiv/motion/use-morph"

const SkeletonVariants=cva("v-skel [border-radius:999px] [background:var(--v-skel-face)] [background-size:200%_100%] [animation:v-shimmer_1.4s_linear_infinite] [box-shadow:none] [position:relative] [overflow:hidden]",{variants:{variant:{"default":"","pill":"-pill [border-radius:var(--r-pill)]","card":"-card [border-radius:20px]","disk":"-disk [border-radius:50%]","line":"-line [height:12px] [border-radius:999px]","skel-group":"-skel-group"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type SkeletonProps=React.ComponentProps<"div"> & VariantProps<typeof SkeletonVariants> & { as?:React.ElementType }
export function Skeleton({as:Tag="div",className,variant,size,ref,...props}:SkeletonProps){const ownedRef=useMorph<HTMLDivElement>("skeleton",ref);return <Tag ref={ownedRef} data-slot="skeleton-item" data-part="item" className={cn(SkeletonVariants({variant,size}),className)} {...props}/>}

const SkeletonGroupVariants=cva("v-skel-group [gap:8px] [display:grid]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type SkeletonGroupProps=React.ComponentProps<"div"> & VariantProps<typeof SkeletonGroupVariants> & { as?:React.ElementType }
export function SkeletonGroup({as:Tag="div",className,variant,size,...props}:SkeletonGroupProps){return <Tag data-slot="skeleton" data-part="root" className={cn(className?.split(/\s+/).includes("v-card")&&cardVariants(),SkeletonGroupVariants({variant,size}),className)} {...props}/>}

const AsyncContentVariants=cva("v-async [display:grid] [gap:10px] [padding:18px] [border-radius:16px] [background:var(--v-beige)] [justify-items:start]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type AsyncContentProps=React.ComponentProps<"div"> & VariantProps<typeof AsyncContentVariants> & { as?:React.ElementType }
export function AsyncContent({as:Tag="div",className,variant,size,...props}:AsyncContentProps){return <Tag data-slot="skeleton-async" data-part="async" className={cn(AsyncContentVariants({variant,size}),className)} {...props}/>}

const AsyncRowVariants=cva("v-async__row [display:flex] [align-items:center] [gap:10px] [font-size:14px] [color:var(--v-text-2)]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type AsyncRowProps=React.ComponentProps<"div"> & VariantProps<typeof AsyncRowVariants> & { as?:React.ElementType }
export function AsyncRow({as:Tag="div",className,variant,size,...props}:AsyncRowProps){return <Tag data-slot="skeleton-async-row" data-part="async-row" className={cn(AsyncRowVariants({variant,size}),className)} {...props}/>}

const QuietVariants=cva("v-quiet [color:var(--v-text-2)]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type QuietProps=React.ComponentProps<"span"> & VariantProps<typeof QuietVariants> & { as?:React.ElementType }
export function Quiet({as:Tag="span",className,variant,size,...props}:QuietProps){return <Tag data-slot="skeleton-quiet" data-part="quiet" className={cn(QuietVariants({variant,size}),className)} {...props}/>}
