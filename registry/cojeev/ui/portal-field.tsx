"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { useReferenceRef } from "../lib/reference-ref";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { createPortalField,type PortalStatus } from "../lib/reference-additions-portal";
import { normalizePortal,portalContour } from "../lib/reference-additions-math";
export type PortalFieldProps=React.ComponentProps<"div">&{
 tone?:"balanced"|"warm"|"cool";speed?:number;intensity?:number;distortion?:number;
 paused?:boolean;interactive?:boolean;size?:"sm"|"default"|"lg";
};
/** A soft, organically warped halo behind real caller content. */
export function PortalField({tone="balanced",speed=.7,intensity=1,distortion=.7,paused=false,interactive=true,size="default",children,className,ref,onPointerMove,onPointerLeave,...props}:PortalFieldProps){
 const host=React.useRef<HTMLDivElement>(null),canvas=React.useRef<HTMLCanvasElement>(null),renderer=React.useRef<ReturnType<typeof createPortalField>|null>(null);
 const attach=useReferenceRef(host,ref);
 const {enabled,inView}=useMotionVisibility(host),[status,setStatus]=React.useState<PortalStatus>("pending");
 const values=normalizePortal(speed,intensity,distortion),moving=enabled&&inView&&!paused&&values.speed>0&&values.intensity>0;
 const safeTone=tone==="warm"||tone==="cool"?tone:"balanced";
 React.useEffect(()=>{if(!host.current||!canvas.current)return;const instance=createPortalField(canvas.current,host.current,next=>setStatus(previous=>previous===next?previous:next));renderer.current=instance;return()=>{instance.dispose();renderer.current=null;};},[]);
 React.useEffect(()=>{renderer.current?.update({speed:values.speed,intensity:values.intensity,distortion:values.distortion,tone:safeTone,visible:inView,moving});},[values.speed,values.intensity,values.distortion,safeTone,inView,moving]);
 return <div {...props} ref={attach} data-slot="portal-field" data-tone={safeTone} data-size={size} data-renderer={status} data-running={moving&&status==="webgl"} className={cn("v-portal-field",className)}
 onPointerMove={event=>{onPointerMove?.(event);if(event.defaultPrevented||!moving||!interactive||event.pointerType==="touch")return;const box=event.currentTarget.getBoundingClientRect();renderer.current?.pointer((event.clientX-box.left)/box.width,1-(event.clientY-box.top)/box.height);}}
 onPointerLeave={event=>{onPointerLeave?.(event);renderer.current?.pointer(.5,.5);}}>
 <svg className="v-portal-field__fallback" viewBox="0 0 640 440" aria-hidden="true" style={{opacity:Math.min(1,values.intensity)}}><path d={portalContour(0,values.distortion,14)} className="v-portal-field__fringe"/><path d={portalContour(0,values.distortion)} className="v-portal-field__core"/></svg>
 <canvas ref={canvas} aria-hidden="true" className="v-portal-field__canvas"/>{children&&<div className="v-portal-field__content">{children}</div>}
 </div>;
}
