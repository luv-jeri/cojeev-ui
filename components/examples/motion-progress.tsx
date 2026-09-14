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
export function SliderExample({variant="default",compact}:ExampleProps){
 const [value,setValue]=React.useState([45]),[marked,setMarked]=React.useState([50]),[range,setRange]=React.useState([20,70]),[mix,setMix]=React.useState([68]);
 const appearance:SliderAppearance=variant==="line"?"line":variant==="segmented"?"segmented":"organic",gap=compact?18:28;
 if(variant==="rubber")return <SliderWrapper style={{gap}}><SliderRow><Label>Elastic tension</Label><SliderOutput>{value[0]}%</SliderOutput></SliderRow><Slider appearance="rubber" value={value} onValueChange={setValue} thumbLabel="Elastic tension"/>{!compact&&<Meta>Pull it like chewing gum: a short strand is thick; stretching it makes the middle thinner. Try Home, End or the arrow keys.</Meta>}</SliderWrapper>;
 if(variant==="range")return <SliderWrapper style={{gap}}><SliderRow><Label>Working interval</Label><SliderOutput>{range[0]}–{range[1]}</SliderOutput></SliderRow><Slider appearance="organic" value={range} onValueChange={setRange} minStepsBetweenThumbs={5} thumbLabel={i=>i===0?"Interval start":"Interval end"}/>{!compact&&<Meta>Only the thumb being adjusted responds; both values remain independently keyboard accessible.</Meta>}</SliderWrapper>;
 if(variant==="vertical")return <SliderWrapper style={{gap}}><SliderRow><Label>Voice mix</Label><SliderOutput>{mix[0]}%</SliderOutput></SliderRow><div style={{display:"flex",alignItems:"center",gap:20,minHeight:compact?164:208}}><Slider appearance="organic" orientation="vertical" value={mix} onValueChange={setMix} thumbLabel="Voice mix" style={{"--h":compact?"140px":"184px"} as React.CSSProperties}/>{!compact&&<div style={{display:"grid",gap:4}}><Meta>Foreground</Meta><Meta>Lower this for a quieter mix.</Meta></div>}</div></SliderWrapper>;
 if(variant==="segmented")return <SliderWrapper style={{gap}}><SliderRow><Label>Review cadence</Label><SliderOutput>{marked[0]}%</SliderOutput></SliderRow><Slider appearance="segmented" value={marked} onValueChange={setMarked} min={0} max={100} step={25} thumbLabel="Review cadence"/><div aria-hidden="true" style={{display:"flex",justifyContent:"space-between",marginTop:-8}}>{[0,25,50,75,100].map(mark=><Meta key={mark}>{mark}</Meta>)}</div>{!compact&&<Meta>A marked step scale for a deliberate, bounded choice.</Meta>}</SliderWrapper>;
 return <SliderWrapper style={{gap}}><SliderRow><Label>Focus duration</Label><SliderOutput>{value[0]} min</SliderOutput></SliderRow><Slider variant={variant==="pink"?"pink":"default"} appearance={appearance} value={value} onValueChange={setValue} max={90} step={5} thumbLabel="Focus duration"/>{!compact&&<Meta>Move with drag or arrow keys. The active control stretches in the direction you travel, then settles.</Meta>}</SliderWrapper>;
}
