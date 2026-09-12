"use client";
/* eslint-disable @next/next/no-img-element -- Installable React image gallery. */
import * as React from "react";
import { cn } from "../lib/utils";
import { galleryIndex, galleryOffset, spiralPlacement } from "../lib/reference-gallery-geometry";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { useGalleryRef } from "../lib/reference-gallery-motion";
export type InfiniteSpiralItem={id:string;src:string;alt:string;title?:string;href?:string};
export type InfiniteSpiralProps=React.ComponentProps<"div"> & {items:readonly InfiniteSpiralItem[];paused?:boolean;speed?:number;direction?:"up"|"down"};
export function InfiniteSpiral({items,paused=false,speed=.35,direction="up",className,ref,...props}:InfiniteSpiralProps){
 const host=React.useRef<HTMLDivElement>(null),stage=React.useRef<HTMLDivElement>(null),position=React.useRef(0);
 const [selected,setSelected]=React.useState(0),[localPaused,setLocalPaused]=React.useState(false),[engaged,setEngaged]=React.useState(false);
 const {enabled,inView}=useMotionVisibility(host);
 const running=enabled&&inView&&!paused&&!localPaused&&!engaged&&items.length>1;
 const rate=Number.isFinite(speed)?Math.min(2,Math.max(.1,speed)):.35;
 const active=galleryIndex(selected,items.length);
 const itemKey=JSON.stringify(items.map(item=>item.id));
 React.useEffect(()=>{
  const root=stage.current;if(!root)return;
  const cards=Array.from(root.querySelectorAll<HTMLElement>("[data-spiral-card]"));
  const paint=()=>cards.forEach((card,index)=>{const p=spiralPlacement(galleryOffset(index,position.current,items.length),items.length,root.clientWidth);card.style.transform=`translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${p.scale})`;card.style.opacity=String(p.opacity);card.style.zIndex=String(Math.round((p.depth+1)*100));});
  const resize=new ResizeObserver(paint);resize.observe(root);paint();let frame=0,last=performance.now();
  const tick=(now:number)=>{position.current+=(now-last>100?0:now-last)*.001*rate*(direction==="up"?1:-1);last=now;paint();setSelected(galleryIndex(position.current,items.length));frame=requestAnimationFrame(tick);};
  if(running)frame=requestAnimationFrame(tick);
  return ()=>{cancelAnimationFrame(frame);resize.disconnect();};
 },[running,rate,direction,items.length,selected,itemKey]);
 const choose=(index:number)=>{const next=galleryIndex(index,items.length);if(next<0)return;setLocalPaused(true);position.current=next;setSelected(next);};
 return <div {...props} ref={useGalleryRef(host,ref)} className={cn("v-infinite-spiral",className)} data-slot="infinite-spiral" data-running={running} onMouseEnter={event=>{setEngaged(true);props.onMouseEnter?.(event);}} onMouseLeave={event=>{setEngaged(false);props.onMouseLeave?.(event);}} onFocusCapture={event=>{setEngaged(true);props.onFocusCapture?.(event);}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setEngaged(false);props.onBlurCapture?.(event);}}>
 <div ref={stage} className="v-infinite-spiral__stage" aria-hidden="true">{items.map(item=><img key={item.id} data-spiral-card="" className="v-infinite-spiral__card" src={item.src} alt=""/>)}{items.length===0&&<p>No images available.</p>}</div>
 <div className="v-infinite-spiral__caption"><strong>{items[active]?.title??"Shape study"}</strong><span>{items[active]?.alt??"No image selected"}</span>{items[active]?.href&&<a href={items[active].href}>Explore this study ↗</a>}</div>
 <div className="v-infinite-spiral__controls"><button type="button" onClick={()=>choose(active-1)} disabled={items.length<2} aria-label="Previous image">←</button><button type="button" onClick={()=>setLocalPaused(value=>!value)} disabled={paused||!enabled||items.length<2} aria-pressed={localPaused||paused}>{!enabled?"Motion is still":localPaused||paused?"Resume spiral":"Pause spiral"}</button><button type="button" onClick={()=>choose(active+1)} disabled={items.length<2} aria-label="Next image">→</button></div>
 <div className="v-infinite-spiral__choices" aria-label="Select image">{items.map((item,index)=><button type="button" key={item.id} aria-label={`Show ${item.title??item.alt}`} aria-pressed={index===active} onClick={()=>choose(index)}>{String(index+1).padStart(2,"0")}</button>)}</div>
 </div>;
}
