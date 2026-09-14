import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { ShapeMorph, type SignatureShapeName } from "@/registry/cojeev/ui/shape";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { useMotionVisibility } from "@/registry/cojeev/motion/use-motion-visibility";
import "./specimen.css";
const possibilities: {id:string;name:SignatureShapeName;other:SignatureShapeName;color:string;line:string}[] = [
 {id:"memory",name:"clover-soft",other:"seed-wing",color:"var(--v-pink)",line:"A memory you share."},
 {id:"harnesses",name:"cushion",other:"pebble-soft",color:"var(--v-blue)",line:"Every agent. Connected."},
 {id:"hooks",name:"petal-7",other:"aster-9",color:"var(--v-olive)",line:"Your prompt. Your rules."},
 {id:"identity",name:"pebble-soft",other:"cloud-3",color:"var(--v-yellow)",line:"One identity. Everywhere."},
 {id:"subagents",name:"seed-wing",other:"clover-soft",color:"var(--v-pink)",line:"The right mind for the task."},
];
export function SpecimenDirection({onExplore,paused}:{onExplore:(id?:string)=>void;paused:boolean}){
 const [index,setIndex]=useState(0),[touched,setTouched]=useState(false),[near,setNear]=useState(false),[breath,setBreath]=useState(false);
 const host=useRef<HTMLDivElement>(null),{enabled,inView}=useMotionVisibility(host),item=possibilities[index];
 useEffect(()=>{if(paused||!enabled||!inView||near)return;const tick=window.setInterval(()=>setBreath(v=>!v),4400);return ()=>window.clearInterval(tick);},[paused,enabled,inView,near]);
 const shape=near?item.other:breath?item.other:item.name;
 return <main className="specimen-direction" aria-label="Cojeev, coming together">
  <h1 className="specimen-title" id="headline" tabIndex={-1}>Coming<br/><span>together.</span></h1>
  <div className="specimen-object" ref={host} style={{"--specimen-color":item.color} as React.CSSProperties}>
   <div className="specimen-offset" aria-hidden="true"><ShapeMorph name={shape}/></div>
   <Button variant="ghost" className="specimen-touch" aria-label="Nudge the shape to discover Cojeev" aria-describedby="specimen-caption" onPointerEnter={()=>setNear(true)} onPointerLeave={()=>setNear(false)} onFocus={()=>setNear(true)} onBlur={()=>setNear(false)} onClick={()=>{setTouched(true);setIndex(v=>touched?(v+1)%possibilities.length:v);}}>
    <ShapeMorph className="specimen-contour" name={shape}/><span className="specimen-ampersand" aria-hidden="true">&amp;</span>
    <span className="specimen-stamp" aria-hidden="true"><ShapeMorph name="sunburst-24"/><span>better<br/>together</span></span>
   </Button>
  </div>
  <div className="specimen-caption" id="specimen-caption"><span className="specimen-invitation">{touched?"Keep exploring":"Give it a nudge"}</span><Button variant="ghost" className="specimen-discovery" onClick={()=>onExplore(item.id)}><span aria-live="polite">{touched?item.line:"AI, with a shared heartbeat."}</span><AnimatedIcon name="arrow-up-right" size="sm" amplitude={1.5}/></Button></div>
 </main>;
}
