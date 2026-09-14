import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { ShapeMorph } from "@/registry/cojeev/ui/shape";
import { ShaderBackground } from "@/registry/cojeev/ui/shader-background";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { useMotionVisibility } from "@/registry/cojeev/motion/use-motion-visibility";
import { features } from "../features";
import "./typographic.css";

const glyphs=["c","o","j","e","e","v"];
export function TypographicDirection({onExplore,paused,mode}:{onExplore:(id?:string)=>void;paused:boolean;mode:"light"|"dark"}){
 const [active,setActive]=React.useState(1),[bloom,setBloom]=React.useState(false);
 const host=React.useRef<HTMLDivElement>(null),{enabled,inView}=useMotionVisibility(host);
 const moving=enabled&&inView&&!paused;
 React.useEffect(()=>{if(!moving)return;const timer=window.setInterval(()=>setBloom(v=>!v),1800);return ()=>window.clearInterval(timer);},[moving]);
 return <main className="type-direction" data-paused={!moving} aria-label="Cojeev, coming soon">
  <ShaderBackground className="type-background" mode={mode} paused={paused} envBasePath="/shader-environments/" original={new URLSearchParams(window.location.search).has("source-shader")}/>
  <div className="type-composition" ref={host}>
   <h1 className="type-intro" id="headline" tabIndex={-1}>One system. Every coding agent.</h1>
   <div className="type-wordmark" role="group" aria-label="Cojeev — explore what is coming">
    {glyphs.map((letter,index)=>{
     const item=features[Math.min(index,4)],isSelected=active===index;
     const artwork=<><ShapeMorph name={index===1?(bloom?"seed-wing":"pebble-soft"):item.shape} className="type-letter-shape"/>{index===1?<span className="type-o-counter"/>:<span className="type-glyph">{letter}</span>}</>;
     return <Button key={index} variant="ghost" className={`type-letter type-letter-${index} ${isSelected?"is-selected":""}`} aria-label={index===5?"Explore all Cojeev features":`Explore ${item.label}`} data-morph="off"
      onPointerEnter={event=>{if(event.pointerType!=="touch")setActive(index);}} onFocus={()=>setActive(index)} onClick={()=>{setActive(index);onExplore(index===5?undefined:item.id);}} style={{"--letter-color":`var(--v-${item.tone})`} as React.CSSProperties}>
      {index===1?<FloatLayer className="type-letter-art type-o-motion" depth={0} drift={moving?8:0} revealDistance={0} revealDuration={.3}><span className="type-o-inner">{artwork}</span></FloatLayer>:<span className="type-letter-art">{artwork}</span>}
     </Button>;
    })}
   </div>
   <div className="type-feature-index" aria-label="Five planned Cojeev features">
    {features.map((item,index)=><Button key={item.id} variant="ghost" className={`type-feature tone-${item.tone}`} data-morph="fill" data-tier="pill" data-reach="6" onPointerEnter={event=>{if(event.pointerType!=="touch")setActive(index);}} onFocus={()=>setActive(index)} onClick={()=>onExplore(item.id)} aria-haspopup="dialog"><AnimatedIcon name={item.icon} size="sm" amplitude={1.25}/><span>{item.label}</span><AnimatedIcon className="feature-index-arrow" name="arrow-up-right" size="sm"/></Button>)}
   </div>
   <p className="type-invitation">Different minds. A shared beginning.</p>
  </div>
 </main>;
}
