"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded } from "../lib/reference-text-math";
import { useReferenceText,useReferenceClock,type ReferenceTextSize } from "../lib/reference-text-motion";
export type WarpTextProps=Omit<React.ComponentProps<"div">,"children">&{text:string;strength?:number;speed?:number;paused?:boolean;size?:ReferenceTextSize};
/** A real noise displacement of rendered glyphs; no WebGL context or foreign font needed. */
export function WarpText({text,strength=12,speed=1,paused=false,size="default",className,ref,...props}:WarpTextProps){
 const {host:hostRef,running}=useReferenceText(paused),noise=React.useRef<SVGFETurbulenceElement>(null);
 const id=`warp-${React.useId().replace(/:/g,"")}`,pace=bounded(speed,0,3,1);
 useReferenceClock(running&&pace>0,time=>{noise.current?.setAttribute("baseFrequency",`${.012+Math.sin(time*.0003*pace)*.003} ${.035+Math.cos(time*.0002*pace)*.008}`);});
 return <div {...props} ref={useReferenceRef(hostRef,ref)} className={cn("v-warp-text",className)} data-slot="warp-text" data-size={size} data-running={running&&pace>0}>
  <svg width="0" height="0" aria-hidden="true"><defs><filter id={id} x="-15%" y="-25%" width="130%" height="150%" colorInterpolationFilters="sRGB"><feTurbulence ref={noise} type="fractalNoise" baseFrequency=".012 .04" numOctaves="2" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale={running?bounded(strength,0,24,12):0} xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>
  <span className="v-warp-text__words" style={{filter:running?`url(#${id})`:undefined}}>{text}</span>
 </div>;
}
