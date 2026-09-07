import * as React from "react"
import { cn } from "@/registry/sahajiv/lib/utils"
import { shapeData } from "@/registry/sahajiv/lib/shape-data"
export type ShapeProps = React.ComponentProps<"span"> & { name?: string }
export function Shape({name="star-4",className,style,...props}:ShapeProps){
 const mask=shapeData[name];
 if(!mask) throw new Error(`Unknown SahaJiv shape: ${name}`)
 return <span data-slot="shape" aria-hidden="true" className={cn("v-shape inline-block h-[1em] w-[1em] shrink-0 bg-[var(--c,currentColor)]",`-${name}`,className)} style={{...style,"--m":mask,mask:"var(--m) center / contain no-repeat",WebkitMask:"var(--m) center / contain no-repeat"} as React.CSSProperties} {...props}/>
}
export const shapeNames=Object.keys(shapeData)
