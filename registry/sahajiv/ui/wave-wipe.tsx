"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { waveBoundary } from "../lib/reference-gallery-geometry";
import { useGalleryRef, useGalleryTransition, type GalleryTransitionProps } from "../lib/reference-gallery-motion";
export type WaveWipeProps=GalleryTransitionProps & {tone?:"pink"|"olive"|"blue"|"yellow"};
export function WaveWipe({first,second,active,duration=1100,paused=false,tone="blue",className,ref,...props}:WaveWipeProps){
 const {host,progress}=useGalleryTransition(active,duration,paused),id=`wave-${React.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;
 const points=Array.from({length:33},(_,i)=>`${i/32},${waveBoundary(progress,i/32)}`).join(" ");
 const edge=Array.from({length:33},(_,i)=>`${i/32*600},${waveBoundary(progress,i/32)*400}`).join(" ");
 return <div {...props} ref={useGalleryRef(host,ref)} data-slot="wave-wipe" data-active={active} className={cn("v-wave-wipe",className)}>
 <svg width="0" height="0" aria-hidden="true" style={{position:"absolute"}}><defs><clipPath id={id} clipPathUnits="objectBoundingBox"><polygon points={`0,1.3 ${points} 1,1.3`}/></clipPath></defs></svg>
 <div className="v-wave-wipe__layer" aria-hidden={active} inert={active} style={{transform:`translateY(${-progress*8}%)`,opacity:progress===1?0:1}}>{first}</div>
 <div className="v-wave-wipe__layer" aria-hidden={!active} inert={!active} style={{clipPath:progress===1?undefined:`url(#${id})`}}>{second}</div>
 {progress>0&&progress<1&&<svg className="v-wave-wipe__field" aria-hidden="true" viewBox="0 0 600 400" preserveAspectRatio="none"><polyline points={edge} fill="none" stroke={`var(--v-${tone})`} strokeWidth="34"/><polyline points={edge} fill="none" stroke="var(--v-paper)" strokeWidth="2"/></svg>}
 </div>;
}
