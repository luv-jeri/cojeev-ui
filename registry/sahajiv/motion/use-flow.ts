"use client"
import * as React from "react"
import { assignMotionRef } from "./refs"
import { acquireFlowEnvironment, appearFlow, attachFlowGroup, isFlowQuiet, replaceFlow, type FlowGroupOptions } from "./flow"
import { subscribeSettings } from "./settings"

export function useFlowGroup<T extends HTMLElement>(externalRef?:React.Ref<T>,options?:FlowGroupOptions):React.RefCallback<T>{
 const kind=options?.kind,itemSelector=options?.itemSelector,activeSelector=options?.activeSelector
 return React.useCallback((el:T|null)=>{
  const releaseRef=assignMotionRef(externalRef,el)
  if(!el)return
  const cleanup=attachFlowGroup(el,{kind,itemSelector,activeSelector})
  return ()=>{cleanup();releaseRef()}
 },[externalRef,kind,itemSelector,activeSelector])
}
/** Initial content is quiet; an actual opening or later mount uses the shared surface animation. */
export function useFlowAppearance<T extends HTMLElement>(open:boolean,externalRef?:React.Ref<T>,kind:'grow'|'enter'='grow'):React.RefCallback<T>{
 const [host,setHost]=React.useState<T|null>(null),previous=React.useRef<boolean|undefined>(undefined)
 const ref=React.useCallback((el:T|null)=>{
  setHost(el);const releaseRef=assignMotionRef(externalRef,el)
  return ()=>{setHost(null);releaseRef()}
 },[externalRef])
 React.useLayoutEffect(()=>{
  if(!host){if(!open)previous.current=false;return}
  const release=acquireFlowEnvironment(),was=previous.current;previous.current=open
  let cleanup=()=>{}
  if(open&&(was===false||(was===undefined&&performance.now()>1500)))cleanup=appearFlow(host,kind==='grow')
  if(open)replaceFlow(host)
  const quiet=()=>{if(isFlowQuiet(host)){cleanup();cleanup=()=>{};replaceFlow(host)}}
  const rm=matchMedia('(prefers-reduced-motion: reduce)');rm.addEventListener('change',quiet)
  const unsubscribe=subscribeSettings(quiet)
  return ()=>{cleanup();unsubscribe();rm.removeEventListener('change',quiet);release()}
 },[host,open,kind])
 return ref
}
