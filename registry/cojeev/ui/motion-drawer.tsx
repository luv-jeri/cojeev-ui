"use client";
import * as React from "react";
import { useDirection } from "@radix-ui/react-direction";
import { Button } from "./button";
import { Sheet,SheetTrigger,SheetContent,SheetTitle,SheetDescription,SheetClose } from "./sheet";
import { cn } from "../lib/utils";
import { shouldDismissDrawer } from "../lib/reference-layouts";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { assignMotionRef } from "../motion/refs";
export type MotionDrawerProps=Omit<React.ComponentProps<"div">,"title"> & {title:string;description?:string;triggerLabel?:string;open?:boolean;defaultOpen?:boolean;onOpenChange?:(open:boolean)=>void;side?:"start"|"end";enableDrag?:boolean};
/** Existing Sheet owns focus trapping, dismissal, scroll locking and focus return. */
export function MotionDrawer({title,description,triggerLabel="Open navigation",open,defaultOpen=false,onOpenChange,side="start",enableDrag=true,children,className,ref,...props}:MotionDrawerProps){
 const [localOpen,setLocalOpen]=React.useState(defaultOpen),[offset,setOffset]=React.useState(0),[dragging,setDragging]=React.useState(false);
 const moved=React.useRef(false);
 const host=React.useRef<HTMLDivElement>(null),start=React.useRef<{x:number;width:number;id:number}|null>(null);const {enabled,inView}=useMotionVisibility(host);
 const direction=useDirection(props.dir==="rtl"||props.dir==="ltr"?props.dir:undefined),physical=(side==="start")!==(direction==="rtl")?"left":"right";
 const isOpen=open??localOpen;
 const change=(next:boolean)=>{setOffset(0);setDragging(false);start.current=null;if(open===undefined)setLocalOpen(next);onOpenChange?.(next);};
 const hostRef=React.useCallback((node:HTMLDivElement|null)=>{host.current=node;return assignMotionRef(ref,node);},[ref]);
 return <div {...props} ref={hostRef} data-slot="motion-drawer" data-motion={enabled&&inView?"on":"off"} className={cn("v-motion-drawer",className)}>
 <Sheet open={isOpen} onOpenChange={change}><SheetTrigger asChild><Button className="v-motion-drawer__trigger" data-open={isOpen}><span aria-hidden="true">☰</span>{triggerLabel}</Button></SheetTrigger>
 <SheetContent side={side} dir={direction} className="v-motion-drawer__panel" style={{translate:enabled?`${offset}px 0`:undefined,transition:dragging||!enabled?"none":"translate .25s ease"}}>
 <div className="v-motion-drawer__top"><SheetTitle>{title}</SheetTitle><SheetClose asChild><Button variant="ghost" size="sm" aria-label="Close navigation">×</Button></SheetClose></div>
 {description?<SheetDescription>{description}</SheetDescription>:<SheetDescription className="sr-only">Use the navigation links or close this panel.</SheetDescription>}
 {enableDrag&&<button type="button" className="v-motion-drawer__handle" aria-label="Drag toward the edge to close; press Enter to close" onClick={event=>{if(event.detail>0&&moved.current){event.preventDefault();moved.current=false;return;}change(false);}} onPointerDown={event=>{if(event.button!==0)return;moved.current=false;start.current={x:event.clientX,width:event.currentTarget.closest<HTMLElement>('[data-slot="sheet-content"]')?.clientWidth??320,id:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);}} onPointerMove={event=>{const drag=start.current;if(!drag||drag.id!==event.pointerId)return;const delta=event.clientX-drag.x;if(Math.abs(delta)>4)moved.current=true;setOffset(physical==="left"?Math.max(-drag.width,Math.min(0,delta)):Math.min(drag.width,Math.max(0,delta)));}} onPointerUp={event=>{const drag=start.current;if(!drag)return;event.currentTarget.releasePointerCapture(event.pointerId);start.current=null;setDragging(false);setOffset(0);if(shouldDismissDrawer(event.clientX-drag.x,drag.width,physical))change(false);else event.preventDefault();}} onPointerCancel={()=>{start.current=null;setDragging(false);setOffset(0);}}><span aria-hidden="true">⠿</span> Drag {physical==="left"?"left":"right"} to close</button>}
 <div className="v-motion-drawer__body">{children}</div>
 </SheetContent></Sheet>
 </div>;
}
