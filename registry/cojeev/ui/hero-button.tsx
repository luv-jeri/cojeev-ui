"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Button, type ButtonProps } from "@/registry/cojeev/ui/button";
import { useChoreography, motionTokens } from "@/registry/cojeev/motion/choreography";
import { cn } from "@/registry/cojeev/lib/utils";

export type HeroButtonProps = ButtonProps & {
  /** Organic keeps a restrained living contour; capsule has a regular resting rim. */
  shape?: "organic" | "capsule";
  showArrow?: boolean;
};

const arrowHead = "M24 7C26 9 29 12 32 14C29 16 26 19 24 21";
const arrowCoil = "M14 12C3 1 3 25 14 23C25 21 21 4 14 12";
const arrowOpening = "M19 7C24 7 28 10 32 14C29 18 24 21 19 21";
const arrowStem = "M7 14C15 14 24 14 32 14";
const stemCoil = "M7 14C7 14 8 14 9 14";

/** A native Button or slotted link, with one shared morph body and a drawing arrow. */
export function HeroButton({
  shape = "organic", showArrow = true, size = "lg", variant = "default",
  asChild = false, className, children, onPointerEnter, onPointerLeave,
  onFocus, onBlur, ...props
}: HeroButtonProps) {
  const { quiet } = useChoreography();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const blocked = props.disabled || props.loading || props["aria-busy"] === true || props["aria-busy"] === "true" || props["aria-disabled"] === true || props["aria-disabled"] === "true";
  const active = !blocked && (hovered || focused);
  const moving = active && !quiet;
  const arrowTransition = {
    type: "tween" as const, duration: quiet ? 0 : moving ? .62 : motionTokens.duration.quick,
    ease: motionTokens.ease.enter, times: moving ? [0, .3, .66, 1] : undefined,
  };
  const content = (label: React.ReactNode) => <>
    <span data-slot="hero-button-label" className="v-hero-button__label">{label}</span>
    {showArrow && <span className="v-hero-button__arrow" aria-hidden="true">
      <svg data-slot="hero-button-arrow" viewBox="0 0 40 28" width="40" height="28" fill="none" focusable="false">
        <motion.path data-slot="hero-button-stem" d={arrowStem} initial={false}
          animate={{ d: moving ? [arrowStem, stemCoil, arrowStem, arrowStem] : arrowStem, pathLength: moving ? [1, .05, .8, 1] : 1 }}
          transition={arrowTransition} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <motion.path data-slot="hero-button-head" d={arrowHead} initial={false}
          animate={{ d: moving ? [arrowHead, arrowCoil, arrowOpening, arrowHead] : arrowHead }}
          transition={arrowTransition} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>}
  </>;
  const child = asChild ? React.Children.only(children) as React.ReactElement<{ children?: React.ReactNode }> : null;
  return <Button
    {...props} asChild={asChild} size={size} variant={variant === "default" || variant === "block" ? "ghost" : variant}
    fullWidth={props.fullWidth || variant === "block"}
    data-slot="hero-button" data-hero-variant={variant} data-hero-size={size} data-hero-shape={shape}
    data-arrow-active={active} data-morph="both" data-tier="pill" data-lobes={shape === "organic" ? 3 : 0}
    data-depth={shape === "organic" ? .024 : 0} data-asym=".12" data-sw="1"
    className={cn("v-hero-button", className)}
    onPointerEnter={event => { onPointerEnter?.(event); if (!event.defaultPrevented && event.pointerType !== "touch") setHovered(true); }}
    onPointerLeave={event => { onPointerLeave?.(event); setHovered(false); }}
    onFocus={event => { onFocus?.(event); if (!event.defaultPrevented) setFocused(event.currentTarget.matches(":focus-visible")); }}
    onBlur={event => { onBlur?.(event); setFocused(false); }}
  >{child ? React.cloneElement(child, undefined, content(child.props.children)) : content(children)}</Button>;
}
