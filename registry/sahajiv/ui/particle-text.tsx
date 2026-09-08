"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded } from "../lib/reference-text-math";
import { useReferenceText,type ReferenceTextSize } from "../lib/reference-text-motion";
export type ParticleTextProps=Omit<React.ComponentProps<"div">,"children">&{text:string;density?:number;particleSize?:number;repelRadius?:number;paused?:boolean;replayKey?:number|string;size?:ReferenceTextSize};
/** Samples the actual font's alpha mask, then gathers those samples into text. */
export function ParticleText({text,density=5,particleSize=1.5,repelRadius=70,paused=false,replayKey=0,size="default",className,ref,onPointerMove,onPointerLeave,...props}:ParticleTextProps){
 const {host:hostRef,running}=useReferenceText(paused),canvas=React.useRef<HTMLCanvasElement>(null),pointer=React.useRef<{x:number;y:number}|null>(null);
 React.useEffect(()=>{
  const el=hostRef.current,surface=canvas.current;if(!el||!surface||!running)return;
  const ctx=surface.getContext("2d");if(!ctx)return;
  let disposed=false,frame=0,start=0,w=1,h=1,ink="",particles:{x:number;y:number;tx:number;ty:number;seed:number}[]=[];
  const build=()=>{
   if(disposed)return;const r=el.getBoundingClientRect();w=Math.round(Math.min(900,Math.max(1,r.width)));h=Math.round(Math.min(420,Math.max(1,r.height)));surface.width=w;surface.height=h;
   const style=getComputedStyle(el);ink=style.color;
   const sample=document.createElement("canvas");sample.width=w;sample.height=h;const mask=sample.getContext("2d",{willReadFrequently:true});if(!mask)return;
   let font=bounded(parseFloat(style.fontSize)*1.3,20,100,64);mask.font=`650 ${font}px ${style.fontFamily}`;
   const words=text.trim().split(/\s+/),lines:string[]=[];let line="";
   for(const word of words){const next=line?line+" "+word:word;if(line&&mask.measureText(next).width>w*.85){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
   const maxWidth=Math.max(1,...lines.map(x=>mask.measureText(x).width));font*=Math.min(1,w*.85/maxWidth,h*.7/Math.max(font,lines.length*font*1.2));
   mask.font=`650 ${font}px ${style.fontFamily}`;mask.fillStyle="#000";mask.textAlign="center";mask.textBaseline="middle";
   lines.forEach((l,i)=>mask.fillText(l,w/2,h/2+(i-(lines.length-1)/2)*font*1.2));
   const alpha=mask.getImageData(0,0,w,h).data,step=Math.max(bounded(density,3,10,5),Math.sqrt(w*h/4000));particles=[];
   for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){if(alpha[(Math.floor(y)*sample.width+Math.floor(x))*4+3]>100){const seed=((x*13+y*7)%101)/101;particles.push({tx:x,ty:y,x:w/2+Math.cos(seed*16)*w*.6,y:h/2+Math.sin(seed*19)*h*.7,seed});}}
   el.dataset.ready=String(particles.length>0);start=0;
  };
  const draw=(now:number)=>{
   if(disposed)return;if(!start)start=now;ctx.clearRect(0,0,w,h);ctx.fillStyle=ink;
   const p=bounded((now-start)/1800,0,1,1),gather=1-Math.pow(1-p,3),radius=bounded(repelRadius,10,200,70);
   for(const dot of particles){let x=dot.tx+(dot.x-dot.tx)*(1-gather),y=dot.ty+(dot.y-dot.ty)*(1-gather);
    if(pointer.current){const dx=x-pointer.current.x,dy=y-pointer.current.y,d=Math.hypot(dx,dy);if(d<radius&&d>0){const force=(1-d/radius)**2*34;x+=dx/d*force;y+=dy/d*force;}}
    ctx.beginPath();ctx.arc(x,y,bounded(particleSize,.7,4,1.5),0,Math.PI*2);ctx.fill();
   }frame=requestAnimationFrame(draw);
  };
  const observer=new ResizeObserver(build);observer.observe(el);const appearance=new MutationObserver(build);for(let parent:HTMLElement|null=el;parent;parent=parent.parentElement)appearance.observe(parent,{attributes:true,attributeFilter:["data-mode","class"]});window.addEventListener("sahajiv:appearancechange",build);build();void document.fonts.ready.then(()=>{if(!disposed)build();});frame=requestAnimationFrame(draw);
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();appearance.disconnect();window.removeEventListener("sahajiv:appearancechange",build);el.dataset.ready="false";pointer.current=null;};
 },[hostRef,running,text,density,particleSize,repelRadius,replayKey]);
 return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="particle-text" data-size={size} data-running={running} className={cn("v-particle-text",className)}
 onPointerMove={event=>{onPointerMove?.(event);if(!running||event.defaultPrevented||event.pointerType==="touch")return;const r=event.currentTarget.getBoundingClientRect();pointer.current={x:(event.clientX-r.left)*Math.min(900,r.width)/r.width,y:(event.clientY-r.top)*Math.min(420,r.height)/r.height};}}
 onPointerLeave={event=>{onPointerLeave?.(event);pointer.current=null;}}>
 <span className="v-particle-text__words">{text}</span><canvas ref={canvas} aria-hidden="true"/>
 </div>;
}
