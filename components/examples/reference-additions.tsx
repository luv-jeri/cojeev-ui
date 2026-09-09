"use client";
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { PortalField } from "@/registry/cojeev/ui/portal-field";
import { ArticleHeadings } from "@/registry/cojeev/ui/article-headings";
type Options={variant?:string;size?:string};
const safeSize=(size?:string)=>size==="sm"||size==="lg"?size:"default";
export function PortalFieldExample({variant,size}:Options){
 const [paused,setPaused]=React.useState(false);
 return <div style={{width:"100%",display:"grid",gap:16}}><PortalField tone={variant==="warm"||variant==="cool"?variant:"balanced"} size={safeSize(size)} paused={paused}><div style={{textAlign:"center",maxWidth:340}}><p style={{fontSize:12,color:"var(--v-text-2)",margin:"0 0 12px"}}>Room for what comes next</p><p style={{fontFamily:"var(--font-display)",fontSize:"clamp(2rem,5vw,3.5rem)",lineHeight:1.08,margin:0}}>An open possibility.</p></div></PortalField><div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}><Button size="sm" variant="outline" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?"Resume motion":"Pause motion"}</Button><span style={{fontSize:13,color:"var(--v-text-2)"}}>Move across the halo. The page keeps its own rhythm.</span></div></div>;
}
export function ArticleHeadingsExample({variant,size}:Options){
 const [paused,setPaused]=React.useState(false),[replay,setReplay]=React.useState(0);
 const items=[{id:"context",title:"Ideas need a place to return to",meta:"Product notes · 6 min read"},{id:"finish",title:"Small promises, carefully kept",meta:"Field guide · 8 min read"}];
 return <div style={{width:"100%",display:"grid",gap:16}}><ArticleHeadings items={items} size={safeSize(size)} duration={variant==="deliberate"?1200:650} stagger={variant==="deliberate"?220:140} scrambleLength={variant==="deliberate"?7:12} tailChance={variant==="deliberate"?.06:.16} paused={paused} replayKey={replay}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button size="sm" variant="outline" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?"Allow motion":"Keep headings still"}</Button><Button size="sm" variant="ghost" onClick={()=>{setPaused(false);setReplay(value=>value+1);}}>Replay decode</Button></div></div>;
}
