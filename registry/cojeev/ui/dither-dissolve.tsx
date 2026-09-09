"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { ditherCells, transitionLayers } from "../lib/reference-gallery-geometry";
import { useGalleryRef, useGalleryTransition, type GalleryTransitionProps } from "../lib/reference-gallery-motion";
export type DitherDissolveProps=GalleryTransitionProps & {tone?:"pink"|"olive"|"blue"|"yellow"};
export function DitherDissolve({first,second,active,duration=1200,paused=false,tone="olive",className,ref,...props}:DitherDissolveProps){
 const {host,progress}=useGalleryTransition(active,duration,paused),layers=transitionLayers(progress,"dither"),cells=ditherCells(layers.cover);
 return <div {...props} ref={useGalleryRef(host,ref)} data-slot="dither-dissolve" data-active={active} className={cn("v-dither-dissolve",className)}>
 <div className="v-dither-dissolve__layer" aria-hidden={active} inert={active} style={{opacity:layers.first}}>{first}</div>
 <div className="v-dither-dissolve__layer" aria-hidden={!active} inert={!active} style={{opacity:layers.second}}>{second}</div>
 {cells.length>0&&<svg className="v-dither-dissolve__field" aria-hidden="true" viewBox="0 0 16 16" preserveAspectRatio="none" shapeRendering="crispEdges"><rect width="16" height="16" fill="var(--v-paper)" opacity={layers.cover}/>{cells.map(({x,y})=><rect key={`${x}-${y}`} x={x} y={y} width="1.01" height="1.01" fill={(x+y)%3===0?"var(--v-ink)":`var(--v-${tone})`}/>)}</svg>}
 </div>;
}
