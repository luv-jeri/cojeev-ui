"use client"
import * as React from "react"
import {cva,type VariantProps} from "class-variance-authority"
import {cn} from "@/registry/sahajiv/lib/utils"
import {iconData,type IconNode} from "@/registry/sahajiv/lib/icon-data"
import {useMorph} from "@/registry/sahajiv/motion/use-morph"
import {useFlowPress} from "@/registry/sahajiv/motion/flow-press"
import {motion} from "motion/react"
import {assignMotionRef} from "@/registry/sahajiv/motion/refs"
import {createMotionLane, motionTokens, useChoreography} from "@/registry/sahajiv/motion/choreography"

// Small authored additions share the pack's 24px stroke geometry.
const extraPaths: Record<string, string[]> = {
  "corner-down-left": ["m9 10-5 5 5 5", "M20 4v7a4 4 0 0 1-4 4H4"],
  github: ["M9 19c-4.3 1.3-4.3-2.2-6-2.7M15 22v-3.8c0-1.1-.4-1.8-.8-2.2 2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.4 6a4.4 4.4 0 0 0-.1-3.9S17.2 1.7 14.5 3a13 13 0 0 0-7 0C4.8 1.7 3.7 2.1 3.7 2.1A4.4 4.4 0 0 0 3.6 6a4.7 4.7 0 0 0-1.3 3.3c0 4.7 2.8 5.7 5.5 6-.4.4-.8 1.2-.8 2.2V22"],
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z", "M7 3v6h9V3M7 21v-8h10v8"],
  "circle-help": ["M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", "m22 6-10 7L2 6"],
  link: ["M10 13a5 5 0 0 0 7 .3l3-3a5 5 0 0 0-7-7l-1.8 1.8M14 11a5 5 0 0 0-7-.3l-3 3a5 5 0 0 0 7 7l1.8-1.8"],
  code: ["m8 5-7 7 7 7m8-14 7 7-7 7m-3-16-2 18"],
  compass: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "m16 8-3 5-5 3 3-5 5-3Z"],
  "folder-plus": ["M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z", "M12 10v7m-3-3.5h6"],
  "undo-2": ["M3 10h11a6 6 0 0 1 0 12M7 6l-4 4 4 4"],
  "redo-2": ["M21 10H10a6 6 0 0 0 0 12M17 6l4 4-4 4"],
  globe: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M2 12h20M12 2c5 5.5 5 14.5 0 20-5-5.5-5-14.5 0-20Z"],
  "log-in": ["M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M3 12h12m-4-4 4 4-4 4"],
  filter: ["M3 4h18l-7 8v7l-4 2v-9L3 4Z"],
  palette: ["M12 3a9 9 0 0 0 0 18h1a2 2 0 0 0 1.4-3.4 1 1 0 0 1 .7-1.6H17a4 4 0 0 0 4-4c0-5-4-9-9-9Z", "M7.5 9h.01M10 6h.01M15 6.5h.01M17.5 10h.01"],
  rocket: ["M12 15c-3 0-6-3-6-3C7 6 12 2 21 3c1 9-3 14-9 15l-3-3M6 12H3l2-5h3M12 18v3l5-2v-3", "m4 16-2 6 6-2M15 8h.01"],
  "arrow-up": ["M12 19V5m-7 7 7-7 7 7"],
  paperclip: ["m21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l10-10a4 4 0 0 1 5.7 5.7l-10 10a2 2 0 0 1-2.8-2.8l9.2-9.2"],
  square: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"],
  "shield-check": ["M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z", "m8 12 3 3 5-6"],
};
const additionalIcons = Object.fromEntries(Object.entries(extraPaths).map(([name, paths]) => [name, paths.map(d => ({ tag: "path", attrs: { d }, children: [] }))])) as Record<string, IconNode[]>;

function renderNode(node:IconNode,key:number,draw?:boolean):React.ReactNode{
  if(node.tag==="path"&&draw!==undefined)return <motion.path key={key} {...node.attrs} initial={false} animate={{pathLength:draw?[0,1]:1}} transition={{duration:draw?.5:0,ease:[.2,.8,.2,1]}}/>;
  return React.createElement(node.tag,{...node.attrs,key},...node.children.map((child,index)=>renderNode(child,index,draw)))
}
export type IconProps=React.ComponentProps<"svg"> & {
  name:string;
  size?:"default"|"sm"|"lg";
  draw?:boolean;
  /** One-shot feedback from the nearest control. Disable when another owner animates this icon. */
  feedback?:boolean;
}

const iconControlSelector = 'button,a[href],summary,[role="button"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="tab"],[role="checkbox"],[role="radio"],[role="switch"],label';

function useIconFeedback(host:React.RefObject<SVGSVGElement|null>, enabled:boolean) {
  React.useEffect(() => {
    const svg=host.current;
    const control=svg?.closest<HTMLElement>(iconControlSelector);
    if(!enabled||!svg||!control)return;
    let inView=false;
    let active=false;
    let kind:"hover"|"focus"|"press"="hover";
    let baseScale="none",baseRotate="none";
    let lastActivation=-Infinity;
    const original=new Map<string,{value:string;priority:string}>();
    const written=new Map<string,{value:string;priority:string}>();
    const owns=(property:string,value:{value:string;priority:string})=>svg.style.getPropertyValue(property)===value.value&&svg.style.getPropertyPriority(property)===value.priority;
    const paint=(property:string,value:string)=>{
      if(!original.has(property))original.set(property,{value:svg.style.getPropertyValue(property),priority:svg.style.getPropertyPriority(property)});
      svg.style.setProperty(property,value);written.set(property,{value:svg.style.getPropertyValue(property),priority:svg.style.getPropertyPriority(property)});
    };
    const restore=()=>{
      for(const [property,previous] of original) {
        // A consumer can change its inline style during feedback; never restore over that update.
        const current=written.get(property);
        if(!current||!owns(property,current))continue;
        if(previous.value)svg.style.setProperty(property,previous.value,previous.priority);
        else svg.style.removeProperty(property);
      }
      original.clear();written.clear();active=false;delete svg.dataset.iconFeedback;
    };
    const lane=createMotionLane(0,progress=>{
      if(!active)return;
      // Yield the whole effect before another frame can overwrite a consumer update.
      if([...written].some(([property,value])=>!owns(property,value))){stop();return}
      const pulse=Math.sin(Math.PI*Math.max(0,Math.min(1,progress)));
      const scale=1+pulse*(kind==="press"?-.09:.06);
      const rotate=pulse*(kind==="press"?2:-3);
      // Individual CSS transforms compose with the consumer's transform attribute/style.
      paint("scale",baseScale==="none"?String(scale):baseScale.split(/\s+/).map(value=>`calc(${value} * ${scale})`).join(" "));
      // Preserve a consumer's 3D-axis rotation instead of trying to parse it as a 2D angle.
      if(!baseRotate.includes(" "))paint("rotate",`calc(${baseRotate==="none"?"0deg":baseRotate} + ${rotate}deg)`);
    });
    const stop=()=>{lane.stop();restore()};
    const eligible=()=>{
      const associated=control instanceof HTMLLabelElement?control.control:control;
      return inView&&!document.hidden&&!svg.closest('[inert],[hidden],[data-motion="off"],[data-flow="off"]')&&
        !associated?.matches(':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])')&&
        !control.matches('[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])')&&
        svg.getClientRects().length>0&&getComputedStyle(svg).visibility!=="hidden";
    };
    const start=(next:typeof kind)=>{
      if(!eligible()){stop();return}
      stop();kind=next;
      const computed=getComputedStyle(svg);baseScale=computed.scale;baseRotate=computed.rotate;
      active=true;svg.dataset.iconFeedback=kind;
      lane.jump(0);lane.to(1,{duration:next==="press"?motionTokens.duration.quick:motionTokens.duration.enter,ease:[...motionTokens.ease.settle]},restore);
    };
    const enter=(event:PointerEvent)=>{if(event.pointerType!=="touch")start("hover")};
    const leave=()=>stop();
    const focus=()=>start("focus");
    const blur=(event:FocusEvent)=>{if(!control.contains(event.relatedTarget as Node|null))stop()};
    const key=(event:KeyboardEvent)=>{if(!event.repeat&&(event.key==="Enter"||event.key===" ")){lastActivation=performance.now();start("press")}};
    const click=()=>{if(performance.now()-lastActivation>100){lastActivation=performance.now();start("press")}};
    const visibility=()=>{if(document.hidden)stop()};
    control.addEventListener("pointerenter",enter);control.addEventListener("pointerleave",leave);
    control.addEventListener("focusin",focus);control.addEventListener("focusout",blur);
    control.addEventListener("keydown",key);control.addEventListener("click",click);
    document.addEventListener("visibilitychange",visibility);
    const intersection=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(!inView)stop()},{threshold:.1});
    intersection.observe(svg);
    const attributes=new MutationObserver(()=>{if(active&&!eligible())stop()});
    for(let ancestor:Element|null=control;ancestor;ancestor=ancestor.parentElement)attributes.observe(ancestor,{attributes:true,attributeFilter:["disabled","aria-disabled","data-disabled","inert","hidden","data-motion","data-flow"]});
    return ()=>{
      control.removeEventListener("pointerenter",enter);control.removeEventListener("pointerleave",leave);
      control.removeEventListener("focusin",focus);control.removeEventListener("focusout",blur);
      control.removeEventListener("keydown",key);control.removeEventListener("click",click);
      document.removeEventListener("visibilitychange",visibility);intersection.disconnect();attributes.disconnect();lane.dispose();restore();
    };
  },[host,enabled]);
}

export function iconClassName(size:IconProps["size"]="default",className?:string){return cn("v-icon [width:var(--icon-md)] [height:var(--icon-md)] [stroke:currentColor] [stroke-width:var(--icon-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [fill:none] [flex:none]",size!=="default"&&`-${size}`,className)}
export function Icon({name,size="default",className,draw,feedback=true,ref,...props}:IconProps){
  const {quiet}=useChoreography();
  const host=React.useRef<SVGSVGElement|null>(null);
  const attach=React.useCallback((node:SVGSVGElement|null)=>{host.current=node;const release=assignMotionRef(ref,node);return()=>{host.current=null;release()}},[ref]);
  useIconFeedback(host,feedback&&!quiet);
  const nodes=iconData[name]??additionalIcons[name];
  if(!nodes)throw new Error(`Unknown SahaJiv icon: ${name}`);
  return <svg ref={attach} data-slot="icon" data-icon-name={name} viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(size,className)} {...props}>{nodes.map((node,index)=>renderNode(node,index,draw===undefined?undefined:draw&&!quiet))}</svg>
}
export const iconNames=Object.keys({...iconData,...additionalIcons})
const DiskVariants=cva("v-disk [display:inline-grid] [place-items:center] [width:var(--disk-md)] [height:var(--disk-md)] [border-radius:50%] [background:var(--disk-bg,var(--v-beige))] [color:var(--v-text)] [flex:none]",{variants:{variant:{"default":"","pink":"-pink [--disk-bg:var(--v-pink)] [color:var(--v-on-accent)]","yellow":"-yellow [--disk-bg:var(--v-yellow)] [color:var(--v-on-accent)]","olive":"-olive [--disk-bg:var(--v-olive)] [color:var(--v-on-accent)]","blue":"-blue [--disk-bg:var(--v-blue)] [color:var(--v-on-accent)]","ink":"-ink [--disk-bg:var(--v-ink)] [color:var(--v-on-ink)]","cream":"-cream [--disk-bg:var(--v-canvas)]","beige":"-beige [--disk-bg:var(--v-beige)]"},size:{"default":"","sm":"-sm [width:var(--disk-sm)] [height:var(--disk-sm)]","lg":"-lg [width:var(--disk-lg)] [height:var(--disk-lg)]"}},defaultVariants:{variant:"default",size:"default"}})
export type DiskProps=React.ComponentProps<"span"> & VariantProps<typeof DiskVariants>
export function Disk({className,variant,size,ref,...props}:DiskProps){const morphRef=useMorph<HTMLSpanElement>("icons",ref);return <span ref={morphRef} data-slot="disk"  className={cn(DiskVariants({variant,size}),className)} {...props}/>}
const IconButtonVariants=cva("v-ibtn [display:inline-grid] [place-items:center] [width:var(--ctl-md)] [height:var(--ctl-md)] [border-radius:50%] [color:var(--v-text)] [background:transparent] [box-shadow:inset_0_0_0_1px_var(--v-border)] [transition:background_var(--t-micro),box-shadow_var(--t-micro)]",{variants:{variant:{"default":"","dashed":"-dashed [box-shadow:none] [border:1px_dashed_var(--v-text-2)] [border-color:var(--v-edge)]","ink":"-ink [background:var(--v-ink)] [color:var(--v-on-ink)] [box-shadow:none]","pink":"-pink [background:var(--v-pink)] [box-shadow:none] [color:var(--v-on-accent)]","beige":"-beige [background:var(--v-beige)] [box-shadow:inset_0_0_0_1px_var(--v-edge)] [color:var(--v-on-accent)]","cream":"-cream [background:var(--v-canvas)] [box-shadow:inset_0_0_0_1px_var(--v-edge)]"},size:{"default":"","sm":"-sm [width:var(--ctl-sm)] [height:var(--ctl-sm)]","lg":"-lg [width:var(--ctl-lg)] [height:var(--ctl-lg)]","xl":"-xl [width:var(--dock-action)] [height:var(--dock-action)]"}},defaultVariants:{variant:"default",size:"default"}})
export type IconButtonProps=React.ComponentProps<"button"> & VariantProps<typeof IconButtonVariants>
export function IconButton({className,variant,size,ref,...props}:IconButtonProps){const morphRef=useMorph<HTMLButtonElement>("icons",ref);const ownedRef=useFlowPress(morphRef);return <button ref={ownedRef} data-slot="icon-button" type="button" className={cn(IconButtonVariants({variant,size}),className)} {...props}/>}
