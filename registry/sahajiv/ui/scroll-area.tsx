"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import * as Primitive from "@radix-ui/react-scroll-area";
import { motionTokens, useChoreography } from "../motion/choreography";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { acquirePageScrollbar, pageScrollGeometry, scrollThumbPath, scrollVelocity } from "../motion/scroll-thumb";
import { assignMotionRef } from "../motion/refs";

function useScrollFeedback(host:React.RefObject<HTMLDivElement|null>,mountedElement:HTMLDivElement|null,orientation:"vertical"|"horizontal",documentScroll=false) {
  const {quiet}=useChoreography();
  const {enabled,inView}=useMotionVisibility(host,mountedElement);
  const [dragging,setDragging]=React.useState(false);
  const hovered=React.useRef(false);
  const engagementTarget=useMotionValue(0),pointerTarget=useMotionValue(0),velocityTarget=useMotionValue(0),pressureTarget=useMotionValue(0);
  const engagement=useSpring(engagementTarget,motionTokens.spring.responsive),bend=useSpring(pointerTarget,motionTokens.spring.gentle),velocity=useSpring(velocityTarget,motionTokens.spring.responsive),pressure=useSpring(pressureTarget,motionTokens.spring.expressive);
  const contour=useTransform([engagement,bend,velocity,pressure],values=>scrollThumbPath(...values as [number,number,number,number]));
  const gripOffset=useTransform(velocity,value=>value*5);
  const active=!quiet&&enabled&&inView;
  React.useEffect(()=>{
    if(!active){
      for(const value of [engagementTarget,pointerTarget,velocityTarget,pressureTarget,engagement,bend,velocity,pressure])value.jump(0);
      host.current?.removeAttribute("data-scrolling");
    }else{engagementTarget.set(dragging?1:hovered.current ? .65 : 0);pressureTarget.set(dragging?1:0);}
  },[active,dragging,host,engagementTarget,pointerTarget,velocityTarget,pressureTarget,engagement,bend,velocity,pressure]);
  React.useEffect(()=>{
    const rail=host.current;
    const owner=documentScroll?document.scrollingElement:rail?.closest('[data-slot="scroll-area"]')?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    if(!rail||!owner)return;
    const read=()=>orientation==="vertical"?owner.scrollTop:owner.scrollLeft;
    let previous=read(),time=performance.now(),timer:ReturnType<typeof setTimeout>|undefined;
    const onScroll=()=>{
      const next=read(),now=performance.now(),delta=next-previous,impulse=scrollVelocity(delta,now-time);
      previous=next;time=now;
      if(!delta)return;
      rail.dataset.direction=delta>0?"forward":"backward";
      if(!active)return;
      rail.dataset.scrolling="true";rail.dataset.scrollVelocity=String(Number(impulse.toFixed(3)));velocityTarget.set(impulse);
      clearTimeout(timer);timer=setTimeout(()=>{velocityTarget.set(0);rail.removeAttribute("data-scrolling");rail.removeAttribute("data-scroll-velocity")},120);
    };
    const source=documentScroll?window:owner;
    source.addEventListener("scroll",onScroll,{passive:true});
    return()=>{clearTimeout(timer);source.removeEventListener("scroll",onScroll);};
  },[host,mountedElement,orientation,documentScroll,active,velocityTarget]);
  const hover=(value:boolean)=>{hovered.current=value;if(active)engagementTarget.set(dragging?1:value ? .65 : 0);if(!value&&!dragging)pointerTarget.set(0);};
  const press=(value:boolean)=>{setDragging(value);if(active){pressureTarget.set(value?1:0);engagementTarget.set(value?1:hovered.current ? .65 : 0);}if(!value)pointerTarget.set(0);};
  const point=(event:React.PointerEvent<HTMLDivElement>)=>{
    const thumb=host.current?.querySelector<HTMLElement>('[data-slot="scroll-area-thumb"],[data-slot="page-scrollbar-thumb"]');
    if(!active||!thumb)return;
    const rect=thumb.getBoundingClientRect(),offset=orientation==="vertical"?event.clientY-rect.top:event.clientX-rect.left,length=orientation==="vertical"?rect.height:rect.width;
    pointerTarget.set(Math.max(-1,Math.min(1,offset/Math.max(1,length)*2-1)));
  };
  return {contour,gripOffset,active,dragging,hover,press,point};
}
function ScrollThumbPaint({feedback,orientation="vertical"}:{feedback:ReturnType<typeof useScrollFeedback>;orientation?:"vertical"|"horizontal"}) {
  return <><svg className="v-scroll__contour" viewBox={orientation==="vertical"?"0 0 20 100":"0 0 100 20"} preserveAspectRatio="none" aria-hidden="true" focusable="false"><motion.path d={feedback.contour} transform={orientation==="horizontal"?"matrix(0 1 1 0 0 0)":undefined}/></svg><motion.span className="v-scroll__grip" aria-hidden="true" style={orientation==="vertical"?{y:feedback.gripOffset}:{x:feedback.gripOffset}}><i/><i/><i/></motion.span></>;
}

export const scrollAreaVariants = cva("v-scroll", {
  variants: { variant: { default: "", ink: "-ink", plain: "-plain" } },
  defaultVariants: { variant: "default" },
});
export type ScrollAreaProps = React.ComponentProps<typeof Primitive.Root> &
  VariantProps<typeof scrollAreaVariants> & {
    viewportClassName?: string;
    /** Native viewport attributes, including a ref, scroll listener or accessible name. */
    viewportProps?: React.ComponentProps<typeof Primitive.Viewport>;
    /** Compose a primitive around the actual scrolling element, preserving its ref. */
    viewportWrapper?: (viewport: React.ReactElement) => React.ReactNode;
  };
function ScrollViewport({ style, ...props }: React.ComponentProps<typeof Primitive.Viewport>) {
  // An asChild parent such as Select.Viewport supplies an overflow shorthand.
  // Normalize it before Radix writes its own axis styles to the same DOM node.
  const { overflow, ...rest } = style ?? {};
  const axes = typeof overflow === "string" ? overflow.split(/\s+/) : [];
  const normalized = axes.length ? { ...rest, overflowX: rest.overflowX ?? axes[0], overflowY: rest.overflowY ?? axes[1] ?? axes[0] } as React.CSSProperties : rest;
  return <Primitive.Viewport {...props} style={normalized} />;
}
export function ScrollArea({ className, variant, children, viewportClassName, viewportProps, viewportWrapper, type = "auto", ...props }: ScrollAreaProps) {
  const viewport = (
    <ScrollViewport
      data-slot="scroll-area-viewport"
      data-part="viewport"
      tabIndex={0}
      role="region"
      aria-label={props["aria-label"] ?? "Scrollable content"}
      {...viewportProps}
      className={cn("v-scroll__viewport", viewportClassName, viewportProps?.className)}
    >{children}</ScrollViewport>
  );
  return (
    <Primitive.Root data-slot="scroll-area" data-part="root" type={type} className={cn(scrollAreaVariants({ variant }), className)} {...props}>
      {viewportWrapper ? viewportWrapper(viewport) : viewport}
      <ScrollBar />
      <Primitive.Corner data-slot="scroll-area-corner" />
    </Primitive.Root>
  );
}
export type ScrollAreaListProps = ScrollAreaProps & { maxHeight?: React.CSSProperties["maxHeight"] };
/** Internal list scrollport: its owning menu/list retains focus and semantics. */
export function ScrollAreaList({ maxHeight = "var(--list-scroll-max-height, min(320px, 60dvh))", className, style, viewportProps, ...props }: ScrollAreaListProps) {
  return <ScrollArea variant="plain" className={cn("v-list-scroll", className)} style={{ "--h": typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight, ...style } as React.CSSProperties} viewportProps={{ role: undefined, "aria-label": undefined, tabIndex: -1, ...viewportProps }} {...props} />;
}
/** Preserve a consumer's native asChild element while wrapping only its contents. */
export function scrollAreaListChildren(children: React.ReactNode, asChild?: boolean) {
  if (asChild && React.isValidElement<{ children?: React.ReactNode }>(children))
    return React.cloneElement(children, { children: <ScrollAreaList>{children.props.children}</ScrollAreaList> });
  return <ScrollAreaList>{children}</ScrollAreaList>;
}
export type ScrollBarProps = React.ComponentProps<typeof Primitive.Scrollbar>;
export function ScrollBar({
  className,
  ref,
  orientation = "vertical",
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  ...props
}: ScrollBarProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const [mountedElement, setMountedElement] = React.useState<HTMLDivElement | null>(null);
  const hostRef = React.useCallback((element: HTMLDivElement | null) => {
    host.current = element;
    setMountedElement(element);
    const release = assignMotionRef(ref, element);
    return () => { host.current = null; setMountedElement(null); release(); };
  }, [ref]);
  const feedback=useScrollFeedback(host,mountedElement,orientation);
  const {active,dragging}=feedback;
  return (
    <Primitive.Scrollbar
      ref={hostRef}
      data-slot="scroll-area-scrollbar"
      data-dragging={dragging ? "true" : undefined}
      data-motion={active ? "on" : "off"}
      orientation={orientation}
      className={cn("v-scroll__bar", className)}
      {...props}
      onPointerEnter={event => { onPointerEnter?.(event); feedback.hover(true); feedback.point(event); }}
      onPointerLeave={event => { onPointerLeave?.(event); feedback.hover(false); }}
      onPointerDown={event => { onPointerDown?.(event); if (event.defaultPrevented || event.button !== 0) return; feedback.press(true); feedback.point(event); }}
      onPointerMove={event => { onPointerMove?.(event); feedback.point(event); }}
      onPointerUp={event => { onPointerUp?.(event); feedback.press(false); }}
      onPointerCancel={event => { onPointerCancel?.(event); feedback.press(false); }}
      onLostPointerCapture={event => { onLostPointerCapture?.(event); feedback.press(false); }}
    >
      <Primitive.Thumb data-slot="scroll-area-thumb" data-part="thumb" className="v-scroll__thumb">
        <ScrollThumbPaint feedback={feedback} orientation={orientation}/>
      </Primitive.Thumb>
    </Primitive.Scrollbar>
  );
}

export type PageScrollBarProps = React.ComponentProps<"div">;
/** Mount once near the application root. The document remains the scroll owner. */
export function PageScrollBar({ className, ref, onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, ...props }: PageScrollBarProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const [mountedElement,setMountedElement]=React.useState<HTMLDivElement|null>(null);
  const externalRef = React.useCallback((element: HTMLDivElement | null) => {
    host.current = element; setMountedElement(element);
    const release = assignMotionRef(ref, element);
    return () => { host.current = null; setMountedElement(null); release(); };
  }, [ref]);
  const generatedId = `page-scroll-${React.useId().replace(/:/g, "")}`;
  const [controlledId, setControlledId] = React.useState(generatedId);
  const [metrics, setMetrics] = React.useState({ maxScroll: 0, thumbSize: 0, thumbOffset: 0, travel: 0, scrollTop: 0, viewport: 0 });
  const metricsRef = React.useRef(metrics);
  const drag = React.useRef<{ pointerId: number; grabOffset: number } | null>(null);
  const feedback=useScrollFeedback(host,mountedElement,"vertical",true);
  const {active,dragging}=feedback;
  React.useEffect(() => {
    const rail = host.current, documentElement = document.documentElement;
    if (!rail) return;
    const owner = document.scrollingElement ?? documentElement;
    const previousId = owner.getAttribute("id");
    if (!previousId) owner.setAttribute("id", generatedId);
    setControlledId(previousId || generatedId);
    const restoreNativeScrollbar = acquirePageScrollbar(documentElement);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = {
        ...pageScrollGeometry(owner.scrollHeight, owner.clientHeight, rail.getBoundingClientRect().height, owner.scrollTop),
        scrollTop: owner.scrollTop, viewport: owner.clientHeight,
      };
      metricsRef.current = next;
      setMetrics(old => Object.keys(next).every(key => next[key as keyof typeof next] === old[key as keyof typeof old]) ? old : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const resize = new ResizeObserver(schedule);
    resize.observe(documentElement);
    resize.observe(rail);
    if (document.body) resize.observe(document.body);
    const content = new MutationObserver(schedule);
    content.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect(); content.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      if (!previousId && owner.id === generatedId) owner.removeAttribute("id");
      restoreNativeScrollbar();
    };
  }, [generatedId]);
  const scrollTo = (top: number) => {
    const owner = document.scrollingElement ?? document.documentElement;
    owner.scrollTo({ top: Math.max(0, Math.min(metricsRef.current.maxScroll, top)), behavior: "instant" });
  };
  const point=feedback.point;
  const move = (clientY: number) => {
    if (!drag.current || !host.current) return;
    const { travel, maxScroll } = metricsRef.current;
    const position = clientY - host.current.getBoundingClientRect().top - drag.current.grabOffset;
    scrollTo(travel > 0 ? position / travel * maxScroll : 0);
  };
  const release = () => {
    drag.current = null; feedback.press(false);
  };
  return (
    <div
      {...props}
      ref={externalRef}
      data-slot="page-scrollbar"
      data-overflow={metrics.maxScroll > 0 ? "true" : "false"}
      data-dragging={dragging ? "true" : undefined}
      data-motion={active ? "on" : "off"}
      role="scrollbar"
      aria-label={props["aria-label"] ?? "Page scroll position"}
      aria-controls={controlledId}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={Math.round(metrics.maxScroll)}
      aria-valuenow={Math.round(Math.max(0, Math.min(metrics.maxScroll, metrics.scrollTop)))}
      aria-hidden={metrics.maxScroll <= 0 || undefined}
      tabIndex={metrics.maxScroll > 0 ? 0 : -1}
      className={cn("v-page-scrollbar", className)}
      onPointerEnter={event => { feedback.hover(true); point(event); props.onPointerEnter?.(event); }}
      onPointerLeave={event => { feedback.hover(false); props.onPointerLeave?.(event); }}
      onPointerDown={event => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0 || metrics.maxScroll <= 0) return;
        const relative = event.clientY - event.currentTarget.getBoundingClientRect().top - metrics.thumbOffset;
        const onThumb = event.target instanceof Element && !!event.target.closest('[data-slot="page-scrollbar-thumb"]');
        drag.current = { pointerId: event.pointerId, grabOffset: onThumb ? relative : metrics.thumbSize / 2 };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        feedback.press(true); move(event.clientY); point(event);
      }}
      onPointerMove={event => { onPointerMove?.(event); if (drag.current?.pointerId === event.pointerId) move(event.clientY); point(event); }}
      onPointerUp={event => { onPointerUp?.(event); release(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={event => { onPointerCancel?.(event); release(); }}
      onLostPointerCapture={event => { onLostPointerCapture?.(event); release(); }}
      onKeyDown={event => {
        onKeyDown?.(event); if (event.defaultPrevented) return;
        const { scrollTop, viewport, maxScroll } = metricsRef.current;
        const targets: Record<string, number> = { ArrowDown: scrollTop + 48, ArrowUp: scrollTop - 48, PageDown: scrollTop + viewport * .9, PageUp: scrollTop - viewport * .9, Home: 0, End: maxScroll, " ": scrollTop + viewport * .9 * (event.shiftKey ? -1 : 1) };
        if (event.key in targets) { event.preventDefault(); scrollTo(targets[event.key]); }
      }}
    >
      <div data-slot="page-scrollbar-thumb" style={{ height: metrics.thumbSize, transform: `translateY(${metrics.thumbOffset}px)` }}>
        <ScrollThumbPaint feedback={feedback}/>
      </div>
    </div>
  );
}
