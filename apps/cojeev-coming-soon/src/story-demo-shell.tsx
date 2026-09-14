import * as React from "react";
import {Button} from "@/registry/cojeev/ui/button";
import {AnimatedIcon} from "@/registry/cojeev/ui/animated-icon";
import {ShaderBackground} from "@/registry/cojeev/ui/shader-background";
import {ShapeMorph} from "@/registry/cojeev/ui/shape";
import {ThemeToggle,applyTheme,type ThemeMode} from "@/registry/cojeev/ui/theme-toggle";
import {useMotionVisibility} from "@/registry/cojeev/motion/use-motion-visibility";
import {Drawer,DrawerTrigger,DrawerContent,DrawerTitle,DrawerDescription,DrawerClose} from "@/registry/cojeev/ui/drawer";
import {Countdown} from "./countdown-display";
import './demo-switcher.css';

export function DemoSwitcher({current}:{current:'bond'|'resident'|'mind'}){
 return <nav className="demo-switcher" aria-label="Compare story demos">{[['bond','The Bond'],['resident','The Resident'],['mind','Changing Mind']].map(([id,label])=><Button asChild key={id} variant="ghost" data-morph="fill" data-tier="pill"><a href={id==='bond'?'/':`/${id}.html`} aria-current={current===id?'page':undefined}>{label}</a></Button>)}</nav>;
}
const powers=[['Memory, shared','Context that stays with you and your team.'],['Prompts, extended','Custom hooks before, during and after a response.'],['Agents, connected','Subagents, model selection and a shared coordination board.'],['A little proactive','Patterns suggested as skills and automations.'],['Character, yours','A personality you shape, across different minds and harnesses.']];
export function StoryDemoShell({kind,children}:{kind:'resident'|'mind';children:(state:{moving:boolean;paused:boolean})=>React.ReactNode}){
 const host=React.useRef<HTMLDivElement>(null),{enabled,inView}=useMotionVisibility(host);
 const [paused,setPaused]=React.useState(false),[open,setOpen]=React.useState(false),[mode,setMode]=React.useState<ThemeMode>(()=>document.documentElement.dataset.mode==='dark'?'dark':'light');
 const moving=enabled&&inView&&!paused&&!open;
 React.useEffect(()=>{let total=0,last=0;const wheel=(e:WheelEvent)=>{if(open||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if(performance.now()-last>220)total=0;last=performance.now();total+=Math.max(0,e.deltaY);if(total>65)setOpen(true);};window.addEventListener('wheel',wheel,{passive:true});return()=>window.removeEventListener('wheel',wheel);},[open]);
 const touch=React.useRef<number|null>(null);
 return <Drawer open={open} onOpenChange={setOpen}><div className={`story-demo ${kind}-demo`} ref={host} data-moving={moving} onTouchStart={e=>{touch.current=e.touches[0].clientY;}} onTouchEnd={e=>{if(touch.current!==null&&touch.current-e.changedTouches[0].clientY>65)setOpen(true);touch.current=null;}}>
 <ShaderBackground mode={mode} paused={!moving} envBasePath="/shader-environments/" className="story-background"/>
 <header className="story-header"><a className="story-brand" href="/">cojeev<span>.</span></a><DemoSwitcher current={kind}/><div className="launch-clock"><span className="launch-label">Arriving in</span><Countdown/></div></header>
 {children({moving,paused})}
 <footer className="story-bottom"><span className="demo-disclosure">An illustrative interaction study.</span><DrawerTrigger asChild><Button variant="ghost" data-morph="fill" data-tier="pill" className="story-footer-trigger">What’s coming <AnimatedIcon name="arrow-up-right" size="sm"/></Button></DrawerTrigger><div className="story-settings"><ThemeToggle mode={mode} responsive onModeChange={(next,details)=>{setMode(next);applyTheme(next,paused,undefined,{origin:details?.origin});}}/><Button variant="ghost" aria-label={paused?'Resume motion':'Pause motion'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}><AnimatedIcon name={paused?'play':'pause'} size="sm"/></Button></div></footer>
 </div><DrawerContent className="future-tray story-tray" data-paused={paused||!enabled}><div className="tray-paint" aria-hidden="true"><ShapeMorph className="tray-crown" name="cloud-3" preserveAspectRatio="none"/><div className="tray-base"/></div><DrawerClose asChild><Button variant="ghost" className="tray-close" aria-label="Close features"><AnimatedIcon name="x" size="sm"/></Button></DrawerClose><div className="tray-scroll"><div className="tray-heading"><div><DrawerTitle>A presence. With a little more power.</DrawerTitle><DrawerDescription>Planned capabilities for Cojeev.</DrawerDescription></div></div><div className="feature-collection">{powers.map(([title,copy])=><article className="feature-detail" key={title}><h2>{title}</h2><p>{copy}</p></article>)}</div><p className="demo-disclosure">A visual demo. No real agents, files or automations are connected.</p></div></DrawerContent></Drawer>;
}
