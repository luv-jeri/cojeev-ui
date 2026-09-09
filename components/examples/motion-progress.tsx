"use client";
import * as React from "react";
import type {ExampleProps} from "./types";
import {Progress,type ProgressAppearance} from "@/registry/cojeev/ui/progress";
import {Slider,SliderWrapper,SliderRow,SliderOutput,type SliderAppearance} from "@/registry/cojeev/ui/slider";
import {Button} from "@/registry/cojeev/ui/button";
import {Label} from "@/registry/cojeev/ui/label";
import {Meta} from "@/registry/cojeev/ui/typography";
const appearances:ProgressAppearance[]=["organic","line","segmented","orbit"];
export function ProgressExample({variant="default",size="default"}:ExampleProps){
 const [value,setValue]=React.useState(45),unavailable=variant==="unavail",appearance=appearances.includes(variant as ProgressAppearance)?variant as ProgressAppearance:"organic";
 const color=variant==="cream"?"cream":unavailable?"unavail":"default";
 return <div style={{display:"grid",gap:24,width:"100%",minWidth:0}}>
  <Progress value={unavailable?null:value} variant={color} appearance={appearance} size={size==="sm"||size==="lg"?size:"default"} aria-label="Example progress"/>
  <Meta role="status">{unavailable?"Progress unavailable":`${value}% complete`}</Meta>
  <div style={{display:"flex",flexWrap:"wrap",gap:8}}><Button size="sm" variant="secondary" disabled={value===0||unavailable} onClick={()=>setValue(v=>Math.max(0,v-10))}>Decrease</Button><Button size="sm" disabled={value===100||unavailable} onClick={()=>setValue(v=>Math.min(100,v+10))}>Increase</Button><Button size="sm" variant="ghost" disabled={unavailable} onClick={()=>setValue(v=>v===100?0:100)}>{value===100?"Reset":"Complete"}</Button></div>
  {!unavailable&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:28,alignItems:"center"}}>{appearances.map((kind,index)=><div key={kind} style={{display:"grid",gap:14,justifyItems:kind==="orbit"?"center":"stretch"}}><Meta>{kind.charAt(0).toUpperCase()+kind.slice(1)}</Meta><Progress appearance={kind} value={value} aria-label={`${kind} comparison`} style={{"--c":["var(--v-pink)","var(--v-blue)","var(--v-olive)","var(--v-yellow)"][index]} as React.CSSProperties}/></div>)}</div>}
 </div>;
}
export function SliderExample({variant="default"}:ExampleProps){
 const [value,setValue]=React.useState([45]),[range,setRange]=React.useState([20,70]);
 const appearance:SliderAppearance=variant==="line"||variant==="segmented"?variant:"organic";
 return <div style={{display:"grid",gap:36,width:"100%",minWidth:0}}><SliderWrapper><SliderRow><Label>Focus duration</Label><SliderOutput>{value[0]} min</SliderOutput></SliderRow><Slider variant={variant==="pink"?"pink":"default"} appearance={appearance} value={value} onValueChange={setValue} max={90} step={5} thumbLabel="Focus duration"/><Meta>Drag or use the arrow keys. The contour settles when the value does.</Meta></SliderWrapper><SliderWrapper><SliderRow><Label>Working range</Label><SliderOutput>{range[0]}–{range[1]}</SliderOutput></SliderRow><Slider appearance={appearance} value={range} onValueChange={setRange} minStepsBetweenThumbs={1} thumbLabel={i=>i===0?"Range start":"Range end"}/><Meta>Each thumb keeps its own keyboard position and accessible value.</Meta></SliderWrapper></div>;
}
