"use client";
import * as React from "react";
import { useReferenceRef } from "../lib/reference-ref";
import { cn } from "../lib/utils";
import { bounded } from "../lib/reference-text-math";
import { useReferenceText,useReferenceClock,type ReferenceTextSize } from "../lib/reference-text-motion";
export type WordStreamProps=Omit<React.ComponentProps<"div">,"children">&{text:string;wordGap?:number;hold?:number;drift?:number;paused?:boolean;replayKey?:string|number;size?:ReferenceTextSize};
/** Pipe-separated phrases build word by word, drift left and run out; the final phrase stays. */
export function WordStream({text,wordGap=250,hold=900,drift=12,paused=false,replayKey=0,size="default",className,ref,...props}:WordStreamProps){
 const {host:hostRef,running}=useReferenceText(paused),gap=bounded(wordGap,100,1000,250),rest=bounded(hold,300,4000,900);
 const phrases=text.split("|").map(x=>x.trim()).filter(Boolean);
 const schedule=React.useMemo(()=>text.split("|").map(x=>x.trim()).filter(Boolean).reduce<{words:string[];start:number;end:number}[]>((items,phrase)=>{const words=phrase.split(/\s+/),start=items.at(-1)?.end??0;return [...items,{words,start,end:start+400+words.length*gap+rest}];},[]),[text,gap,rest]);
 useReferenceClock(running,time=>{
  const el=hostRef.current;if(!el)return false;el.dataset.ready="true";const final=schedule[schedule.length-1];
  el.querySelectorAll<HTMLElement>("[data-stream-phrase]").forEach((phrase,i)=>{
   const item=schedule[i],last=i===schedule.length-1,active=time>=item.start&&(last||time<item.end);phrase.style.visibility=active?"visible":"hidden";
   if(!active)return;const life=Math.min(time-item.start,item.end-item.start),enter=1-bounded(life/400,0,1,1),exit=last?0:bounded((time-item.end+240)/240,0,1,0);
   phrase.style.transform=`translateX(${enter*24-Math.min(24,bounded(drift,0,40,12)*life/1000)-exit*80}px)`;
   phrase.querySelectorAll<HTMLElement>("[data-stream-word]").forEach((word,j)=>{const p=bounded((life-150-j*gap)/200,0,1,1);word.style.opacity=String(p);word.style.filter=`blur(${(1-p)*2}px)`;});
  });
  const done=!final||time>=final.end;if(done)el.dataset.state="complete";else el.dataset.state="streaming";return !done;
 },`${replayKey}:${text}:${gap}:${rest}`);
 return <div {...props} ref={useReferenceRef(hostRef,ref)} data-slot="word-stream" data-size={size} data-running={running} className={cn("v-word-stream",className)}>
 <span className="v-word-stream__words">{phrases.join(". ")}</span>
 <div aria-hidden="true" className="v-word-stream__visual">{schedule.map((phrase,i)=><span key={i} data-stream-phrase="">{phrase.words.map((word,j)=><React.Fragment key={j}><span data-stream-word="">{word}</span>{" "}</React.Fragment>)}</span>)}</div>
 </div>;
}
