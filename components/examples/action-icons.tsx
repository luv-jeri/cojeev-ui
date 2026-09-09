"use client";
import * as React from "react";
import {Icon,iconActionNames,iconActionDescriptions} from "@/registry/cojeev/ui/icon";
import {AnimatedIcon,type IconMotion} from "@/registry/cojeev/ui/animated-icon";
import {Button} from "@/registry/cojeev/ui/button";
import {Input} from "@/registry/cojeev/ui/input";
import {Label} from "@/registry/cojeev/ui/label";
import type {ExampleProps} from "./types";

const label=(name:string)=>name.split("-").map(word=>word[0].toUpperCase()+word.slice(1)).join(" ");
const pageSize=12;
const presets:IconMotion[]=["auto","tremor","draw","spin","bounce","validation","pulse","none"];
function IconExplorer({animated=false,variant="auto",size="default"}:ExampleProps&{animated?:boolean}) {
  const [query,setQuery]=React.useState("");
  const [page,setPage]=React.useState(0);
  const [selected,setSelected]=React.useState<string|null>(null);
  const [disabled,setDisabled]=React.useState(false);
  const id=React.useId();
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=iconActionNames.filter(name=>terms.every(term=>(name+" "+label(name)+" "+iconActionDescriptions[name]).toLocaleLowerCase().includes(term)));
  const pages=Math.max(1,Math.ceil(matches.length/pageSize));
  const currentPage=Math.min(page,pages-1);
  const visible=matches.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const preset=presets.includes(variant as IconMotion)?variant as IconMotion:"auto";
  const iconSize=size==="sm"||size==="lg"?size:"default";
  return <div data-icon-explorer={animated?"animated":"native"} style={{display:"grid",gap:20,minWidth:0}}>
    <p>{animated?"Hover or focus an action. Select it to replay; the loader runs until released.":"Find a symbol by its name or action. Choose one to inspect its motion."}</p>
    <div style={{display:"flex",alignItems:"end",gap:12,flexWrap:"wrap"}}>
      <div style={{display:"grid",gap:8,flex:"1 1 220px",minWidth:0}}><Label size="sm" htmlFor={id}>Find an icon</Label>
        <Input id={id} type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(0)}} placeholder="Try camera, folder, or sound"/>
      </div>
      <Button variant="ghost" disabled={!query} onClick={()=>{setQuery("");setPage(0)}}>Clear search</Button>
    </div>
    {animated&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <Button variant="secondary" onClick={()=>setSelected(null)} disabled={!selected}>Release selection</Button>
      <Button variant="ghost" aria-pressed={disabled} onClick={()=>setDisabled(value=>!value)}>{disabled?"Enable actions":"Disable actions"}</Button>
    </div>}
    <p role="status" aria-atomic="true" style={{margin:0,fontSize:13}}>{matches.length?`${currentPage*pageSize+1}–${Math.min((currentPage+1)*pageSize,matches.length)} of ${matches.length} icons`:"No matching icons. Try a different name or action."}</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(104px,1fr))",gap:12}}>{visible.map(name=><Button key={name} data-icon-option={name} variant={selected===name?"secondary":"ghost"} disabled={disabled} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,minHeight:84,height:"auto",padding:12,fontSize:12,whiteSpace:"normal"}} aria-pressed={selected===name} onClick={()=>setSelected(current=>current===name?null:name)}>
      {animated?<AnimatedIcon name={name} size={iconSize} preset={preset} active={selected===name?true:undefined}/>:<Icon name={name} size={iconSize}/>}{label(name)}
    </Button>)}</div>
    {pages>1&&<nav aria-label="Icon result pages" style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
      <Button variant="ghost" disabled={currentPage===0} onClick={()=>setPage(value=>Math.max(0,value-1))}>Previous icons</Button>
      <span style={{fontSize:13}}>Page {currentPage+1} of {pages}</span>
      <Button variant="ghost" disabled={currentPage===pages-1} onClick={()=>setPage(value=>Math.min(pages-1,value+1))}>Next icons</Button>
    </nav>}
    <output aria-live="polite" style={{minHeight:44,overflowWrap:"anywhere"}}>{disabled?"Actions disabled.":selected?<><code>{selected}</code> — {iconActionDescriptions[selected]}</>:"Select an icon for its name and motion."}</output>
  </div>;
}
export function IconExample(props:ExampleProps){return <IconExplorer {...props}/>}
export function AnimatedIconExample(props:ExampleProps){return <IconExplorer {...props} animated/>}
