import * as React from "react";
import {createRoot} from "react-dom/client";
import {PromptBond} from "./prompt-bond";
import {Button} from "@/registry/cojeev/ui/button";
import {AnimatedIcon} from "@/registry/cojeev/ui/animated-icon";
import {ShaderBackground} from "@/registry/cojeev/ui/shader-background";
import {ThemeToggle,applyTheme,type ThemeMode} from "@/registry/cojeev/ui/theme-toggle";
import {useMotionVisibility} from "@/registry/cojeev/motion/use-motion-visibility";
import {Drawer,DrawerTrigger,DrawerContent,DrawerTitle,DrawerDescription,DrawerClose} from "@/registry/cojeev/ui/drawer";
import {Countdown} from "./countdown-display";
import "./utilities.css";
import "./styles.css";
import "./bond-demo.css";

/** What is coming: five capabilities, each with a glyph in its own colour. */
const details:[string,string,string,string][]=[
 ['brain','Shared memory','Team context and decisions, remembered across sessions.','memory'],
 ['workflow','Prompt lifecycle','Hooks and prompt injection before, during and after a response.','lifecycle'],
 ['users','Agents, together','Subagents, the right models, and a board where agents coordinate.','agents'],
 ['sparkles','A little proactive','Useful patterns suggested as skills or automations.','proactive'],
 ['user','Your character','A personality you can shape, across different harnesses and models.','character'],
];

/** The page's scale: 1 at 1440 × 900, up to 1.8 on a large screen, 1 on phones (they are tuned by hand in CSS). It is set on the root
 * element before the first render, so the story measures its layout against the scaled field, and the tray, which the drawer portals
 * outside the shell, scales too; a window resize refreshes it (the story re-measures on its own when the stage changes size). */
const fitUi=()=>{const ui=innerWidth<=700?1:Math.min(1.8,Math.max(innerWidth<=1024?.9:.8,Math.min(innerWidth/1440,innerHeight/900)));document.documentElement.style.setProperty('--ui',ui.toFixed(3));};
fitUi();addEventListener('resize',fitUi);


function Demo(){
 const [paused,setPaused]=React.useState(false),[open,setOpen]=React.useState(false),[replayKey,setReplayKey]=React.useState(0);
 const [mode,setMode]=React.useState<ThemeMode>(()=>document.documentElement.dataset.mode==="dark"?"dark":"light");
 const host=React.useRef<HTMLDivElement>(null),{enabled,inView}=useMotionVisibility(host);
 // the page's scale: 1 at 1440 × 900, up to 1.8 on a large screen, 1 on phones (they are tuned by hand in CSS)

 // the story and the field keep moving behind the tray; only pause, hidden and reduced motion stop them
 const moving=enabled&&inView&&!paused;
 // a scroll down opens the tray; a scroll up (with the tray at its top) closes it again; a touch swipe does the same in both directions
 React.useEffect(()=>{let total=0,last=0;const wheel=(e:WheelEvent)=>{if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const now=performance.now();if(now-last>200)total=0;last=now;total+=e.deltaY;if(!open&&total>70){total=0;setOpen(true);}else if(open&&total<-70&&(trayScroll.current?.scrollTop??0)<=0){total=0;setOpen(false);}};window.addEventListener('wheel',wheel,{passive:true});return()=>window.removeEventListener('wheel',wheel);},[open]);
 const touch=React.useRef<number|null>(null),sheetTouch=React.useRef<number|null>(null),trayScroll=React.useRef<HTMLDivElement>(null);
 const replay=()=>{setReplayKey(k=>k+1);};
 return <Drawer open={open} onOpenChange={setOpen}>
 <div className="bond-demo" ref={host} data-moving={moving} data-open={open} onTouchStart={e=>{touch.current=e.touches[0].clientY;}} onTouchEnd={e=>{if(touch.current!==null&&touch.current-e.changedTouches[0].clientY>65)setOpen(true);touch.current=null;}}>
  <ShaderBackground mode={mode} paused={!moving} envBasePath="/shader-environments/" className="bond-background"/>
  <header className="bond-header"><a href="/" className="bond-brand">cojeev<span>.</span></a><div className="bond-corner"><span className="bond-soon">Coming soon</span><div className="launch-clock bond-clock"><span className="launch-label">Arriving in</span><Countdown/></div></div></header>
  <PromptBond key={replayKey} moving={moving} active={moving} quiet={!enabled}/>
  <footer className="bond-bottom"><div className="bond-motion"><Button variant="ghost" className="replay-button" onClick={replay}><AnimatedIcon name="play" size="sm"/>Replay</Button><Button variant="ghost" className="pause-button" aria-label={paused?'Resume motion':'Pause motion'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}><AnimatedIcon name={paused?'play':'pause'} size="sm"/></Button></div><DrawerTrigger asChild><Button variant="ghost" className="bond-footer-trigger" data-morph="fill" data-tier="pill"><AnimatedIcon name="chevron-up" size="sm"/>What’s coming</Button></DrawerTrigger><ThemeToggle mode={mode} responsive onModeChange={(next,detail)=>{setMode(next);applyTheme(next,paused,undefined,{origin:detail?.origin});}}/></footer>
 </div>
 <DrawerContent className="future-tray bond-tray" data-paused={paused||!enabled} onTouchStart={e=>{sheetTouch.current=e.touches[0].clientY;}} onTouchEnd={e=>{if(sheetTouch.current!==null&&e.changedTouches[0].clientY-sheetTouch.current>65&&(trayScroll.current?.scrollTop??0)<=0)setOpen(false);sheetTouch.current=null;}}>
  <div className="tray-handle" aria-hidden="true"/>
  <DrawerClose asChild><Button variant="ghost" className="tray-close" aria-label="Close"><AnimatedIcon name="x" size="sm"/></Button></DrawerClose>
  <div className="tray-scroll" ref={trayScroll}>
   <div className="tray-heading"><DrawerTitle>A little more than intelligence.</DrawerTitle><DrawerDescription>Five things Cojeev is being built around. One living presence.</DrawerDescription></div>
   <ol className="tray-features">{details.map(([icon,title,copy,tone])=><li className="tray-feature" key={title} data-tone={tone}><span className="tray-feature-glyph"><AnimatedIcon name={icon} size="sm"/></span><h2>{title}</h2><p>{copy}</p></li>)}</ol>
   <p className="tray-note">Cojeev · Coming soon. A visual concept: the memories, teammates, agents and automations on this page are illustrative.</p>
  </div>
 </DrawerContent>
 </Drawer>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Demo/></React.StrictMode>);
