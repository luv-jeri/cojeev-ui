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
const IDLE_MS=6500;

/** Something the organism reaches for outside the panel: a memory, a teammate, a subagent, a thing worth keeping. */
type Thing={title:string;sub:string;icon?:string;initials?:string};
type Story={prompt:string;memories:[Thing,Thing];woven:string;agents:[Thing,Thing];kept:Thing;automation:string;reply:[number,number,number]};
/** Illustrative conversations, one per thought. Each one recalls what the one before it kept. */
export const stories:Story[]=[
 {prompt:'Plan our next launch.',memories:[{title:'team decisions',sub:'12 notes',icon:'file-text'},{title:'last launch notes',sub:'kept three weeks ago',icon:'brain'}],woven:'your instructions, launch skill',agents:[{title:'a teammate',sub:'takes the timeline',initials:'MK'},{title:'a subagent',sub:'checks the dates',icon:'bot'}],kept:{title:'launch plan v1',sub:'kept for next time',icon:'bookmark'},automation:'Make this an automation?',reply:[1,.82,.56]},
 {prompt:'Draft the release notes.',memories:[{title:'launch plan v1',sub:'kept just now',icon:'bookmark'},{title:'changelog',sub:'34 commits',icon:'git-branch'}],woven:'your voice, release-notes skill',agents:[{title:'a teammate',sub:'reviews the wording',initials:'AR'},{title:'a subagent',sub:'collects the diffs',icon:'bot'}],kept:{title:'release notes v1',sub:'kept for next time',icon:'bookmark'},automation:'Draft notes on every release?',reply:[1,.9,.7]},
 {prompt:'Summarize this week for the team.',memories:[{title:'this week’s threads',sub:'7 conversations',icon:'list'},{title:'release notes v1',sub:'kept just now',icon:'bookmark'}],woven:'your instructions, summary skill',agents:[{title:'a teammate',sub:'adds the numbers',initials:'JL'},{title:'a subagent',sub:'reads the board',icon:'bot'}],kept:{title:'weekly summary',sub:'kept for next time',icon:'bookmark'},automation:'Summarize every Friday?',reply:[.9,1,.5]},
 {prompt:'Why did the deploy fail?',memories:[{title:'deploy log',sub:'last run',icon:'terminal'},{title:'runbook',sub:'kept two months ago',icon:'list'}],woven:'your instructions, debugging skill',agents:[{title:'an ops teammate',sub:'checks the cluster',initials:'SP'},{title:'a subagent',sub:'reads the trace',icon:'bot'}],kept:{title:'root cause: expired token',sub:'kept for next time',icon:'bookmark'},automation:'Watch deploys for this?',reply:[1,.7,.85]},
];
const storyAt=(run:number)=>stories[run%stories.length];
type Part={t:string;b?:boolean};
const rowsFor=(s:Story):Part[][]=>[
 [{t:'recalled · '},{t:s.memories[0].title,b:true},{t:', '},{t:s.memories[1].title,b:true}],
 [{t:'woven in · '},{t:s.woven,b:true}],
 [{t:'task → '},{t:s.agents[0].title,b:true},{t:' · notified '},{t:s.agents[1].title,b:true}],
 [{t:'kept · '},{t:s.kept.title,b:true}],
];
const kindOf=(th:Thing|null)=>th?.initials?'teammate':th?.icon==='bot'?'subagent':th?.icon==='bookmark'?'kept':'memory';
/** Which cards stand outside the panel in a beat: memories on the left, agents on the right, the kept thing back on the left. */
const thingsFor=(beat:number,s:Story):(Thing|null)[]=>beat===3?[s.memories[0],s.memories[1],null,null]:beat===5?[null,null,s.agents[0],s.agents[1]]:beat===7?[s.kept,null,null,null]:[null,null,null,null];
const ROW_ICONS=['','brain','sparkles','users','','bookmark',''];

/* ── World: plain objects the timelines tween and the frame loop paints ──
 * Positions are named px/py on purpose: Motion treats keys called x and y as
 * transform properties and snaps them under reduced motion, which would break
 * the seeked still poses. */

type Cell={px:number;py:number;hw:number;hh:number;r:number;tone:number;rot:number;w:number};
type Strand={ax:number;ay:number;bx:number;by:number;r:number;tone:number;taper:number;w:number};
/** A card outside the panel: anchored at its glyph, `s` scales it around that glyph, `t` reveals its text. */
type Node={px:number;py:number;o:number;s:number;t:number};
type Row={o:number;dy:number;p:number};
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
  nodes:Array.from({length:4},()=>({px:0,py:0,o:0,s:1,t:1})),
  rows:Array.from({length:ROWS},()=>({o:0,dy:0,p:0})),fold:{o:0,dy:0},
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
/** A measured card: its box, and where its glyph sits so a pocket can wrap the box while the anchor stays on the glyph. */
type Size={w:number;h:number;off:number};
type Rect={cx:number;cy:number;hw:number;hh:number};
type Layout={
 W:number;H:number;k:number;field:Rect;panel:Rect&{left:number;right:number;top:number;bottom:number};composerDy:number;
 endL:Point;endR:Point;docks:Point[];rest:Point[];bounds:{x0:number;y0:number;x1:number;y1:number};
 M1:Point;M2:Point;T1:Point;T2:Point;P1:Point;P2:Point;Q1:Point;Q2:Point;roomy:boolean;
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
 // the cards outside carry text when there is room beside the panel; otherwise only their glyph.
 // With room they sit far out near the page edges, so pulling one in crosses real distance.
 const roomy=left>=230*k&&W-right>=230*k;
 const farL=roomy?Math.max(150*k,left-300*k):left-30*k,farR=roomy?Math.min(W-150*k,right+300*k):right+30*k;
 const clampX=(x:number)=>Math.min(W-22*k,Math.max(22*k,x)),clampY=(y:number)=>Math.min(H-22*k,Math.max(22*k,y));
 const M1={x:clampX(farL),y:clampY(top+34*k)},M2={x:clampX(farL+16*k),y:clampY(bottom-84*k)};
 const T1={x:clampX(farR),y:clampY(top+58*k)},T2={x:clampX(farR-16*k),y:clampY(pcy+58*k)};
 return {W,H,k,field:{cx,cy,hw,hh},panel:{cx:pcx,cy:pcy,hw:phw,hh:phh,left,right,top,bottom},composerDy,
  endL,endR,bounds,
  docks:[endL,endR,{x:cx-hw*.35,y:cy-hh+3},{x:cx+hw*.3,y:cy-hh+3},{x:cx-hw*.05,y:cy+hh-3},{x:cx+hw*.5,y:cy+hh-3}],
  rest:[place(cx-hw*.75,cy-hh-80*k),place(cx+hw*.7,cy+hh+78*k),place(cx-hw-150*k,cy-40*k),place(cx+hw*.25,cy-hh-150*k),place(cx-hw*.3,cy+hh+140*k),place(cx+hw+160*k,cy+30*k)],
  M1,M2,T1,T2,P1:{x:left+6,y:M1.y+12*k},P2:{x:left+6,y:M2.y-8*k},Q1:{x:right-6,y:T1.y+8*k},Q2:{x:right-6,y:T2.y},
  roomy,rows,reply,
 };
}
const at=(p:Point)=>({px:p.x,py:p.y});
const zero={hw:0,hh:0,r:0};
/** A pocket of membrane grown around a card; its centre sits `off` from the card's glyph. */
const pocket=(size:Size,k:number,anchor:Point)=>({px:anchor.x+size.off,py:anchor.y,hw:size.w/2+11*k,hh:size.h/2+9*k,r:Math.min(size.h/2+9*k,18*k)});

/** Beat 0: six free organisms, nothing else. */
function restPose(w:World,L:Layout,roam:Roam[]){
 const k=L.k;Object.assign(w.env,{free:1,breath:0,wobble:1.2,underline:1,pulse:0,contour:0,panel:0});
 [w.A,w.B,...w.O].forEach((c,i)=>{const r=RADII[i]*k;Object.assign(c,{...at(L.rest[i]),hw:r,hh:r,r,rot:0});const o=roam[i];o.x=L.rest[i].x;o.y=L.rest[i].y;o.vx=o.vy=0;o.r=r;o.wait=0;o.tx=o.x;o.ty=o.y;});
 for(const c of [w.PL,w.PR,...w.K,...w.U,w.Y])Object.assign(c,{px:L.field.cx,py:L.field.cy,...zero,rot:0});
 for(const s of w.strands)Object.assign(s,{ax:L.field.cx,ay:L.field.cy,bx:L.field.cx,by:L.field.cy,r:0,taper:0});
 for(const n of w.nodes){n.o=0;n.s=1;n.t=1;}for(const r of w.rows){r.o=0;r.dy=0;r.p=0;}w.fold.o=0;w.fold.dy=0;
 for(const e of w.eyes){e.o=1;e.lid=0;}Object.assign(w.gaze,{px:L.field.cx,py:L.field.cy,w:0});
 Object.assign(w.lines,{a:0,b:0,c:0,check:0,typing:0});
}
/** The settled bonded line: two heads at the ends, membrane between. */
function bondedPose(w:World,L:Layout,roam:Roam[]){
 restPose(w,L,roam);const e=L.field.hh+3,F=L.field;
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
function panelPose(w:World,L:Layout,roam:Roam[],upTo:number,folded:boolean){
 bondedPose(w,L,roam);
 Object.assign(w.env,{panel:1,contour:.3});
 Object.assign(w.A,headL(L));Object.assign(w.B,headR(L));Object.assign(w.PL,bodyL(L));Object.assign(w.PR,bodyR(L));
 Object.assign(w.gaze,{px:L.panel.cx,py:L.panel.top+40*L.k,w:1});
 w.rows[0].o=1;w.fold.o=folded?1:0;
 if(upTo>3)w.rows[1].o=1;if(upTo>4)w.rows[2].o=1;if(upTo>5)w.rows[3].o=1;
 if(upTo>6){w.rows[4].o=1;Object.assign(w.lines,{a:1,b:1,c:1,check:1});}
 if(upTo>7)w.rows[5].o=1;if(upTo>8)w.rows[6].o=1;
}

/* ── Choreography: one Motion sequence per beat ── */

type Beat={seq:AnimationSequence;still:number};
const flow=[.6,0,.15,1] as const,settle=[.4,0,.2,1] as const,inOut='easeInOut' as const,out='easeOut' as const;
const spring=(stiffness:number,damping:number)=>({type:'spring' as const,stiffness,damping});
const lookAt=(w:World,p:Point,t:number,d=.4):AnimationSequence[number]=>[w.gaze,{...at(p),w:1},{duration:d,at:t}];
const home=(w:World,L:Layout,t:number):AnimationSequence[number]=>[w.gaze,{px:L.panel.cx,py:L.panel.top+40*L.k},{duration:.5,at:t}];
/** A row rises into place; its glyph pulses when something lands on it. */
const land=(w:World,L:Layout,i:number,t:number):AnimationSequence=>[[w.rows[i],{dy:12*L.k},{duration:.01,at:0}],[w.rows[i],{o:1,dy:0},{duration:.5,ease:settle,at:t}],...pulse(w,i,t+.05)];
const pulse=(w:World,i:number,t:number):AnimationSequence=>[[w.rows[i],{p:1},{duration:.12,at:t}],[w.rows[i],{p:0},{duration:.9,at:t+.12}]];
/** The lead's eyes: a wider look, a squint, a blink. */
const widen=(w:World,t:number,d=.7):AnimationSequence=>[[w.eyes[0],{lid:-.2},{duration:.2,at:t}],[w.eyes[0],{lid:0},{duration:.35,at:t+d}]];
const blink=(w:World,t:number):AnimationSequence=>[[w.eyes[0],{lid:1},{duration:.1,at:t}],[w.eyes[0],{lid:0},{duration:.22,at:t+.12}]];

/** Beat 1: the organisms are already flying in (see the roam step); the timeline handles contact and the spread. */
function bond(w:World,L:Layout):Beat{
 const e=L.field.hh+3,F=L.field,half=(F.cx-L.endL.x)/2+8;
 return {still:3,seq:[
  [w.env,{underline:3.2},{duration:.26,ease:out,at:0}],
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
  [w.env,{underline:0},{duration:.7,at:1.1}],
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

/** Beat 2: the line grows into a panel; the prompt lifts into the conversation. Later thoughts fold the last exchange away first. */
function launch(w:World,L:Layout,again:boolean):Beat{
 const k=L.k,[sent,...rest]=w.rows;
 if(again)return {still:1.3,seq:[
  [rest,{o:0},{duration:.3,at:0}],
  [w.lines,{a:0,b:0,c:0,check:0,typing:0},{duration:.3,at:0}],
  [sent,{dy:-12*k,o:0},{duration:.3,ease:settle,at:0}],
  [w.fold,{o:0,dy:8*k},{duration:.01,at:0}],
  [w.fold,{o:1,dy:0},{duration:.4,ease:settle,at:.25}],
  [sent,{dy:26*k},{duration:.01,at:.5}],
  [sent,{dy:0,o:1},{duration:.55,ease:settle,at:.55}],
  ...blink(w,.35),
  home(w,L,.5),
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

/** Beat 3: a memory surfaces far out; a tendril reaches it, the membrane closes around it, and the whole card is hauled across into the panel. */
function recall(w:World,L:Layout,sizes:Size[]):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1]=w.K,[n0,n1]=w.nodes,row=L.rows[1];
 const one=(S:Strand,K:Cell,n:Node,size:Size,P:Point,M:Point,t:number):AnimationSequence=>{const pk=pocket(size,k,M);return [
  // something is out there: the card surfaces first, on its own
  [n,{...at(M),o:0,s:.5,t:1},{duration:.01,at:t}],
  [n,{o:1,s:1},{...spring(170,13),at:t+.02}],
  lookAt(w,M,t+.1),
  // the organism reaches for it: a tendril crosses the gap and the membrane closes around the card
  [S,{ax:P.x,ay:P.y,bx:P.x,by:P.y,r:9*k,taper:.35,tone:1},{duration:.01,at:t+.3}],
  [S,{bx:M.x,by:M.y},{duration:.75,ease:out,at:t+.32}],
  [K,{px:pk.px,py:pk.py,...zero,r:pk.r,tone:1,w:1.3,rot:0},{duration:.01,at:t+1.02}],
  [K,{hw:pk.hw,hh:pk.hh},{...spring(210,14),at:t+1.05}],
  [n,{s:1.1},{duration:.14,ease:out,at:t+1.05}],
  [n,{s:1},{duration:.35,at:t+1.19}],
  // the pull: card and pocket travel the whole way to the rim while the tendril thickens to haul
  [S,{r:13*k},{duration:.3,at:t+2.1}],
  [K,{px:P.x+size.off*.8,py:P.y,hw:pk.hw*.8,hh:pk.hh*.8},{duration:.9,ease:inOut,at:t+2.1}],
  [n,{px:P.x,py:P.y,s:.8},{duration:.9,ease:inOut,at:t+2.1}],
  [S,{bx:P.x,by:P.y},{duration:.9,ease:inOut,at:t+2.1}],
  // swallowed at the rim: the words fold into the glyph, the body pulses, the glyph slides onto its row
  [n,{t:0,s:.5},{duration:.2,at:t+3.0}],
  [K,{px:P.x,hw:9*k,hh:9*k,r:9*k},{duration:.2,at:t+3.0}],
  [S,{r:0},{duration:.2,at:t+3.0}],
  [w.env,{pulse:1},{duration:.12,at:t+3.0}],
  [w.env,{pulse:0},{duration:.3,at:t+3.12}],
  [K,{px:row.x,py:row.y},{duration:.45,ease:inOut,at:t+3.2}],
  [n,{px:row.x,py:row.y},{duration:.45,ease:inOut,at:t+3.2}],
  [n,{o:0},{duration:.15,at:t+3.6}],
  [K,zero,{duration:.25,at:t+3.65}],
 ];};
 return {still:2.0,seq:[
  ...one(S0,K0,n0,sizes[0],L.P1,L.M1,0),
  ...one(S1,K1,n1,sizes[1],L.P2,L.M2,.45),
  ...widen(w,1.05,1.3),
  ...land(w,L,1,3.5),
  home(w,L,4.6),
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
  ...bud(K1,L.panel.cx+L.panel.hw*.2,Math.max(52,70*k),.75),
  ...land(w,L,2,1.55),
  home(w,L,2.8),
 ]};
}

/** Beat 5: a teammate and a subagent wait far out on the right; tendrils reach them, the task itself travels the whole way, and context comes back. The right head wakes to watch. */
function reach(w:World,L:Layout,sizes:Size[]):Beat{
 const k=L.k,[S0,S1]=w.strands,[K0,K1,K2]=w.K,[U0,U1]=w.U,[,,n2,n3]=w.nodes,row=L.rows[3];
 const one=(S:Strand,U:Cell,K:Cell,n:Node,size:Size,Q:Point,T:Point,t:number):AnimationSequence=>{const pk=pocket(size,k,T);return [
  [n,{...at(T),o:0,s:.5,t:1},{duration:.01,at:t}],
  [n,{o:1,s:1},{...spring(170,13),at:t+.02}],
  lookAt(w,T,t+.1),
  [S,{ax:Q.x,ay:Q.y,bx:Q.x,by:Q.y,r:8*k,taper:.3,tone:2},{duration:.01,at:t+.3}],
  [S,{bx:T.x,by:T.y},{duration:.75,ease:out,at:t+.32}],
  [U,{px:pk.px,py:pk.py,...zero,r:pk.r,tone:2,rot:0},{duration:.01,at:t+1.02}],
  [U,{hw:pk.hw,hh:pk.hh},{...spring(240,15),at:t+1.05}],
  [n,{s:1.08},{duration:.14,ease:out,at:t+1.05}],
  [n,{s:1},{duration:.3,at:t+1.19}],
  // the task leaves its row, crosses the rim and rides the whole tendril to be received
  [K,{px:row.x,py:row.y,hw:7*k,hh:7*k,r:7*k,tone:0,w:1.4},{duration:.01,at:t+1.2}],
  [K,at(Q),{duration:.45,ease:inOut,at:t+1.25}],
  [K,at(T),{duration:.8,ease:inOut,at:t+1.7}],
  [K,zero,{duration:.15,at:t+2.5}],
  [n,{s:1.2},{duration:.15,ease:out,at:t+2.45}],
  [n,{s:1},{duration:.4,at:t+2.6}],
  // release: the card lets go and the tendril returns
  [n,{t:0},{duration:.25,at:t+3.3}],
  [n,{o:0,s:.7},{duration:.35,at:t+3.4}],
  [S,{bx:Q.x,by:Q.y,taper:.9},{duration:.55,ease:inOut,at:t+3.45}],
  [U,zero,{duration:.45,at:t+3.5}],
  [S,{r:0},{duration:.2,at:t+3.95}],
 ];};
 return {still:2.0,seq:[
  ...one(S0,U0,K0,n2,sizes[2],L.Q1,L.T1,0),
  ...one(S1,U1,K1,n3,sizes[3],L.Q2,L.T2,.45),
  ...land(w,L,3,.8),
  [w.eyes[1],{o:1,lid:0},{duration:.35,at:.5}],
  [w.eyes[1],{lid:1},{duration:.3,at:3.9}],
  [w.eyes[1],{o:0},{duration:.3,at:4.2}],
  // the teammate sends context back the same way
  [K2,{...at(L.T1),hw:6*k,hh:6*k,r:6*k,tone:2,w:1.4},{duration:.01,at:2.7}],
  [K2,at(L.Q1),{duration:.6,ease:inOut,at:2.75}],
  [K2,{px:row.x,py:row.y},{duration:.4,ease:inOut,at:3.35}],
  [K2,zero,{duration:.2,at:3.75}],
  ...pulse(w,3,3.7),
  home(w,L,4.3),
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

/** Beat 7: one line of the reply is worth keeping; it is carried all the way out to where the memories live, becomes a card, and is stored. */
function keep(w:World,L:Layout,sizes:Size[]):Beat{
 const k=L.k,[,S1]=w.strands,[K0]=w.K,[n0]=w.nodes,R=L.reply,row=L.rows[5],M={x:L.M1.x+10*k,y:L.M1.y+24*k},pk=pocket(sizes[0],k,M);
 return {still:3.4,seq:[
  [K0,{px:R.x+R.w*.4,py:R.y+R.h*.55,...zero,tone:1,w:1.5,rot:0},{duration:.01,at:0}],
  [K0,{hw:8*k,hh:8*k,r:8*k},{duration:.2,at:.1}],
  lookAt(w,{x:R.x+R.w*.4,y:R.y+R.h*.55},0,.3),
  [K0,{px:row.x,py:row.y},{duration:.7,ease:inOut,at:.4}],
  ...land(w,L,5,.9),
  [K0,at(L.P1),{duration:.5,ease:inOut,at:1.3}],
  // carried out along a tendril to where the memories live
  [S1,{ax:L.P1.x,ay:L.P1.y,bx:L.P1.x,by:L.P1.y,r:9*k,taper:.3,tone:1},{duration:.01,at:1.4}],
  [S1,{bx:M.x,by:M.y},{duration:.85,ease:out,at:1.45}],
  [K0,at(M),{duration:.85,ease:out,at:1.8}],
  lookAt(w,M,1.9),
  // the pocket opens around the card only after the travel above has ended (no overlapping tweens on px)
  [K0,{px:pk.px,hw:pk.hw,hh:pk.hh,r:pk.r},{...spring(200,15),at:2.7}],
  [n0,{...at(M),o:0,s:.5,t:0},{duration:.01,at:0}],
  [n0,{o:1,s:1},{...spring(170,13),at:2.75}],
  [n0,{t:1},{duration:.3,at:2.9}],
  ...blink(w,3.2),
  [S1,{bx:L.P1.x,by:L.P1.y,taper:.95},{duration:.5,ease:inOut,at:3.6}],
  [S1,{r:0},{duration:.2,at:4.05}],
  // stored: it drifts up and away, kept
  [n0,{t:0},{duration:.25,at:4.1}],
  [n0,{py:M.y-60*k,o:0,s:.7},{duration:.9,ease:out,at:4.2}],
  [K0,{py:M.y-60*k},{duration:1.0,ease:out,at:4.1}],
  [K0,{hw:0,hh:0},{duration:.7,at:4.4}],
  home(w,L,4.4),
 ]};
}

/** Beat 8: a rhythm is noticed along the rim and offered back as an automation. */
function notice(w:World,L:Layout):Beat{
 const k=L.k,[K0,K1,K2]=w.K,Y=w.Y,row=L.rows[6],y=L.panel.bottom-9*k;
 const dot=(K:Cell,x:number,t:number):AnimationSequence=>[
  [K,{px:x,py:y,...zero,r:5*k,tone:3,w:1.6,rot:0},{duration:.01,at:t}],
  [K,{hw:5*k,hh:5*k},{duration:.18,ease:out,at:t+.02}],
  [w.env,{pulse:1},{duration:.1,at:t}],
  [w.env,{pulse:0},{duration:.32,at:t+.1}],
 ];
 return {still:2.8,seq:[
  ...dot(K0,L.panel.cx-44*k,0),...dot(K1,L.panel.cx,.32),...dot(K2,L.panel.cx+44*k,.64),
  lookAt(w,{x:L.panel.cx,y},.3),
  [[K0,K1,K2],{px:row.x,py:row.y,hw:7*k,hh:7*k,r:7*k},{duration:.55,ease:inOut,at:1.05}],
  [[K1,K2],zero,{duration:.2,at:1.5}],
  [Y,{px:L.panel.right+2,py:row.y,...zero,r:16*k,tone:3,rot:0},{duration:.01,at:1.5}],
  [Y,{hw:18*k,hh:14*k},{...spring(210,15),at:1.55}],
  [K0,zero,{duration:.3,at:1.6}],
  ...land(w,L,6,1.5),
  lookAt(w,{x:row.x+40*k,y:row.y},1.6),
  ...widen(w,1.7,.9),
  // hold for the visitor, then the offer sinks back into the body
  [Y,{hw:0,hh:0,px:L.panel.right-8},{duration:.5,ease:inOut,at:4.4}],
  home(w,L,4.6),
 ]};
}

function buildBeat(beat:number,w:World,L:Layout,run:number,sizes:Size[]):Beat|null{
 switch(beat){case 1:return bond(w,L);case 2:return launch(w,L,run>0);case 3:return recall(w,L,sizes);case 4:return prepare(w,L);case 5:return reach(w,L,sizes);case 6:return check(w,L,storyAt(run));case 7:return keep(w,L,sizes);case 8:return notice(w,L);default:return null;}
}

/* ── Component ── */

type Fold={prompt:string;kept:string};

export function PromptBond({moving,quiet}:{moving:boolean;active?:boolean;quiet:boolean}){
 const [beat,setBeat]=React.useState(0);
 const [prompt,setPrompt]=React.useState('');
 const [sent,setSent]=React.useState('');
 const [run,setRun]=React.useState(0);
 const [folds,setFolds]=React.useState<Fold[]>([]);
 const [noted,setNoted]=React.useState(false);
 const [stopped,setStopped]=React.useState(false);
 const [checkOn,setCheckOn]=React.useState(false);
 const [ready,setReady]=React.useState(0);
 const input=React.useRef<HTMLInputElement>(null),form=React.useRef<HTMLFormElement>(null),stage=React.useRef<HTMLElement>(null),panel=React.useRef<HTMLDivElement>(null);
 const membrane=React.useRef<MembraneHandle>(null);
 const underline=React.useRef<HTMLDivElement>(null),eyeRefs=React.useRef<(HTMLSpanElement|null)[]>([]),foldEl=React.useRef<HTMLDivElement>(null);
 const nodeRefs=React.useRef<(HTMLSpanElement|null)[]>([]),rowRefs=React.useRef<(HTMLElement|null)[]>([]),reply=React.useRef<HTMLDivElement>(null);
 const world=React.useRef(createWorld()),roam=React.useRef(createRoam()),layout=React.useRef<Layout|null>(null);
 const capture=React.useRef<Capture|null>(null),formDy=React.useRef(0),reached=React.useRef(0),pending=React.useRef<string|null>(null);
 const controls=React.useRef<AnimationPlaybackControls|null>(null),generation=React.useRef(0);
 const clock=React.useRef(0),pointer=React.useRef<Point|null>(null),checkRef=React.useRef(false);
 const typing=React.useRef<{text:string;at:number;fast:boolean;n:number}|null>(null),typed=React.useRef(false),idle=React.useRef<number|null>(null);
 const scene=React.useRef({cells:Array.from({length:15},():MembraneCell=>({x:0,y:0,hw:0,hh:0,r:0,tone:0,rot:0,w:1})),strands:Array.from({length:8},():MembraneStrand=>({ax:0,ay:0,bx:0,by:0,r:0,tone:0,taper:0,w:1}))});
 const bonded=beat>0;
 const state=React.useRef({moving,quiet,beat,prompt,run,sent,stopped,folded:folds.length>0});
 state.current={moving,quiet,beat,prompt,run,sent,stopped,folded:folds.length>0};
 const startRef=React.useRef<()=>void>(()=>{});

 /* Steering for one free organism: wander with arrival, keep company, keep off the prompt text. */
 const stepRoam=React.useCallback((i:number,dt:number,L:Layout)=>{
  const R=roam.current,r=R[i],k=L.k,F=L.field,cap=capture.current;
  if(cap){
   const tc=clock.current-cap.t0,dock=L.docks[i],from=cap.from[i],startAt=.28+i*.07;
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
  const dt=live&&!still?Math.min(delta,40)/1000:0;clock.current+=dt;
  const t=clock.current,k=L.k,f=w.env.free,p=pointer.current,R=roam.current;
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
  if(underline.current){underline.current.style.opacity=String(Math.min(1,w.env.underline));underline.current.style.transform=`scaleY(${Math.max(.01,w.env.underline)})`;}
  const gazeTo=(from:Point)=>{let tx:number,ty:number;if(w.gaze.w>.5){tx=w.gaze.px;ty=w.gaze.py;}else if(p){tx=p.x;ty=p.y;}else{tx=L.field.cx;ty=L.field.cy;}const dx=tx-from.x,dy=ty-from.y,d=Math.hypot(dx,dy)||1,a=Math.min(1,d/80)*3.5*k;return {x:dx/d*a,y:dy/d*a};};
  w.eyes.forEach((e,i)=>{const el=eyeRefs.current[i];if(!el)return;const g=gazeTo(pos[i]);el.style.transform=`translate(${(pos[i].x+g.x).toFixed(1)}px,${(pos[i].y+g.y-2*k).toFixed(1)}px)`;el.style.opacity=String(e.o);el.style.setProperty('--lid',e.lid.toFixed(3));});
  w.nodes.forEach((n,i)=>{const el=nodeRefs.current[i];if(!el)return;el.style.transform=`translate(${n.px.toFixed(1)}px,${n.py.toFixed(1)}px) translate(${-(el.dataset.gx??0)}px,-50%) scale(${n.s.toFixed(3)})`;el.style.opacity=String(n.o);el.style.setProperty('--t',n.t.toFixed(3));});
  if(state.current.beat===2&&w.rows[0].o>.05&&state.current.prompt)setPrompt('');
  if(pending.current&&w.rows[0].o<.05){setSent(pending.current);pending.current=null;}
  w.rows.forEach((r,i)=>{const el=rowRefs.current[i];if(!el)return;el.style.opacity=String(r.o);el.style.setProperty('--dy',`${r.dy.toFixed(1)}px`);el.style.setProperty('--p',r.p.toFixed(3));const hidden=r.o<.5;if(el.inert!==hidden){el.inert=hidden;el.setAttribute('aria-hidden',hidden?'true':'false');}});
  if(foldEl.current){foldEl.current.style.opacity=String(w.fold.o);foldEl.current.style.transform=`translateY(${w.fold.dy.toFixed(1)}px)`;}
  if(reply.current){const el=reply.current;el.style.setProperty('--la',String(w.lines.a));el.style.setProperty('--lb',String(w.lines.b));el.style.setProperty('--lc',String(w.lines.c));el.style.setProperty('--check',String(w.lines.check));el.style.setProperty('--typing',String(w.lines.typing));const on=w.lines.check>.5;if(on!==checkRef.current){checkRef.current=on;setCheckOn(on);}}
  if(form.current){const dy=w.env.panel*L.composerDy;formDy.current=dy;form.current.style.transform=`translateY(${dy.toFixed(1)}px)`;}
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
  const w=world.current,{beat:b,stopped:st,folded}=state.current;
  if(b===0)restPose(w,L,roam.current);else if(b===1)bondedPose(w,L,roam.current);else panelPose(w,L,roam.current,b===LAST&&st?reached.current:b,folded);
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
   if(!capture.current)capture.current={t0:clock.current,from:roam.current.map(r=>({x:r.x,y:r.y}))};
   [w.A,w.B,...w.O].forEach((c,i)=>Object.assign(c,at(L.docks[i])));
   if(quiet||!moving)roam.current.forEach((r,i)=>{r.x=L.docks[i].x;r.y=L.docks[i].y;r.vx=r.vy=0;});
  } else capture.current=null;
  // measure this beat's cards at full size, and remember where each glyph sits so the card scales around it
  const sizes=nodeRefs.current.map((el):Size=>{
   if(!el)return {w:26,h:26,off:0};
   el.style.setProperty('--t','1');
   const g=el.querySelector<HTMLElement>('.thing-glyph'),w=el.offsetWidth,h=el.offsetHeight,gx=g?g.offsetLeft+g.offsetWidth/2:w/2;
   el.dataset.gx=gx.toFixed(1);el.style.transformOrigin=`${gx.toFixed(1)}px 50%`;
   return {w,h,off:w/2-gx};
  });
  const built=buildBeat(beat,w,L,run,sizes);
  if(!built){if(beat===0)restPose(w,L,roam.current);else panelPose(w,L,roam.current,stopped?reached.current:beat,folds.length>0);return;}
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
  typing.current={text,at:clock.current,fast,n:0};
 },[]);
 const start=React.useCallback(()=>{
  const {beat:b,prompt:text,quiet:still,moving:live}=state.current;
  if(b!==0&&b!==LAST)return;
  if(typing.current){const ty=typing.current;typing.current=null;setPrompt(ty.text);window.setTimeout(()=>startRef.current(),40);return;}
  if(!text.trim()){typeThenStart(nextPrompt(),true);return;}
  typed.current=false;setNoted(false);input.current?.blur();
  if(b===0){setSent(text.trim());setBeat(1);return;}
  // a later thought: the last exchange folds away and the new one launches into the same panel
  const previous=storyAt(state.current.run);
  setFolds(f=>[...f,{prompt:state.current.sent,kept:state.current.stopped?'':previous.kept.title}].slice(-3));
  if(still||!live)setSent(text.trim());else pending.current=text.trim();
  setStopped(false);setRun(r=>r+1);setBeat(2);
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
 const acceptSuggestion=()=>{setNoted(true);const c=controls.current;if(c&&c.time<4.25)c.time=4.25;if(!moving||quiet)paintSoon();};
 const onPointer=(e:React.PointerEvent)=>{const s=stage.current?.getBoundingClientRect();if(!s)return;pointer.current={x:e.clientX-s.left,y:e.clientY-s.top};};
 const story=storyAt(run),rows=rowsFor(story),things=thingsFor(beat,story),lastFold=folds[folds.length-1];
 const cue=beat===8&&noted?'Noted. It will be there next time.':beat===LAST&&stopped?'Stopped. Whenever you’re ready.':beats[beat].cue;
 const composing=beat===0||beat===LAST,working=bonded&&!composing;
 React.useEffect(()=>{if(composing&&matchMedia('(hover:hover) and (pointer:fine)').matches)requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));},[composing]);

 return <main className="prompt-story" ref={stage} data-beat={beat} data-bonded={bonded} data-moving={moving} data-quiet={quiet} data-compact={layout.current?!layout.current.roomy:false} onPointerMove={onPointer} onPointerLeave={()=>{pointer.current=null;}}>
  <Membrane ref={membrane} className="prompt-membrane" onMeasure={relayout}/>
  <div className="stage-layer" aria-hidden="true">
   {RADII.map((_,i)=><span key={i} className="eyes" data-small={i>1} ref={el=>{eyeRefs.current[i]=el;}}><i/><i/></span>)}
   {things.map((th,i)=><span key={i} ref={el=>{nodeRefs.current[i]=el;}} className="thing" data-side={i<2?'left':'right'} data-kind={kindOf(th)}>
    <span className="thing-glyph">{th?.initials?th.initials:<AnimatedIcon name={th?.icon??'brain'} size="sm"/>}</span>
    <span className="thing-text"><em className="thing-kind">{th?kindOf(th):''}</em><b>{th?.title??''}</b><small>{th?.sub??''}</small></span>
   </span>)}
  </div>
  <div className="prompt-title"><span className="prompt-eyebrow">THE BOND</span><h1>Every prompt.<br/>A little more alive.</h1></div>
  <div className="prompt-theatre" role="group" aria-label="An illustrative prompt lifecycle">
   <div className="prompt-understroke" ref={underline} aria-hidden="true"/>
   <div className="chat-panel" ref={panel} data-open="false" inert>
    {lastFold&&<div className="chat-fold" ref={foldEl}><span className="chat-fold-prompt">› {lastFold.prompt}</span>{lastFold.kept&&<span className="chat-fold-kept"><AnimatedIcon name="bookmark" size="sm"/>{lastFold.kept}</span>}{folds.length>1&&<span className="chat-fold-more">+{folds.length-1} earlier</span>}</div>}
    <div className="chat-sent" ref={el=>{rowRefs.current[0]=el;}}><BubbleContent variant="me" className="chat-bubble chat-bubble-me">{sent}</BubbleContent></div>
    <ul className="chat-work">
     {[1,2,3].map(i=><li key={i} className="chat-row" data-tone={['memory','prepare','reach'][i-1]} ref={el=>{rowRefs.current[i]=el;}}><span className="chat-row-glyph"><AnimatedIcon name={ROW_ICONS[i]} size="sm"/></span><span className="chat-row-text">{rows[i-1].map((p,j)=>p.b?<b key={j}>{p.t}</b>:<React.Fragment key={j}>{p.t}</React.Fragment>)}</span></li>)}
    </ul>
    <div className="chat-reply" ref={el=>{rowRefs.current[4]=el;}}><span className="chat-glyph" aria-hidden="true"/><div className="chat-bubble chat-bubble-reply" ref={reply}><span className="chat-typing" aria-hidden="true"><i/><i/><i/></span><i className="chat-line"/><i className="chat-line"/><i className="chat-line"/><span className="response-check"><AnimatedIcon name="check" preset="draw" active={checkOn} size="sm"/></span></div></div>
    <ul className="chat-work">
     <li className="chat-row" data-tone="memory" ref={el=>{rowRefs.current[5]=el;}}><span className="chat-row-glyph"><AnimatedIcon name="bookmark" size="sm"/></span><span className="chat-row-text">{rows[3].map((p,j)=>p.b?<b key={j}>{p.t}</b>:<React.Fragment key={j}>{p.t}</React.Fragment>)}</span></li>
     <li className="chat-row chat-row-action" data-tone="automation" ref={el=>{rowRefs.current[6]=el;}}><Button variant="ghost" className="bud-button" onClick={acceptSuggestion} disabled={noted}><AnimatedIcon name={noted?'check':'workflow'} size="sm" active={noted}/>{noted?'Automation saved':story.automation}</Button></li>
    </ul>
   </div>
   <form className="living-prompt" ref={form} onSubmit={e=>{e.preventDefault();start();}}>
    <span className="prompt-prefix" aria-hidden="true">›</span>
    <InputControl ref={input} aria-label="Your prompt" value={prompt} maxLength={80} placeholder={beat===0?stories[0].prompt:beat===LAST?'Next thought…':undefined} readOnly={!composing} onChange={e=>{typed.current=e.target.value.length>0;setPrompt(e.target.value);}} onKeyDown={e=>{if(e.nativeEvent.isComposing&&e.key==='Enter')e.preventDefault();}}/>
    <Button type={working?'button':'submit'} variant="ghost" data-morph="fill" data-tier="pill" className="prompt-send" data-state={working?'stop':'send'} disabled={beat===1} onClick={working?stop:undefined} aria-label={working?'Stop working':beat===LAST?'Send another thought':'Start the bond'}>
     <span className="send-glyph"><AnimatedIcon name="arrow-right" size="sm"/></span><span className="stop-glyph"><i/></span>
    </Button>
   </form>
  </div>
  <div className="prompt-caption">
   <p aria-live="polite" aria-atomic="true">{cue}</p>
   {beat===0?<Button className="enter-invitation" variant="ghost" onClick={start}>Press <kbd>Enter ↵</kbd></Button>
   :beat===LAST?<p className="again-hint">Type another thought and press <kbd>Enter ↵</kbd></p>
   :<div className="lifecycle-progress" aria-label={`Prompt lifecycle: ${beats[beat].label}`}>{beats.slice(1,LAST).map((b,i)=><span key={b.label} data-complete={beat>i+1} data-current={beat===i+1} title={b.label}/>)}</div>}
  </div>
  {bonded&&beat<LAST&&<div className="lifecycle-steps"><Button variant="ghost" className="lifecycle-step" onClick={back} disabled={beat<=1} aria-label="Previous lifecycle step"><span aria-hidden="true">←</span> Back</Button><Button variant="ghost" className="lifecycle-step" onClick={next} aria-label="Next lifecycle step">Next <span aria-hidden="true">→</span></Button></div>}
 </main>;
}
