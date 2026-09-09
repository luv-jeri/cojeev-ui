"use client";
/* eslint-disable @next/next/no-img-element -- Installable React image gallery. */
import * as React from "react";
import { cn } from "../lib/utils";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { useGalleryRef, useGallerySelection } from "../lib/reference-gallery-motion";
export type AccordionGalleryItem={id:string;src:string;alt:string;title:string;description?:string;href?:string};
export type AccordionGalleryProps=Omit<React.ComponentProps<"div">,"onChange"> & {items:readonly AccordionGalleryItem[];defaultIndex?:number;selectedIndex?:number;onSelectionChange?:(index:number)=>void;orientation?:"horizontal"|"vertical"};
export function AccordionGallery({items,defaultIndex=0,selectedIndex,onSelectionChange,orientation="horizontal",className,ref,...props}:AccordionGalleryProps){
 const host=React.useRef<HTMLDivElement>(null),buttons=React.useRef<(HTMLButtonElement|null)[]>([]),id=React.useId();
 const {enabled,inView}=useMotionVisibility(host);
 const {selected,select}=useGallerySelection(items.length,defaultIndex,selectedIndex,onSelectionChange);
 const key=(event:React.KeyboardEvent<HTMLButtonElement>,index:number)=>{let next=index;if(event.key==="ArrowRight"||event.key==="ArrowDown")next=(index+1)%items.length;else if(event.key==="ArrowLeft"||event.key==="ArrowUp")next=(index-1+items.length)%items.length;else if(event.key==="Home")next=0;else if(event.key==="End")next=items.length-1;else return;event.preventDefault();select(next);buttons.current[next]?.focus();};
 return <div {...props} ref={useGalleryRef(host,ref)} data-slot="accordion-gallery" data-motion={enabled&&inView ? "on":"off"} data-orientation={orientation} className={cn("v-accordion-gallery",className)}>
 {items.length===0 ? <p>No gallery items.</p> : items.map((item,index)=><section key={item.id} className="v-accordion-gallery__panel" data-selected={selected===index}>
 <img className="v-accordion-gallery__image" src={item.src} alt={item.alt}/>
 <h3 className="v-accordion-gallery__heading"><button type="button" ref={node=>{buttons.current[index]=node;}} aria-expanded={selected===index} aria-controls={`${id}-${index}`} onClick={()=>select(index)} onKeyDown={event=>key(event,index)}><span className="v-accordion-gallery__number">{String(index+1).padStart(2,"0")}</span><span>{item.title}</span></button></h3>
 <div id={`${id}-${index}`} className="v-accordion-gallery__story" hidden={selected!==index}>{item.description&&<p>{item.description}</p>}{item.href&&<a href={item.href}>Explore {item.title}<span aria-hidden="true"> ↗</span></a>}</div>
 </section>)}
 </div>;
}
