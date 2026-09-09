"use client";
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";
import { InfiniteSpiral } from "@/registry/cojeev/ui/infinite-spiral";
import { AccordionGallery } from "@/registry/cojeev/ui/accordion-gallery";
import { OptionWheel } from "@/registry/cojeev/ui/option-wheel";
import { GrainDissolve } from "@/registry/cojeev/ui/grain-dissolve";
import { WaveWipe } from "@/registry/cojeev/ui/wave-wipe";
import { DitherDissolve } from "@/registry/cojeev/ui/dither-dissolve";
import { signatureShapePaths } from "@/registry/cojeev/lib/signature-shapes";
import type { ExampleProps } from "./types";

const galleryStudies = Object.entries(signatureShapePaths).slice(0,6).map(([name,path],index)=>({
 id:name,title:["Begin","Gather","Remember","Grow","Connect","Return"][index],alt:`${name.replaceAll("-"," ")} in a printed color field`,
 description:["Every useful thing begins with a little room to explore.","Bring the pieces together and find the next useful step.","Keep the things that matter close enough to return to.","Let a small idea become a dependable daily practice.","Give related thoughts a place to meet.","Pick up the thread exactly where you left it."][index],
 src:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="${["#F5B8DB","#9AAB63","#B6CAEB","#F5D867"][index%4]}"/><path transform="translate(40 90) scale(2.2)" d="${path}" fill="#FBF4E6" stroke="#111" stroke-width=".45"/></svg>`)}`,
}));
export function InfiniteSpiralExample({variant}:ExampleProps){return <InfiniteSpiral items={galleryStudies} direction={variant==="down"?"down":"up"}/>;}
export function AccordionGalleryExample({variant}:ExampleProps){return <AccordionGallery items={galleryStudies.slice(0,4)} orientation={variant==="vertical"?"vertical":"horizontal"}/>;}
export function OptionWheelExample({variant}:ExampleProps){return <OptionWheel side={variant==="right"?"right":"left"} items={galleryStudies.map(item=>({id:item.id,label:item.title,description:item.description}))}/>;}
function GalleryScene({second}:{second:boolean}){return <div style={{minHeight:330,display:"grid",alignContent:"center",justifyItems:"center",gap:16,padding:28,background:second?"var(--v-blue)":"var(--v-pink)",color:"var(--v-on-accent)",textAlign:"center"}}><ShapeArtwork name={second?"clover-soft":"daisy-12"} tone={second?"olive":"yellow"} width={150} height={150}/><strong style={{fontFamily:"var(--font-display)",fontSize:30,lineHeight:1.15}}>{second?"A little more possibility.":"A seed of an idea."}</strong><p style={{margin:0,fontSize:14}}>{second?"One thought, taking shape.":"Begin with something small."}</p></div>;}
function TransitionStudy({kind,variant}:{kind:"grain"|"wave"|"dither";variant?:string}){
 const [active,setActive]=React.useState(false),[paused,setPaused]=React.useState(false);
 const tone=variant==="pink"||variant==="olive"||variant==="blue"||variant==="yellow"?variant:kind==="grain"?"pink":kind==="wave"?"blue":"olive";
 const Component=kind==="grain"?GrainDissolve:kind==="wave"?WaveWipe:DitherDissolve;
 return <div style={{display:"grid",gap:18,width:"100%",minWidth:0}}><Component tone={tone} active={active} paused={paused} first={<GalleryScene second={false}/>} second={<GalleryScene second/>}/><div style={{display:"flex",flexWrap:"wrap",gap:12}}><Button onClick={()=>setActive(value=>!value)} aria-pressed={active}>Change scene</Button><Button variant="secondary" onClick={()=>setPaused(value=>!value)} aria-pressed={paused}>{paused?"Enable transition":"Use still transitions"}</Button></div><p style={{margin:0,fontSize:14,color:"var(--v-text-2)"}}>Change direction during the transition. Still mode completes the selected scene immediately.</p></div>;
}
export function GrainDissolveExample({variant}:ExampleProps){return <TransitionStudy kind="grain" variant={variant}/>;}
export function WaveWipeExample({variant}:ExampleProps){return <TransitionStudy kind="wave" variant={variant}/>;}
export function DitherDissolveExample({variant}:ExampleProps){return <TransitionStudy kind="dither" variant={variant}/>;}
