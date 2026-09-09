"use client";
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { LinearModal } from "@/registry/cojeev/ui/linear-modal";
import { ImageMasking } from "@/registry/cojeev/ui/image-masking";
import { BuyMeCoffee } from "@/registry/cojeev/ui/buy-me-coffee";
import { Swapy } from "@/registry/cojeev/ui/swapy";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";
import type { SignatureShapeName } from "@/registry/cojeev/lib/signature-shapes";
import type { ExampleProps } from "./types";

const layoutStudyImage=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500"><rect width="600" height="500" fill="#B6CAEB"/><circle cx="100" cy="80" r="120" fill="#F5D867"/><path d="M0 420Q140 210 290 360T600 230V500H0Z" fill="#9AAB63"/><circle cx="395" cy="230" r="115" fill="#F5B8DB"/><path d="M30 410Q220 95 550 440" fill="none" stroke="#111" stroke-width="3"/><path d="M10 445Q240 140 580 475" fill="none" stroke="#111" stroke-width="1.5"/></svg>`)}`;
export function MotionDrawerExample({variant}:ExampleProps){
 const [selected,setSelected]=React.useState("Overview"),id=React.useId(),[open,setOpen]=React.useState(false);
 return <div style={{display:"grid",gap:20,width:"100%"}}><MotionDrawer open={open} onOpenChange={setOpen} side={variant==="end"?"end":"start"} title="A place to begin" description="Choose a chapter, or drag the handle toward the edge to close." triggerLabel="Explore the chapters"><nav aria-label="Example chapters" style={{display:"grid",gap:12}}>{["Overview","Shapes","Motion","Principles"].map(label=><a key={label} href={`#${id}`} aria-current={selected===label?"page":undefined} onClick={()=>{setSelected(label);setOpen(false);}}>{label}</a>)}</nav></MotionDrawer><section id={id} style={{padding:24,borderRadius:20,background:"var(--v-beige)"}}><strong style={{fontFamily:"var(--font-display)",fontSize:26}}>{selected}</strong><p style={{marginBottom:0,color:"var(--v-text-2)",fontSize:14}}>The selected chapter stays here when the drawer closes.</p></section></div>;
}
export function LinearModalExample({variant}:ExampleProps){return <LinearModal title="Room for good ideas" description="A quiet place to collect, connect and continue." src={layoutStudyImage} alt="Pink sun and olive hills under a blue sky, crossed by fine ink contours" variant={variant==="compact"?"compact":"card"}><p>Some ideas arrive as fragments. Give them somewhere to land, and a small thread to follow back.</p><p>Our shapes share the same warm paper, precise ink and gentle colors as the tools around them.</p></LinearModal>;}
export function ImageMaskingExample({variant}:ExampleProps){
 const [shape,setShape]=React.useState<SignatureShapeName>("clover-soft");
 return <div style={{display:"grid",gap:20,width:"100%"}}><ImageMasking src={layoutStudyImage} alt="Pink sun, olive hills and delicate ink contours" shape={shape} method={variant==="clip"?"clip":"mask"} caption="A familiar landscape, seen through a different shape."/><div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:10}}>{(["clover-soft","daisy-12","pebble-soft"] as const).map(name=><Button key={name} size="sm" variant="secondary" aria-pressed={shape===name} onClick={()=>setShape(name)}>{name.replaceAll("-"," ")}</Button>)}</div></div>;
}
export function BuyMeCoffeeExample({variant}:ExampleProps){
 const id=`support-${React.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`,tone=variant==="pink"||variant==="olive"||variant==="blue"||variant==="yellow"?variant:"yellow";
 return <div style={{display:"grid",justifyItems:"center",gap:24,width:"100%"}}><BuyMeCoffee href={`#${id}`} tone={tone} actionLabel="Ways to support"/><section id={id} tabIndex={-1} style={{padding:20,borderRadius:18,background:"var(--v-beige)",maxWidth:420}}><strong>Good work grows through people.</strong><p style={{fontSize:14,lineHeight:1.5,marginBottom:0}}>Share useful feedback, contribute an improvement, or tell someone who would find the library helpful. This example opens support information; it does not take a payment.</p></section></div>;
}
export function SwapyExample({variant}:ExampleProps){
 const [order,setOrder]=React.useState<string[]>([]);
 const items=[{id:"collect",label:"Collect",content:<ShapeArtwork name="daisy-12" tone="pink" width={100} height={100}/>},{id:"connect",label:"Connect",content:<ShapeArtwork name="clover-soft" tone="olive" width={100} height={100}/>},{id:"continue",label:"Continue",content:<ShapeArtwork name="pebble-soft" tone="blue" width={100} height={100}/>},{id:"grow",label:"Grow",content:<ShapeArtwork name="petal-7" tone="yellow" width={100} height={100}/>}];
 return <div style={{display:"grid",gap:16,width:"100%"}}><Swapy items={items} order={order} onOrderChange={setOrder} variant={variant==="list"?"list":"grid"}/><Button variant="secondary" onClick={()=>setOrder(items.map(item=>item.id))}>Restore original order</Button></div>;
}
