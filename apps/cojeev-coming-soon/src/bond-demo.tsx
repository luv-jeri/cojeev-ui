import * as React from "react";
import {createRoot} from "react-dom/client";
import {PromptBond} from "./prompt-bond";
import {Button} from "@/registry/cojeev/ui/button";
import {AnimatedIcon} from "@/registry/cojeev/ui/animated-icon";
import {ShapeMorph} from "@/registry/cojeev/ui/shape";
import {ShaderBackground} from "@/registry/cojeev/ui/shader-background";
import {ThemeToggle,applyTheme,type ThemeMode} from "@/registry/cojeev/ui/theme-toggle";
import {useMotionVisibility} from "@/registry/cojeev/motion/use-motion-visibility";
import {Drawer,DrawerTrigger,DrawerContent,DrawerTitle,DrawerDescription,DrawerClose} from "@/registry/cojeev/ui/drawer";
import {Countdown} from "./countdown-display";
import {DemoSwitcher} from "./story-demo-shell";
import "./utilities.css";
import "./styles.css";
import "./bond-demo.css";

const details=[['Shared memory','Team context and decisions, remembered across sessions.'],['Prompt lifecycle','Hooks and prompt injection before, during and after a response.'],['Agents, together','Subagents, the right models, and a board where agents coordinate.'],['A little proactive','Useful patterns suggested as skills or automations.'],['Your character','A personality you can shape, across different harnesses and models.']];

function Demo(){
 const [paused,setPaused]=React.useState(false),[open,setOpen]=React.useState(false),[replayKey,setReplayKey]=React.useState(0);
 const [mode,setMode]=React.useState<ThemeMode>(()=>document.documentElement.dataset.mode==="dark"?"dark":"light");
 const host=React.useRef<HTMLDivElement>(null),{enabled,inView}=useMotionVisibility(host);
 const moving=enabled&&inView&&!paused&&!open;
 React.useEffect(()=>{let total=0,last=0;const wheel=(e:WheelEvent)=>{if(open||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const now=performance.now();if(now-last>200)total=0;last=now;total+=Math.max(e.deltaY,0);if(total>70)setOpen(true);};window.addEventListener('wheel',wheel,{passive:true});return()=>window.removeEventListener('wheel',wheel);},[open]);
 const touch=React.useRef<number|null>(null);
 const replay=()=>{setReplayKey(k=>k+1);};
 return <Drawer open={open} onOpenChange={setOpen}>
 <div className="bond-demo" ref={host} data-moving={moving} onTouchStart={e=>{touch.current=e.touches[0].clientY;}} onTouchEnd={e=>{if(touch.current!==null&&touch.current-e.changedTouches[0].clientY>65)setOpen(true);touch.current=null;}}>
  <ShaderBackground mode={mode} paused={!moving} envBasePath="/shader-environments/" className="bond-background"/>
  <header className="bond-header"><a href="/" className="bond-brand">cojeev<span>.</span></a><DemoSwitcher current="bond"/><div className="launch-clock"><span className="launch-label">Arriving in</span><Countdown/></div></header>
  <PromptBond key={replayKey} moving={moving} active={moving} quiet={!enabled}/>
  <footer className="bond-bottom"><Button variant="ghost" className="replay-button" onClick={replay}><AnimatedIcon name="play" size="sm"/>Replay the story</Button><DrawerTrigger asChild><Button variant="ghost" className="bond-footer-trigger" data-morph="fill" data-tier="pill">What’s coming <AnimatedIcon name="arrow-up-right" size="sm"/></Button></DrawerTrigger><div className="bond-controls"><ThemeToggle mode={mode} responsive onModeChange={(next,detail)=>{setMode(next);applyTheme(next,paused,undefined,{origin:detail?.origin});}}/><Button variant="ghost" aria-label={paused?'Resume motion':'Pause motion'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}><AnimatedIcon name={paused?'play':'pause'} size="sm"/></Button></div></footer>
 </div>
 <DrawerContent className="future-tray bond-tray" data-paused={paused||!enabled}><div className="tray-paint" aria-hidden="true"><ShapeMorph className="tray-crown" name="cloud-3" preserveAspectRatio="none"/><div className="tray-base"/></div><DrawerClose asChild><Button variant="ghost" className="tray-close" aria-label="Close features"><AnimatedIcon name="x" size="sm"/></Button></DrawerClose><div className="tray-scroll"><div className="tray-heading"><div><DrawerTitle>A little more than intelligence.</DrawerTitle><DrawerDescription>Planned capabilities. One living presence.</DrawerDescription></div></div><div className="feature-collection">{details.map(([title,copy])=><article className="feature-detail" key={title}><h2>{title}</h2><p>{copy}</p></article>)}</div><p className="bond-study-note">Cojeev · Coming soon. This is a visual concept demo; the agents and suggestions are illustrative.</p></div></DrawerContent>
 </Drawer>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Demo/></React.StrictMode>);
