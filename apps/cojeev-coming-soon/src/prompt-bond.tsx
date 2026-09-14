import * as React from 'react';
import {animate, frame, cancelFrame, type AnimationPlaybackControls, type AnimationSequence} from 'motion';
import {Button} from '@/registry/cojeev/ui/button';
import {InputControl} from '@/registry/cojeev/ui/input';
import {AnimatedIcon} from '@/registry/cojeev/ui/animated-icon';
import {BubbleContent} from '@/registry/cojeev/ui/bubble';
import {Membrane, type MembraneHandle} from '@/registry/cojeev/ui/membrane';
import type {MembraneCell, MembraneStrand} from '@/registry/cojeev/lib/membrane-field';
import './prompt-bond.css';

/* ── Story ─────────────────────────────────────────────────────────── */

export const beats = [
 {cue:'A small thought. A little curiosity.',label:'Ready'},
 {cue:'Bonded. Your prompt lives inside now.',label:'Bond'},
 {cue:'Sent. The whole conversation is alive.',label:'Launch'},
 {cue:'The right memories find their way back.',label:'Recall'},
 {cue:'Your way of working, woven in.',label:'Prepare'},
 {cue:'The task reaches your teammates and agents.',label:'Reach'},
 {cue:'A response forms. A second look checks it.',label:'Check'},
 {cue:'The useful part stays with you.',label:'Keep'},
 {cue:'A familiar rhythm. A future automation?',label:'Notice'},
 {cue:'One prompt ends. The next starts wiser.',label:'Again'},
] as const;
const LAST=beats.length-1;
const IDLE_MS=9000;

/** Something that lives in the environment around the panel: a memory, a teammate, a subagent, a thing worth keeping. */
type Thing={title:string;sub:string;icon?:string;initials?:string};
type Kind='memory'|'teammate'|'subagent'|'kept';
type Story={prompt:string;memories:[Thing,Thing];woven:string;agents:[Thing,Thing];kept:Thing;automation:string;reply:[number,number,number]};
/** Illustrative conversations, one per thought. Each one's first memory is what the one before it kept. */
export const stories:Story[]=[
 {prompt:'Plan our next launch.',memories:[{title:'team decisions',sub:'12 notes',icon:'file-text'},{title:'last launch notes',sub:'kept three weeks ago',icon:'brain'}],woven:'your instructions, launch skill',agents:[{title:'a teammate',sub:'takes the timeline',initials:'MK'},{title:'a subagent',sub:'checks the dates',icon:'bot'}],kept:{title:'launch plan v1',sub:'kept for next time',icon:'bookmark'},automation:'Make this an automation?',reply:[1,.82,.56]},
 {prompt:'Draft the release notes.',memories:[{title:'launch plan v1',sub:'kept just now',icon:'bookmark'},{title:'changelog',sub:'34 commits',icon:'git-branch'}],woven:'your voice, release-notes skill',agents:[{title:'a teammate',sub:'reviews the wording',initials:'AR'},{title:'a subagent',sub:'collects the diffs',icon:'bot'}],kept:{title:'release notes v1',sub:'kept for next time',icon:'bookmark'},automation:'Draft notes on every release?',reply:[1,.9,.7]},
 {prompt:'Summarize this week for the team.',memories:[{title:'release notes v1',sub:'kept just now',icon:'bookmark'},{title:'this week’s threads',sub:'7 conversations',icon:'list'}],woven:'your instructions, summary skill',agents:[{title:'a teammate',sub:'adds the numbers',initials:'JL'},{title:'a subagent',sub:'reads the board',icon:'bot'}],kept:{title:'weekly summary',sub:'kept for next time',icon:'bookmark'},automation:'Summarize every Friday?',reply:[.9,1,.5]},
 {prompt:'Why did the deploy fail?',memories:[{title:'deploy log',sub:'last run',icon:'terminal'},{title:'runbook',sub:'kept two months ago',icon:'list'}],woven:'your instructions, debugging skill',agents:[{title:'an ops teammate',sub:'checks the cluster',initials:'SP'},{title:'a subagent',sub:'reads the trace',icon:'bot'}],kept:{title:'root cause: expired token',sub:'kept for next time',icon:'bookmark'},automation:'Watch deploys for this?',reply:[1,.7,.85]},
];
const storyAt=(run:number)=>stories[run%stories.length];
type Part={t:string;b?:boolean};
/** The work rows: plain words and, in bold, the things that were pulled in. */
const rowsFor=(s:Story):Record<number,Part[]>=>({
 1:[{t:'recalled · '},{t:s.memories[0].title,b:true},{t:', '},{t:s.memories[1].title,b:true}],
 2:[{t:'woven in · '},{t:s.woven,b:true}],
 3:[{t:'task → '},{t:s.agents[0].title,b:true},{t:' · notified '},{t:s.agents[1].title,b:true}],
 5:[{t:'kept · '},{t:s.kept.title,b:true}],
});
const kindOf=(th:Thing):Kind=>th.initials?'teammate':th.icon==='bot'?'subagent':th.icon==='bookmark'?'kept':'memory';
const KIND_TITLE:Record<Kind,string>={memory:'Memory',teammate:'Teammate',subagent:'Subagent',kept:'Kept'};
const ROW_ICONS=['','brain','sparkles','users','','bookmark',''];
/** Each row's glyph moves in its own way when something lands: the brain draws itself, the sparkles twinkle, the second figure steps out, the bookmark slides into place. */
const ROW_PRESET=['auto','draw','auto','auto','auto','auto','draw'] as const;

/* ── The environment: five float slots, three on the left (memories, and the thing kept last) and two on the right (agents).
 * Things drift there on their own until a tendril grabs one; what is eaten leaves, what is kept is placed back out. */

type Floating={thing:Thing;eaten:boolean};
const SLOTS=5,LEFT=[0,1,2],RIGHT=[3,4],KEPT_SLOT=2;
/** What floats around a story once `upTo` beats have happened. `prevKept` is the title of what the previous thought kept, so it keeps its slot. */
function poolFor(s:Story,upTo:number,prevKept:string):(Floating|null)[]{
 const pool:(Floating|null)[]=Array(SLOTS).fill(null);
 const [m0,m1]=s.memories,eaten=upTo>3;
 if(m0.title===prevKept){pool[KEPT_SLOT]={thing:m0,eaten};pool[0]={thing:m1,eaten};}
 else{pool[0]={thing:m0,eaten};pool[1]={thing:m1,eaten};}
 if(upTo>=7)pool[KEPT_SLOT]={thing:s.kept,eaten:false};
 pool[3]={thing:s.agents[0],eaten:false};pool[4]={thing:s.agents[1],eaten:false};
 return pool;
}
const slotOf=(pool:(Floating|null)[],title:string)=>pool.findIndex(f=>f?.thing.title===title);

/* ── World: plain objects the timelines tween and the frame loop paints ──
 * Positions are named px/py on purpose: Motion treats keys called x and y as
 * transform properties and snaps them under reduced motion, which would break
 * the seeked still poses. */

type Cell={px:number;py:number;hw:number;hh:number;r:number;tone:number;rot:number;w:number};
type Strand={ax:number;ay:number;bx:number;by:number;r:number;tone:number;taper:number;w:number};
/** A floating thing: anchored at its shape, `s` scales it around that shape, `t` shows its label, `free` blends its drift
 * (1 floating, 0 held), `rip` is the ring that ripples out when it surfaces (1 = gone), `flash` its light, `busy` its activity. */
type Node={px:number;py:number;o:number;s:number;t:number;free:number;rip:number;flash:number;busy:number};
/** A row: `g` is its glyph chip coming into being, `p` the ring that ripples off the chip. */
type Row={o:number;dy:number;p:number;g:number};
type Eye={o:number;lid:number};
type World={
 env:{free:number;breath:number;wobble:number;underline:number;pulse:number;contour:number;panel:number};
 A:Cell;B:Cell;O:Cell[];PL:Cell;PR:Cell;K:Cell[];U:Cell[];Y:Cell;
 strands:Strand[];nodes:Node[];rows:Row[];fold:{o:number;dy:number};
 eyes:Eye[];gaze:{px:number;py:number;w:number};
 lines:{a:number;b:number;c:number;check:number;typing:number};
};
const cell=(tone:number,w=1):Cell=>({px:0,py:0,hw:0,hh:0,r:0,tone,rot:0,w});
const strand=(tone:number):Strand=>({ax:0,ay:0,bx:0,by:0,r:0,tone,taper:0,w:1});
const ROWS=7; // 0 sent, 1 recalled, 2 woven in, 3 reached, 4 reply, 5 kept, 6 automation
const ORGANISMS=6,RADII=[26,23,13,11,15,10];
function createWorld():World{
 return {
  env:{free:1,breath:0,wobble:1.2,underline:1,pulse:0,contour:0,panel:0},
  A:cell(0),B:cell(2),O:[cell(0),cell(2),cell(0),cell(2)],PL:cell(0),PR:cell(2),
  K:[cell(1,1.4),cell(1,1.4),cell(1,1.2),cell(1,1.2)],U:[cell(2),cell(2)],Y:cell(3),
  strands:Array.from({length:8},(_,i)=>strand(i>5?0:1)),
  nodes:Array.from({length:SLOTS},()=>({px:0,py:0,o:0,s:1,t:1,free:1,rip:1,flash:0,busy:0})),
  rows:Array.from({length:ROWS},()=>({o:0,dy:0,p:0,g:0})),fold:{o:0,dy:0},
  eyes:Array.from({length:ORGANISMS},()=>({o:1,lid:0})),gaze:{px:0,py:0,w:0},
  lines:{a:0,b:0,c:0,check:0,typing:0},
 };
}

/* ── Roaming: six organisms steer across the whole stage while free ── */

type Roam={x:number;y:number;vx:number;vy:number;tx:number;ty:number;wait:number;r:number;seed:number};
type Capture={t0:number;from:Point[]};
const createRoam=():Roam[]=>RADII.map((r,i)=>({x:0,y:0,vx:0,vy:0,tx:0,ty:0,wait:0,r,seed:i*1.7}));
/** Critically damped approach that keeps whatever velocity the body already has. */
function damp(r:Roam,tx:number,ty:number,smooth:number,dt:number){
 const omega=2/smooth,x=omega*dt,ex=1/(1+x+.48*x*x+.235*x*x*x);
 const cx=r.x-tx,cy=r.y-ty,ux=(r.vx+omega*cx)*dt,uy=(r.vy+omega*cy)*dt;
 r.vx=(r.vx-omega*ux)*ex;r.vy=(r.vy-omega*uy)*ex;r.x=tx+(cx+ux)*ex;r.y=ty+(cy+uy)*ex;
}

/* ── Layout: everything is measured from the real prompt field and panel ── */

type Point={x:number;y:number};
/** A measured shape: its box; the pocket wraps the box and the anchor is its centre. */
type Size={w:number;h:number};
type Rect={cx:number;cy:number;hw:number;hh:number};
type Layout={
 W:number;H:number;k:number;field:Rect;panel:Rect&{left:number;right:number;top:number;bottom:number};composerDy:number;
 endL:Point;endR:Point;docks:Point[];rest:Point[];bounds:{x0:number;y0:number;x1:number;y1:number};
 slots:Point[];rims:Point[];roomy:boolean;
 rows:Point[];reply:{x:number;y:number;w:number;h:number};
};
function measure(stage:HTMLElement,form:HTMLElement,panel:HTMLElement,rowEls:(HTMLElement|null)[],replyEl:HTMLElement|null,formDy:number):Layout|null{
 const s=stage.getBoundingClientRect(),f=form.getBoundingClientRect(),p=panel.getBoundingClientRect();
 if(!s.width||!f.width||!p.width)return null;
 const W=s.width,H=s.height,cx=f.left-s.left+f.width/2,cy=f.top-s.top+f.height/2-formDy;
 const hw=f.width/2+10,hh=f.height/2+6,k=Math.min(1,Math.max(.62,hw/290));
 const pl=p.left-s.left,pt=p.top-s.top,pcx=pl+p.width/2,pcy=pt+p.height/2,phw=p.width/2+10,phh=p.height/2+8;
 const composerDy=pt+p.height-f.height/2-10*k-cy;
 const inset=Math.min(90,H*.1),bounds={x0:40*k,y0:inset,x1:W-40*k,y1:H-inset};
 const place=(x:number,y:number):Point=>({x:Math.min(bounds.x1,Math.max(bounds.x0,x)),y:Math.min(bounds.y1,Math.max(bounds.y0,y))});
 const endL={x:cx-hw+hh*.3,y:cy},endR={x:cx+hw-hh*.3,y:cy};
 const rows=Array.from({length:ROWS},(_,i)=>{const el=rowEls[i];return el?{x:pl+el.offsetLeft+10,y:pt+el.offsetTop+el.offsetHeight/2}:{x:pcx,y:pcy};});
 const reply=replyEl?{x:pl+replyEl.offsetLeft,y:pt+replyEl.offsetTop,w:replyEl.offsetWidth,h:replyEl.offsetHeight}:{x:pcx-60,y:pcy,w:120,h:40};
 const left=pcx-phw,right=pcx+phw,top=pcy-phh,bottom=pcy+phh;
 // things carry a label when there is room beside the panel; otherwise only their shape.
 // With room they float far out near the page edges, so grabbing one crosses real distance.
 const roomy=left>=230*k&&W-right>=230*k;
 const farL=roomy?Math.max(150*k,left-300*k):left-34*k,farR=roomy?Math.min(W-150*k,right+300*k):right+34*k;
 const clampX=(x:number)=>Math.min(W-26*k,Math.max(26*k,x)),clampY=(y:number)=>Math.min(H-26*k,Math.max(26*k,y));
 const slots=[
  {x:clampX(farL),y:clampY(top+40*k)},{x:clampX(farL+14*k),y:clampY(pcy+30*k)},{x:clampX(farL-6*k),y:clampY(bottom-70*k)},
  {x:clampX(farR),y:clampY(top+60*k)},{x:clampX(farR-14*k),y:clampY(pcy+56*k)},
 ];
 const rims=[{x:left+6,y:slots[0].y+10*k},{x:left+6,y:slots[1].y-6*k},{x:left+6,y:slots[2].y-16*k},{x:right-6,y:slots[3].y+8*k},{x:right-6,y:slots[4].y}];
 return {W,H,k,field:{cx,cy,hw,hh},panel:{cx:pcx,cy:pcy,hw:phw,hh:phh,left,right,top,bottom},composerDy,
  endL,endR,bounds,
  docks:[endL,endR,{x:cx-hw*.35,y:cy-hh+3},{x:cx+hw*.3,y:cy-hh+3},{x:cx-hw*.05,y:cy+hh-3},{x:cx+hw*.5,y:cy+hh-3}],
  rest:[place(cx-hw*.75,cy-hh-80*k),place(cx+hw*.7,cy+hh+78*k),place(cx-hw-150*k,cy-40*k),place(cx+hw*.25,cy-hh-150*k),place(cx-hw*.3,cy+hh+140*k),place(cx+hw+160*k,cy+30*k)],
  slots,rims,roomy,rows,reply,
 };
}
const at=(p:Point)=>({px:p.x,py:p.y});
const zero={hw:0,hh:0,r:0};
/** A pocket of membrane grown around a shape. */
const pocket=(size:Size,k:number,anchor:Point)=>({px:anchor.x,py:anchor.y,hw:size.w/2+9*k,hh:size.h/2+9*k,r:Math.min(size.h/2+9*k,22*k)});

/** Everything that floats, at its slot, drifting; eaten things are gone. */
function floatPose(w:World,L:Layout,pool:(Floating|null)[]){
 w.nodes.forEach((n,i)=>{const f=pool[i];Object.assign(n,{...at(L.slots[i]),o:f&&!f.eaten?1:0,s:1,t:1,free:1,rip:1,flash:0,busy:0});});
}
/** Beat 0: six free organisms, and the environment around them. */
function restPose(w:World,L:Layout,roam:Roam[],pool:(Floating|null)[]){
 const k=L.k;Object.assign(w.env,{free:1,breath:0,wobble:1.2,underline:1,pulse:0,contour:0,panel:0});
 [w.A,w.B,...w.O].forEach((c,i)=>{const r=RADII[i]*k;Object.assign(c,{...at(L.rest[i]),hw:r,hh:r,r,rot:0});const o=roam[i];o.x=L.rest[i].x;o.y=L.rest[i].y;o.vx=o.vy=0;o.r=r;o.wait=0;o.tx=o.x;o.ty=o.y;});
 for(const c of [w.PL,w.PR,...w.K,...w.U,w.Y])Object.assign(c,{px:L.field.cx,py:L.field.cy,...zero,rot:0});
 for(const s of w.strands)Object.assign(s,{ax:L.field.cx,ay:L.field.cy,bx:L.field.cx,by:L.field.cy,r:0,taper:0});
 floatPose(w,L,pool);for(const r of w.rows){r.o=0;r.dy=0;r.p=0;r.g=0;}w.fold.o=0;w.fold.dy=0;
 for(const e of w.eyes){e.o=1;e.lid=0;}Object.assign(w.gaze,{px:L.field.cx,py:L.field.cy,w:0});
 Object.assign(w.lines,{a:0,b:0,c:0,check:0,typing:0});
}
/** The settled bonded line: two heads at the ends, membrane between. */
function bondedPose(w:World,L:Layout,roam:Roam[],pool:(Floating|null)[]){
 restPose(w,L,roam,pool);const e=L.field.hh+3,F=L.field;
 Object.assign(w.env,{free:0,breath:1,wobble:1.5,underline:0,contour:.7});
 Object.assign(w.A,{...at(L.endL),hw:e,hh:e,r:e});Object.assign(w.B,{...at(L.endR),hw:e,hh:e,r:e});
 [w.A,w.B,...w.O].forEach((c,i)=>{const o=roam[i];o.x=L.docks[i].x;o.y=L.docks[i].y;o.vx=o.vy=0;if(i>1)Object.assign(c,{...at(L.docks[i]),...zero});});
 const half=(F.cx-L.endL.x)/2+8;
 Object.assign(w.PL,{px:L.endL.x+half,py:F.cy,hw:half,hh:F.hh+2,r:F.hh+2});
 Object.assign(w.PR,{px:L.endR.x-half,py:F.cy,hw:half,hh:F.hh+2,r:F.hh+2});
 w.eyes.forEach((e,i)=>{if(i>0)Object.assign(e,{o:0,lid:1});});Object.assign(w.gaze,{px:F.cx,py:F.cy,w:1});
}
const headL=(L:Layout)=>({px:L.panel.left+30*L.k,py:L.panel.top+4*L.k,hw:22*L.k,hh:22*L.k,r:22*L.k});
const headR=(L:Layout)=>({px:L.panel.right-30*L.k,py:L.panel.top+4*L.k,hw:20*L.k,hh:20*L.k,r:20*L.k});
const bodyL=(L:Layout)=>({px:L.panel.cx-L.panel.hw*.22,py:L.panel.cy,hw:L.panel.hw*.78,hh:L.panel.hh,r:30*L.k});
const bodyR=(L:Layout)=>({px:L.panel.cx+L.panel.hw*.22,py:L.panel.cy,hw:L.panel.hw*.78,hh:L.panel.hh,r:30*L.k});
/** The open panel with everything the beats before `upTo` already revealed. */
function panelPose(w:World,L:Layout,roam:Roam[],upTo:number,folded:boolean,pool:(Floating|null)[]){
 bondedPose(w,L,roam,pool);
 Object.assign(w.env,{panel:1,contour:.3});
 Object.assign(w.A,headL(L));Object.assign(w.B,headR(L));Object.assign(w.PL,bodyL(L));Object.assign(w.PR,bodyR(L));
 Object.assign(w.gaze,{px:L.panel.cx,py:L.panel.top+40*L.k,w:1});
 w.rows[0].o=1;w.fold.o=folded?1:0;
 const done=(i:number)=>{const r=w.rows[i];r.o=1;r.g=1;};
 if(upTo>3)done(1);if(upTo>4)done(2);if(upTo>5)done(3);
 if(upTo>6){w.rows[4].o=1;Object.assign(w.lines,{a:1,b:1,c:1,check:1});}
 if(upTo>7)done(5);if(upTo>8)done(6);
}

/* ── Choreography: one Motion sequence per beat ── */

type Beat={seq:AnimationSequence;still:number};
const flow=[.6,0,.15,1] as const,settle=[.4,0,.2,1] as const,haul=[.65,0,.35,1] as const,inOut='easeInOut' as const,out='easeOut' as const;
const spring=(stiffness:number,damping:number)=>({type:'spring' as const,stiffness,damping});
const lookAt=(w:World,p:Point,t:number,d=.4):AnimationSequence[number]=>[w.gaze,{...at(p),w:1},{duration:d,at:t}];
const home=(w:World,L:Layout,t:number):AnimationSequence[number]=>[w.gaze,{px:L.panel.cx,py:L.panel.top+40*L.k},{duration:.5,at:t}];
/** A row settles into place, quietly. */
const land=(w:World,L:Layout,i:number,t:number):AnimationSequence=>[[w.rows[i],{dy:8*L.k,g:0,p:0},{duration:.01,at:0}],[w.rows[i],{o:1,dy:0},{duration:.5,ease:settle,at:t}]];
/** The row's glyph chip pops into being and a ring ripples off it: what was pulled has arrived. */
const arrive=(w:World,i:number,t:number):AnimationSequence=>[[w.rows[i],{g:1},{...spring(240,14),at:t}],...ripple(w,i,t+.02)];
const ripple=(w:World,i:number,t:number):AnimationSequence=>[[w.rows[i],{p:1},{duration:.08,at:t}],[w.rows[i],{p:0},{duration:.85,ease:out,at:t+.1}]];
/** A thing surfaces in the environment: it springs up, flashes, and a ring ripples away from it. */
const surface=(n:Node,M:Point,t:number,text=1):AnimationSequence=>[
 [n,{...at(M),o:0,s:.5,t:text,rip:0,flash:0,busy:0},{duration:.01,at:t}],
 [n,{o:1,s:1},{...spring(170,13),at:t+.02}],
 [n,{flash:1},{duration:.1,at:t+.02}],[n,{flash:0},{duration:.5,ease:out,at:t+.12}],
 [n,{rip:1},{duration:.8,ease:out,at:t+.04}],
];
/** The lead's eyes: a wider look, a squint, a blink. */
const widen=(w:World,t:number,d=.7):AnimationSequence=>[[w.eyes[0],{lid:-.2},{duration:.2,at:t}],[w.eyes[0],{lid:0},{duration:.35,at:t+d}]];
const blink=(w:World,t:number):AnimationSequence=>[[w.eyes[0],{lid:1},{duration:.1,at:t}],[w.eyes[0],{lid:0},{duration:.22,at:t+.12}]];

/** Beat 1: the organisms are already flying in (see the roam step); the timeline handles contact and the spread. */
function bond(w:World,L:Layout):Beat{
 const e=L.field.hh+3,F=L.field,half=(F.cx-L.endL.x)/2+8;
 return {still:3,seq:[
  [w.env,{underline:3.2},{duration:.9,ease:out,at:0}],
  lookAt(w,{x:F.cx,y:F.cy},.1,.3),
  // contact: the heads flatten onto the ends of the line
  [w.env,{free:0},{duration:.25,at:.95}],
  [w.A,{hw:e,hh:e,r:e},{...spring(300,14),at:.95}],
  [w.B,{hw:e,hh:e,r:e},{...spring(300,14),at:1.0}],
  ...w.O.map((c,i):AnimationSequence[number]=>[c,zero,{duration:.4,at:1.3+i*.08}]),
  ...w.eyes.slice(2).map((ey,i):AnimationSequence[number]=>[ey,{o:0},{duration:.25,at:1.2+i*.08}]),
  // spread: two membranes flow inward from the ends and fuse
  [w.PL,{px:L.endL.x+2,py:F.cy,hw:2,hh:F.hh+2,r:F.hh+2},{duration:.01,at:.98}],
  [w.PR,{px:L.endR.x-2,py:F.cy,hw:2,hh:F.hh+2,r:F.hh+2},{duration:.01,at:1.04}],
  [w.PL,{px:L.endL.x+half,hw:half},{duration:1.05,ease:flow,at:1.0}],
  [w.PR,{px:L.endR.x-half,hw:half},{duration:1.05,ease:flow,at:1.06}],
  [w.env,{underline:0},{duration:.9,at:1.0}],
  [w.eyes[1],{lid:1},{duration:.35,at:1.2}],
  [w.eyes[1],{o:0},{duration:.4,at:1.55}],
  // fusion pulse, then settle
  [w.PL,{hh:F.hh+9},{duration:.16,ease:out,at:2.0}],
  [w.PR,{hh:F.hh+9},{duration:.16,ease:out,at:2.04}],
  [w.A,{hw:e+5,hh:e+5,r:e+5},{duration:.16,ease:out,at:2.0}],
  [w.B,{hw:e+5,hh:e+5,r:e+5},{duration:.16,ease:out,at:2.04}],
  [w.PL,{hh:F.hh+2},{...spring(170,13),at:2.18}],
  [w.PR,{hh:F.hh+2},{...spring(170,13),at:2.22}],
  [w.A,{hw:e,hh:e,r:e},{...spring(170,13),at:2.18}],
  [w.B,{hw:e,hh:e,r:e},{...spring(170,13),at:2.22}],
  [w.eyes[0],{lid:.5},{duration:.12,at:2.05}],
  [w.eyes[0],{lid:0},{duration:.3,at:2.3}],
  [w.env,{contour:.7},{duration:1,at:1.6}],
  [w.env,{wobble:1.5},{duration:.8,at:2.0}],
  [w.env,{breath:1},{duration:.6,at:2.4}],
 ]};
}

/** Beat 2: the line grows into a panel; the prompt lifts into the conversation. Later thoughts fold the last exchange away first,
 * and the new story's things surface in the environment. */
function launch(w:World,L:Layout,again:boolean,fresh:number[]):Beat{
 const k=L.k,[sent,...rest]=w.rows;
 if(again)return {still:1.3,seq:[
  [rest,{o:0,g:0,p:0},{duration:.3,at:0}],
  [w.lines,{a:0,b:0,c:0,check:0,typing:0},{duration:.3,at:0}],
  [sent,{dy:-12*k,o:0},{duration:.3,ease:settle,at:0}],
  [w.fold,{o:0,dy:8*k},{duration:.01,at:0}],
  [w.fold,{o:1,dy:0},{duration:.4,ease:settle,at:.25}],
  [sent,{dy:26*k},{duration:.01,at:.5}],
  [sent,{dy:0,o:1},{duration:.55,ease:settle,at:.55}],
  ...blink(w,.35),
  home(w,L,.5),
  ...fresh.flatMap((i,j)=>[[w.nodes[i],{o:0,free:1},{duration:.01,at:0}] as AnimationSequence[number],...surface(w.nodes[i],L.slots[i],.6+j*.18)]),
 ]};
 return {still:1.4,seq:[
  [sent,{dy:26*k,o:0},{duration:.01,at:0}],
  [w.PL,bodyL(L),{duration:1.0,ease:flow,at:.1}],
  [w.PR,bodyR(L),{duration:1.0,ease:flow,at:.1}],
  [w.env,{panel:1},{duration:1.0,ease:flow,at:.1}],
  [w.A,headL(L),{duration:.9,ease:flow,at:.15}],
  [w.B,headR(L),{duration:.9,ease:flow,at:.2}],
  [w.env,{contour:.3},{duration:.8,at:.3}],
  home(w,L,.4),
  [sent,{dy:0,o:1},{duration:.55,ease:settle,at:.55}],
 ]};
}

/** Beat 3: two memories float on the left. A tendril reaches each one, the membrane closes around its shape, and the shape is hauled
 * across and swallowed: the body bulges, the shape sinks in, and its name settles onto the "recalled" line. */
function recall(w:World,L:Layout,sizes:Size[],pool:(Floating|null)[],s:Story):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1]=w.K,[U0,U1]=w.U,row=L.rows[1];
 const one=(S:Strand,K:Cell,U:Cell,slot:number,t:number):AnimationSequence=>{const n=w.nodes[slot],M=L.slots[slot],P=L.rims[slot],pk=pocket(sizes[slot],k,M);return [
  lookAt(w,M,t+.05),
  // the organism reaches for it: a tendril crosses the gap
  [S,{ax:P.x,ay:P.y,bx:P.x,by:P.y,r:9*k,taper:.35,tone:1},{duration:.01,at:t}],
  [S,{bx:M.x,by:M.y},{duration:.7,ease:out,at:t+.02}],
  // grabbed: the drift stops, the membrane closes around the shape, the thing lights up
  [n,{free:0},{duration:.3,at:t+.6}],
  [K,{px:pk.px,py:pk.py,...zero,r:pk.r,tone:1,w:1.3,rot:0},{duration:.01,at:t+.72}],
  [K,{hw:pk.hw,hh:pk.hh},{...spring(210,14),at:t+.75}],
  [n,{flash:1},{duration:.1,at:t+.75}],[n,{flash:0},{duration:.4,ease:out,at:t+.85}],
  [n,{s:1.1},{duration:.14,ease:out,at:t+.75}],
  [n,{s:1},{duration:.35,at:t+.89}],
  // a first packet streams down the tendril, then the label folds and the shape is hauled to the rim
  [U,{px:M.x,py:M.y,...zero,r:5*k,tone:1,w:1.3,rot:0},{duration:.01,at:t+1.15}],
  [U,{hw:5*k,hh:5*k},{duration:.15,at:t+1.17}],
  [U,{px:P.x,py:P.y},{duration:.55,ease:inOut,at:t+1.32}],
  [U,zero,{duration:.15,at:t+1.87}],
  [n,{t:0},{duration:.25,at:t+1.3}],
  [S,{r:13*k},{duration:.3,at:t+1.5}],
  [K,{px:P.x,py:P.y,hw:pk.hw*.85,hh:pk.hh*.85},{duration:.85,ease:haul,at:t+1.5}],
  [n,{px:P.x,py:P.y,s:.85},{duration:.85,ease:haul,at:t+1.5}],
  [S,{bx:P.x,by:P.y},{duration:.85,ease:haul,at:t+1.5}],
  // swallowed: the shape sinks into the body, which bulges, and the glyph slides onto its row
  [n,{s:.3,o:0},{duration:.3,at:t+2.35}],
  [K,{hw:9*k,hh:9*k,r:9*k},{duration:.3,at:t+2.35}],
  [S,{r:0},{duration:.25,at:t+2.35}],
  [w.env,{pulse:1},{duration:.12,at:t+2.4}],
  [w.env,{pulse:0},{duration:.35,at:t+2.52}],
  [K,{px:row.x,py:row.y},{duration:.4,ease:inOut,at:t+2.65}],
  [K,zero,{duration:.25,at:t+3.05}],
 ];};
 const a=slotOf(pool,s.memories[0].title),b=slotOf(pool,s.memories[1].title);
 return {still:2.0,seq:[
  ...one(S0,K0,U0,a<0?0:a,0),
  ...one(S1,K1,U1,b<0?1:b,.5),
  ...widen(w,.8,1.2),
  ...land(w,L,1,2.9),...arrive(w,1,3.3),...ripple(w,1,3.8),
  home(w,L,4.3),
 ]};
}

/** Beat 4: instructions and a skill bud from the rim and sink into the work. */
function prepare(w:World,L:Layout):Beat{
 const k=L.k,[K0,K1]=w.K,row=L.rows[2],top=L.panel.top;
 const bud=(K:Cell,x:number,hw:number,t:number):AnimationSequence=>[
  [K,{px:x,py:top+2,...zero,r:14*k,tone:1.6,w:1.3,rot:0},{duration:.01,at:t}],
  [K,{hw,hh:14*k},{...spring(200,15),at:t+.02}],
  lookAt(w,{x,y:top},t+.15,.35),
  [K,{px:row.x+(x>L.panel.cx?26*k:0),py:row.y,hw:hw*.45,hh:9*k},{duration:.6,ease:settle,at:t+1.0}],
  [K,zero,{duration:.35,at:t+1.6}],
 ];
 return {still:1.1,seq:[
  ...bud(K0,L.panel.cx-L.panel.hw*.3,Math.max(44,58*k),0),
  ...bud(K1,L.panel.cx+L.panel.hw*.2,Math.max(52,70*k),.7),
  ...land(w,L,2,1.2),...arrive(w,2,1.6),...ripple(w,2,2.3),
  home(w,L,2.7),
 ]};
}

/** Beat 5: a teammate and a subagent float on the right. Tendrils reach them, the task itself travels the whole way, they get busy,
 * context comes back, and they are let go to float again. The right head wakes to watch. */
function reach(w:World,L:Layout,sizes:Size[]):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1,K2]=w.K,[U0,U1]=w.U,row=L.rows[3];
 const one=(S:Strand,U:Cell,K:Cell,slot:number,t:number):AnimationSequence=>{const n=w.nodes[slot],T=L.slots[slot],Q=L.rims[slot],pk=pocket(sizes[slot],k,T);return [
  lookAt(w,T,t+.05),
  [S,{ax:Q.x,ay:Q.y,bx:Q.x,by:Q.y,r:8*k,taper:.3,tone:2},{duration:.01,at:t}],
  [S,{bx:T.x,by:T.y},{duration:.7,ease:out,at:t+.02}],
  [n,{free:0},{duration:.3,at:t+.6}],
  [U,{px:pk.px,py:pk.py,...zero,r:pk.r,tone:2,rot:0},{duration:.01,at:t+.72}],
  [U,{hw:pk.hw,hh:pk.hh},{...spring(240,15),at:t+.75}],
  [n,{s:1.08},{duration:.14,ease:out,at:t+.75}],
  [n,{s:1},{duration:.3,at:t+.89}],
  // the task leaves its row, crosses the rim and rides the whole tendril to be received
  [K,{px:row.x,py:row.y,hw:7*k,hh:7*k,r:7*k,tone:0,w:1.4},{duration:.01,at:t+.9}],
  [K,at(Q),{duration:.45,ease:inOut,at:t+.95}],
  [K,at(T),{duration:.75,ease:inOut,at:t+1.4}],
  [K,zero,{duration:.15,at:t+2.15}],
  [n,{s:1.2},{duration:.15,ease:out,at:t+2.1}],
  [n,{s:1},{duration:.4,at:t+2.25}],
  // received: the teammate starts typing, the subagent's ring spins
  [n,{busy:1},{duration:.2,at:t+2.15}],
  [n,{busy:0},{duration:.2,at:t+2.95}],
  // release: the pocket opens, the tendril returns, the thing floats again
  [U,zero,{duration:.4,at:t+3.05}],
  [S,{bx:Q.x,by:Q.y,taper:.9},{duration:.5,ease:inOut,at:t+3.05}],
  [S,{r:0},{duration:.2,at:t+3.5}],
  [n,{free:1},{duration:.5,at:t+3.1}],
 ];};
 return {still:1.9,seq:[
  ...one(S0,U0,K0,3,0),
  ...one(S1,U1,K1,4,.45),
  ...land(w,L,3,.4),...arrive(w,3,.75),
  [w.eyes[1],{o:1,lid:0},{duration:.35,at:.4}],
  [w.eyes[1],{lid:1},{duration:.3,at:3.5}],
  [w.eyes[1],{o:0},{duration:.3,at:3.8}],
  // the teammate sends context back the same way
  [K2,{...at(L.slots[3]),hw:6*k,hh:6*k,r:6*k,tone:2,w:1.4},{duration:.01,at:2.4}],
  [K2,at(L.rims[3]),{duration:.55,ease:inOut,at:2.45}],
  [K2,{px:row.x,py:row.y},{duration:.4,ease:inOut,at:3.0}],
  [K2,zero,{duration:.2,at:3.4}],
  ...ripple(w,3,3.35),
  home(w,L,3.9),
 ]};
}

/** Beat 6: the reply types itself; a second look runs along it and approves. The lead thinks with half-closed eyes, then blinks. */
function check(w:World,L:Layout,story:Story):Beat{
 const k=L.k,[K0]=w.K,R=L.reply,[a,b,c]=story.reply;
 return {still:3,seq:[
  [w.rows[4],{dy:8*k},{duration:.01,at:0}],
  [w.rows[4],{o:1,dy:0},{duration:.4,ease:settle,at:0}],
  [w.lines,{typing:1},{duration:.3,at:.1}],
  [w.eyes[0],{lid:.35},{duration:.3,at:.2}],
  lookAt(w,{x:R.x+R.w/2,y:R.y+R.h/2},.2),
  [w.lines,{typing:0},{duration:.25,at:1.0}],
  [w.eyes[0],{lid:0},{duration:.3,at:1.1}],
  [w.lines,{a},{duration:.5,ease:out,at:1.1}],
  [w.lines,{b},{duration:.5,ease:out,at:1.35}],
  [w.lines,{c},{duration:.45,ease:out,at:1.6}],
  [K0,{px:R.x+R.w-8,py:R.y+R.h+2,...zero,tone:1,w:1.4,rot:0},{duration:.01,at:2.05}],
  [K0,{hw:7*k,hh:7*k,r:7*k},{duration:.15,at:2.1}],
  [K0,{px:R.x+8},{duration:.9,ease:inOut,at:2.25}],
  [K0,zero,{duration:.2,at:3.15}],
  [w.lines,{check:1},{duration:.3,at:3.0}],
  ...blink(w,3.05),
  home(w,L,3.5),
 ]};
}

/** Beat 7: one line of the reply is worth keeping. It settles on the "kept" line, then is carried out along a tendril and placed in the
 * environment as a new thing that takes shape and starts to float there, where the next thought can find it. */
function keep(w:World,L:Layout,sizes:Size[]):Beat{
 const k=L.k,[,S1]=w.strands,[K0]=w.K,n=w.nodes[KEPT_SLOT],R=L.reply,row=L.rows[5],M=L.slots[KEPT_SLOT],P=L.rims[KEPT_SLOT];
 return {still:3.2,seq:[
  [n,{...at(M),o:0,s:.4,t:0,free:0,rip:1,flash:0,busy:0},{duration:.01,at:0}],
  [K0,{px:R.x+R.w*.4,py:R.y+R.h*.55,...zero,tone:1,w:1.5,rot:0},{duration:.01,at:0}],
  [K0,{hw:8*k,hh:8*k,r:8*k},{duration:.2,at:.1}],
  lookAt(w,{x:R.x+R.w*.4,y:R.y+R.h*.55},0,.3),
  [K0,{px:row.x,py:row.y},{duration:.7,ease:inOut,at:.4}],
  ...land(w,L,5,.85),...arrive(w,5,1.15),
  [K0,at(P),{duration:.5,ease:inOut,at:1.3}],
  // carried out along a tendril to where the memories live
  [S1,{ax:P.x,ay:P.y,bx:P.x,by:P.y,r:9*k,taper:.3,tone:1},{duration:.01,at:1.4}],
  [S1,{bx:M.x,by:M.y},{duration:.85,ease:out,at:1.45}],
  [K0,at(M),{duration:.85,ease:out,at:1.8}],
  lookAt(w,M,1.9),
  // placed: the body lets go, a new thing takes shape and starts to float
  [K0,{hw:0,hh:0},{duration:.3,at:2.7}],
  ...surface(n,M,2.66,0),
  [n,{t:1},{duration:.3,at:2.95}],
  ...blink(w,3.2),
  [S1,{bx:P.x,by:P.y,taper:.95},{duration:.5,ease:inOut,at:3.3}],
  [S1,{r:0},{duration:.2,at:3.75}],
  [n,{free:1},{duration:.6,at:3.4}],
  home(w,L,3.8),
 ]};
}

/** Beat 8: the organism re-reads the thread (a ripple runs down the rows), a rhythm is noticed along the rim, and an offer is made. */
function notice(w:World,L:Layout):Beat{
 const k=L.k,[K0,K1,K2]=w.K,Y=w.Y,row=L.rows[6],y=L.panel.bottom-9*k;
 const dot=(K:Cell,x:number,t:number):AnimationSequence=>[
  [K,{px:x,py:y,...zero,r:5*k,tone:3,w:1.6,rot:0},{duration:.01,at:t}],
  [K,{hw:5*k,hh:5*k},{duration:.18,ease:out,at:t+.02}],
  [w.env,{pulse:1},{duration:.1,at:t}],
  [w.env,{pulse:0},{duration:.32,at:t+.1}],
 ];
 return {still:2.6,seq:[
  ...[1,2,3,5].flatMap((i,j)=>ripple(w,i,.05+j*.16)),
  ...dot(K0,L.panel.cx-44*k,0),...dot(K1,L.panel.cx,.32),...dot(K2,L.panel.cx+44*k,.64),
  lookAt(w,{x:L.panel.cx,y},.3),
  [[K0,K1,K2],{px:row.x,py:row.y,hw:7*k,hh:7*k,r:7*k},{duration:.55,ease:inOut,at:1.05}],
  [[K1,K2],zero,{duration:.2,at:1.5}],
  [Y,{px:L.panel.right+2,py:row.y,...zero,r:16*k,tone:3,rot:0},{duration:.01,at:1.5}],
  [Y,{hw:18*k,hh:14*k},{...spring(210,15),at:1.55}],
  [K0,zero,{duration:.3,at:1.6}],
  ...land(w,L,6,1.4),...arrive(w,6,1.55),...ripple(w,6,2.7),
  lookAt(w,{x:row.x+40*k,y:row.y},1.6),
  ...widen(w,1.7,.9),
  // hold for the visitor, then the offer sinks back into the body
  [Y,{hw:0,hh:0,px:L.panel.right-8},{duration:.5,ease:inOut,at:4.2}],
  home(w,L,4.4),
 ]};
}

/** `again` is true for every thought after the first (an earlier exchange is folded), whatever story it plays. */
function buildBeat(beat:number,w:World,L:Layout,run:number,sizes:Size[],again:boolean,pool:(Floating|null)[]):Beat|null{
 const s=storyAt(run);
 switch(beat){
  case 1:return bond(w,L);
  case 2:return launch(w,L,again,pool.map((f,i)=>f&&!f.eaten&&i!==KEPT_SLOT?i:-1).filter(i=>i>=0));
  case 3:return recall(w,L,sizes,pool,s);
  case 4:return prepare(w,L);
  case 5:return reach(w,L,sizes);
  case 6:return check(w,L,s);
  case 7:return keep(w,L,sizes);
  case 8:return notice(w,L);
  default:return null;
 }
}

/* ── Component ── */

type Fold={prompt:string;kept:string};

export function PromptBond({moving,quiet,clock}:{moving:boolean;active?:boolean;quiet:boolean;clock?:React.ReactNode}){
 const [beat,setBeat]=React.useState(0);
 const [prompt,setPrompt]=React.useState('');
 const [sent,setSent]=React.useState('');
 const [run,setRun]=React.useState(0);
 const [folds,setFolds]=React.useState<Fold[]>([]);
 const [noted,setNoted]=React.useState(false);
 const [stopped,setStopped]=React.useState(false);
 const [checkOn,setCheckOn]=React.useState(false);
 const [glyphOn,setGlyphOn]=React.useState<boolean[]>(()=>Array(ROWS).fill(false));
 const [picked,setPicked]=React.useState<string|null>(null);
 const [ready,setReady]=React.useState(0);
 const glyphRef=React.useRef<boolean[]>(Array(ROWS).fill(false));
 const input=React.useRef<HTMLInputElement>(null),form=React.useRef<HTMLFormElement>(null),stage=React.useRef<HTMLElement>(null),panel=React.useRef<HTMLDivElement>(null);
 const membrane=React.useRef<MembraneHandle>(null);
 const eyeRefs=React.useRef<(HTMLSpanElement|null)[]>([]),foldEl=React.useRef<HTMLDivElement>(null);
 const nodeRefs=React.useRef<(HTMLSpanElement|null)[]>([]),rowRefs=React.useRef<(HTMLElement|null)[]>([]),reply=React.useRef<HTMLDivElement>(null);
 const world=React.useRef(createWorld()),roam=React.useRef(createRoam()),layout=React.useRef<Layout|null>(null);
 const capture=React.useRef<Capture|null>(null),formDy=React.useRef(0),reached=React.useRef(0),pending=React.useRef<string|null>(null);
 const controls=React.useRef<AnimationPlaybackControls|null>(null),generation=React.useRef(0);
 const clock_=React.useRef(0),pointer=React.useRef<Point|null>(null),checkRef=React.useRef(false);
 const typing=React.useRef<{text:string;at:number;fast:boolean;n:number}|null>(null),typed=React.useRef(false),idle=React.useRef<number|null>(null);
 const scene=React.useRef({cells:Array.from({length:15},():MembraneCell=>({x:0,y:0,hw:0,hh:0,r:0,tone:0,rot:0,w:1})),strands:Array.from({length:8},():MembraneStrand=>({ax:0,ay:0,bx:0,by:0,r:0,tone:0,taper:0,w:1}))});
 const bonded=beat>0;
 const story=storyAt(run),lastFold=folds[folds.length-1];
 const upTo=beat===LAST&&stopped?reached.current:beat;
 const pool=React.useMemo(()=>poolFor(story,upTo,lastFold?.kept??''),[story,upTo,lastFold]);
 const state=React.useRef({moving,quiet,beat,prompt,run,sent,stopped,folded:folds.length>0,pool});
 state.current={moving,quiet,beat,prompt,run,sent,stopped,folded:folds.length>0,pool};
 const startRef=React.useRef<()=>void>(()=>{});

 /* Steering for one free organism: wander with arrival, keep company, keep off the prompt text. */
 const stepRoam=React.useCallback((i:number,dt:number,L:Layout)=>{
  const R=roam.current,r=R[i],k=L.k,F=L.field,cap=capture.current;
  if(cap){
   const tc=clock_.current-cap.t0,dock=L.docks[i],from=cap.from[i],startAt=.28+i*.07;
   if(tc>=1.3){r.x=dock.x;r.y=dock.y;r.vx=r.vy=0;return;}
   if(tc<startAt){const dx=dock.x-from.x,dy=dock.y-from.y,d=Math.hypot(dx,dy)||1,pull=(i<2?22:12)*k;damp(r,from.x-dx/d*pull,from.y-dy/d*pull,.18,dt);}
   else damp(r,dock.x,dock.y,i<2?.22:.2,dt);
   return;
  }
  r.wait-=dt;
  let dx=r.tx-r.x,dy=r.ty-r.y,d=Math.hypot(dx,dy);
  if(r.wait<=0||d<18*k){
   const b=L.bounds;
   if(Math.random()<.4){const a=Math.random()*Math.PI*2;r.tx=F.cx+Math.cos(a)*(F.hw+70*k+Math.random()*90*k);r.ty=F.cy+Math.sin(a)*(F.hh+60*k+Math.random()*70*k);}
   else{r.tx=b.x0+Math.random()*(b.x1-b.x0);r.ty=b.y0+Math.random()*(b.y1-b.y0);}
   r.tx=Math.min(b.x1,Math.max(b.x0,r.tx));r.ty=Math.min(b.y1,Math.max(b.y0,r.ty));
   r.wait=2.5+Math.random()*4;dx=r.tx-r.x;dy=r.ty-r.y;d=Math.hypot(dx,dy)||1;
  }
  const maxS=(i<2?36:48)*k*(.85+.3*((i*7)%5)/5),maxF=(i<2?60:80)*k,arrive=Math.min(1,d/(140*k));
  let fx=dx/d*maxS*arrive-r.vx,fy=dy/d*maxS*arrive-r.vy;
  const fm=Math.hypot(fx,fy);if(fm>maxF){fx*=maxF/fm;fy*=maxF/fm;}
  for(let j=0;j<ORGANISMS;j++){if(j===i)continue;const ex=r.x-R[j].x,ey=r.y-R[j].y,dd=Math.hypot(ex,ey)||1,minD=r.r+R[j].r+30*k;if(dd<minD){fx+=ex/dd*(minD-dd)*4;fy+=ey/dd*(minD-dd)*4;}}
  const kx=F.hw+30*k-Math.abs(r.x-F.cx),ky=F.hh+26*k-Math.abs(r.y-F.cy);
  if(kx>0&&ky>0){if(kx<ky)fx+=Math.sign(r.x-F.cx||1)*kx*6;else fy+=Math.sign(r.y-F.cy||1)*ky*6;}
  const b=L.bounds;if(r.x<b.x0)fx+=(b.x0-r.x)*5;if(r.x>b.x1)fx+=(b.x1-r.x)*5;if(r.y<b.y0)fy+=(b.y0-r.y)*5;if(r.y>b.y1)fy+=(b.y1-r.y)*5;
  r.vx+=fx*dt;r.vy+=fy*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;
 },[]);

 /* Paint one frame: the membrane, then the DOM that rides on it. */
 const paint=React.useCallback((delta:number)=>{
  const w=world.current,L=layout.current,m=membrane.current;if(!L||!m)return;
  const {moving:live,quiet:still}=state.current;
  const dt=live&&!still?Math.min(delta,40)/1000:0;clock_.current+=dt;
  const t=clock_.current,k=L.k,f=w.env.free,p=pointer.current,R=roam.current;
  if(f>0)for(let i=0;i<ORGANISMS;i++)stepRoam(i,dt,L);
  // typing rides the same clock so a paused page pauses the typing too
  const ty=typing.current;
  if(ty){const per=ty.fast?.5/ty.text.length:.055;const n=Math.min(ty.text.length,Math.floor((t-ty.at)/per));if(n!==ty.n){ty.n=n;setPrompt(ty.text.slice(0,n));}if(n===ty.text.length&&t-ty.at>per*n+(ty.fast?.12:.4)){typing.current=null;startRef.current();}}
  const breath=1+w.env.breath*.012*Math.sin(t*1.9),pulse=w.env.pulse*3*k;
  const out=scene.current.cells;
  const put=(i:number,c:Cell,x=c.px,y=c.py,hw=c.hw,hh=c.hh,r=c.r,rot=c.rot)=>{const o=out[i];o.x=x;o.y=y;o.hw=hw;o.hh=hh;o.r=r;o.tone=c.tone;o.rot=rot;o.w=c.w;};
  const lean=(r:Roam)=>{if(!p||f<=0||capture.current)return {x:0,y:0};const dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy);if(d>150*k||d<1)return {x:0,y:0};const a=(1-d/(150*k))*9*k*f;return {x:dx/d*a,y:dy/d*a};};
  const pos:Point[]=[];
  [w.A,w.B,...w.O].forEach((c,i)=>{
   const r=R[i],sp=Math.hypot(r.vx,r.vy),e=Math.min(.32,sp/(110*k)),ang=sp>1?Math.atan2(r.vy,r.vx):0,l=lean(r),bob=Math.sin(t*1.1+r.seed)*3*k;
   const x=c.px+(r.x+l.x-c.px)*f,y=c.py+(r.y+l.y+bob-c.py)*f;
   const hw=(c.hw+(r.r*(1+e)-c.hw)*f)*breath,hh=(c.hh+(r.r*(1-e*.5)-c.hh)*f)*breath,rr=c.r+(r.r-c.r)*f;
   pos[i]={x,y};put(i,c,x,y,hw,hh,rr,f>0?ang:c.rot);
  });
  put(6,w.PL,w.PL.px,w.PL.py,w.PL.hw,w.PL.hh*breath+pulse);put(7,w.PR,w.PR.px,w.PR.py,w.PR.hw,w.PR.hh*breath+pulse);
  w.K.forEach((c,i)=>put(8+i,c));w.U.forEach((c,i)=>put(12+i,c));put(14,w.Y);
  const strands=scene.current.strands;
  w.strands.forEach((s,i)=>{Object.assign(strands[i],s);});
  // curious pseudopods: the two leads probe toward the prompt while free
  const probe=(i:number,host:Point,target:Point,phase:number)=>{const s=strands[6+i],amt=(capture.current?0:f)*Math.pow(Math.max(0,Math.sin(t*.8+phase)),3);const dx=target.x-host.x,dy=target.y-host.y,d=Math.hypot(dx,dy)||1;s.ax=host.x;s.ay=host.y;s.bx=host.x+dx/d*46*k*amt;s.by=host.y+dy/d*46*k*amt;s.r=9*k*amt;s.taper=.7;s.tone=i?2:0;s.w=1;};
  probe(0,pos[0],{x:L.endL.x+40*k,y:L.field.cy},0);probe(1,pos[1],{x:L.endR.x-40*k,y:L.field.cy},2.4);
  m.draw({cells:out,strands,blend:24*k+4,wobble:still?0:w.env.wobble,contour:w.env.contour,time:t});
  // DOM riding on the body
  const gazeTo=(from:Point)=>{let tx:number,ty:number;if(w.gaze.w>.5){tx=w.gaze.px;ty=w.gaze.py;}else if(p){tx=p.x;ty=p.y;}else{tx=L.field.cx;ty=L.field.cy;}const dx=tx-from.x,dy=ty-from.y,d=Math.hypot(dx,dy)||1,a=Math.min(1,d/80)*3.5*k;return {x:dx/d*a,y:dy/d*a};};
  w.eyes.forEach((e,i)=>{const el=eyeRefs.current[i];if(!el)return;const g=gazeTo(pos[i]);el.style.transform=`translate(${(pos[i].x+g.x).toFixed(1)}px,${(pos[i].y+g.y-2*k).toFixed(1)}px)`;el.style.opacity=String(e.o);el.style.setProperty('--lid',e.lid.toFixed(3));});
  // things drift on their own while free; a held thing sits exactly where the tendril has it
  w.nodes.forEach((n,i)=>{const el=nodeRefs.current[i];if(!el)return;const d=still?0:n.free,ox=Math.sin(t*.55+i*1.3)*9*k*d,oy=Math.cos(t*.42+i*.9)*7*k*d,rot=Math.sin(t*.35+i)*3*d;
   el.style.transform=`translate(${(n.px+ox).toFixed(1)}px,${(n.py+oy).toFixed(1)}px) translate(${-(el.dataset.gx??0)}px,-50%) rotate(${rot.toFixed(2)}deg) scale(${n.s.toFixed(3)})`;el.style.opacity=String(n.o);
   const st=el.style;st.setProperty('--t',n.t.toFixed(3));st.setProperty('--rip',n.rip.toFixed(3));st.setProperty('--flash',n.flash.toFixed(3));st.setProperty('--busy',n.busy.toFixed(3));});
  if(state.current.beat===2&&w.rows[0].o>.05&&state.current.prompt)setPrompt('');
  if(pending.current&&w.rows[0].o<.05){setSent(pending.current);pending.current=null;}
  w.rows.forEach((r,i)=>{const el=rowRefs.current[i];if(!el)return;el.style.opacity=String(r.o);el.style.setProperty('--dy',`${r.dy.toFixed(1)}px`);el.style.setProperty('--p',r.p.toFixed(3));el.style.setProperty('--g',r.g.toFixed(3));
   const on=r.g>.4;if(glyphRef.current[i]!==on){glyphRef.current[i]=on;setGlyphOn(prev=>{const next=[...prev];next[i]=on;return next;});}
   const hidden=r.o<.5;if(el.inert!==hidden){el.inert=hidden;el.setAttribute('aria-hidden',hidden?'true':'false');}});
  if(foldEl.current){foldEl.current.style.opacity=String(w.fold.o);foldEl.current.style.transform=`translateY(${w.fold.dy.toFixed(1)}px)`;}
  if(reply.current){const el=reply.current;el.style.setProperty('--la',String(w.lines.a));el.style.setProperty('--lb',String(w.lines.b));el.style.setProperty('--lc',String(w.lines.c));el.style.setProperty('--check',String(w.lines.check));el.style.setProperty('--typing',String(w.lines.typing));const on=w.lines.check>.5;if(on!==checkRef.current){checkRef.current=on;setCheckOn(on);}}
  if(form.current){const dy=w.env.panel*L.composerDy;formDy.current=dy;form.current.style.transform=`translateY(${dy.toFixed(1)}px)`;form.current.style.setProperty('--line',w.env.underline.toFixed(3));}
  if(panel.current){const el=panel.current,open=w.env.panel>.5;el.style.opacity=String(w.env.panel);if((el.dataset.open==='true')!==open){el.dataset.open=open?'true':'false';el.inert=!open;}}
 },[stepRoam]);

 /* One clock, painting after Motion's own render step so seeks and completions are already written. */
 const paintSoon=React.useCallback((frames=4)=>{let left=frames;const tick=()=>{paint(0);if(--left<=0)cancelFrame(tick);};frame.postRender(tick,true);},[paint]);
 React.useEffect(()=>{
  const tick=({delta}:{delta:number})=>paint(delta);
  if(moving&&!quiet){frame.postRender(tick,true);return()=>cancelFrame(tick);}
  paintSoon();
 },[moving,quiet,paint,paintSoon,beat,ready]);

 /* Layout follows the real prompt field and panel; the settled pose is re-fitted on resize. */
 const relayout=React.useCallback(()=>{
  if(!stage.current||!form.current||!panel.current)return;
  const L=measure(stage.current,form.current,panel.current,rowRefs.current,reply.current,formDy.current);if(!L)return;
  const first=!layout.current;layout.current=L;
  const w=world.current,{beat:b,stopped:st,folded,pool:pl}=state.current;
  if(b===0)restPose(w,L,roam.current,pl);else if(b===1)bondedPose(w,L,roam.current,pl);else panelPose(w,L,roam.current,b===LAST&&st?reached.current:b,folded,pl);
  if(first||b>0)setReady(v=>v+1);
 },[]);
 /* A folded thread shifts the rows; re-measure them without touching the pose. */
 React.useLayoutEffect(()=>{
  if(!folds.length||!stage.current||!form.current||!panel.current)return;
  const L=measure(stage.current,form.current,panel.current,rowRefs.current,reply.current,formDy.current);if(L)layout.current=L;
 },[folds.length]);

 /* Build the current beat's timeline; play, pause or seek according to the motion gates. */
 React.useEffect(()=>{
  const L=layout.current,w=world.current;
  controls.current?.stop();controls.current=null;
  if(!L)return;
  if(beat===1){
   // the organisms fly in from wherever they are; the heads' tween targets are their docks
   if(!capture.current)capture.current={t0:clock_.current,from:roam.current.map(r=>({x:r.x,y:r.y}))};
   [w.A,w.B,...w.O].forEach((c,i)=>Object.assign(c,at(L.docks[i])));
   if(quiet||!moving)roam.current.forEach((r,i)=>{r.x=L.docks[i].x;r.y=L.docks[i].y;r.vx=r.vy=0;});
  } else capture.current=null;
  // measure each thing's shape, and remember where it sits so the thing scales and folds around it
  const sizes=nodeRefs.current.map((el):Size=>{
   if(!el)return {w:30,h:30};
   const g=el.querySelector<HTMLElement>('.thing-shape'),w=g?.offsetWidth??30,h=g?.offsetHeight??30,gx=g?g.offsetLeft+w/2:w/2;
   el.dataset.gx=gx.toFixed(1);el.style.transformOrigin=`${gx.toFixed(1)}px 50%`;
   return {w,h};
  });
  const built=buildBeat(beat,w,L,run,sizes,folds.length>0,pool);
  if(!built){if(beat===0)restPose(w,L,roam.current,pool);else panelPose(w,L,roam.current,stopped?reached.current:beat,folds.length>0,pool);return;}
  const own=++generation.current;
  const c=animate(built.seq,{defaultTransition:{ease:'easeInOut'}});
  controls.current=c;
  if(quiet||!moving){c.pause();c.time=quiet?built.still:0;}
  c.finished.then(()=>{if(generation.current!==own||!state.current.moving||state.current.quiet)return;c.complete();setBeat(b=>Math.min(LAST,b+1));},()=>{});
  return()=>{generation.current++;if(controls.current===c){c.stop();controls.current=null;}};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[beat,ready,quiet,run]);
 React.useEffect(()=>{const c=controls.current;if(!c||quiet)return;if(moving)c.play();else c.pause();},[moving,quiet]);

 /* Enter from anywhere on the page, or the field itself, begins the bond. An empty field types a thought first. */
 const nextPrompt=()=>storyAt(state.current.beat===0?0:state.current.run+1).prompt;
 const typeThenStart=React.useCallback((text:string,fast:boolean)=>{
  if(state.current.quiet||!state.current.moving){setPrompt(text);typing.current=null;window.setTimeout(()=>startRef.current(),60);return;}
  typing.current={text,at:clock_.current,fast,n:0};
 },[]);
 const start=React.useCallback(()=>{
  const {beat:b,prompt:text,quiet:still,moving:live}=state.current;
  if(b!==0&&b!==LAST)return;
  if(typing.current){const ty=typing.current;typing.current=null;setPrompt(ty.text);window.setTimeout(()=>startRef.current(),40);return;}
  if(!text.trim()){typeThenStart(nextPrompt(),true);return;}
  typed.current=false;setNoted(false);setPicked(null);input.current?.blur();
  // a thought that matches one of the stories plays that story; anything else plays the next one in the cycle
  const chosen=stories.findIndex(s=>s.prompt===text.trim());
  if(b===0){if(chosen>=0)setRun(chosen);setSent(text.trim());setBeat(1);return;}
  // a later thought: the last exchange folds away and the new one launches into the same panel
  const previous=storyAt(state.current.run);
  setFolds(f=>[...f,{prompt:state.current.sent,kept:state.current.stopped?'':previous.kept.title}].slice(-3));
  if(still||!live)setSent(text.trim());else pending.current=text.trim();
  setStopped(false);setRun(r=>chosen>=0?chosen:r+1);setBeat(2);
 },[typeThenStart]);
 startRef.current=start;
 /* The send button is a stop button while the organism works: what was reached stays, the rest is let go. */
 const stop=(e:React.MouseEvent)=>{
  e.preventDefault(); // the same button is a submit button once the composer returns; the click's default action would send at once
  const b=state.current.beat;if(b<2||b>=LAST)return;
  reached.current=b;setStopped(true);controls.current?.complete();setBeat(LAST);
 };
 React.useEffect(()=>{
  const onEnter=(e:KeyboardEvent)=>{if(e.key!=='Enter'||e.isComposing||e.defaultPrevented)return;
   const target=e.target as HTMLElement;
   if(target!==input.current&&target.closest('input,button,a,textarea,[role=button],[role=switch],[contenteditable]'))return;
   if(state.current.beat!==0&&state.current.beat!==LAST)return;
   e.preventDefault();start();
  };
  window.addEventListener('keydown',onEnter);return()=>window.removeEventListener('keydown',onEnter);
 },[start]);

 /* Nobody typing for a while: the page types a thought itself and sends it. Any key or tap cancels. */
 React.useEffect(()=>{
  if(!moving||quiet||(beat!==0&&beat!==LAST))return;
  const clear=()=>{if(idle.current!==null){window.clearTimeout(idle.current);idle.current=null;}};
  const arm=()=>{clear();idle.current=window.setTimeout(()=>{idle.current=null;if(typed.current||typing.current||state.current.prompt.trim())return;typeThenStart(nextPrompt(),false);},IDLE_MS);};
  const activity=(e:Event)=>{if(typing.current&&!(e.type==='keydown'&&(e as KeyboardEvent).key==='Enter'))typing.current=null;arm();};
  window.addEventListener('keydown',activity,true);window.addEventListener('pointerdown',activity,true);
  arm();
  return()=>{clear();window.removeEventListener('keydown',activity,true);window.removeEventListener('pointerdown',activity,true);};
 },[moving,quiet,beat,typeThenStart]);

 const next=()=>{controls.current?.complete();setBeat(b=>Math.min(LAST,b+1));};
 const back=()=>{controls.current?.complete();setBeat(b=>Math.max(1,b-1));};
 const acceptSuggestion=()=>{setNoted(true);const c=controls.current;if(c&&c.time<4.05)c.time=4.05;if(!moving||quiet)paintSoon();};
 /* A picked thought shrinks away as it is typed quickly into the field and sent. */
 const pick=(text:string)=>{typing.current=null;typed.current=false;setPicked(text);typeThenStart(text,true);};
 const onPointer=(e:React.PointerEvent)=>{const s=stage.current?.getBoundingClientRect();if(!s)return;pointer.current={x:e.clientX-s.left,y:e.clientY-s.top};};
 const rows=rowsFor(story);
 const cue=beat===8&&noted?'Noted. It will be there next time.':beat===LAST&&stopped?'Stopped. Whenever you’re ready.':beats[beat].cue;
 const composing=beat===0||beat===LAST,working=bonded&&!composing;
 const suggestions=beat===0?stories.slice(0,3).map(s=>s.prompt):beat===LAST?[storyAt(run+1).prompt]:[];
 const compact=layout.current?!layout.current.roomy:false;
 React.useEffect(()=>{if(composing&&matchMedia('(hover:hover) and (pointer:fine)').matches)requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));},[composing]);
 const renderParts=(ps:Part[])=><span className="chat-row-text">{ps.map((p,j)=>p.b?<b key={j}>{p.t}</b>:<span key={j}>{p.t}</span>)}</span>;

 return <main className="prompt-story" ref={stage} data-beat={beat} data-bonded={bonded} data-moving={moving} data-quiet={quiet} data-compact={compact} onPointerMove={onPointer} onPointerLeave={()=>{pointer.current=null;}}>
  <Membrane ref={membrane} className="prompt-membrane" onMeasure={relayout}/>
  <div className="stage-layer" aria-hidden="true">
   {RADII.map((_,i)=><span key={i} className="eyes" data-small={i>1} ref={el=>{eyeRefs.current[i]=el;}}><i/><i/></span>)}
   {pool.map((f,i)=>{const th=f?.thing??null,kind=th?kindOf(th):'memory';return <span key={i} ref={el=>{nodeRefs.current[i]=el;}} className="thing" data-side={i<3?'left':'right'} data-kind={kind}>
    <span className="thing-shape"><i className="thing-ring"/><i className="thing-flash"/>{th?.initials?<b>{th.initials}</b>:<AnimatedIcon name={th?.icon??'brain'} size="sm"/>}<span className="thing-busy"><i/><i/><i/></span></span>
    <span className="thing-label"><em>{KIND_TITLE[kind]}</em><b>{th?.title??''}</b><small>{th?.sub??''}</small></span>
   </span>;})}
  </div>
  <div className="prompt-title">{clock&&<div className="prompt-clock">{clock}</div>}<h1>Every prompt.<br/>A little more alive.</h1></div>
  <div className="prompt-theatre" role="group" aria-label="An illustrative prompt lifecycle">
   <div className="chat-panel" ref={panel} data-open="false" inert>
    {lastFold&&<div className="chat-fold" ref={foldEl}><span className="chat-fold-prompt">› {lastFold.prompt}</span>{lastFold.kept&&<span className="chat-fold-kept"><AnimatedIcon name="bookmark" size="sm"/>{lastFold.kept}</span>}{folds.length>1&&<span className="chat-fold-more">+{folds.length-1} earlier</span>}</div>}
    <div className="chat-sent" ref={el=>{rowRefs.current[0]=el;}}><BubbleContent variant="me" className="chat-bubble chat-bubble-me">{sent}</BubbleContent></div>
    <ul className="chat-work">
     {[1,2,3].map(i=><li key={i} className="chat-row" data-tone={['memory','prepare','reach'][i-1]} ref={el=>{rowRefs.current[i]=el;}}><span className="chat-row-glyph"><AnimatedIcon name={ROW_ICONS[i]} preset={ROW_PRESET[i]} active={glyphOn[i]} size="sm"/></span>{renderParts(rows[i])}</li>)}
    </ul>
    <div className="chat-reply" ref={el=>{rowRefs.current[4]=el;}}><span className="chat-glyph" aria-hidden="true"/><div className="chat-bubble chat-bubble-reply" ref={reply}><span className="chat-typing" aria-hidden="true"><i/><i/><i/></span><i className="chat-line"/><i className="chat-line"/><i className="chat-line"/><span className="response-check"><AnimatedIcon name="check" preset="draw" active={checkOn} size="sm"/></span></div></div>
    <ul className="chat-work">
     <li className="chat-row" data-tone="kept" ref={el=>{rowRefs.current[5]=el;}}><span className="chat-row-glyph"><AnimatedIcon name="bookmark" preset={ROW_PRESET[5]} active={glyphOn[5]} size="sm"/></span>{renderParts(rows[5])}</li>
     <li className="chat-row chat-row-action" data-tone="automation" ref={el=>{rowRefs.current[6]=el;}}><Button variant="ghost" className="bud-button" onClick={acceptSuggestion} disabled={noted}><AnimatedIcon name={noted?'check':'workflow'} preset={noted?'auto':ROW_PRESET[6]} active={noted||glyphOn[6]} size="sm"/>{noted?'Automation saved':story.automation}</Button></li>
    </ul>
   </div>
   <form className="living-prompt" ref={form} data-has-text={composing&&prompt.trim().length>0} onSubmit={e=>{e.preventDefault();start();}}>
    <span className="prompt-prefix" aria-hidden="true">›</span>
    <InputControl ref={input} aria-label="Your prompt" value={prompt} maxLength={80} placeholder={beat===0?'Type a thought…':beat===LAST?'Next thought…':undefined} readOnly={!composing} onChange={e=>{typed.current=e.target.value.length>0;setPrompt(e.target.value);}} onKeyDown={e=>{if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault();}}/>
    <Button type={working?'button':'submit'} variant="ghost" data-morph="fill" data-tier="pill" className="prompt-send" data-state={working?'stop':'send'} disabled={beat===1} onClick={working?stop:undefined} aria-label={working?'Stop working':beat===LAST?'Send another thought':'Start the bond'}>
     <span className="send-glyph"><AnimatedIcon name="arrow-right" size="sm"/></span><span className="stop-glyph"><i/></span>
    </Button>
   </form>
  </div>
  <div className="prompt-caption">
   {suggestions.length>0&&<div className="prompt-thoughts" role="group" aria-label="Thoughts to try"><span className="thoughts-label">{beat===0?'or pick a thought':'next'}</span>{suggestions.map((s,i)=><Button key={s} variant="ghost" className="thought" style={{'--i':i} as React.CSSProperties} data-picked={picked===s} onClick={()=>pick(s)}><i className="thought-tail" aria-hidden="true"><b/><b/></i>{s}</Button>)}</div>}
   <p aria-live="polite" aria-atomic="true">{cue}</p>
   {beat===0?<Button className="enter-invitation" variant="ghost" onClick={start}>Press <kbd>Enter ↵</kbd></Button>
   :beat===LAST?<p className="again-hint">Type another thought and press <kbd>Enter ↵</kbd></p>
   :<div className="lifecycle-progress" aria-label={`Prompt lifecycle: ${beats[beat].label}`}>{beats.slice(1,LAST).map((b,i)=><span key={b.label} data-complete={beat>i+1} data-current={beat===i+1} title={b.label}/>)}</div>}
  </div>
  {bonded&&beat<LAST&&<div className="lifecycle-steps"><Button variant="ghost" className="lifecycle-step" onClick={back} disabled={beat<=1} aria-label="Previous lifecycle step"><span aria-hidden="true">←</span> Back</Button><Button variant="ghost" className="lifecycle-step" onClick={next} aria-label="Next lifecycle step">Next <span aria-hidden="true">→</span></Button></div>}
 </main>;
}
