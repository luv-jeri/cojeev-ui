"use client";
import * as React from "react";
import {GlassSculpture,type SculptureStudio,type SculptureRendererState} from "@/registry/cojeev/ui/glass-sculpture";
import {FlowSculpture} from "@/registry/cojeev/ui/flow-sculpture";
import {ParticleSculpture} from "@/registry/cojeev/ui/particle-sculpture";
import {SculptureOrbit} from "@/registry/cojeev/ui/sculpture-orbit";
import {loadSculptureFile,type SculptureGeometryInput,type GlyphForm,type GlyphTone} from "@/registry/cojeev/ui/glyph-sculpture";
import {Button} from "@/registry/cojeev/ui/button";
import {Card} from "@/registry/cojeev/ui/card";
import {Icon} from "@/registry/cojeev/ui/icon";
import {Input} from "@/registry/cojeev/ui/input";
import {Label} from "@/registry/cojeev/ui/label";
import {NativeSelect,NativeSelectOption} from "@/registry/cojeev/ui/native-select";
import {Slider,SliderOutput} from "@/registry/cojeev/ui/slider";
import {Switch} from "@/registry/cojeev/ui/switch";
import {SectionTitle,BodySecondary,Meta} from "@/registry/cojeev/ui/typography";
import type {ExampleProps} from "./types";

function MaterialNumber({label,value,onChange,min,max,step=.05,disabled=false}:{label:string;value:number;onChange:(value:number)=>void;min:number;max:number;step?:number;disabled?:boolean}){
 const id=React.useId();return <div style={{display:"grid",gap:9,minWidth:0}}><Label as="span" id={id}>{label}</Label><div style={{display:"flex",alignItems:"center",gap:12}}><Slider min={min} max={max} step={step} disabled={disabled} value={[value]} onValueChange={next=>onChange(next[0]??value)} aria-labelledby={id} style={{width:112}}/><SliderOutput style={{minWidth:"5ch"}}>{Number(value.toFixed(2))}</SliderOutput></div></div>;
}
function MaterialStudio({kind,variant="default"}:{kind:"glass"|"flow"|"particle";variant?:string}){
 const id=React.useId(),[surface,setSurface]=React.useState<HTMLDivElement|null>(null),[active,setActive]=React.useState(false);
 // The public element exposes activity, so copied examples do not need private motion hooks.
 React.useEffect(()=>{if(!surface)return;const read=()=>setActive(surface.dataset.moving==="true");read();const observer=new MutationObserver(read);observer.observe(surface,{attributes:true,attributeFilter:["data-moving"]});return()=>observer.disconnect();},[surface]);
 const [form,setForm]=React.useState<GlyphForm>("bloom"),[tone,setTone]=React.useState<GlyphTone>(kind==="particle"?"moss":"sky"),[paused,setPaused]=React.useState(false),[tracking,setTracking]=React.useState(kind!=="glass"),[pulse,setPulse]=React.useState(0),[renderer,setRenderer]=React.useState<SculptureRendererState>("pending");
 const [studio,setStudio]=React.useState<SculptureStudio>(variant==="petals"||variant==="tiles"?variant:"ribbons"),[refraction,setRefraction]=React.useState(1.45),[frost,setFrost]=React.useState(variant==="frosted"?.48:.08),[thickness,setThickness]=React.useState(1.2),[dispersion,setDispersion]=React.useState(.55);
 const [distortion,setDistortion]=React.useState(variant==="soft"?.65:variant==="prismatic"?1.5:1),[chromatic,setChromatic]=React.useState(variant==="soft"?0:variant==="prismatic"?.9:.5),[spread,setSpread]=React.useState(.14),[settle,setSettle]=React.useState(1),[swirl,setSwirl]=React.useState(.35);
 const [count,setCount]=React.useState(variant==="fine"?2200:variant==="dense"?6400:3600),[size,setSize]=React.useState(variant==="fine"?1.5:2.3),[strength,setStrength]=React.useState(1),[radius,setRadius]=React.useState(.4),[spring,setSpring]=React.useState(1),[damping,setDamping]=React.useState(1);
 const [geometry,setGeometry]=React.useState<SculptureGeometryInput>(),[name,setName]=React.useState(""),[error,setError]=React.useState(""),[loading,setLoading]=React.useState(false),job=React.useRef<AbortController|null>(null);
 React.useEffect(()=>()=>job.current?.abort(),[]);
 async function importFile(file:File){job.current?.abort();const current=new AbortController();job.current=current;setLoading(true);setError("");try{const value=await loadSculptureFile(file,{signal:current.signal});if(!current.signal.aborted){setGeometry(value);setName(file.name);}}catch(error){if(!current.signal.aborted)setError(error instanceof Error?error.message:"The shape could not be read.");}finally{if(!current.signal.aborted)setLoading(false);}}
 function clear(){job.current?.abort();job.current=null;setGeometry(undefined);setName("");setError("");setLoading(false);}
 const title=kind==="glass"?"Light, held in a shape.":kind==="flow"?"A little current. A living surface.":"Every point remembers home.";
 const description=kind==="glass"?"A translucent sculpture bends an original studio pattern. Turn it, soften it, change the light.":kind==="flow"?"Sweep across the sculpture to stir a flowing lens. The current stretches color, then quietly settles.":"Move through the points and let them wander. Their tiny springs gently rebuild the original surface.";
 return <div style={{display:"grid",gap:24,width:"100%",minWidth:0}}>
  <Card style={{display:"grid",gap:16,padding:"clamp(18px,4vw,30px)"}}><div style={{display:"grid",gap:9,maxWidth:550}}><SectionTitle as="h3" style={{margin:0}}>{title}</SectionTitle><BodySecondary style={{margin:0}}>{description}</BodySecondary></div>
   <SculptureOrbit label="Material sculpture">{view=>{const common={ref:setSurface,form,tone,geometry,turn:view.turn,pitch:view.pitch,zoom:view.zoom,paused:paused||view.interacting,pointerTracking:tracking,onRendererChange:setRenderer};return kind==="glass"?<GlassSculpture {...common} studio={studio} refraction={refraction} frost={frost} thickness={thickness} dispersion={dispersion}/>:kind==="flow"?<FlowSculpture {...common} distortion={distortion} chromatic={chromatic} spread={spread} settle={settle} swirl={swirl} pulse={pulse}/>:<ParticleSculpture {...common} count={count} size={size} strength={strength} radius={radius} spring={spring} damping={damping} swirl={swirl} pulse={pulse}/>;}}</SculptureOrbit>
  </Card>
  <div style={{display:"flex",flexWrap:"wrap",gap:20,alignItems:"end"}}>
   <div style={{display:"grid",gap:8}}><Label htmlFor={`${id}-form`}>Form</Label><NativeSelect id={`${id}-form`} value={form} disabled={!!geometry} onChange={e=>setForm(e.target.value as GlyphForm)}><NativeSelectOption value="bloom">Bloom</NativeSelectOption><NativeSelectOption value="seed">Seed</NativeSelectOption><NativeSelectOption value="pebble">Pebble</NativeSelectOption></NativeSelect></div>
   <div style={{display:"grid",gap:8}}><Label htmlFor={`${id}-tone`}>Color</Label><NativeSelect id={`${id}-tone`} value={tone} onChange={e=>setTone(e.target.value as GlyphTone)}><NativeSelectOption value="sky">Sky</NativeSelectOption><NativeSelectOption value="rose">Rose</NativeSelectOption><NativeSelectOption value="moss">Moss</NativeSelectOption><NativeSelectOption value="ink">Ink</NativeSelectOption></NativeSelect></div>
   {kind==="glass"&&<div style={{display:"grid",gap:8}}><Label htmlFor={`${id}-studio`}>Studio backdrop</Label><NativeSelect id={`${id}-studio`} value={studio} onChange={e=>setStudio(e.target.value as SculptureStudio)}><NativeSelectOption value="ribbons">Ribbons</NativeSelectOption><NativeSelectOption value="petals">Petals</NativeSelectOption><NativeSelectOption value="tiles">Tiles</NativeSelectOption></NativeSelect></div>}
   <Button size="sm" variant="secondary" onClick={()=>setPaused(p=>!p)} aria-pressed={paused}>{paused?"Resume material":"Pause material"}</Button>
   {kind!=="glass"&&<Button size="sm" disabled={!active||paused||renderer!=="webgl"} onClick={()=>setPulse(value=>value+1)}><Icon name={kind==="flow"?"refresh":"sparkles"}/>{kind==="flow"?"Stir the surface":"Scatter and return"}</Button>}
  </div>
  <div style={{display:"flex",flexWrap:"wrap",gap:"24px 32px"}}>
   {kind==="glass"?<><MaterialNumber label="Refraction" value={refraction} onChange={setRefraction} min={1} max={2.2}/><MaterialNumber label="Frost" value={frost} onChange={setFrost} min={0} max={.8}/><MaterialNumber label="Thickness" value={thickness} onChange={setThickness} min={.1} max={3}/><MaterialNumber label="Dispersion" value={dispersion} onChange={setDispersion} min={0} max={2}/></>:kind==="flow"?<><MaterialNumber label="Distortion" value={distortion} onChange={setDistortion} min={0} max={2}/><MaterialNumber label="Color split" value={chromatic} onChange={setChromatic} min={0} max={1}/><MaterialNumber label="Stir radius" value={spread} onChange={setSpread} min={.035} max={.3} step={.015}/><MaterialNumber label="Settle speed" value={settle} onChange={setSettle} min={.25} max={3}/><MaterialNumber label="Swirl" value={swirl} onChange={setSwirl} min={0} max={1}/></>:<><MaterialNumber label="Point count" value={count} onChange={setCount} min={300} max={8000} step={100}/><MaterialNumber label="Point size" value={size} onChange={setSize} min={1} max={6} step={.1}/><MaterialNumber label="Push strength" value={strength} onChange={setStrength} min={0} max={2}/><MaterialNumber label="Push radius" value={radius} onChange={setRadius} min={.1} max={.8}/><MaterialNumber label="Spring" value={spring} onChange={setSpring} min={.25} max={3}/><MaterialNumber label="Damping" value={damping} onChange={setDamping} min={.25} max={2}/></>}
  </div>
  <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:12}}><Switch id={`${id}-pointer`} checked={tracking} onCheckedChange={setTracking}/><Label htmlFor={`${id}-pointer`}>{kind==="glass"?"Follow pointer":"Respond to pointer"}</Label>{!active&&renderer==="webgl"&&<Meta>Motion is resting. View and material settings remain available.</Meta>}</div>
  <div style={{display:"grid",gap:10,minWidth:0,borderTop:"1px solid var(--v-border)",paddingTop:20}}><Label htmlFor={`${id}-file`}>Try your own shape</Label><Input id={`${id}-file`} type="file" accept=".glb,.svg,.png,.jpg,.jpeg" aria-describedby={`${id}-file-help`} onChange={e=>{const file=e.target.files?.[0];if(file)void importFile(file);e.currentTarget.value="";}} style={{maxWidth:440,height:"auto",padding:12,cursor:"pointer"}}/>
   <Meta id={`${id}-file-help`}>Local files only: a self-contained GLB, filled SVG, PNG or JPEG. Up to 8 MiB and four million image pixels. The material uses the shape; original textures are replaced.</Meta><div role="status" aria-live="polite" style={{minHeight:20,overflowWrap:"anywhere"}}><Meta>{loading?"Reading the local shape…":error?`${error} The current sculpture is unchanged.`:name?`Showing ${name}`:""}</Meta></div>{(geometry||loading)&&<Button size="sm" variant="ghost" onClick={clear} style={{justifySelf:"start"}}>{loading?"Cancel import":"Return to built-in forms"}</Button>}
  </div>
 </div>;
}
export function GlassSculptureExample({variant="default"}:ExampleProps){return <MaterialStudio key={`glass:${variant}`} kind="glass" variant={variant}/>;}
export function FlowSculptureExample({variant="default"}:ExampleProps){return <MaterialStudio key={`flow:${variant}`} kind="flow" variant={variant}/>;}
export function ParticleSculptureExample({variant="default"}:ExampleProps){return <MaterialStudio key={`particle:${variant}`} kind="particle" variant={variant}/>;}
