import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {motion,useMotionValue,useSpring} from 'motion/react';
import {Button} from '@/registry/cojeev/ui/button';
import {ShapeMorph} from '@/registry/cojeev/ui/shape';
import {AnimatedIcon} from '@/registry/cojeev/ui/animated-icon';
import {StoryDemoShell} from './story-demo-shell';
import './utilities.css';import './styles.css';import './story-demos.css';
const scenes=[
 {label:'Meet',heading:'Someone new\nis moving in.',copy:'It lives on your device. And finds its place beside you.',position:[92,2],shape:'seed-wing'},
 {label:'Remember',heading:'Yesterday’s thought.\nStill here.',copy:'A little memory that stays, even when the session ends.',position:[2,43],shape:'pebble-tall'},
 {label:'Connect',heading:'A conversation\nbetween minds.',copy:'Separate agents. Shared context. A little coordination.',position:[54,99],shape:'ribbon-soft'},
 {label:'Notice',heading:'It notices\nthe useful things.',copy:'A repeated pattern. The beginning of a skill.',position:[98,59],shape:'clover-soft'},
 {label:'Stay',heading:'A different mind.\nThe same resident.',copy:'Your memory and character stay, whichever intelligence is inside.',position:[52,4],shape:'pebble-soft'},
] as const;
function Resident({moving}:{moving:boolean}){
 const [scene,setScene]=React.useState(0),[playing,setPlaying]=React.useState(true),[saved,setSaved]=React.useState(false),[mind,setMind]=React.useState(0);
 const px=useMotionValue(0),py=useMotionValue(0),x=useSpring(px,{stiffness:70,damping:20}),y=useSpring(py,{stiffness:70,damping:20});
 React.useEffect(()=>{if(!moving||!playing)return;const t=setTimeout(()=>{if(scene===4)setPlaying(false);else setScene(s=>s+1);},5200);return()=>clearTimeout(t);},[scene,moving,playing]);
 const pick=(i:number)=>{setScene(i);setPlaying(false);};
 return <main className="resident-main"><div className="resident-copy"><span className="story-kicker">02 / THE RESIDENT</span><h1>{scenes[scene].heading}</h1><p>{scenes[scene].copy}</p><nav className="resident-chapters" aria-label="Resident chapters">{scenes.map((s,i)=><Button key={s.label} variant="ghost" aria-current={scene===i?'step':undefined} data-morph="fill" data-tier="pill" onClick={()=>pick(i)}>{s.label}</Button>)}</nav><Button className="story-replay" variant="ghost" onClick={()=>{setScene(0);setPlaying(true);setSaved(false);setMind(0);}}><AnimatedIcon name="play" size="sm"/>Replay the visit</Button></div>
 <div className="resident-workspace" onPointerMove={e=>{if(!moving||e.pointerType==='touch')return;const b=e.currentTarget.getBoundingClientRect();px.set((e.clientX-b.left-b.width/2)/b.width*20);py.set((e.clientY-b.top-b.height/2)/b.height*18);}} onPointerLeave={()=>{px.set(0);py.set(0);}}>
 <div className="device-window"><div className="device-toolbar"><span className="window-dots">•••</span><span>your device</span><span className="device-local">○ local</span></div><div className="device-interior" data-scene={scene}>
 {scene===0&&<div className="window-welcome"><span className="terminal-mark">›</span><span>Make something.</span><i className="resident-caret"/><small>A place to begin.</small></div>}
 {scene===1&&<div className="memory-discovery"><span className="device-eyebrow">A NEW SESSION</span><div className="old-thought">“Keep the idea simple.”</div><div className="remembered-thought"><ShapeMorph name="clover-soft"/><span>Still remembered.<small>Ready for you. And your team.</small></span></div><div className="memory-thread"/></div>}
 {scene===2&&<div className="device-agents"><svg viewBox="0 0 420 240" preserveAspectRatio="none" aria-hidden="true"><path d="M70 70 Q200 15 340 70 M70 70 Q100 185 210 185 M340 70 Q320 180 210 185" fill="none" stroke="currentColor" strokeWidth="1"/><circle r="3" fill="currentColor" className="resident-signal"/></svg>{[['Think','cushion'],['Build','seed-wing'],['Check','petal-7']].map(([label,shape],i)=><div className={`device-agent device-agent-${i}`} key={label}><ShapeMorph name={shape as 'cushion'}/><span>{label}</span><small>{i===0?'Context shared':i===1?'Working together':'Thought received'}</small></div>)}</div>}
 {scene===3&&<div className="pattern-discovery"><div className="pattern-lines"><span>review → refine → remember</span><span>review → refine → remember</span><span>review → refine → remember</span></div><div className="skill-suggestion"><ShapeMorph name={saved?'clover-soft':'seed-wing'}/><p>{saved?'A pattern, given a home.':'You do this often.'}<small>{saved?'Illustrative skill saved for this demo.':'Shall we make it a skill?'}</small></p><Button variant="ghost" data-morph="fill" data-tier="pill" disabled={saved} onClick={()=>{setSaved(true);setPlaying(false);}}>{saved?'Kept':'Try it'}<AnimatedIcon name="arrow-up-right" size="sm"/></Button></div></div>}
 {scene===4&&<div className="resident-identity"><ShapeMorph name={mind===0?'petal-7':mind===1?'cushion':'clover-soft'} className={`resident-brain brain-${mind}`}/><span>{['Creative','Precise','Curious'][mind]} mind</span><Button variant="ghost" data-morph="fill" data-tier="pill" onClick={()=>setMind(v=>(v+1)%3)}>Switch mind <AnimatedIcon name="arrow-right" size="sm"/></Button><small>Same memory. Same character.</small></div>}
 </div><div className="device-status"><span>{scene===0?'waiting for your first thought':'cojeev is here'}</span><span className="resident-status-dot"/></div></div>
 <motion.div className="resident-being-anchor" animate={{left:`${scenes[scene].position[0]}%`,top:`${scenes[scene].position[1]}%`}} transition={{duration:moving?1.5:0,ease:[.22,1,.36,1]}}><motion.div className="resident-being" style={{x:moving?x:0,y:moving?y:0}}><div className="resident-breathe"><ShapeMorph name={scenes[scene].shape}/><ShapeMorph className="resident-outline" name="pebble-soft" variant="outline"/><span className="resident-eyes"><i/><i/></span></div></motion.div></motion.div><span className="window-caption">A little life, around the edges.</span>
 </div></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><StoryDemoShell kind="resident">{({moving})=><Resident moving={moving}/>}</StoryDemoShell></React.StrictMode>);
