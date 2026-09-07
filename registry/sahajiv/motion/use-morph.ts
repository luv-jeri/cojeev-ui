"use client"

import * as React from "react"
import { rim, path as serializePath } from "./geometry"
import { fromShape, SHAPES } from "./shapes"
import { bodyPadding, createBody, rewindBody, stepBody, type Body } from "./body"
import { getMotionSettings, getMorphProfile, subscribeMotion, reloadMotionSettings, type Category, type TierName } from "./settings"

const instances=new Set<{frame:(t:number,dt:number)=>boolean;rewind:()=>void;reseed:()=>void;refresh:()=>void}>()
let clock:number|null=null,previous:number|null=null,raf=0,seed:number|null=null
const pointer={x:-1e4,y:-1e4}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function frame(t:number){const dt=previous===null?0:Math.min(.05,Math.max(0,(t-previous)/1000));previous=t;let active=false;instances.forEach(b=>{active=b.frame(t,dt)||active});return active}
function wake(){if(clock!==null||raf||!instances.size||document.hidden)return;raf=requestAnimationFrame(t=>{raf=0;if(frame(t))wake()})}
/** Deterministic milliseconds on the document time origin; null resumes rAF. */
const animationStarts=new WeakMap<Animation,number>()
export function morphClock(t:number|null){stop();if(t===null){clock=null;previous=performance.now();wake()}else{if(clock===null)previous=t;clock=t;frame(t)}
 if(typeof document!=='undefined')for(const animation of document.getAnimations()){
  if(t===null){if(animationStarts.has(animation)){animationStarts.delete(animation);animation.play()}continue}
  if(!animationStarts.has(animation)){animationStarts.set(animation,t);animation.pause()}
  animation.currentTime=Math.max(0,t-animationStarts.get(animation)!)
 }
}
export function rewindMorph(){pointer.x=pointer.y=-1e4;instances.forEach(b=>b.rewind());previous=clock??performance.now();wake()}
export function seedMorph(n:number|null){seed=n;instances.forEach(b=>b.reseed());rewindMorph()}
function bodySeed(el:HTMLElement){const raw=el.ownerDocument.documentElement.dataset.seed;const n=seed??(raw!=null&&raw!==""&&Number.isFinite(+raw)?+raw:null);if(n===null)return Math.random()*100;
 let key="",node:Element|null=el;while(node&&node!==el.ownerDocument.documentElement){let i=0,s=node.previousElementSibling;while(s){if(!s.matches("svg.v-morph,#v-morph-defs,.v-glide__pill,.v-glide__hover,.v-glide__trail"))i++;s=s.previousElementSibling}key=node.tagName+i+"/"+key;node=node.parentElement}
 let h=2166136261;for(const c of key+"#"+n){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h%100000/1000
}
const ns="http://www.w3.org/2000/svg"
function svgNode(tag:string,attrs:Record<string,string>={}){const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el}
const clear=(v:string)=>!v||v==="transparent"||v==="rgba(0, 0, 0, 0)"
function surfaceFill(el:HTMLElement){let bg="";for(let p=el.parentElement;p;p=p.parentElement){bg=getComputedStyle(p).backgroundColor;if(!clear(bg))break}const m=/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(bg);const rgb=m?m.slice(1).map(n=>{const v=+n/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4}):[1,1,1];return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]<.18?"rgba(251,244,230,.14)":"var(--v-beige)"}
// One browser subscription set, acquired by mounted hooks and released with the last host.
let environmentUsers=0,disposeEnvironment=()=>{}
function acquireEnvironment(){
 if(environmentUsers++===0){
  const ac=new AbortController(),opts={signal:ac.signal}
  const refresh=()=>instances.forEach(b=>b.refresh())
  const theme=new MutationObserver(refresh);theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-mode','data-skin']})
  window.addEventListener('v-theme',refresh,opts);window.addEventListener('v-palette',refresh,opts)
  document.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;wake()},{...opts,passive:true})
  document.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1e4;wake()},opts)
  window.addEventListener('resize',wake,opts);window.addEventListener('scroll',wake,{...opts,capture:true,passive:true})
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{previous=performance.now();wake()}},opts)
  window.addEventListener('storage',e=>{if(e.key==='v-motion'||e.key==='v-morph-cfg-v3'||e.key===null)reloadMotionSettings()},opts)
  disposeEnvironment=()=>{ac.abort();theme.disconnect();stop();previous=null}
 }
 return ()=>{if(--environmentUsers===0)disposeEnvironment()}
}
/** Component-owned attachment. No document scanning, global API, or provider required. */
export function useMorph<T extends HTMLElement>(category:Category,externalRef?:React.Ref<T>){
 const [host,setHost]=React.useState<T|null>(null)
 const syncHost=React.useRef<()=>void>(()=>{})
 const ref=React.useCallback((node:T|null)=>{setHost(node);if(typeof externalRef==="function"){const cleanup=externalRef(node);return ()=>{setHost(null);if(typeof cleanup==="function")cleanup();else externalRef(null)}}if(externalRef)externalRef.current=node;return ()=>{setHost(null);if(externalRef)externalRef.current=null}},[externalRef])
 React.useLayoutEffect(()=>{
  if(!host)return
  const el=host,ac=new AbortController(),opts={signal:ac.signal}
  const mq=matchMedia("(prefers-reduced-motion: reduce)")
  let destroyBody:()=>void=()=>{}
  let retainedBody:Body|undefined,repairBody=()=>{},signature='',autoMode:string|undefined
  const visualSignature=()=>JSON.stringify([
   el.className.split(/\s+/).filter(c=>!['v-morph-host','v-morph-live','v-morph-rel'].includes(c)).join(' '),
   ...['motion','tier','reach','inside','amp','lobes','depth','asym','spread','r','shape','sw','dash'].map(k=>el.dataset[k]),
   el.dataset.morph===autoMode?'':el.dataset.morph,
  ])
  function attach(){
   destroyBody();destroyBody=()=>{}
   repairBody=()=>{};autoMode=undefined
   const settings=getMotionSettings(),profile=getMorphProfile(),explicit=el.dataset.morph
   if(el.closest('[data-motion="off"]')||el.closest('[hidden]'))return
   if(!explicit&&(settings.mode==="off"||!settings.cats[category]||el.matches('.v-btn.-ghost,.v-badge.-count,.v-badge.-sm')))return
   const cs=getComputedStyle(el);if(/auto|scroll/.test(cs.overflowX+cs.overflowY))return
   const stroke=explicit?explicit==="stroke":el.matches('.v-btn.-outline,.v-badge.-dashed,.v-badge.-test')
   const mode=explicit||(stroke?"stroke":"fill"),tierName=(el.dataset.tier||({cards:"card",pills:"tile",icons:"tile",skeleton:"pill"}[category as "cards"]||"pill")) as TierName
   if(!profile.TIER[tierName])return
   const tier={...profile.TIER[tierName]};for(const k of ["reach","inside","amp","lobes","depth","asym","spread"] as const){if(el.dataset[k]!=null&&Number.isFinite(+el.dataset[k]!))tier[k]=+el.dataset[k]!}
   const cfg={...profile.cfg};if(settings.mode==="off"||mq.matches)for(const k of ["rest","reach","merge","hold","jiggleOn","press","echo"] as const)cfg[k]=false
   const b=retainedBody??createBody(tier,tierName,bodySeed(el));retainedBody=b
   b.tier=tier;b.tierName=tierName;b.w=b.h=0;b.focus=el.ownerDocument.activeElement===el
   if(mq.matches)rewindBody(b)
   const old={fill:el.style.getPropertyValue('--mfill'),stroke:el.style.getPropertyValue('--mstroke'),pad:el.style.getPropertyValue('--mpad'),transform:el.style.transform}
   const svg=svgNode('svg',{class:'v-morph','aria-hidden':'true','shape-rendering':'geometricPrecision'})
   const path=svgNode('path',{fill:mode!=='stroke'?'var(--mfill,var(--v-beige))':'none'})
   if(mode!=='fill'){path.setAttribute('stroke','var(--mstroke,transparent)');path.setAttribute('stroke-width',el.dataset.sw||(el.matches('.v-badge.-test')?'1.5':'1'));path.setAttribute('stroke-linejoin','round');const dash=el.dataset.dash||(el.matches('.v-badge.-dashed')?'3 3':'');if(dash)path.setAttribute('stroke-dasharray',dash)}
   const echo=svgNode('path',{fill:'none',stroke:'var(--mstroke,var(--mfill,transparent))','stroke-width':'1.5','vector-effect':'non-scaling-stroke'}),dots=svgNode('g',{fill:'var(--mfill,transparent)'})
   echo.style.display=dots.style.display='none';svg.append(path,echo,dots)
   if(!explicit){el.dataset.morph=mode;autoMode=mode}
   el.classList.add('v-morph-host','v-morph-live');const relative=cs.position==='static';if(relative)el.classList.add('v-morph-rel')
   el.prepend(svg)
   const repaint=()=>{if(stroke){el.style.setProperty('--mstroke',old.stroke||(el.matches('.v-badge.-test')?'var(--v-ink)':el.matches('.v-badge.-dashed')?'var(--v-text-2)':'var(--v-border)'))}else{el.style.removeProperty('--mfill');const bg=getComputedStyle(el).backgroundColor;el.style.setProperty('--mfill',!clear(bg)?bg:old.fill||getComputedStyle(el).getPropertyValue('--mfill').trim()||surfaceFill(el))}}
   let lastD='',dirty=true
   repairBody=()=>{
    if(svg.parentNode!==el){el.prepend(svg);dirty=true}
    el.classList.add('v-morph-host','v-morph-live');if(relative)el.classList.add('v-morph-rel')
    if(!explicit&&!el.dataset.morph)el.dataset.morph=mode
   }
   function measure(){const R=el.getBoundingClientRect();b.R=R;const w=Math.round(R.width),h=Math.round(R.height);if(!w||!h)return;if(w===b.w&&h===b.h)return;b.w=w;b.h=h;const authored=el.dataset.r;const original=parseFloat(getComputedStyle(el).borderTopLeftRadius);const radius=authored?+authored:original&&original<200?Math.min(original,Math.min(w,h)/2):Math.min(w,h)/2;b.base=el.dataset.shape&&SHAPES[el.dataset.shape]?fromShape(el.dataset.shape,w,h,Math.max(1,cfg.quality)*.7):rim(w,h,radius,Math.max(1,cfg.quality));const pad=bodyPadding(tier,cfg,w,h);svg.setAttribute('viewBox',`${-pad} ${-pad} ${w+2*pad} ${h+2*pad}`);svg.style.cssText=`position:absolute;left:${-pad}px;top:${-pad}px;width:${w+2*pad}px;height:${h+2*pad}px;pointer-events:none;overflow:visible;z-index:-1`;el.style.setProperty('--mpad',pad+'px');dirty=true}
   const instance={frame:(t:number,dt:number)=>{measure();if(!b.w||!b.h)return false;const out=stepBody(b,pointer,dt,t/1000,cfg,mq.matches,!dirty);if(out.d!==lastD){path.setAttribute('d',out.d);lastD=out.d}if(cfg.echo){const m=cfg.echoScale,ox=cfg.echoOff*Math.cos(b.seed),oy=cfg.echoOff*Math.sin(b.seed);echo.setAttribute('d',serializePath(out.points.map(([x,y])=>[b.w/2+(x-b.w/2)*m+ox,b.h/2+(y-b.h/2)*m+oy]),!!b.base.poly));echo.style.display=''}if(cfg.dots){while(dots.childElementCount<cfg.dots)dots.append(svgNode('circle',{r:(2+((dots.childElementCount*7+b.seed)%3)).toFixed(1)}));for(let i=0;i<cfg.dots;i++){const j=Math.floor((i/cfg.dots)*b.base.length+b.seed*3)%b.base.length,q=b.base[j],dot=dots.children[i];dot.setAttribute('cx',(out.points[j][0]+q[2]*(8+i*3)).toFixed(2));dot.setAttribute('cy',(out.points[j][1]+q[3]*(8+i*3)).toFixed(2))}dots.style.display=''}if(out.press>.004&&!mq.matches)el.style.transform=`scale(${1-out.press*.03},${1-out.press*.015})`;else el.style.transform=old.transform;const work=out.active||dirty;dirty=false;return work},rewind:()=>{rewindBody(b);dirty=true;lastD=''},reseed:()=>{b.seed=bodySeed(el)},refresh:()=>{repaint();dirty=true;wake()}}
   const bodyAC=new AbortController(),bo={signal:bodyAC.signal}
   const press=()=>{if(!cfg.press||el.matches(':disabled'))return;b.press.to=1;b.press.k=260;wake()}
   const release=()=>{if(b.press.to){b.press.to=0;b.ripple=1;wake()}}
   el.addEventListener('focusin',()=>{b.focus=true;wake()},bo);el.addEventListener('focusout',()=>{b.focus=false;release();wake()},bo)
   el.addEventListener('pointerenter',()=>{el.setAttribute('data-hover','');wake()},bo);el.addEventListener('pointerleave',()=>{el.removeAttribute('data-hover');wake()},bo)
   el.addEventListener('pointerdown',press,bo);el.addEventListener('pointercancel',release,bo);document.addEventListener('pointerup',release,bo)
   el.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')press()},bo);el.addEventListener('keyup',release,bo)
   const ro=new ResizeObserver(()=>{dirty=true;wake()});ro.observe(el)
   repaint();instances.add(instance);instance.frame(clock??performance.now(),0);wake()
   destroyBody=()=>{instances.delete(instance);bodyAC.abort();ro.disconnect();svg.remove();el.classList.remove('v-morph-host','v-morph-live');if(relative)el.classList.remove('v-morph-rel');el.removeAttribute('data-hover');if(!explicit&&el.dataset.morph===mode)delete el.dataset.morph;for(const [key,value]of [['--mfill',old.fill],['--mstroke',old.stroke],['--mpad',old.pad]]){if(value)el.style.setProperty(key,value);else el.style.removeProperty(key)}el.style.transform=old.transform;if(!instances.size)stop()}
  }
  attach()
  signature=visualSignature()
  const sync=()=>{if(visualSignature()!==signature){attach();signature=visualSignature()}else repairBody()}
  syncHost.current=sync
  const children=new MutationObserver(()=>{repairBody()});children.observe(el,{childList:true})
  const unsubscribe=subscribeMotion(attach)
  mq.addEventListener('change',attach,opts)
  const releaseEnvironment=acquireEnvironment()
  return ()=>{syncHost.current=()=>{};children.disconnect();unsubscribe();destroyBody();ac.abort();releaseEnvironment()}
 },[host,category])
 React.useLayoutEffect(()=>{syncHost.current()})
 return ref
}
