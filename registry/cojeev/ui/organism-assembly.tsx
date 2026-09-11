"use client";
import * as React from "react";
import { OrganismComposition, type OrganismCompositionProps, type OrganismKind } from "./organism-composition";
import { Button } from "./button";
import { Icon, IconButton } from "./icon";
import { organismChoices } from "../lib/assembly-geometry";
import { useChoreography } from "../motion/choreography";
import { useFlowGroup } from "../motion/use-flow";
import { cn } from "../lib/utils";
import { useMotionVisibility } from "../motion/use-motion-visibility";

export type OrganismAssemblyProps=Omit<React.ComponentProps<"div">,"onChange">&{
  value?:OrganismKind;
  defaultValue?:OrganismKind;
  onValueChange?:(value:OrganismKind)=>void;
  defaultAssembled?:boolean;
  /** Gather once when the measured studio first becomes visible. User choices take priority. */
  autoAssemble?:boolean;
  /** An optional curated subset; the default studio still exposes all six compositions. */
  compositions?:OrganismKind[];
  compositionProps?:Omit<OrganismCompositionProps,"kind"|"assembled"|"onSettledChange">;
};
/** A specimen studio. The moving parts are the native components you can use after arrival. */
export function OrganismAssembly({value,defaultValue="profile",onValueChange,defaultAssembled=false,autoAssemble=false,compositions,compositionProps,className,...props}:OrganismAssemblyProps){
  const [local,setLocal]=React.useState(defaultValue);
  const host=React.useRef<HTMLDivElement>(null),autoStarted=React.useRef(false);
  const {inView,enabled}=useMotionVisibility(host);
  const choices=compositions?.length?organismChoices.filter(choice=>compositions.includes(choice.value)):organismChoices;
  const kind=value??local,choiceKind=kind==="dashboard"?"side-panel":kind;
  const [assembled,setAssembled]=React.useState(defaultAssembled);
  const [settled,setSettled]=React.useState(defaultAssembled);
  const {quiet}=useChoreography();
  const choicesRef=useFlowGroup<HTMLDivElement>(undefined,{itemSelector:"[data-assembly-choice]",activeSelector:'[aria-pressed="true"]'});
  const timer=React.useRef<ReturnType<typeof setTimeout>|null>(null);
  const id=React.useId();
  const clear=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null}};
  React.useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  React.useEffect(()=>{if(quiet&&timer.current){clearTimeout(timer.current);timer.current=null;setAssembled(true)}},[quiet]);
  React.useEffect(()=>{
    if(!autoAssemble||autoStarted.current||!inView||!enabled||quiet)return;
    const autoTimer=setTimeout(()=>{autoStarted.current=true;setAssembled(true);if(timer.current===autoTimer)timer.current=null},550);
    timer.current=autoTimer;
    // Visibility cleanup only owns this gather, never a later visitor-triggered replay.
    return()=>{clearTimeout(autoTimer);if(timer.current===autoTimer)timer.current=null};
  },[autoAssemble,inView,enabled,quiet]);
  const choose=(next:OrganismKind)=>{autoStarted.current=true;clear();if(value===undefined)setLocal(next);onValueChange?.(next);setAssembled(true)};
  const title=organismChoices.find(choice=>choice.value===choiceKind)?.label??"Panel";
  function replay(){autoStarted.current=true;clear();setAssembled(false);timer.current=setTimeout(()=>{setAssembled(true);timer.current=null},1550)}
  function moveChoice(event:React.KeyboardEvent<HTMLDivElement>){
    const count=choices.length,index=choices.findIndex(choice=>choice.value===choiceKind);
    const next=event.key==="ArrowRight"||event.key==="ArrowDown"?(index+1)%count:event.key==="ArrowLeft"||event.key==="ArrowUp"?(index+count-1)%count:event.key==="Home"?0:event.key==="End"?count-1:-1;
    if(next<0)return;event.preventDefault();choose(choices[next].value);event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return <div {...props} ref={host} className={cn("v-organism-assembly",className)} data-slot="organism-assembly" data-phase={quiet||assembled&&settled?"usable":assembled?"assembling":"scattered"}>
    <div className="v-organism-assembly__toolbar">
      <div ref={choicesRef} className="v-organism-assembly__choices v-seg -pink" role="group" aria-label="Choose a composition" onKeyDown={moveChoice}>
        {choices.map(choice=><Button key={choice.value} data-assembly-choice={choice.value} variant={choiceKind===choice.value?"accent":"ghost"} size="sm" aria-pressed={choiceKind===choice.value} aria-controls={id} onClick={()=>choose(choice.value)}>{choice.label}</Button>)}
      </div>
      <IconButton size="sm" variant="cream" aria-label="Replay assembly" disabled={quiet} onClick={replay}><Icon name="refresh-cw"/></IconButton>
    </div>
    <OrganismComposition particleCount={144} {...compositionProps} id={id} kind={kind} assembled={assembled} onSettledChange={setSettled}/>
    <div className="v-organism-assembly__transport">
      <Button size="sm" variant={assembled?"ghost":"accent"} disabled={quiet} onClick={()=>{autoStarted.current=true;clear();setAssembled(!assembled)}}><Icon name={assembled?"layout-grid":"arrow-right"}/>{assembled?"Scatter":"Assemble"}</Button>
    </div>
    <span className="sr-only" role="status">{quiet||assembled&&settled?`${title} ready`:assembled?`Assembling ${title.toLowerCase()}`:"Ready to assemble"}</span>
  </div>;
}
