"use client";
import * as React from "react";
import {motion,useMotionValue,useSpring,useTransform,type MotionValue} from "motion/react";
import {cva,type VariantProps} from "class-variance-authority";
import {cn} from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-slider";
import {assignMotionRef} from "../motion/refs";
import {motionTokens,useChoreography} from "../motion/choreography";
import {useMotionVisibility} from "../motion/use-motion-visibility";
import {useOrganicValue,usePaintSize} from "../motion/use-organic-value";
import {organicBandPath,organicLinePath,organicThumbPath,progressRatio} from "../motion/progress-geometry";

export const sliderVariants=cva("v-slider",{variants:{variant:{default:"",pink:"-pink"}},defaultVariants:{variant:"default"}});
export type SliderAppearance="organic"|"line"|"segmented";
export type SliderProps=React.ComponentProps<typeof Primitive.Root> & VariantProps<typeof sliderVariants> & {thumbLabel?:string|((index:number)=>string);appearance?:SliderAppearance};
function RailPaint({energy,appearance,vertical=false,filled=false}:{energy:MotionValue<number>;appearance:SliderAppearance;vertical?:boolean;filled?:boolean}){
 const ref=React.useRef<SVGSVGElement|null>(null),{width,height}=usePaintSize(ref);
 const viewBox=useTransform([width,height],([w,h])=>`0 0 ${w} ${h}`);
 const d=useTransform([width,height,energy],([w,h,e])=>{
  const length=Number(vertical?h:w),thickness=Number(vertical?w:h);
  return appearance==="organic"?organicBandPath(length,thickness,1,filled?Number(e):0):organicLinePath(length,thickness,1,filled?Number(e):0);
 });
 return <motion.svg ref={ref} className="v-slider__paint" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true"><motion.path d={d} transform={vertical?"matrix(0 1 1 0 0 0)":undefined}/></motion.svg>;
}
function ThumbPaint({energy,engagement}:{energy:MotionValue<number>;engagement:MotionValue<number>}){
 const d=useTransform([engagement,energy],([e,v])=>organicThumbPath(Number(e),Number(v)));
 return <svg className="v-slider__thumb-paint" viewBox="0 0 24 24" aria-hidden="true"><motion.path d={d}/><circle cx="12" cy="12" r="1.8"/></svg>;
}
export function Slider({className,variant,appearance="organic",value,defaultValue=[50],min=0,max=100,thumbLabel,onValueChange,style,ref,onPointerEnter,onPointerLeave,onPointerDown,onPointerUp,onPointerCancel,onLostPointerCapture,onFocusCapture,onBlurCapture,...props}:SliderProps){
 const [uncontrolledValue,setUncontrolledValue]=React.useState(defaultValue),values=value??uncontrolledValue;
 const [hovered,setHovered]=React.useState(false),[focused,setFocused]=React.useState(false),[pressed,setPressed]=React.useState(false),[activeIndex,setActiveIndex]=React.useState(0);
 const host=React.useRef<HTMLSpanElement|null>(null),{enabled,inView}=useMotionVisibility(host),{quiet}=useChoreography();
 const attach=React.useCallback((node:HTMLSpanElement|null)=>{host.current=node;const release=assignMotionRef(ref,node);return()=>{host.current=null;release()}},[ref]);
 const still=quiet||!enabled||!inView||!!props.disabled,vertical=props.orientation==="vertical";
 const selected=values[Math.min(activeIndex,Math.max(0,values.length-1))]??min;
 const {energy}=useOrganicValue(progressRatio(selected-min,max-min),still);
 const engagementTarget=useMotionValue(0),engagement=useSpring(engagementTarget,motionTokens.spring.responsive);
 React.useEffect(()=>{if(still){engagementTarget.jump(0);engagement.jump(0)}else engagementTarget.set(pressed?1:(hovered||focused)? .65:0)},[still,pressed,hovered,focused,engagementTarget,engagement]);
 const handleValueChange=(next:number[])=>{if(value===undefined)setUncontrolledValue(next);onValueChange?.(next)};
 return <Primitive.Root {...props} ref={attach} data-slot="slider" data-part="track" data-range={values.length>1||vertical||undefined} data-appearance={appearance} data-motion={still?"off":"on"} data-pressed={pressed||undefined} className={cn(sliderVariants({variant}),className)} value={value} defaultValue={defaultValue} min={min} max={max} onValueChange={handleValueChange} style={style}
  onPointerEnter={event=>{onPointerEnter?.(event);setHovered(true)}} onPointerLeave={event=>{onPointerLeave?.(event);setHovered(false)}}
  onPointerDown={event=>{onPointerDown?.(event);if(!event.defaultPrevented&&!props.disabled&&event.button===0)setPressed(true)}}
  onPointerUp={event=>{onPointerUp?.(event);setPressed(false)}} onPointerCancel={event=>{onPointerCancel?.(event);setPressed(false)}} onLostPointerCapture={event=>{onLostPointerCapture?.(event);setPressed(false)}}
  onFocusCapture={event=>{onFocusCapture?.(event);setFocused(true);const thumb=event.target instanceof Element?event.target.closest<HTMLElement>('[data-thumb-index]'):null;if(thumb)setActiveIndex(Number(thumb.dataset.thumbIndex))}}
  onBlurCapture={event=>{onBlurCapture?.(event);if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocused(false)}}>
   <Primitive.Track data-slot="slider-track"><RailPaint {...{energy,appearance,vertical}}/><Primitive.Range data-slot="slider-range"><RailPaint {...{energy,appearance,vertical}} filled/></Primitive.Range></Primitive.Track>
   {values.map((_,index)=><Primitive.Thumb key={index} data-slot="slider-thumb" data-part="thumb" data-thumb-index={index} aria-labelledby={thumbLabel===undefined&&values.length===1?props["aria-labelledby"]:undefined} aria-describedby={props["aria-describedby"]} aria-invalid={props["aria-invalid"]} aria-label={typeof thumbLabel==="function"?thumbLabel(index):thumbLabel??(values.length>1?`Value ${index+1}`:props["aria-label"])}><ThumbPaint {...{energy,engagement}}/></Primitive.Thumb>)}
 </Primitive.Root>;
}
export type SliderWrapperProps = React.ComponentProps<"div">;
export function SliderWrapper({ className, ...props }: SliderWrapperProps) {
  return (
    <div
      data-slot="slider-wrapper"
      data-part="root"
      className={cn("v-sliderwrap grid gap-3", className)}
      {...props}
    />
  );
}
export type SliderRowProps = React.ComponentProps<"div">;
export function SliderRow({ className, ...props }: SliderRowProps) {
  return (
    <div
      data-slot="slider-row"
      className={cn("v-sliderwrap__row", className)}
      {...props}
    />
  );
}
export type SliderOutputProps = React.ComponentProps<"output">;
export function SliderOutput({ className, ...props }: SliderOutputProps) {
  return (
    <output
      data-slot="slider-output"
      data-part="indicator"
      className={className}
      {...props}
    />
  );
}
