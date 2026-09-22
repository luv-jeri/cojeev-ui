/** A single owner for transient hero input. Pixel samples never enter React. */
import { experience, sceneAnimates } from "./experience-store";
export type HeroControlId =
  | "create"
  | "switch"
  | "slider"
  | "layout"
  | "content"
  | "actions";
export type HeroPhase = "idle" | "approach" | "interact" | "return";
export type DrawerId = "layout" | "content" | "actions";
export const HERO_DRAG_THRESHOLD = 5;
export const heroPointer = {
  x: 0,
  y: 0,
  active: false,
  frozen: false,
  revealY: null as number | null,
};
const cleanups = new Set<() => void>();
export const heroInteraction = {
  activate(id: HeroControlId) {
    experience.set({
      heroControl: id,
      heroPhase: sceneAnimates(experience.get()) ? "approach" : "interact",
    });
  },
  acquired() {
    heroPointer.frozen = true;
    experience.set({ heroPhase: "interact" });
  },
  release() {
    heroPointer.active = false;
    heroPointer.frozen = false;
    experience.set(
      sceneAnimates(experience.get())
        ? { pressed: false, heroPhase: "return" }
        : { pressed: false, heroPhase: "idle", heroControl: null },
    );
  },
  cancel() {
    for (const cleanup of cleanups) cleanup();
    heroPointer.active = false;
    heroPointer.frozen = false;
    heroPointer.revealY = null;
    experience.set({
      pressed: false,
      heroDrawer: null,
      heroControl: null,
      heroPhase: "idle",
    });
  },
  register(cleanup: () => void) {
    cleanups.add(cleanup);
    return () => {
      cleanups.delete(cleanup);
    };
  },
};
export function dragTension(
  start: number,
  dx: number,
  dy: number,
  axis: { x: number; y: number; length: number },
) {
  return Math.max(
    0,
    Math.min(
      100,
      start + ((dx * axis.x + dy * axis.y) / Math.max(44, axis.length)) * 100,
    ),
  );
}
/** Time-based ease with exact endpoints; no asymptotic idle render loop. */
export function cameraStep(value: number, target: number, dt: number) {
  const duration = target > value ? 0.42 : 0.5;
  const next = value + (Math.sign(target - value) * dt) / duration;
  return target > value ? Math.min(target, next) : Math.max(target, next);
}
export const cameraEase = (t: number) => t * t * (3 - 2 * t);
