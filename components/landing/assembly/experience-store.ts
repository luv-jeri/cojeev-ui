/**
 * Interaction values and discrete events for the assembly.
 *
 * Two channels, deliberately separate:
 *
 * - **State** is what React renders and what the scene controller samples once per
 *   frame. Directly manipulated values (press, tension, contour amount) live here
 *   and are never spring-integrated.
 * - **Events** are momentary facts an audio cue or a live-region announcement may
 *   consume. They carry no layout and are never inferred by watching DOM classes.
 *
 * The store is module-level and tiny on purpose: one page, one owner. It is
 * disposed on unmount so a later visit cannot inherit a stale press or drag.
 */
import * as React from "react";
import type { HeroControlId, HeroPhase, DrawerId } from "./hero-interaction";
import type { SpecimenFilterId } from "./canonical";
import { isShapeName } from "./contour-export";
import type { SignatureShapeName } from "../../../registry/cojeev/lib/signature-shapes";
import { PALETTE } from "./canonical";

export type ContourColor = keyof typeof PALETTE;
export const CONTOUR_COLORS: readonly ContourColor[] = ["yellow", "pink", "olive", "cream"];
export type LayerId = "ui" | "style" | "source";
export type WebglStatus = "pending" | "ready" | "failed" | "unavailable";

export type ExperienceState = {
  heroControl: HeroControlId | null;
  heroPhase: HeroPhase;
  heroDrawer: DrawerId | null;
  /** Create press. Direct, immediate, never spring-integrated. */
  pressed: boolean;
  /**
   * Bounded horizontal pull on the ribbon, 0–100. This is the semantic value the
   * adjacent range control also edits; elastic decoration must not move it.
   */
  tension: number;
  /** Whether the visitor has opted into the projected Create seam. */
  tryMode: boolean;
  /** Source layer separation, 0–1 target. Critically damped in the scene. */
  layersOpen: boolean;
  activeLayer: LayerId;
  /** Catalogue. */
  filter: SpecimenFilterId;
  specimen: string;
  exampleOpen: boolean;
  /**
   * Contour press. Site-only: no installable API is involved.
   *
   * Typed to the whole shape table rather than to `ContourPreset`: the press
   * offers three silhouettes, but the hero's own flower opens on `petal-7`
   * because that is the flower the artboard draws (see the geometry note in
   * `scene-geometry.ts`). Starting on a shape the press does not offer leaves
   * its three buttons unselected until the visitor presses one.
   */
  contourPreset: SignatureShapeName;
  contourAmount: number;
  contourColor: ContourColor;
  /** Presentation. */
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  /**
   * Mirrors the registry motion system's own mode. The sculpted switch reads
   * this rather than owning a parallel on/off, so the mesh and the real
   * `MotionControls` control can never disagree.
   */
  motionOn: boolean;
  webgl: WebglStatus;
  reducedMotion: boolean;
  /** Latest announced result, for the polite live region. */
  announcement: { id: number; text: string } | null;
};

export type AssemblyEvent =
  | { type: "press" }
  | { type: "compress"; intensity: number }
  | { type: "release" }
  | { type: "dragAcquire" }
  | { type: "tension"; intensity: number }
  | { type: "dragRelease" }
  | { type: "specimenLift"; id: string }
  | { type: "specimenDock"; id: string }
  | { type: "layersOpen" }
  | { type: "layersClose" }
  | { type: "shapeSelect"; id: string }
  | { type: "shapeCommit" }
  | { type: "contourChange"; amount: number }
  | { type: "copy" }
  | { type: "copyFailed"; what: string }
  | { type: "exported" }
  | { type: "navigation" }
  | { type: "transition"; to: string }
  | { type: "arrive"; to: string };

const INITIAL: ExperienceState = {
  heroControl: null, heroPhase: "idle", heroDrawer: null,
  pressed: false,
  /* The artboard's own value. Its slider is drawn at the top of its travel —
   * rail 969-1244 with the thumb on 1188-1244, its right edge flush with the
   * rail's cap — so the hero rests at 100 and the visitor's first drag relaxes
   * the ribbon from there. Stage 3 rested at 46 and could not move the thumb
   * without dragging the thread with it; the two are separated now
   * (`scene-controller.ts` anchors the thread's reach at this value rather than
   * deriving it from it), so the value itself is free to be the artboard's. */
  tension: 100,
  tryMode: false,
  layersOpen: false,
  activeLayer: "ui",
  filter: "essentials",
  specimen: "button",
  exampleOpen: false,
  contourPreset: "petal-7",
  contourAmount: 0,
  contourColor: "yellow",
  soundEnabled: false,
  musicEnabled: false,
  volume: 0.7,
  motionOn: true,
  webgl: "pending",
  reducedMotion: false,
  announcement: null,
};

let state: ExperienceState = INITIAL;
const listeners = new Set<() => void>();
const eventListeners = new Set<(event: AssemblyEvent) => void>();
let announcementId = 0;

function publish() {
  for (const listener of listeners) listener();
}

export const experience = {
  get: () => state,
  server: () => INITIAL,
  set(patch: Partial<ExperienceState>) {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof ExperienceState)[]) {
      const next = patch[key];
      if (next !== undefined && !Object.is(state[key], next)) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    publish();
  },
  /** Commits a result and announces it once. */
  announce(text: string) {
    state = { ...state, announcement: { id: ++announcementId, text } };
    publish();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(event: AssemblyEvent) {
    for (const listener of eventListeners) listener(event);
  },
  onEvent(listener: (event: AssemblyEvent) => void) {
    eventListeners.add(listener);
    return () => eventListeners.delete(listener);
  },
  /**
   * Restores the authored defaults.
   *
   * The module-level store outlives any one mount, so a client-side route round
   * trip would otherwise carry a pressed control, an open drag or an enabled-sound
   * flag into the next visit — and the next visit's fresh engine would be created
   * with default settings while the UI still showed the previous ones.
   *
   * This existed and was documented as running on unmount, but nothing ever called
   * it. The page calls it from its own unmount effect now, and a test asserts the
   * wiring rather than the docstring.
   *
   * It deliberately does **not** clear the subscriber sets. Unmount order is not
   * guaranteed, so a tree that has not yet torn down is still subscribed when this
   * runs; dropping its listener would leave that tree rendered against a store
   * that no longer notifies it — a stuck interface, in exchange for a leak a `Set`
   * of closures does not actually have while the page is alive. Subscribers release
   * themselves in their own cleanups, and notifying after the reset is what keeps
   * anything still mounted showing the restored values.
   */
  reset() {
    state = INITIAL;
    publish();
  },
};
export function useExperience(): ExperienceState {
  return React.useSyncExternalStore(
    experience.subscribe,
    experience.get,
    experience.server,
  );
}

/**
 * Whether the scene may animate at all.
 *
 * Two independent switches silence it and they have the same consequence: the
 * registry's motion system writes a zero duration when either says off, and the
 * visitor's own `prefers-reduced-motion` is a standing instruction that does not
 * depend on this site's settings. Deriving one predicate means the scene cannot
 * honour one and forget another — which is exactly what happened while reduced
 * motion only disabled press compression and left the camera travelling on its
 * authored path.
 */
export function sceneAnimates(state: {
  motionOn: boolean;
  reducedMotion: boolean;
}) {
  return state.motionOn && !state.reducedMotion;
}

/** Narrow selector so a live example does not re-render on unrelated changes. */
export function useExperienceValue<T>(select: (value: ExperienceState) => T): T {
  return React.useSyncExternalStore(
    experience.subscribe,
    () => select(experience.get()),
    () => select(INITIAL),
  );
}

export function readStoredContour(): {
  preset: SignatureShapeName;
  amount: number;
  color: ContourColor;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("000h-assembly-contour");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { preset?: unknown; amount?: unknown; color?: unknown };
    const amount = Number(record.amount);
    if (!isShapeName(record.preset) || !Number.isFinite(amount)) return null;
    /* The tone was not persisted, so choosing one and reloading silently reverted
     * it — the preview, the sculpted face and the export all went back to yellow
     * while the swatch the visitor had pressed was no longer the pressed one.
     * A record written before this key existed simply has no usable `color`, and
     * falls back to the authored tone rather than being rejected. */
    const color = CONTOUR_COLORS.includes(record.color as ContourColor)
      ? (record.color as ContourColor)
      : "yellow";
    return { preset: record.preset, amount: Math.max(0, Math.min(100, amount)), color };
  } catch {
    return null;
  }
}

export function storeContour(
  preset: SignatureShapeName,
  amount: number,
  color: ContourColor = "yellow",
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      "000h-assembly-contour",
      JSON.stringify({ preset, amount, color }),
    );
  } catch {
    /* storage is unavailable; the in-memory value remains authoritative */
  }
}
