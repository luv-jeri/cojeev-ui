"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { animate, motion, useMotionValue, useTransform, type MotionStyle } from "motion/react";
import { assemblyContour, type AssemblyContour, type AssemblyRect } from "../lib/assembly-geometry";
import { trackMotion, useChoreography } from "../motion/choreography";
import { cn } from "../lib/utils";

const NativePart=motion.create(Slot);
type PartPaint={background:string;ink:string};
/** Read the authored endpoint on the actual native root, before the browser paints.
 * Generated morph layers suppress their host fill, so exclude only that owned
 * layer while sampling. The root, its state and its children keep their identity. */
function nativePaint(node:HTMLElement):PartPaint {
  const body=node.querySelector<SVGSVGElement>(":scope > svg.v-morph"),next=body?.nextSibling;
  const live=node.classList.contains("v-morph-live"),fill=node.style.getPropertyValue("--mfill"),priority=node.style.getPropertyPriority("--mfill");
  node.setAttribute("data-assembly-paint-probe","");
  body?.remove();if(live)node.classList.remove("v-morph-live");
  if(node.hasAttribute("data-auto-morph"))node.style.removeProperty("--mfill");
  const style=getComputedStyle(node),paint={background:style.backgroundColor,ink:style.color};
  if(body)node.insertBefore(body,next??null);if(live)node.classList.add("v-morph-live");
  if(fill)node.style.setProperty("--mfill",fill,priority);
  node.removeAttribute("data-assembly-paint-probe");
  return paint;
}
const colourMix=(start:string,end:string,amount:number)=>amount>=1?end:amount<=0?start:`color-mix(in oklab, ${start} ${(1-amount)*100}%, ${end} ${amount*100}%)`;
export type AssemblyPartProps={
  children:React.ReactElement;
  identity:string;
  /** Marks a new composition even when a reused part has identical target geometry. */
  transitionKey?:string;
  rect:AssemblyRect;
  /** Initial geometry for a newly introduced native part; existing roots keep current motion values. */
  from?:AssemblyRect;
  fromContour?:AssemblyContour;
  contour?:AssemblyContour;
  radius?:number;
  reveal?:boolean;
  interactive?:boolean;
  immediate?:boolean;
  duration?:number;
  delay?:number;
  /** Curved travel strength from 0 (straight) to 1. */
  curve?:number;
  onProgress?:(progress:number)=>void;
  /** Give native paint, clipping, focus and hover motion back after arrival. */
  release?:boolean;
  floating?:boolean;
  tone?:"pink"|"blue"|"olive"|"yellow";
  onRest?:()=>void;
  className?:string;
};
/** One persistent atomic root. Its real surface changes contour, dimensions and location. */
export function AssemblyPart({children,identity,transitionKey,rect,from,fromContour,contour="rounded",radius=16,reveal=true,interactive=true,immediate=false,duration=1.35,delay=0,curve=.65,onProgress,release=false,floating=false,tone="pink",onRest,className}:AssemblyPartProps){
  const {quiet}=useChoreography();
  const origin=from??rect;
  const x=useMotionValue(origin.x),y=useMotionValue(origin.y),width=useMotionValue(origin.width),height=useMotionValue(origin.height),rotate=useMotionValue(origin.rotate??0);
  const rotation=useTransform(rotate,value=>`${value}deg`);
  const path=React.useMemo(()=>assemblyContour(contour,rect.width,rect.height,radius),[contour,rect.width,rect.height,radius]);
  const initialPath=from?assemblyContour(fromContour??contour,from.width,from.height,radius):path;
  const clipPath=useMotionValue(release?"":initialPath),contentOpacity=useMotionValue(reveal?1:0);
  const background=useMotionValue(`var(--v-${tone})`),ink=useMotionValue("var(--v-on-accent)"),paintProgress=useMotionValue(0);
  const lastContour=React.useRef(initialPath),callbacks=React.useRef({onRest,onProgress});
  const native=React.useRef<HTMLElement>(null);
  React.useLayoutEffect(()=>{callbacks.current={onRest,onProgress}},[onRest,onProgress]);
  React.useLayoutEffect(()=>{
    let current=true,labelsOpen=reveal;
    const node=native.current;
    node?.setAttribute("data-assembly-revealing",String(reveal));
    const arriving=contour==="rounded"||contour==="circle";
    const sampleTarget=():PartPaint=>node?arriving?nativePaint(node):{background:getComputedStyle(node).getPropertyValue("--assembly-tone").trim(),ink:"var(--v-on-accent)"}:{background:`var(--v-${tone})`,ink:"var(--v-on-accent)"};
    let paintStart:PartPaint=node?{background:getComputedStyle(node).backgroundColor,ink:getComputedStyle(node).color}:{background:background.get(),ink:ink.get()};
    let paintEnd=sampleTarget(),colourFrom=arriving?.3:0,colourTo=arriving?.94:.76,progressNow=0;
    const pairs=[[x,rect.x],[y,rect.y],[width,rect.width],[height,rect.height],[rotate,rect.rotate??0]] as const;
    if(release||quiet||immediate){
      // Stop writers before clearing. Retained renders read this same cleared value.
      for(const [value,target]of pairs){value.stop();value.jump(target)}
      clipPath.stop();clipPath.jump(release?"":path);lastContour.current=path;
      background.stop();ink.stop();background.jump(paintEnd.background);ink.jump(paintEnd.ink);paintProgress.jump(1);
      contentOpacity.stop();contentOpacity.jump(reveal?1:0);callbacks.current.onProgress?.(1);callbacks.current.onRest?.();return;
    }
    const start={x:x.get(),y:y.get(),width:width.get(),height:height.get(),rotate:rotate.get()};
    const beginning=clipPath.get()||lastContour.current;
    const oldPoints=beginning.match(/-?\d+(?:\.\d+)?/g)!.map(Number),newPoints=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const distance=Math.hypot(rect.x-start.x,rect.y-start.y),strength=Math.max(0,Math.min(1,curve));
    const direction=Array.from(identity).reduce((sum,char)=>sum+char.charCodeAt(0),0)%2?1:-1;
    const bowX=direction*Math.min(16,distance*.1)*strength,bowY=-Math.min(30,distance*.14)*strength;
    const right=Math.max(start.x+start.width,rect.x+rect.width),bottom=Math.max(start.y+start.height,rect.y+rect.height);
    const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};
    const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
    const draw=(progress:number)=>{
      if(!current)return;
      progressNow=progress;
      const colour=smooth((progress-colourFrom)/Math.max(.001,colourTo-colourFrom));
      background.set(colourMix(paintStart.background,paintEnd.background,colour));ink.set(colourMix(paintStart.ink,paintEnd.ink,colour));paintProgress.set(colour);
      const shape=smooth(progress/(arriving?.94:.76)),anticipation=1-Math.sin(Math.PI*Math.min(1,progress/.22))*.025;
      const w=mix(start.width,rect.width,shape)*anticipation,h=mix(start.height,rect.height,shape)*anticipation;
      width.set(w);height.set(h);
      x.set(Math.max(0,Math.min(right-w,mix(start.x,rect.x,progress)+Math.sin(Math.PI*progress)*bowX)));
      y.set(Math.max(0,Math.min(bottom-h,mix(start.y,rect.y,progress)+Math.sin(Math.PI*progress)*bowY)));
      rotate.set(mix(start.rotate,rect.rotate??0,shape)+Math.sin(Math.PI*progress)*direction*3*strength);
      const points=newPoints.map((value,index)=>mix(oldPoints[index]??value,value,shape));
      const next=`polygon(${Array.from({length:96},(_,index)=>`${points[index*2].toFixed(3)}% ${points[index*2+1].toFixed(3)}%`).join(",")})`;
      clipPath.set(next);lastContour.current=next;
      contentOpacity.set(reveal?1:arriving?smooth((progress-.64)/.3):0);
      if(!labelsOpen&&arriving&&progress>=.64){labelsOpen=true;native.current?.setAttribute("data-assembly-revealing","true")}
      callbacks.current.onProgress?.(progress);
    };
    // Palette or theme updates rebase only paint. Travel keeps its current clock
    // and path, and interrupted selections start from the visible mixed colour.
    const theme=new MutationObserver(()=>{
      if(!node||!current||progressNow>=1)return;
      const style=getComputedStyle(node);paintStart={background:style.backgroundColor,ink:style.color};
      paintEnd=sampleTarget();colourFrom=progressNow;colourTo=Math.max(.94,progressNow+(1-progressNow)*.7);
    });
    theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-mode","data-skin","style"]});
    draw(0);
    const travel=animate(0,1,{duration:Math.max(.15,Math.min(duration,4)),delay:Math.max(0,Math.min(delay,.7)),ease:[.32,.08,.22,1],onUpdate:draw});
    const releases=[trackMotion(travel)];
    void travel.finished.then(()=>{
      if(!current)return;
      draw(1);callbacks.current.onRest?.();
      if(floating){const drift=animate(y,[rect.y,rect.y-5,rect.y],{duration:3.2,repeat:Infinity,ease:"easeInOut"});releases.push(trackMotion(drift))}
    });
    return()=>{current=false;theme.disconnect();releases.forEach(stop=>stop())};
  },[rect.x,rect.y,rect.width,rect.height,rect.rotate,path,contour,identity,transitionKey,duration,delay,curve,floating,release,reveal,quiet,immediate,tone,x,y,width,height,rotate,clipPath,contentOpacity,background,ink,paintProgress]);
  React.useLayoutEffect(()=>{
    const node=native.current;if(!release||!node)return;
    // A selection or palette can change a resting native surface. Remember its
    // current endpoint for a later replay without taking paint ownership back.
    const remember=()=>{const paint=nativePaint(node);background.jump(paint.background);ink.jump(paint.ink)};
    remember();
    const theme=new MutationObserver(remember);theme.observe(document.documentElement,{attributes:true,attributeFilter:["data-mode","data-skin","style"]});
    return()=>theme.disconnect();
  });
  // One writer owns each value through travel and quiet interruptions. At rest,
  // empty clipping and left/top positioning leave native hover/press paint free.
  const position={left:x,top:y,width,height,clipPath,"--assembly-rotation":rotation,"--assembly-content-opacity":contentOpacity,"--assembly-paint-bg":background,"--assembly-paint-ink":ink,"--assembly-paint-progress":paintProgress} as MotionStyle;
  return <NativePart ref={native} className={cn("v-assembly-part",className)} data-assembly-part={identity} data-assembly-reveal={reveal} data-assembly-revealing={reveal} data-assembly-released={release} data-assembly-tone={tone} data-motion={release?undefined:"off"} data-flow={release?undefined:"off"} inert={!interactive||undefined} aria-hidden={!reveal||undefined} style={position}>{children}</NativePart>;
}
