"use client";
import * as React from "react";
import { motion } from "motion/react";
import { Icon, iconClassName, type IconProps } from "@/registry/sahajiv/ui/icon";
import { useChoreography } from "@/registry/sahajiv/motion/choreography";
import { useMotionVisibility } from "@/registry/sahajiv/motion/use-motion-visibility";

export type IconMotion = "auto" | "tremor" | "draw" | "spin" | "bounce" | "validation";
export type AnimatedIconProps = Omit<IconProps,"draw"> & { preset?:IconMotion; active?:boolean };
export function AnimatedIcon({name,preset="auto",active,className,size="default",children,...props}:AnimatedIconProps) {
  const host=React.useRef<HTMLSpanElement>(null);
  const {quiet,transition}=useChoreography();
  const {enabled,inView}=useMotionVisibility(host);
  const [hovered,setHovered]=React.useState(false);
  const [focused,setFocused]=React.useState(false);
  React.useEffect(()=>{
    const node=host.current?.closest<HTMLElement>("button,a,[role=button]")??host.current;
    if(!node)return;
    const enter=()=>setHovered(true),leave=()=>setHovered(false);
    const focus=()=>setFocused(true),blur=(event:FocusEvent)=>{if(!node.contains(event.relatedTarget as Node|null))setFocused(false)};
    node.addEventListener("pointerenter",enter);node.addEventListener("pointerleave",leave);node.addEventListener("focusin",focus);node.addEventListener("focusout",blur);
    return ()=>{node.removeEventListener("pointerenter",enter);node.removeEventListener("pointerleave",leave);node.removeEventListener("focusin",focus);node.removeEventListener("focusout",blur)};
  },[]);
  const permitted=!quiet&&enabled&&inView;
  const running=permitted&&(active??(hovered||focused));
  const settle=permitted?transition:{duration:0};
  const intent=preset!=="auto"?preset:/setting|gear|loader/.test(name)?"spin":/arrow|chevron/.test(name)?"bounce":/check|close|^x$/.test(name)?"validation":"tremor";
  const rotate=running&&intent==="spin"?[0,360]:running&&intent==="tremor"?[0,-9,7,-3,0]:0;
  const x=running&&intent==="bounce"?[0,3,0]:0;
  const scale=running&&intent==="validation"?[1,.85,1.08,1]:1;
  return <span ref={host} data-slot="animated-icon" data-preset={intent} data-animated={running||undefined} className="v-animated-icon">
    <motion.span initial={false} animate={{rotate,x,scale}} transition={running?{duration:intent==="spin"?1.6:.48,repeat:intent==="spin"?Infinity:0,ease:intent==="spin"?"linear":[.2,.8,.2,1]}:settle}>
      {intent==="validation"&&/^(check|x)$/.test(name)?<svg data-slot="icon" data-icon-name={name} viewBox="0 0 24 24" aria-hidden="true" className={iconClassName(size,className)} {...props}><motion.path initial={false} animate={{d:name==="check"?"M5 12L10 17L20 6M10 17L10 17":"M6 6L12 12L18 18M6 18L18 6"}} transition={settle}/>{children}</svg>:<Icon name={name} size={size} className={className} draw={intent==="draw"?running:undefined} {...props}>{children}</Icon>}
    </motion.span>
  </span>;
}
