"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { supportDestination } from "../lib/reference-layouts";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { assignMotionRef } from "../motion/refs";
export type BuyMeCoffeeProps=Omit<React.ComponentProps<"a">,"href"|"children"|"title"> & {href:string;title?:string;description?:string;actionLabel?:string;tone?:"pink"|"olive"|"blue"|"yellow"};
/** A support invitation and native destination link, with no payment behavior. */
export function BuyMeCoffee({href,title="Keep good things growing.",description="A little support makes room for the next useful idea.",actionLabel="Support this work",tone="yellow",className,ref,...props}:BuyMeCoffeeProps){
 const host=React.useRef<HTMLAnchorElement>(null),{enabled,inView}=useMotionVisibility(host),destination=supportDestination(href);
 const hostRef=React.useCallback((node:HTMLAnchorElement|null)=>{host.current=node;return assignMotionRef(ref,node);},[ref]);
 return <a {...props} ref={hostRef} href={destination} aria-disabled={!destination||undefined} className={cn("v-buy-me-coffee",className)} data-slot="buy-me-coffee" data-motion={enabled&&inView?"on":"off"} style={{...props.style,"--support-tone":`var(--v-${tone})`} as React.CSSProperties} rel={props.target==="_blank"?"noopener noreferrer":props.rel}>
 <span className="v-buy-me-coffee__poster" aria-hidden="true">a little<br/>goes a<br/>long way.</span>
 <span className="v-buy-me-coffee__art" aria-hidden="true"><svg viewBox="0 0 180 170" fill="none"><path className="v-buy-me-coffee__steam" d="M66 42C47 26 83 25 65 8M94 42C75 26 111 25 93 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M122 65H139C158 65 158 96 140 98H121" stroke="currentColor" strokeWidth="5"/><path d="M38 58H128L121 127Q118 148 83 148Q48 148 45 127Z" fill="var(--support-tone)" stroke="currentColor" strokeWidth="3"/><ellipse cx="83" cy="59" rx="44" ry="8" fill="var(--v-paper)" stroke="currentColor" strokeWidth="3"/><path d="M66 103C58 84 82 81 84 96C87 81 112 85 99 104L83 119Z" fill="var(--v-ink)"/><path d="M27 153H143" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></span>
 <span className="v-buy-me-coffee__copy"><strong>{title}</strong><span>{description}</span></span>
 <span className="v-buy-me-coffee__action">{destination?actionLabel:"Support link unavailable"}<span aria-hidden="true">↗</span></span>
 </a>;
}
