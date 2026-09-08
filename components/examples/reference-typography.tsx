"use client";
import * as React from "react";
import { Button } from "@/registry/sahajiv/ui/button";
import { TextRibbon } from "@/registry/sahajiv/ui/text-ribbon";
import { TextReveal } from "@/registry/sahajiv/ui/text-reveal";
import { TypographyVortex } from "@/registry/sahajiv/ui/typography-vortex";
import { ParticleText } from "@/registry/sahajiv/ui/particle-text";
import { WarpText } from "@/registry/sahajiv/ui/warp-text";
import { VariableProximity } from "@/registry/sahajiv/ui/variable-proximity";
import { FallingText } from "@/registry/sahajiv/ui/falling-text";
import { ScrollReveal } from "@/registry/sahajiv/ui/scroll-reveal";
import { WordStream } from "@/registry/sahajiv/ui/word-stream";
import { CaretSwap } from "@/registry/sahajiv/ui/caret-swap";
import { ZoomWords } from "@/registry/sahajiv/ui/zoom-words";
import type { ReferenceTextSize } from "@/registry/sahajiv/lib/reference-text-motion";
type Options={variant?:string;size?:string};
const stageSize=(size?:string):ReferenceTextSize=>size==="sm"||size==="lg"?size:"default";
function Playback({children,hint="",replayable=true}:{children:(paused:boolean,replay:number)=>React.ReactNode;hint?:string;replayable?:boolean}){
 const [paused,setPaused]=React.useState(false),[replay,setReplay]=React.useState(0);
 return <div style={{width:"100%",display:"grid",gap:16,minWidth:0}}>{children(paused,replay)}<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><Button size="sm" variant="outline" aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?"Resume motion":"Pause motion"}</Button>{replayable&&<Button size="sm" variant="ghost" onClick={()=>{setReplay(n=>n+1);setPaused(false);}}>Replay</Button>}{hint&&<span style={{fontSize:13,color:"var(--v-text-2)"}}>{hint}</span>}</div></div>;
}
export function TypographyVortexExample({variant,size}:Options){
 const [pulse,setPulse]=React.useState(0);
 return <Playback hint="Move across the rings to scatter ink.">{(paused,replay)=><div style={{display:"grid",gap:12}}><TypographyVortex key={replay} text="Ideas find their orbit" rings={variant==="focused"?4:8} size={stageSize(size)} paused={paused} pulse={pulse}/><Button size="sm" variant="secondary" onClick={()=>setPulse(n=>n+1)}>Gather rings</Button></div>}</Playback>;
}
export function ParticleTextExample({variant,size}:Options){return <Playback hint="Move over the letters; particles return to their word.">{(paused,replay)=><ParticleText text="Made of ideas" density={variant==="fine"?3:5} particleSize={variant==="fine"?1:1.7} size={stageSize(size)} paused={paused} replayKey={replay}/>}</Playback>;}
export function WarpTextExample({variant,size}:Options){return <Playback>{(paused,replay)=><WarpText key={replay} text="A little less rigid." strength={variant==="gentle"?7:20} size={stageSize(size)} paused={paused}/>}</Playback>;}
export function VariableProximityExample({variant,size}:Options){return <Playback replayable={false} hint="Move across the letters to change their weight.">{paused=><VariableProximity text={variant==="pressure"?"Give ideas room":"Closer feels different"} variant={variant==="pressure"?"pressure":"weight"} size={stageSize(size)} paused={paused}/>}</Playback>;}
export function TextPressureExample({size}:Options){return <VariableProximityExample variant="pressure" size={size}/>;}
export function FallingTextExample({variant,size}:Options){return <Playback hint="Word bodies fall, collide and settle inside the page.">{(paused,replay)=><FallingText text="Let the rigid ways of working fall away." gravity={variant==="gentle"?500:1200} size={stageSize(size)} paused={paused} replayKey={replay}/>}</Playback>;}
export function ScrollRevealExample({variant,size}:Options){
 const [progress,setProgress]=React.useState(.55),scroll=React.useRef<HTMLDivElement>(null),id=React.useId();
 return <Playback replayable={false} hint={variant==="controlled"?"Drag the progress control.":"Scroll inside this story to bring the words into focus."}>{paused=><>{variant==="controlled"?<><ScrollReveal text="Make room for meaningful work. Let the small things find their place." progress={progress} paused={paused} size={stageSize(size)}/><label htmlFor={id}>Reveal progress · {Math.round(progress*100)}%</label><input id={id} type="range" min="0" max="100" value={Math.round(progress*100)} onChange={e=>setProgress(Number(e.target.value)/100)}/></>:<div ref={scroll} tabIndex={0} aria-label="Scrollable story preview" style={{height:320,overflowY:"auto",borderRadius:24}}><div style={{height:160,display:"grid",placeItems:"center",fontSize:14}}>A thought, coming into focus ↓</div><ScrollReveal text="Make room for meaningful work. Let the small things find their place." scrollTarget={scroll} paused={paused} size={stageSize(size)}/><div style={{height:280}}/></div>}</>}</Playback>;
}
export function WordStreamExample({variant,size}:Options){return <Playback>{(paused,replay)=><WordStream text="One clear thought | room to explore | work that feels yours" drift={variant==="calm"?3:12} wordGap={variant==="calm"?400:250} size={stageSize(size)} paused={paused} replayKey={replay}/>}</Playback>;}
export function CaretSwapExample({variant,size}:Options){return <Playback>{(paused,replay)=><CaretSwap fromText="Another open tab?" toText={variant==="memory"?"A place to remember.":"A little room to think."} size={stageSize(size)} paused={paused} replayKey={replay}/>}</Playback>;}
export function ZoomWordsExample({variant,size}:Options){return <Playback>{(paused,replay)=><ZoomWords text="Small steps make room" zoom={variant==="wide"?1.15:1.7} size={stageSize(size)} paused={paused} replayKey={replay}/>}</Playback>;}
// Reference-facing previews for mechanisms already shipped. No duplicate registry components.
export function TextLoopExample({variant}:Options){return <Playback replayable={false}>{paused=><TextRibbon text="Warm paper · Living contours" shape={variant==="wave"?"wave":"loop"} tone="pink" auto paused={paused} guide/>}</Playback>;}
export function CircularTextExample(){return <Playback replayable={false}>{paused=><TextRibbon text="Made with room to grow" shape="circle" tone="olive" auto paused={paused} hoverBehavior="slow"/>}</Playback>;}
export function CurvedLoopExample(){return <Playback replayable={false} hint="Drag, or use arrow keys. Home returns to the start.">{paused=><TextRibbon text="Tools with a human rhythm" shape="arch" auto paused={paused} draggable guide={false}/>}</Playback>;}
export function SplitTextExample({variant}:Options){return <Playback>{(paused,replay)=><div style={{fontFamily:"var(--font-display)",fontSize:"clamp(2rem,5vw,3.5rem)",padding:24}}><TextReveal text="Good work begins with room to think." split={variant==="words"?"word":"grapheme"} variant="rise" duration={paused?0:650} replayKey={replay}/></div>}</Playback>;}
