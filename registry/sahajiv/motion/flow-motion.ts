import { animate } from "motion";
import { createMotionLane, motionTokens, resolveChoreography, trackMotion } from "./choreography";
import { getSettingsSnapshot, getFlowSettings } from "./settings";

type Box = { x: number; y: number; w: number; h: number; r: string };

/** CSS retains paint; Motion is the sole owner of all travelling layer geometry. */
export function createFlowPainter(write: (name: string, value: string) => void) {
  const families = ["glide", "hov", "trail"] as const;
  const make = (prefix: string) => Object.fromEntries(["x", "y", "w", "h", "o"].map(key => [key,
    createMotionLane(0, value => write(`--${prefix}-${key}`, `${Number(value.toFixed(3))}${key === "o" ? "" : "px"}`)),
  ])) as Record<"x" | "y" | "w" | "h" | "o", ReturnType<typeof createMotionLane>>;
  const lanes = { glide: make("glide"), hov: make("hov"), trail: make("trail") };
  const initialized = new Set<string>();
  function paint(box: Box, hover = false, immediate = false) {
    const snapshot = getSettingsSnapshot();
    const { transition } = resolveChoreography(snapshot, false);
    for (const prefix of hover ? ["hov"] as const : ["glide", "trail"] as const) {
      const instant = immediate || !initialized.has(prefix);
      const timing = prefix === "trail" ? { ...transition, delay: .045 / snapshot.flow.speed } : transition;
      for (const key of ["x", "y", "w", "h"] as const) {
        if (instant) lanes[prefix][key].jump(box[key]);
        else lanes[prefix][key].to(box[key], timing);
      }
      write(`--${prefix}-r`, box.r);
      if (instant) lanes[prefix].o.jump(1);
      else lanes[prefix].o.to(1, { duration: .12 / snapshot.flow.speed });
      initialized.add(prefix);
    }
  }
  return {
    paint,
    hide(hover: boolean, immediate = false) {
      for (const prefix of hover ? ["hov"] as const : ["glide", "trail"] as const) {
        if (immediate) lanes[prefix].o.jump(0);
        else lanes[prefix].o.to(0, { duration: motionTokens.duration.quick });
      }
    },
    stop: () => { for (const prefix of families) Object.values(lanes[prefix]).forEach(lane => lane.stop()); },
    dispose: () => { for (const prefix of families) Object.values(lanes[prefix]).forEach(lane => lane.dispose()); },
  };
}

/** A bounded release response. Each new gesture cancels the previous owner. */
export function animateFlowLanding(element: HTMLElement, variant: string, direction = "x") {
  const { intensity, speed } = getFlowSettings();
  const stretch = (variant === "jelly" ? .13 : variant === "drop" ? -.08 : .045) * Math.min(intensity, 2);
  const x = direction === "x" ? 1 + stretch : 1 - stretch * .55;
  const y = direction === "x" ? 1 - stretch * .55 : 1 + stretch;
  const animation = animate(element, { scaleX: [x, 1], scaleY: [y, 1], ...(variant === "pebble" ? { skewX: [-2 * intensity, 0] } : {}) }, {
    ...motionTokens.spring.expressive,
    stiffness: motionTokens.spring.expressive.stiffness * speed * speed,
    damping: motionTokens.spring.expressive.damping * speed,
  });
  const stop = trackMotion(animation);
  let removeAura = () => {};
  if (variant === "ripple" || variant === "halo") {
    const aura = document.createElement("span");
    Object.assign(aura.style, {
      position: "absolute", inset: "0", borderRadius: "inherit", pointerEvents: "none",
      boxShadow: variant === "ripple" ? "inset 0 0 0 1px var(--v-pink)" : "0 0 12px 4px var(--v-pink)",
    });
    element.append(aura);
    const bloom = animate(aura, { scale: [1, 1 + .3 * intensity], opacity: [.45, 0] }, {
      duration: .5 / speed, ease: [...motionTokens.ease.settle],
    });
    const stopAura = trackMotion(bloom);
    removeAura = () => { stopAura(); aura.remove(); };
    void bloom.finished.then(() => aura.remove());
  }
  return () => { stop(); removeAura(); };
}
