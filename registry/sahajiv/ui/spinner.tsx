"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { useReducedMotion } from "@/registry/sahajiv/motion/use-reduced-motion"
import { cn } from "@/registry/sahajiv/lib/utils"

const SpinnerVariants=cva("v-pulse [display:inline-grid] [place-items:center] [width:var(--pulse,34px)] [height:var(--pulse,34px)] [position:relative]",{variants:{variant:{"default":"","point":"-point"},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
function seedPath(radius:(angle:number)=>number) {
  return "M"+Array.from({length:64},(_,i)=>{const angle=i/64*Math.PI*2;const r=radius(angle);return `${(50+r*Math.cos(angle)).toFixed(2)} ${(50+r*Math.sin(angle)).toFixed(2)}`}).join("L")+"Z"
}
const pebble=seedPath(t=>41+2.4*Math.cos(3*t+.6)+1.4*Math.sin(5*t))
const star=seedPath(t=>21+23*Math.pow(Math.abs(Math.cos(2*t)),1.9))
const puff=seedPath(t=>36+6*Math.abs(Math.cos(4*t)))
export type SpinnerProps=React.ComponentProps<"span"> & VariantProps<typeof SpinnerVariants> & { label?:string }
export function Spinner({className,variant,size,label,children,...props}:SpinnerProps){
  const reduced=useReducedMotion()
  const caption=label??(props as Record<string,unknown>)["data-label"] as string|undefined
  return <span role="status" aria-label={caption||"Working"} data-slot="spinner" data-part="root" className={cn(SpinnerVariants({variant,size}),className)} {...props}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><path className="seed" d={reduced?star:pebble}>{!reduced&&<animate attributeName="d" dur="4.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.3;.45;.75;1" keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1" values={`${pebble};${star};${star};${puff};${pebble}`}/>}</path><circle className="core" cx="50" cy="50" r="5"/></svg>
    {caption&&<SpinnerLabel>{caption}</SpinnerLabel>}{children}
  </span>
}

const SpinnerLabelVariants=cva("v-pulse__label [font-weight:500] [color:var(--v-text-2)] [opacity:1] [position:absolute] [inset:auto_auto_-20px_50%] [transform:translateX(-50%)] [font-size:11px] [white-space:nowrap]",{variants:{variant:{"default":""},size:{"default":""}},defaultVariants:{variant:"default",size:"default"}})
export type SpinnerLabelProps=React.ComponentProps<"span"> & VariantProps<typeof SpinnerLabelVariants>
export function SpinnerLabel({className,variant,size,...props}:SpinnerLabelProps){return <span data-slot="spinner-label" data-part="label" className={cn(SpinnerLabelVariants({variant,size}),className)} {...props}/>}
