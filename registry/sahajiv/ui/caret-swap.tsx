"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded,caretFrame } from "../lib/reference-text-math";
import { useReferenceText,useReferenceClock,type ReferenceTextSize } from "../lib/reference-text-motion";
export type CaretSwapProps=Omit<React.ComponentProps<"div">,"children">&{fromText:string;toText:string;duration?:number;paused?:boolean;replayKey?:string|number;size?:ReferenceTextSize};
/** A caret expands right-to-left, collapses, then types whole graphemes into the reserved footprint. */
export function CaretSwap({fromText,toText,duration=4200,paused=false,replayKey=0,size="default",className,ref,...props}:CaretSwapProps){
 const {host:hostRef,running}=useReferenceText(paused),[progress,setProgress]=React.useState(1);
 const cycle=bounded(duration,1600,12000,4200);
 useReferenceClock(running,time=>{const p=bounded(time/cycle,0,1,1);setProgress(p);return p<1;},`${replayKey}:${fromText}:${toText}:${cycle}`);
 const state=caretFrame(fromText,toText,running?progress:1);
 return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="caret-swap" data-size={size} data-running={running&&progress<1} data-state={state.phase} className={cn("v-caret-swap",className)}>
 <span className="v-caret-swap__accessible">{toText}</span>
 <span aria-hidden="true" className="v-caret-swap__frame"><span className="v-caret-swap__measure">{fromText}</span><span className="v-caret-swap__measure">{toText}</span>
 <span className="v-caret-swap__text">{state.text}{(state.phase==="typing"||state.phase==="complete")&&<span className="v-caret-swap__caret"/>}</span>
 {(state.phase==="covering"||state.phase==="collapsing")&&<span className="v-caret-swap__block" style={{width:`${state.cover*100}%`,left:state.phase==="collapsing"?0:undefined,right:state.phase==="covering"?0:undefined}}/>}
 </span></div>;
}
