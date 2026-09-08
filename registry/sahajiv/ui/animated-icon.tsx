"use client";
import * as React from "react";
import { motion } from "motion/react";
import { Icon, iconClassName, createIconMotionPainter, getIconDirection, type IconProps } from "@/registry/sahajiv/ui/icon";
import { createMotionLane, useChoreography } from "@/registry/sahajiv/motion/choreography";
import { useMotionVisibility } from "@/registry/sahajiv/motion/use-motion-visibility";

export type IconMotion = "auto" | "tremor" | "draw" | "spin" | "bounce" | "validation" | "pulse" | "none";
export type AnimatedIconProps = Omit<IconProps,"draw"|"feedback"> & { preset?:IconMotion; active?:boolean; amplitude?:number; duration?:number };
export function AnimatedIcon({name,preset="auto",active,amplitude=1,duration,className,size="default",children,...props}:AnimatedIconProps) {
  const host=React.useRef<HTMLSpanElement>(null);
  const {quiet,transition}=useChoreography();
  const {enabled,inView}=useMotionVisibility(host);
  const [hovered,setHovered]=React.useState(false);
  const [focused,setFocused]=React.useState(false);
  const [allowed,setAllowed]=React.useState(false);
  React.useEffect(()=>{
    const node=host.current?.closest<HTMLElement>('button,a[href],summary,[role=button],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=tab],[role=checkbox],[role=radio],[role=switch],label')??host.current;
    if(!node)return;
    const associated=node instanceof HTMLLabelElement?node.control:node;
    const eligible=()=>!node.closest('[inert],[hidden],[data-motion="off"],[data-flow="off"]')&&!node.matches(':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])')&&!associated?.matches(':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"])');
    const sync=()=>{const next=eligible();setAllowed(next);if(!next){setHovered(false);setFocused(false)}};
    sync();
    const enter=(event:PointerEvent)=>{if(event.pointerType!=="touch")setHovered(eligible())},leave=()=>setHovered(false);
    const focus=()=>setFocused(eligible()),blur=(event:FocusEvent)=>{if(!node.contains(event.relatedTarget as Node|null))setFocused(false)};
    node.addEventListener("pointerenter",enter);node.addEventListener("pointerleave",leave);node.addEventListener("focusin",focus);node.addEventListener("focusout",blur);
    const attributes=new MutationObserver(sync);
    const observe=(element:Element)=>attributes.observe(element,{attributes:true,attributeFilter:["disabled","aria-disabled","data-disabled","inert","hidden","data-motion","data-flow"]});
    for(let ancestor:Element|null=node;ancestor;ancestor=ancestor.parentElement)observe(ancestor);
    if(associated&&associated!==node)observe(associated);
    return ()=>{node.removeEventListener("pointerenter",enter);node.removeEventListener("pointerleave",leave);node.removeEventListener("focusin",focus);node.removeEventListener("focusout",blur);attributes.disconnect()};
  },[]);
  const amount=Number.isFinite(amplitude)?Math.max(0,Math.min(amplitude,3)):1;
  const permitted=allowed&&!quiet&&enabled&&inView&&amount>0;
  const running=permitted&&(active??(hovered||focused));
  const settle=permitted?transition:{duration:0};
  const intent=preset!=="auto"?preset:"semantic";
  const seconds=duration!==undefined&&Number.isFinite(duration)?Math.max(.08,Math.min(duration,10)):undefined;
  React.useEffect(()=>{
    if(intent!=="semantic"||!running)return;
    const svg=host.current?.querySelector<SVGSVGElement>("[data-slot=icon]");if(!svg)return;
    const painter=createIconMotionPainter(svg,name,amount);
    const lane=createMotionLane(0,painter.paint);
    const looping=name==="loader"||name==="loader-circle";
    lane.jump(0);
    lane.to(1,{duration:seconds??(looping?1.35:.55),ease:"linear",repeat:looping?Infinity:0},painter.restore);
    return ()=>{lane.dispose();painter.restore()};
  },[intent,running,name,amount,seconds,active]);
  const rotate=running&&intent==="spin"?[0,360]:running&&intent==="tremor"?[0,-9*amount,7*amount,-3*amount,0]:0;
  const direction=getIconDirection(name);
  const [dx,dy]=direction[0]||direction[1]?direction:[1,0];
  const x=running&&intent==="bounce"?[0,3*amount*dx,0]:0;
  const y=running&&intent==="bounce"?[0,3*amount*dy,0]:0;
  const scale=running&&intent==="validation"?[1,1-.15*amount,1+.08*amount,1]:running&&intent==="pulse"?[1,1+.12*amount,1]:1;
  return <span ref={host} data-slot="animated-icon" data-preset={intent} data-animated={(running&&intent!=="none")||undefined} className="v-animated-icon">
    <motion.span initial={false} animate={{rotate,x,y,scale}} transition={running?{duration:seconds??(intent==="spin"?1.6:.48),repeat:intent==="spin"?Infinity:0,ease:intent==="spin"?"linear":[.2,.8,.2,1]}:settle}>
      {intent==="validation"&&/^(check|x)$/.test(name)?<svg data-slot="icon" data-icon-name={name} viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(size,className)} {...props}><motion.path initial={false} animate={{d:name==="check"?"M5 12L10 17L20 6M10 17L10 17":"M6 6L12 12L18 18M6 18L18 6"}} transition={settle}/>{children}</svg>:<Icon name={name} size={size} className={className} draw={intent==="draw"?running:undefined} {...props} feedback={false}>{children}</Icon>}
    </motion.span>
  </span>;
}


export type StateChevronProps = Omit<React.ComponentProps<"span">,"children"> & {
  /** Omit to follow the closest native trigger's data-state/aria-expanded. */
  open?: boolean;
  direction?: "down" | "right";
};
/** One real state cue; quiet motion still updates the direction immediately. */
export function StateChevron({ open, direction="down", className, ref, ...props }: StateChevronProps) {
  const host = React.useRef<HTMLSpanElement | null>(null);
  const [nativeOpen, setNativeOpen] = React.useState(false);
  const { quiet, transition } = useChoreography();
  const attach = React.useCallback((node: HTMLSpanElement | null) => {
    host.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  React.useEffect(() => {
    if (open !== undefined) return;
    const trigger = host.current?.parentElement?.closest("[aria-expanded],[data-state]");
    if (!trigger) return;
    const sync = () => setNativeOpen(trigger.getAttribute("aria-expanded") === "true" || trigger.getAttribute("data-state") === "open");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(trigger, { attributes:true, attributeFilter:["data-state","aria-expanded"] });
    return () => observer.disconnect();
  }, [open]);
  const expanded = open ?? nativeOpen;
  return <span {...props} ref={attach} data-slot="state-chevron" data-open={expanded} aria-hidden="true" className={["v-state-chevron",className].filter(Boolean).join(" ")}>
    <motion.span initial={false} animate={{rotate:expanded?(direction==="right"?90:180):0}} transition={quiet?{duration:0}:transition}><Icon name={direction==="right"?"chevron-right":"chevron-down"} size="sm" feedback={false} /></motion.span>
  </span>;
}
