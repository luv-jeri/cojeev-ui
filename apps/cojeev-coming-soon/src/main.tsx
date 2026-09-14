import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { ShapeMorph } from "@/registry/cojeev/ui/shape";
import { features } from "./features";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/registry/cojeev/ui/drawer";
import { getSettingsSnapshot, getServerSettingsSnapshot, subscribeSettings, setMotionMode } from "@/registry/cojeev/motion/settings";
import { ThemeToggle, applyTheme, type ThemeMode } from "@/registry/cojeev/ui/theme-toggle";
import { Countdown } from "./countdown-display";
import { TypographicDirection } from "./directions/typographic";
import "./utilities.css";
import "./styles.css";

function App() {
  const [mode,setMode]=useState<ThemeMode>(()=>document.documentElement.dataset.mode==="dark"?"dark":"light");
  const [open,setOpen]=useState(false), [feature,setFeature]=useState<string|null>(null);
  const snapshot=useSyncExternalStore(subscribeSettings,getSettingsSnapshot,getServerSettingsSnapshot);
  const paused=snapshot.motion.mode==="off";
  const trigger=useRef<HTMLButtonElement>(null), touch=useRef<{x:number;y:number}|null>(null), openedAt=useRef(0);
  const lastFocus=useRef<HTMLElement|null>(null);
  const openFooter=()=>{setFeature(null);setOpen(true);};
  const explore=(id?:string)=>{setFeature(id&&features.some(f=>f.id===id)?id:null);lastFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setOpen(true);};
  // Wheel, keyboard and touch expose the same drawer; the scene never scrolls.
  useEffect(() => {
    if (open) openedAt.current = performance.now();
    let accumulated = 0, lastWheel = 0;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const tray = event.target instanceof Element ? event.target.closest<HTMLElement>(".tray-scroll") : null;
      if (open) {
        if (performance.now() - openedAt.current < 800) return;
        if (event.deltaY < -35 && (!tray || tray.scrollTop === 0)) setOpen(false);
        return;
      }
      if (performance.now() - lastWheel > 220) accumulated = 0;
      lastWheel = performance.now(); accumulated += Math.max(0, event.deltaY);
      if (accumulated > 55) openFooter();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (open || event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement).closest("button,a,input,textarea,select,[role=tab]")) return;
      if (["ArrowDown", "PageDown", "End", " "].includes(event.key)) { event.preventDefault(); openFooter(); }
    };
    window.addEventListener("wheel", wheel, { passive: true }); window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("wheel", wheel); window.removeEventListener("keydown", keyboard); };
  }, [open]);


  return <Drawer open={open} onOpenChange={value=>value?openFooter():setOpen(false)}>
    <div className="cojeev-page" data-paused={paused} data-footer-open={open} data-direction="type"
      onTouchStart={event=>{const p=event.touches[0];touch.current={x:p.clientX,y:p.clientY};}}
      onTouchEnd={event=>{const p=event.changedTouches[0],start=touch.current;touch.current=null;if(start&&start.y-p.clientY>55&&Math.abs(start.x-p.clientX)<100)openFooter();}}>
      <a className="skip-link" href="#headline">Skip to content</a>
      <header className="site-header"><a className="wordmark" href="/" aria-label="Cojeev home">cojeev<span className="wordmark-period">.</span></a><div className="launch-clock"><span className="launch-label">Coming soon</span><Countdown/></div></header>
      <TypographicDirection onExplore={explore} paused={paused||open} mode={mode}/>
      <div className="scene-bottom">
        <span className="bottom-note">Made for the way you think.</span>
        <DrawerTrigger asChild><Button ref={trigger} className="footer-peek" variant="accent" data-morph="fill" data-tier="pill" data-reach="7" data-inside="3" style={{"--mfill":"var(--v-ink)"} as React.CSSProperties}><span>What’s taking shape</span><AnimatedIcon name="arrow-down" size="sm" amplitude={1.5}/></Button></DrawerTrigger>
        <div className="scene-controls"><ThemeToggle mode={mode} responsive onModeChange={(next,details)=>{setMode(next);applyTheme(next,paused,undefined,{origin:details?.origin});try{localStorage.setItem("cojeev-coming-soon-theme",next);}catch{}document.querySelector("meta[name=theme-color]")?.setAttribute("content",next==="dark"?"#15171A":"#FBF4E6");}}/><Button variant="ghost" className="motion-toggle" onClick={()=>setMotionMode(paused?"subtle":"off")} aria-label={paused?"Resume motion":"Pause motion"} aria-pressed={paused}><AnimatedIcon name={paused?"play":"pause"} size="sm"/></Button></div>
      </div>
    </div>
    <DrawerContent className="future-tray" data-paused={paused} data-flow="jelly"
      onOpenAutoFocus={event=>{event.preventDefault();requestAnimationFrame(()=>{const tray=document.querySelector<HTMLElement>(".tray-scroll");const selected=feature?document.getElementById(`future-${feature}`):null;(selected??tray)?.focus({preventScroll:true});if(selected&&tray){const item=selected.getBoundingClientRect(),view=tray.getBoundingClientRect();tray.scrollTop+=item.top-view.top-(tray.clientHeight-item.height)/2;}});}}
      onCloseAutoFocus={event=>{event.preventDefault();const element=lastFocus.current;lastFocus.current=null;(element?.isConnected&&element.closest("button,a")?element:trigger.current)?.focus({preventScroll:true});}}
      onTouchStart={event=>{const p=event.touches[0];touch.current={x:p.clientX,y:p.clientY};}}
      onTouchEnd={event=>{const p=event.changedTouches[0],start=touch.current;touch.current=null;if(start&&p.clientY-start.y>65&&(event.currentTarget.querySelector(".tray-scroll")?.scrollTop??0)===0)setOpen(false);}}>
      <div className="tray-paint" aria-hidden="true"><ShapeMorph className="tray-crown" name="cloud-3" preserveAspectRatio="none"/><div className="tray-base"/></div>
      <DrawerClose asChild><Button variant="ghost" className="tray-close" aria-label="Close features"><AnimatedIcon name="x" size="sm" preset="tremor"/></Button></DrawerClose>
      <div className="tray-scroll" tabIndex={-1}>
       <DrawerHeader className="tray-heading"><div><DrawerTitle>Many parts. One Cojeev.</DrawerTitle><DrawerDescription>Five ways your AI starts working together.</DrawerDescription></div></DrawerHeader>
       <div className="feature-collection">
        {features.map(item=><article key={item.id} id={`future-${item.id}`} className={`feature-detail tone-${item.tone}`} aria-label={item.label} data-selected={feature===item.id} tabIndex={-1}>
         <div className="feature-detail-title"><ShapeMorph name={item.shape}/><h2>{item.label}</h2></div><p>{item.copy}</p>
        </article>)}
       </div>
      <footer className="tray-footer"><span>© {new Date().getFullYear()} Cojeev</span><span>And more in the making.</span><Button variant="ghost" className="tray-motion" onClick={()=>setMotionMode(paused?"subtle":"off")}><AnimatedIcon name={paused?"play":"pause"} size="sm"/>{paused?"Resume motion":"Pause motion"}</Button></footer>
      </div>
    </DrawerContent>
  </Drawer>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
