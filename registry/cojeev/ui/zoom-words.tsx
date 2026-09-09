"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded } from "../lib/reference-text-math";
import { useReferenceText,useReferenceClock,type ReferenceTextSize } from "../lib/reference-text-motion";
export type ZoomWordsProps=Omit<React.ComponentProps<"div">,"children">&{text:string;wordGap?:number;zoom?:number;paused?:boolean;replayKey?:string|number;size?:ReferenceTextSize};
/** The camera follows measured word centers through an enlarged, growing line. */
export function ZoomWords({text,wordGap=650,zoom=1.7,paused=false,replayKey=0,size="default",className,ref,...props}:ZoomWordsProps){
 const {host:hostRef,running}=useReferenceText(paused),track=React.useRef<HTMLSpanElement>(null),gap=bounded(wordGap,250,1600,650),scale=bounded(zoom,1,2.5,1.7);
 const words=text.trim().split(/\s+/).filter(Boolean);
 useReferenceClock(running,time=>{
  const el=hostRef.current,line=track.current;if(!el||!line)return false;const items=Array.from(line.children) as HTMLElement[];if(!items.length)return false;
  const p=bounded((time-450)/gap,0,items.length-1,0),index=Math.floor(p),mix=p-index,a=items[index],b=items[Math.min(index+1,items.length-1)];
  const center=(a.offsetLeft+a.offsetWidth/2)*(1-mix)+(b.offsetLeft+b.offsetWidth/2)*mix;
  line.style.transform=`translateX(${-center*scale}px) scale(${scale})`;
  items.forEach((word,i)=>{const reveal=bounded((time-i*gap)/400,0,1,1);word.style.opacity=String(reveal);word.style.filter=`blur(${(1-reveal)*2}px)`;word.style.translate=`${(1-reveal)*8}px ${(1-reveal)*6}px`;});
  el.dataset.ready="true";const done=time>=(items.length+.5)*gap;el.dataset.state=done?"complete":"tracking";return !done;
 },`${replayKey}:${text}:${gap}:${scale}`);
 return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="zoom-words" data-size={size} data-running={running} className={cn("v-zoom-words",className)}><span className="v-zoom-words__words">{text}</span><span aria-hidden="true" className="v-zoom-words__camera"><span ref={track} className="v-zoom-words__track">{words.map((word,i)=><span key={i}>{word}{i<words.length-1?" ":""}</span>)}</span></span></div>;
}
