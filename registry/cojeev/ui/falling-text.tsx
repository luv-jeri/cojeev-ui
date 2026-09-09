"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded,fallStep,type FallingBody } from "../lib/reference-text-math";
import { useReferenceText,type ReferenceTextSize } from "../lib/reference-text-motion";
export type FallingTextProps=Omit<React.ComponentProps<"div">,"children">&{text:string;gravity?:number;paused?:boolean;replayKey?:string|number;size?:ReferenceTextSize};
/** Measured word rectangles fall, collide and settle inside their own stage. */
export function FallingText({text,gravity=900,paused=false,replayKey=0,size="default",className,ref,...props}:FallingTextProps){
 const {host:hostRef,running}=useReferenceText(paused);
 const words=text.trim().split(/\s+/).filter(Boolean),animate=running&&words.length<=80;
 React.useEffect(()=>{
  const el=hostRef.current;if(!el||!animate)return;const letters=Array.from(el.querySelectorAll<HTMLElement>("[data-falling-word]"));
  let frame=0,last=0,elapsed=0,bodies:FallingBody[]=[],width=0,height=0;
  const measure=()=>{
   letters.forEach(word=>{word.style.transform="";word.style.position="";word.style.left="";word.style.top="";word.style.width="";});
   const box=el.getBoundingClientRect();width=box.width-16;height=box.height-16;
   bodies=letters.map((word,i)=>{const r=word.getBoundingClientRect();return{x:r.x-box.x-8,y:r.y-box.y-8,w:r.width,h:r.height,vx:Math.sin(i*3.2)*65,vy:0,angle:0};});
   letters.forEach((word,i)=>{word.style.position="absolute";word.style.left="8px";word.style.top="8px";word.style.width=`${bodies[i].w}px`;});elapsed=0;last=0;
  };
  const tick=(now:number)=>{
   const dt=last?Math.min(32,now-last):0;last=now;elapsed+=dt;
   bodies=bodies.map(body=>fallStep(body,width,height,dt,bounded(gravity,100,2400,900)));
   for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
    if(ox>0&&oy>0){if(oy<ox){const top=a.y<b.y?a:b,bottom=top===a?b:a;top.y=Math.max(0,top.y-oy*.65);bottom.y=Math.min(height-bottom.h,bottom.y+oy*.35);top.vy=-Math.abs(top.vy)*.22;top.vx*=.94;}else{const left=a.x<b.x?a:b,right=left===a?b:a;left.x=Math.max(0,left.x-ox*.5);right.x=Math.min(width-right.w,right.x+ox*.5);left.vx=-Math.abs(left.vx)*.3;right.vx=Math.abs(right.vx)*.3;}}
   }
   letters.forEach((word,i)=>{const b=bodies[i];word.style.transform=`translate(${b.x}px,${b.y}px)`;});
   el.dataset.state=elapsed<4200?"falling":"settled";
   if(elapsed<4200)frame=requestAnimationFrame(tick);
  };
  measure();frame=requestAnimationFrame(tick);
  const resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);measure();frame=requestAnimationFrame(tick);});resize.observe(el);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();letters.forEach(word=>{word.removeAttribute("style");});el.dataset.state="still";};
 },[hostRef,animate,text,gravity,replayKey]);
 return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="falling-text" data-size={size} data-running={animate} data-state={animate?"falling":"still"} className={cn("v-falling-text",className)}><span className="v-falling-text__accessible">{text}</span><div aria-hidden="true" className="v-falling-text__sentence">{words.map((word,i)=><React.Fragment key={i}><span data-falling-word="">{word}</span>{" "}</React.Fragment>)}</div></div>;
}
