"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import { ThemeToggle } from "@/registry/sahajiv/ui/theme-toggle";
import { AnimatedIcon, type IconMotion } from "@/registry/sahajiv/ui/animated-icon";
import { Button } from "@/registry/sahajiv/ui/button";
import { Card, CardTitle, CardContent } from "@/registry/sahajiv/ui/card";
import { Meta } from "@/registry/sahajiv/ui/typography";
import { MotionPresence, MotionSurface, type PresencePreset } from "@/registry/sahajiv/ui/presence";

export function PresenceExample({variant="rise"}:ExampleProps) {
  const [visible,setVisible]=React.useState(true);
  const presets:PresencePreset[]=["rise","fade","scale","slide","mask","settle","soften","focus"];
  const preset=presets.includes(variant as PresencePreset)?variant as PresencePreset:"rise";
  return <div style={{display:"grid",gap:24,minHeight:260}}>
    <Button variant="secondary" onClick={()=>setVisible(value=>!value)}>{visible?"Hide result":"Show result"}</Button>
    <MotionPresence mode="wait"><MotionSurface key={visible?"result":"empty"} preset={preset} asChild><Card variant={visible?"olive":"cream"}><CardContent><CardTitle>{visible?"Your result is ready":"A little room for what is next"}</CardTitle><p>{visible?"The same Card keeps its semantics, shape and colors while the shared boundary controls its arrival and departure.":"Show the result again to see its entrance."}</p></CardContent></Card></MotionSurface></MotionPresence>
    <div style={{minHeight:120,paddingBlock:16}}>
      <MotionPresence>{visible && <MotionSurface key="thought" asChild preset="fade" initial={{opacity:1}} animate={{opacity:1}} exit={{opacity:1,transition:{duration:0}}}><h3 aria-label="Every thought deserves a little space." style={{margin:0,font:"500 clamp(24px,4vw,38px)/1.4 var(--font-display)"}}>
        {"Every thought deserves a little space.".split(" ").map((word,index)=><React.Fragment key={index}><MotionSurface asChild preset={preset} delay={index*.045} exitDelay={index*.045}><span aria-hidden="true" style={{display:"inline-block"}}>{word}</span></MotionSurface>{" "}</React.Fragment>)}
      </h3></MotionSurface>}</MotionPresence>
    </div>
    <Meta>Words can leave in the same rhythm. Exits retain their space until the final word settles.</Meta>
  </div>;
}

export function ThemeToggleExample({size="default"}:ExampleProps) {
  const [mode,setMode]=React.useState<"light"|"dark">("light");
  return <div style={{display:"grid",gap:24,justifyItems:"start"}}>
    <ThemeToggle mode={mode} onModeChange={setMode} size={size==="sm"||size==="lg"?size:"default"}/>
    <Card style={{width:"100%",background:mode==="dark"?"var(--ink-fixed)":"var(--cream-fixed)",color:mode==="dark"?"var(--cream-fixed)":"var(--ink-fixed)"}}>
      <CardContent><CardTitle>{mode==="dark"?"A quieter evening":"Room for a bright idea"}</CardTitle><p>Selected appearance: {mode}. This preview keeps the choice local.</p></CardContent>
    </Card>
    <Meta>Use the page’s appearance switch for the full organic reveal from a different part of the screen.</Meta>
  </div>;
}

export function AnimatedIconExample({variant="auto"}:ExampleProps) {
  const [checked,setChecked]=React.useState(false);
  const [active,setActive]=React.useState(false);
  const presets:IconMotion[]=["auto","tremor","draw","spin","bounce","pulse","validation","none"];
  const preset=presets.includes(variant as IconMotion)?variant as IconMotion:"auto";
  const name=preset==="spin"?"settings":preset==="bounce"?"arrow-right":preset==="validation"?(checked?"check":"x"):"star";
  return <div style={{display:"grid",gap:24}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
      <Button variant="secondary" onClick={()=>setChecked(value=>!value)} aria-pressed={checked}><AnimatedIcon name={name} preset={preset} active={active?true:undefined}/>{checked?"Marked ready":"Mark ready"}</Button>
      <Button variant="ghost" aria-pressed={active} onClick={()=>setActive(value=>!value)}>{active?"Use hover and focus":"Keep motion active"}</Button>
    </div>
    <Meta role="status">{checked?"Ready for review.":"Waiting for review."} Hover or focus the action to see its motion.</Meta>
    <div style={{display:"flex",flexWrap:"wrap",gap:16}}><Button variant="ghost"><AnimatedIcon name="settings"/>Settings</Button><Button variant="ghost"><AnimatedIcon name="arrow-right"/>Next step</Button><Button variant="ghost"><AnimatedIcon name="check" preset="draw"/>Draw a check</Button></div>
  </div>;
}
