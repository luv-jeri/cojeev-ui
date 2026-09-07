"use client"

import * as React from "react"

// Standalone press landing; group travel will share these character settings.
const characters:Record<string,{duration:number;ease:string;land:string;glow?:string}>={
 glide:{duration:.42,ease:'cubic-bezier(.34,1.32,.44,1)',land:'vf-land'},stretch:{duration:.3,ease:'cubic-bezier(.3,1.15,.4,1)',land:'vf-land'},
 jelly:{duration:.5,ease:'cubic-bezier(.3,1.3,.45,1)',land:'vf-jellyx'},comet:{duration:.34,ease:'cubic-bezier(.2,.8,.2,1)',land:'vf-land'},
 drop:{duration:.3,ease:'cubic-bezier(.3,1.25,.4,1)',land:'vf-bloom'},rubber:{duration:.36,ease:'cubic-bezier(.3,1.3,.4,1)',land:'vf-land'},
 pebble:{duration:.46,ease:'cubic-bezier(.32,1.25,.42,1)',land:'vf-lean'},ripple:{duration:.36,ease:'cubic-bezier(.2,.8,.2,1)',land:'vf-land',glow:'vf-ring'},
 halo:{duration:.4,ease:'cubic-bezier(.3,1.2,.4,1)',land:'vf-land',glow:'vf-glow'},off:{duration:0,ease:'linear',land:'none'},
}
function settings(){try{return {variant:'glide',speed:1,intensity:1,...JSON.parse(localStorage.getItem('v-flow-v1')||'null')}}catch{return {variant:'glide',speed:1,intensity:1}}}
export function pulseFlowPress(el:HTMLElement){
 const cfg=settings();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||cfg.variant==='off'||el.closest('[data-flow="off"],.v-glide')||el.matches(':disabled'))return
 const c=characters[cfg.variant]||characters.glide,cs=getComputedStyle(el),token=cs.getPropertyValue('--t-flow-'+cfg.variant).trim();
 const duration=token?(parseFloat(token)/(token.endsWith('ms')?1000:1)):c.duration;
 el.style.setProperty('--flow-ease',cs.getPropertyValue('--e-flow-'+cfg.variant).trim()||c.ease)
 el.style.setProperty('--flow-dur',(duration/Math.max(.25,+cfg.speed||1)).toFixed(3)+'s')
 el.style.setProperty('--flow-intensity',String(Math.max(0,Number(cfg.intensity))))
 el.style.setProperty('--flow-land',c.land);el.style.setProperty('--flow-glow',c.glow||'none')
 el.removeAttribute('data-flow-land');void el.offsetWidth;el.setAttribute('data-flow-land','')
}
export function useFlowPress<T extends HTMLElement>(externalRef:React.Ref<T>){
 return React.useCallback((el:T|null)=>{
  let externalCleanup:void|(()=>void)
  if(typeof externalRef==='function')externalCleanup=externalRef(el);else if(externalRef)externalRef.current=el
  if(!el)return
  const ac=new AbortController(),options={capture:true,signal:ac.signal}
  el.addEventListener('pointerup',()=>pulseFlowPress(el),options)
  el.addEventListener('keyup',event=>{if(event.key==='Enter'||event.key===' ')pulseFlowPress(el)},options)
  return ()=>{ac.abort();if(typeof externalCleanup==='function')externalCleanup();else if(typeof externalRef==='function')externalRef(null);else if(externalRef)externalRef.current=null}
 },[externalRef])
}
