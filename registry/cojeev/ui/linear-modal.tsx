"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { AnimatePresence,motion } from "motion/react";
import { Button } from "./button";
import { Dialog,DialogTrigger,DialogTitle,DialogDescription,DialogClose } from "./dialog";
import { cn } from "../lib/utils";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { assignMotionRef } from "../motion/refs";
export type LinearModalProps=Omit<React.ComponentProps<"div">,"title"> & {title:string;description:string;src:string;alt:string;open?:boolean;defaultOpen?:boolean;onOpenChange?:(open:boolean)=>void;variant?:"card"|"compact"};
/** A card-to-dialog composition; Radix owns modal semantics and focus management. */
export function LinearModal({title,description,src,alt,open,defaultOpen=false,onOpenChange,variant="card",children,className,ref,...props}:LinearModalProps){
 const [localOpen,setLocalOpen]=React.useState(defaultOpen),host=React.useRef<HTMLDivElement>(null),id=React.useId();const {enabled,inView}=useMotionVisibility(host);
 const isOpen=open??localOpen,animated=enabled&&inView;
 const change=(value:boolean)=>{if(open===undefined)setLocalOpen(value);onOpenChange?.(value);};
 const hostRef=React.useCallback((node:HTMLDivElement|null)=>{host.current=node;return assignMotionRef(ref,node);},[ref]);
 const timing={duration:animated?.4:0,ease:[.22,1,.36,1] as [number,number,number,number]};
 return <div {...props} ref={hostRef} className={cn("v-linear-modal",className)} data-slot="linear-modal" data-variant={variant}>
 <Dialog open={isOpen} onOpenChange={change}>
 <DialogTrigger asChild><motion.button type="button" layoutId={animated?`${id}-surface`:undefined} className="v-linear-modal__card" transition={timing} style={{opacity:isOpen?0:1}} aria-label={`Read ${title}`}>
 <motion.img layoutId={animated?`${id}-image`:undefined} transition={timing} className="v-linear-modal__image" src={src} alt={alt}/>
 <span className="v-linear-modal__summary"><motion.strong layoutId={animated?`${id}-title`:undefined} transition={timing}>{title}</motion.strong><span>{description}</span><span className="v-linear-modal__read" aria-hidden="true">Take a closer look ↗</span></span>
 </motion.button></DialogTrigger>
 <AnimatePresence>{isOpen&&<Primitive.Portal forceMount><Primitive.Overlay asChild forceMount><motion.div className="v-linear-modal__overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={timing}/></Primitive.Overlay><Primitive.Content asChild forceMount><motion.section className="v-linear-modal__detail" layoutId={animated?`${id}-surface`:undefined} transition={timing} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
 <motion.img layoutId={animated?`${id}-image`:undefined} transition={timing} className="v-linear-modal__hero" src={src} alt={alt}/>
 <div className="v-linear-modal__content"><DialogTitle asChild><motion.h2 layoutId={animated?`${id}-title`:undefined} transition={timing}>{title}</motion.h2></DialogTitle><DialogDescription>{description}</DialogDescription><div className="v-linear-modal__story">{children}</div></div>
 <DialogClose asChild><Button className="v-linear-modal__close" variant="secondary" size="sm" aria-label="Close detail">×</Button></DialogClose>
 </motion.section></Primitive.Content></Primitive.Portal>}</AnimatePresence>
 </Dialog>
 </div>;
}
