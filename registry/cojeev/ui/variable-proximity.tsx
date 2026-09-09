"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded, graphemes, proximityWeight } from "../lib/reference-text-math";
import { useReferenceText, type ReferenceTextSize } from "../lib/reference-text-motion";
export type VariableProximityProps = Omit<React.ComponentProps<"div">,"children"> & {
  text: string; variant?: "weight" | "pressure"; size?: ReferenceTextSize; paused?: boolean;
  radius?: number; fromWeight?: number; toWeight?: number;
};
/** Local pointer distance changes the shipped Bricolage variable font's real wght/wdth axes. */
export function VariableProximity({text,variant="weight",size="default",paused=false,radius=150,fromWeight=350,toWeight=800,className,ref,onPointerMove,onPointerLeave,...props}:VariableProximityProps) {
  const {host:hostRef,running}=useReferenceText(paused);
  const frame=React.useRef(0), point=React.useRef<{x:number;y:number}|null>(null);
  const from=bounded(fromWeight,200,800,350),to=bounded(toWeight,200,800,800);
  const paint=React.useCallback(() => {
    hostRef.current?.querySelectorAll<HTMLElement>("[data-proximity-letter]").forEach(letter=>{
      const rect=letter.getBoundingClientRect();
      const distance=point.current&&running?Math.hypot(point.current.x-rect.x-rect.width/2,point.current.y-rect.y-rect.height/2):Infinity;
      const weight=proximityWeight(distance,radius,from,to);
      const width=variant==="pressure"?proximityWeight(distance,radius,75,100):100;
      letter.style.fontVariationSettings=`"wght" ${weight}, "wdth" ${width}`;
    });
  },[hostRef,running,radius,from,to,variant]);
  React.useEffect(()=>{paint();return()=>cancelAnimationFrame(frame.current);},[paint,text]);
  return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="variable-proximity" data-variant={variant} data-size={size} data-running={running} className={cn("v-variable-proximity",className)}
    onPointerMove={event=>{onPointerMove?.(event);if(event.defaultPrevented||event.pointerType==="touch"||!running)return;point.current={x:event.clientX,y:event.clientY};cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(paint);}}
    onPointerLeave={event=>{onPointerLeave?.(event);point.current=null;paint();}}>
    <span className="v-variable-proximity__accessible">{text}</span>
    <span aria-hidden="true" className="v-variable-proximity__line">{text.split(/(\s+)/).map((word,i)=>/^\s+$/.test(word)?word:<span className="v-variable-proximity__word" key={i}>{graphemes(word).map((char,j)=><span key={j} data-proximity-letter="" style={{fontVariationSettings:`"wght" ${from}, "wdth" ${variant==="pressure"?75:100}`}}>{char}</span>)}</span>)}</span>
  </div>;
}
