/**
 * The cue manifest.
 *
 * These cues are **synthesised in the browser**, not loaded from audio files.
 * That is a deliberate limitation, stated plainly wherever sound is offered: a
 * finished sound design would be recorded assets, and this page does not pretend
 * to have them. What it does have is a real, tested cue system — one that is off
 * by default, requires an explicit gesture to start, and can be muted instantly.
 *
 * Each cue declares its intent and its budget. A cue that cannot state what it is
 * for does not belong in the manifest.
 */

export type CueId =
  | "contact"
  | "tension"
  | "release"
  | "dock"
  | "select"
  | "open"
  | "commit"
  | "copy"
  | "export"
  | "transition"
  | "arrive";

export type VoiceSpec =
  /** A short body thud: sine with a falling pitch and a filtered noise attack. */
  | {
      kind: "thud";
      duration: number;
      frequency: number;
      bend: number;
      noise: number;
      damping: number;
    }
  /** A dry click: bandpassed noise with a very short envelope. */
  | { kind: "tick"; duration: number; frequency: number; q: number; noise: number }
  /** A slow two-oscillator swell used only at chapter arrivals. */
  | { kind: "swell"; duration: number; frequency: number; detune: number };

export type CueSpec = {
  /** What this cue is for, in one line. */
  intent: string;
  /** Peak gain on the effects bus, before the master fader. */
  gain: number;
  /** Shortest gap between two instances, in milliseconds. */
  cooldown: number;
  /**
   * Voices released before this one starts, with a short fade. A cue may name
   * itself — the engine releases first and only then builds the new voice, so
   * that is a retrigger rather than a self-cancel, and it is how a fast repeated
   * gesture replaces its own sound instead of stacking it.
   */
  replaces: CueId[];
  voice: VoiceSpec;
};

export const CUES: Record<CueId, CueSpec> = {
  contact: {
    intent: "Confirms the Create control was pressed. Must read as weight, not as a click.",
    gain: 0.34,
    cooldown: 90,
    // Retriggers itself: a second press must replace the first thud, not double it.
    replaces: ["contact", "release"],
    voice: { kind: "thud", duration: 0.16, frequency: 168, bend: 0.55, noise: 0.3, damping: 900 },
  },
  tension: {
    intent: "Marks ribbon travel during a drag. Must thin out as it repeats, never drone.",
    gain: 0.1,
    cooldown: 110,
    replaces: ["tension"],
    voice: { kind: "tick", duration: 0.05, frequency: 2400, q: 7, noise: 0.5 },
  },
  release: {
    intent: "Returns the ribbon's stored energy. Softer and lower than contact.",
    gain: 0.22,
    cooldown: 70,
    replaces: ["release", "contact", "tension"],
    voice: { kind: "thud", duration: 0.22, frequency: 122, bend: 0.4, noise: 0.18, damping: 620 },
  },
  dock: {
    intent: "A specimen settling onto its tray. Spatial, brief, never a reward chime.",
    gain: 0.2,
    cooldown: 120,
    replaces: ["dock"],
    voice: { kind: "thud", duration: 0.12, frequency: 232, bend: 0.7, noise: 0.42, damping: 1500 },
  },
  select: {
    intent:
      "A specimen becoming the one on the bench, as distinct from merely being hovered. Brighter and shorter than dock so the two never read as the same event.",
    gain: 0.13,
    cooldown: 90,
    replaces: ["select"],
    voice: { kind: "tick", duration: 0.045, frequency: 1750, q: 9, noise: 0.4 },
  },
  open: {
    intent: "Layer separation. One gesture, one sound, no continuous motor noise.",
    gain: 0.24,
    cooldown: 260,
    replaces: ["open"],
    voice: { kind: "swell", duration: 0.42, frequency: 196, detune: 0.7 },
  },
  commit: {
    intent: "A chosen silhouette becoming the object. The page's single confirmation.",
    gain: 0.3,
    cooldown: 300,
    replaces: ["commit", "tension"],
    voice: { kind: "thud", duration: 0.3, frequency: 144, bend: 0.32, noise: 0.12, damping: 480 },
  },
  copy: {
    intent: "A copy succeeded. Short, dry, and distinct from commit.",
    gain: 0.16,
    cooldown: 160,
    replaces: ["copy"],
    voice: { kind: "tick", duration: 0.07, frequency: 3200, q: 5, noise: 0.35 },
  },
  export: {
    intent:
      "An artifact leaving the page: a downloaded contour or component. Lower and longer than copy so a download is audibly not a clipboard write.",
    gain: 0.2,
    cooldown: 400,
    replaces: ["export", "copy"],
    voice: { kind: "swell", duration: 0.34, frequency: 262, detune: 0.8 },
  },
  transition: {
    intent: "A chapter boundary. Lowest gain of the set: it marks motion, it does not narrate it.",
    gain: 0.12,
    cooldown: 400,
    replaces: ["transition"],
    voice: { kind: "swell", duration: 0.5, frequency: 128, detune: 1.1 },
  },
  arrive: {
    intent: "A chapter settled. Reserved for arrival so it cannot fire mid-scroll.",
    gain: 0.18,
    cooldown: 700,
    replaces: ["arrive", "transition"],
    voice: { kind: "swell", duration: 0.7, frequency: 220, detune: 0.5 },
  },
};

export const CUE_IDS = Object.keys(CUES) as CueId[];

/** Voices allowed to sound at once. Mobile gets a smaller ceiling. */
export const VOICE_LIMIT = { desktop: 8, mobile: 6 } as const;

/**
 * Peak budget for a single voice after the master fader, expressed as a linear
 * amplitude. The engine additionally runs a limiter, but keeping every authored
 * gain inside this bound means the limiter is a safety net rather than the sound.
 */
export const VOICE_PEAK_BUDGET = 0.36;

/**
 * The interruption fade, in seconds. Long enough to remove the click, short
 * enough that a repeat feels immediate.
 */
export const FADE_RANGE = { min: 0.02, max: 0.05 } as const;

/**
 * The ambient bed.
 *
 * A bed is optional in the sense that the page is complete without it, but it is
 * not optional in the sense that a control may exist for it and do nothing: the
 * "Ambient bed" switch was previously wired to a gain node with no source
 * connected to it, so the switch moved a number that no listener could hear. It is
 * implemented rather than removed, because ambience under the cues is part of the
 * intended experience and synthesis is a legitimate way to produce it.
 *
 * `loopSeconds` is a whole number of cycles of every partial and of the tremolo,
 * so the loop point is inaudible. The bed is deliberately quiet and static: it
 * sits under the cues and never competes with them.
 */
export const BED = {
  /** Drone root, in Hz. Low enough to read as room rather than as pitch. */
  rootHz: 55,
  /** Tremolo rate, in Hz. Slow enough to be felt rather than heard as movement. */
  lfoHz: 0.125,
  loopSeconds: 8,
  /** Bus gain while the bed is on. */
  gain: 0.5,
  /** The bus floor: `exponentialRampToValueAtTime` cannot reach true zero. */
  silentGain: 0.0001,
  /** Time for the bus to come up or go down, in seconds. */
  fadeSeconds: 0.8,
} as const;

export type AudioSupport = "unsupported" | "suspended" | "ready" | "off";

/** A cue whose declared budget exceeds the manifest contract. */
export function auditCues(): string[] {
  const problems: string[] = [];
  for (const id of CUE_IDS) {
    const cue = CUES[id];
    if (!cue.intent.trim()) problems.push(`${id}: no stated intent`);
    if (cue.gain <= 0 || cue.gain > VOICE_PEAK_BUDGET)
      problems.push(`${id}: gain ${cue.gain} outside (0, ${VOICE_PEAK_BUDGET}]`);
    if (cue.cooldown < 40) problems.push(`${id}: cooldown ${cue.cooldown}ms is too short to read`);
    if (cue.voice.duration <= 0 || cue.voice.duration > 1)
      problems.push(`${id}: duration ${cue.voice.duration}s outside (0, 1]`);
    for (const other of cue.replaces)
      if (!CUE_IDS.includes(other)) problems.push(`${id}: replaces unknown cue ${other}`);
  }
  return problems;
}
