"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { transitionLayers } from "../lib/reference-gallery-geometry";
import { useGalleryRef, useGalleryTransition, type GalleryTransitionProps } from "../lib/reference-gallery-motion";
export type GrainDissolveProps=GalleryTransitionProps & {tone?:"pink"|"olive"|"blue"|"yellow"};
export function GrainDissolve({first,second,active,duration=1300,paused=false,tone="pink",className,ref,...props}:GrainDissolveProps){
 const {host,progress}=useGalleryTransition(active,duration,paused),layers=transitionLayers(progress,"grain"),id=`grain-${React.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;
 return <div {...props} ref={useGalleryRef(host,ref)} data-slot="grain-dissolve" data-active={active} className={cn("v-grain-dissolve",className)} style={{...props.style,"--gallery-pigment":`var(--v-${tone})`} as React.CSSProperties}>
 <div className="v-grain-dissolve__layer" aria-hidden={active} inert={active} style={{opacity:layers.first,filter:`blur(${(1-layers.first)*9}px)`}}>{first}</div>
 <div className="v-grain-dissolve__layer" aria-hidden={!active} inert={!active} style={{opacity:layers.second,filter:`blur(${(1-layers.second)*9}px)`,transform:`scale(${1+(1-layers.second)*.025})`}}>{second}</div>
 {layers.cover>0&&<svg className="v-grain-dissolve__field" aria-hidden="true" viewBox="0 0 600 400" preserveAspectRatio="none" style={{opacity:layers.cover}}><defs><filter id={id}><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter><radialGradient id={`${id}-wash`}><stop stopColor="var(--gallery-pigment)"/><stop offset="1" stopColor="var(--v-paper)"/></radialGradient></defs><rect width="600" height="400" fill="var(--v-paper)"/><ellipse cx={180+progress*230} cy={230-progress*60} rx={220+progress*140} ry="290" fill={`url(#${id}-wash)`}/><rect width="600" height="400" fill="var(--gallery-pigment)" opacity=".3" filter={`url(#${id})`}/></svg>}
 </div>;
}
