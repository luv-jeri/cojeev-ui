"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded } from "../lib/reference-text-math";
import { useReferenceText,useReferenceClock,type ReferenceTextSize } from "../lib/reference-text-motion";
export type TypographyVortexProps=Omit<React.ComponentProps<"div">,"children">&{text:string;rings?:number;speed?:number;paused?:boolean;size?:ReferenceTextSize;/** Change to pull rings inward, then release. */pulse?:number};
/** Nested counter-rotating glyph rings, a local dissolution lens, and a finite suction pulse. */
export function TypographyVortex({text,rings=7,speed=1,paused=false,size="default",pulse=0,className,ref,onPointerMove,onPointerLeave,...props}:TypographyVortexProps){
 const {host:hostRef,running}=useReferenceText(paused),lens=React.useRef<SVGCircleElement>(null),dust=React.useRef<SVGGElement>(null),field=React.useRef<SVGGElement>(null);
 const id=`vortex-${React.useId().replace(/:/g,"")}`,count=Math.floor(bounded(rings,3,10,7)),pace=bounded(speed,0,3,1),pulseStart=React.useRef(-10000),clock=React.useRef(0);
 React.useEffect(()=>{if(pulse>0)pulseStart.current=clock.current;},[pulse]);
 useReferenceClock(running&&pace>0,time=>{
  clock.current=time;
  hostRef.current?.querySelectorAll<SVGGElement>("[data-vortex-ring]").forEach((ring,i)=>{ring.setAttribute("transform",`rotate(${time*.003*pace*(i%2?-1:1)*(1+i*.12)} 320 220)`);});
  const p=bounded((time-pulseStart.current)/1400,0,1,1),scale=1-Math.sin(p*Math.PI)*.7;
  field.current?.setAttribute("transform",`translate(320 220) scale(${scale}) translate(-320 -220)`);
  hostRef.current?.setAttribute("data-state",p<1?"suction":"ambient");
 });
 React.useEffect(()=>{if(!running){lens.current?.setAttribute("r","0");dust.current?.setAttribute("opacity","0");field.current?.removeAttribute("transform");}},[running]);
 return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="typography-vortex" data-size={size} data-running={running&&pace>0} className={cn("v-typography-vortex",className)}
 onPointerMove={event=>{onPointerMove?.(event);if(!running||event.defaultPrevented||event.pointerType==="touch")return;const svg=hostRef.current?.querySelector("svg");if(!svg)return;const matrix=svg.getScreenCTM();if(!matrix)return;const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const {x,y}=point.matrixTransform(matrix.inverse());lens.current?.setAttribute("cx",String(x));lens.current?.setAttribute("cy",String(y));lens.current?.setAttribute("r","48");dust.current?.setAttribute("transform",`translate(${x} ${y})`);dust.current?.setAttribute("opacity","1");}}
 onPointerLeave={event=>{onPointerLeave?.(event);lens.current?.setAttribute("r","0");dust.current?.setAttribute("opacity","0");}}>
 <svg viewBox="0 0 640 440" aria-hidden="true" className="v-typography-vortex__field"><defs><mask id={`${id}-lens`}><rect width="640" height="440" fill="white"/><circle ref={lens} r="0" fill="black"/></mask>{Array.from({length:count},(_,i)=>{const r=55+i*24;return <path key={i} id={`${id}-${i}`} d={`M320 ${220-r}a${r} ${r} 0 1 1 0 ${2*r}a${r} ${r} 0 1 1 0 ${-2*r}`}/>;})}</defs>
 <g ref={field}><g mask={`url(#${id}-lens)`}>{Array.from({length:count},(_,i)=><g key={i} data-vortex-ring=""><text fontSize={10+i*.7} opacity={.38+i*.07}><textPath href={`#${id}-${i}`} textLength={2*Math.PI*(55+i*24)} lengthAdjust="spacingAndGlyphs">{(text+' · ').repeat(Math.max(2,Math.ceil((16+i*8)/Math.max(1,text.length))))}</textPath></text></g>)}</g></g>
 <g ref={dust} opacity="0" className="v-typography-vortex__dust">{Array.from({length:22},(_,i)=><circle key={i} cx={Number((Math.cos(i*2.4)*(24+i*1.6)).toFixed(3))} cy={Number((Math.sin(i*2.4)*(24+i*1.6)).toFixed(3))} r={1+i%3*.5}/>)}</g></svg>
 <span className="v-typography-vortex__label">{text}</span>
 </div>;
}
