"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { galleryOffset } from "../lib/reference-gallery-geometry";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { useGalleryRef, useGallerySelection } from "../lib/reference-gallery-motion";
export type OptionWheelItem={id:string;label:string;description?:string};
export type OptionWheelProps=Omit<React.ComponentProps<"div">,"onChange"> & {items:readonly OptionWheelItem[];defaultIndex?:number;selectedIndex?:number;onSelectionChange?:(index:number)=>void;side?:"left"|"right"};
export function OptionWheel({items,defaultIndex=0,selectedIndex,onSelectionChange,side="left",className,ref,...props}:OptionWheelProps){
 const host=React.useRef<HTMLDivElement>(null),id=React.useId();const {enabled,inView}=useMotionVisibility(host);
 const {selected,select}=useGallerySelection(items.length,defaultIndex,selectedIndex,onSelectionChange);
 const key=(event:React.KeyboardEvent<HTMLDivElement>)=>{let next=selected;if(event.key==="ArrowDown"||event.key==="ArrowRight")next++;else if(event.key==="ArrowUp"||event.key==="ArrowLeft")next--;else if(event.key==="Home")next=0;else if(event.key==="End")next=items.length-1;else return;event.preventDefault();select(next);};
 return <div {...props} ref={useGalleryRef(host,ref)} data-slot="option-wheel" data-motion={enabled&&inView ? "on":"off"} data-side={side} className={cn("v-option-wheel",className)}>
 <div role="listbox" aria-label={props["aria-label"]??"Choose an option"} aria-activedescendant={selected>=0 ? `${id}-${selected}`:undefined} tabIndex={items.length?0:-1} onKeyDown={key} className="v-option-wheel__stage">
 <span aria-hidden="true" className="v-option-wheel__marker">↳</span>
 {items.map((item,index)=>{const d=galleryOffset(index,selected,items.length),angle=d*.15;return <div key={item.id} id={`${id}-${index}`} role="option" aria-selected={index===selected} onClick={event=>{select(index);event.currentTarget.parentElement?.focus();}} className="v-option-wheel__option" style={{transform:`translate(${((side==="left"?1:-1)*(1-Math.cos(angle))*180).toFixed(3)}px, calc(-50% + ${d*58}px)) rotate(${(side==="left"?-1:1)*d*4}deg)`,opacity:Math.abs(d)>2?0:Math.max(.45,1-Math.abs(d)*.24),pointerEvents:Math.abs(d)>2?"none":"auto"}}>{item.label}</div>;})}
 {!items.length&&<p>No options available.</p>}
 </div>
 <div className="v-option-wheel__footer"><button type="button" aria-label="Previous option" disabled={items.length<2} onClick={()=>select(selected-1)}>↑</button><p role="status">{items[selected]?.description??items[selected]?.label??"No selection"}</p><button type="button" aria-label="Next option" disabled={items.length<2} onClick={()=>select(selected+1)}>↓</button></div>
 </div>;
}
