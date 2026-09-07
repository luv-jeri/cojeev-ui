"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/sahajiv/lib/utils"

const MarkerVariants=cva("v-marker [display:flex] [align-items:center] [gap:var(--s-3)] [font-size:var(--fs-meta)] [color:var(--muted-foreground)] [margin:var(--s-2)_0]",{variants:{variant:{"default":"","ok":"-ok [color:var(--v-olive-ink)]","danger":"-danger [color:var(--v-danger-ink)]"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type MarkerProps=React.ComponentProps<"div"> & VariantProps<typeof MarkerVariants> & { as?:React.ElementType }
export function Marker({as:Tag="div",className,variant,size,...props}:MarkerProps){return <Tag data-slot="marker" data-part="root" className={cn(MarkerVariants({variant,size}),className)} {...props}/>}
