"use client";
import * as React from "react";
import { assignMotionRef } from "@/registry/sahajiv/motion/refs";
import { cn } from "@/registry/sahajiv/lib/utils";
import { createGlyphMesh } from "@/registry/sahajiv/lib/glyph-mesh";
import { sculptureGeometry } from "@/registry/sahajiv/lib/sculpture-geometry";
import { rasterizeSculpture, sculptureGrid, sculpturePrint, sculpturePrintPath, sculptureNumber } from "@/registry/sahajiv/lib/sculpture-raster";
import { useMotionVisibility } from "@/registry/sahajiv/motion/use-motion-visibility";
import type { SculptureCommonProps } from "@/registry/sahajiv/ui/glyph-sculpture";
import { createMaterialRenderer, type MaterialEffect, type MaterialConfiguration, type MaterialRenderer } from "./sculpture-renderer";
export type SculptureRendererState="pending"|"webgl"|"fallback"|"error";
export type MaterialSculptureCommonProps=SculptureCommonProps&{ref?:React.Ref<HTMLDivElement>;onRendererChange?:(state:SculptureRendererState)=>void};
type StageControl = {configure:(configuration:MaterialConfiguration)=>void;repaint:()=>void};

/** Shared native scene boundary; materials never take ownership of page input or scroll. */
export function SculptureStage({effect,form="bloom",tone="sky",geometry,speed=1,turn=0,pitch=0,zoom=1,pointerTracking=true,paused=false,onGeometryError,onRendererChange,className,ref,...props}:MaterialSculptureCommonProps&{effect:MaterialEffect}){
 const host=React.useRef<HTMLDivElement>(null),canvas=React.useRef<HTMLCanvasElement>(null),control=React.useRef<StageControl|null>(null),{enabled,inView}=useMotionVisibility(host);
 const attach=React.useCallback((node:HTMLDivElement|null)=>{host.current=node;const release=assignMotionRef(ref,node);return()=>{host.current=null;release();};},[ref]);
 const safeForm=form==="seed"||form==="pebble"?form:"bloom",safeTone=tone==="rose"||tone==="ink"||tone==="moss"?tone:"sky",pace=sculptureNumber(speed,1,0,3),degrees=sculptureNumber(turn,0,-180,180),tilt=sculptureNumber(pitch,0,-80,80),scale=sculptureNumber(zoom,1,.6,1.15);
 const meshResult=React.useMemo(()=>{try{return {mesh:sculptureGeometry(geometry??createGlyphMesh(safeForm)),error:null};}catch(error){return {mesh:null,error:error instanceof Error?error:new Error("The geometry could not be read.")};}},[geometry,safeForm]);
 const mesh=meshResult.mesh,kind=effect.kind;
 React.useEffect(()=>{if(meshResult.error)onGeometryError?.(meshResult.error);},[meshResult.error,onGeometryError]);
 const configuration=React.useMemo<MaterialConfiguration>(()=>({effect,visible:inView,quiet:!enabled,run:enabled&&!paused&&pace>0,respond:enabled&&!paused&&pace>0&&pointerTracking,turn:degrees,pitch:tilt,zoom:scale,speed:pace}),[effect,inView,enabled,paused,pace,pointerTracking,degrees,tilt,scale]);
 const latest=React.useRef(configuration);
 const [rendered,setRendered]=React.useState<{mesh:typeof mesh;kind:typeof kind;status:"pending"|"webgl"|"fallback"}>({mesh:null,kind,status:"pending"});
 const renderer=rendered.mesh===mesh&&rendered.kind===kind?rendered.status:"pending";
 React.useEffect(()=>{onRendererChange?.(meshResult.error?"error":renderer);},[renderer,meshResult.error,onRendererChange]);
 const still=React.useMemo(()=>{if(!mesh)return null;const grid=sculptureGrid(384,288,4),frame=rasterizeSculpture(mesh,grid,.35+degrees*Math.PI/180,-.16+tilt*Math.PI/180,scale);return {grid,path:sculpturePrintPath(sculpturePrint(frame,{kind:"dither",pattern:"ordered",density:1}),grid.columns)};},[mesh,degrees,tilt,scale]);
 React.useEffect(()=>{latest.current=configuration;control.current?.configure(configuration);},[configuration]);
 React.useEffect(()=>{control.current?.repaint();},[safeTone]);
 React.useEffect(()=>{
  const element=host.current,surface=canvas.current;if(!element||!surface||!mesh)return;
  let disposed=false,engine:MaterialRenderer|undefined,frame=0,last=0,elapsed=0,options=latest.current,job:AbortController|undefined,painted=false,lost=false;
  let previousPointer:{x:number;y:number}|undefined;
  const hover=window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const colors=()=>{const css=getComputedStyle(element);return {paper:css.backgroundColor,ink:css.getPropertyValue("--v-text").trim()||"#20252a",accent:css.getPropertyValue("--material-accent").trim()||"#a6bde8",other:css.getPropertyValue("--v-yellow").trim()||"#edcf70"};};
  function cancel(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
  function request(){if(!disposed&&!lost&&engine&&options.visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw);}
  function fallback(){if(disposed)return;cancel();job?.abort();engine?.dispose(false);engine=undefined;painted=false;setRendered({mesh,kind,status:"fallback"});}
  function draw(time:number){frame=0;if(disposed||lost||!engine||!options.visible||document.hidden)return;if(options.run&&last&&time-last<32){request();return;}const seconds=last?Math.min((time-last)/1000,1/30):1/30;last=time;if(options.run)elapsed+=seconds*options.speed;
   try{const again=engine.draw(seconds,elapsed);if(!painted){painted=true;setRendered({mesh,kind,status:"webgl"});}if(again)request();}catch{fallback();}
  }
  function resize(){if(!engine)return;const bounds=element!.getBoundingClientRect();engine.resize(bounds.width,bounds.height,window.devicePixelRatio||1);request();}
  function repaint(){engine?.colors(colors());request();}
  async function initialize(){if(disposed||lost||engine||job||!options.visible||document.hidden)return;job=new AbortController();const ownJob=job;
   try{const next=await createMaterialRenderer(surface!,mesh!,options,colors(),ownJob.signal);if(disposed||ownJob.signal.aborted){next.dispose(!surface!.isConnected);return;}engine=next;engine.configure(options);resize();request();}catch{if(!disposed&&!ownJob.signal.aborted)fallback();}
   finally{if(job===ownJob)job=undefined;}
  }
  const instance:StageControl={configure(next){options=next;engine?.configure(next);if(!next.respond){engine?.leave();previousPointer=undefined;}cancel();if(!engine)void initialize();else request();},repaint};control.current=instance;
  function pointer(event:PointerEvent){if(!engine||!options.respond||!options.visible||!hover.matches||event.pointerType==="touch"||document.hidden)return;const rect=element!.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=1-(event.clientY-rect.top)/rect.height;
   if(x<0||x>1||y<0||y>1){engine.leave();previousPointer=undefined;return;}const dx=previousPointer?x-previousPointer.x:.025,dy=previousPointer?y-previousPointer.y:.01;previousPointer={x,y};engine.pointer(x,y,dx,dy);request();
  }
  const visibility=()=>{cancel();engine?.leave();previousPointer=undefined;if(!document.hidden){if(!engine)void initialize();request();}},leave=()=>{engine?.leave();previousPointer=undefined;},onLost=(event:Event)=>{event.preventDefault();lost=true;fallback();},onRestored=()=>{lost=false;painted=false;void initialize();};
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(element);const appearance=new MutationObserver(repaint);for(let ancestor:Element|null=element;ancestor;ancestor=ancestor.parentElement)appearance.observe(ancestor,{attributes:true,attributeFilter:["class","style","data-mode"]});
  window.addEventListener("pointermove",pointer,{passive:true});window.addEventListener("blur",leave);window.addEventListener("resize",resize);window.addEventListener("sahajiv:appearancechange",repaint);document.addEventListener("visibilitychange",visibility);surface.addEventListener("webglcontextlost",onLost);surface.addEventListener("webglcontextrestored",onRestored);void initialize();
  return()=>{disposed=true;job?.abort();cancel();if(control.current===instance)control.current=null;sizeObserver.disconnect();appearance.disconnect();window.removeEventListener("pointermove",pointer);window.removeEventListener("blur",leave);window.removeEventListener("resize",resize);window.removeEventListener("sahajiv:appearancechange",repaint);document.removeEventListener("visibilitychange",visibility);surface.removeEventListener("webglcontextlost",onLost);surface.removeEventListener("webglcontextrestored",onRestored);engine?.dispose(!surface.isConnected);surface.width=1;surface.height=1;};
 },[mesh,kind]);
 return <div {...props} ref={attach} className={cn("v-material-sculpture",className)} data-slot={`${kind}-sculpture`} data-tone={safeTone} data-renderer={meshResult.error?"error":renderer} data-moving={configuration.run&&inView&&renderer==="webgl"?"true":"false"}>
  {meshResult.error?<span data-slot="material-status" role="status">{meshResult.error.message}</span>:still&&<svg data-slot="material-still" viewBox={`0 0 ${still.grid.columns} ${still.grid.rows}`} aria-hidden="true"><path d={still.path} fill="currentColor"/></svg>}
  <canvas ref={canvas} data-slot="material-canvas" aria-hidden="true" inert/>
  {!meshResult.error&&renderer!=="webgl"&&<span data-slot="material-status" role={renderer==="fallback"?"status":undefined}>{renderer==="fallback"?"3D material is unavailable. ":""}Static shape preview</span>}
 </div>;
}
