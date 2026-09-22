/**
 * Which interaction events make a sound, and which are deliberately silent.
 *
 * This is a table rather than a switch inside a component so it can be asserted
 * on. The page's event channel is the only route to a cue, which means an event
 * that nothing consumes is a signature interaction that happens in total silence —
 * and two of them were in exactly that state: `shapeSelect` and `exported`, so
 * choosing a silhouette and downloading it were the only two headline acts on the
 * page with no sound at all.
 *
 * Declaring the whole channel, including the silent entries, is what makes that
 * class of omission visible: an event type with no line here is a defect, and a
 * test can say so without knowing anything about the audio engine.
 */
import type { AssemblyEvent } from "./experience-store";
import type { CueId } from "./audio-manifest";

type Binding =
  /** Play this cue; `intensity` is the event's own 0–1 value where it has one. */
  | { cue: CueId; intensity?: (event: never) => number }
  /** Handled, and intentionally makes no sound. */
  | { silent: string };

export const CUE_BINDINGS: Record<AssemblyEvent["type"], Binding> = {
  press: { cue: "contact" },
  release: { cue: "release" },
  tension: { cue: "tension", intensity: (event: { intensity: number }) => 0.5 + event.intensity * 0.5 },
  layersOpen: { cue: "open" },
  layersClose: { cue: "open" },
  shapeSelect: { cue: "select" },
  shapeCommit: { cue: "commit" },
  copy: { cue: "copy" },
  exported: { cue: "export" },
  specimenLift: { cue: "dock" },
  /* Hover and focus both lift a specimen, so docking is the second half of the
   * same gesture. Sounding it made every pointer pass over the bench a two-note
   * event and made keyboard focus sound like a hover. Selection is marked by
   * `shapeSelect`/`specimenLift` and arrival by `arrive` instead. */
  specimenDock: { silent: "the second half of the lift gesture; would double every hover" },
  copyFailed: { silent: "a failure is reported in text; a sound would read as success" },
  compress: { silent: "continuous press compression; `press` already marks the gesture" },
  dragAcquire: { silent: "the drag's start is `press`, which sounds contact" },
  dragRelease: { silent: "the drag's end is `release`, which sounds the stored energy" },
  contourChange: { silent: "continuous while dragging a range; would drone" },
  navigation: { silent: "ordinary link traffic; the arrival cue belongs to `arrive`" },
  transition: { silent: "the boundary is heard through `arrive`, not mid-travel" },
  arrive: { cue: "arrive", intensity: () => 0.75 },
};

/** Event types that produce a cue. */
export function soundingEvents(): AssemblyEvent["type"][] {
  return (Object.keys(CUE_BINDINGS) as AssemblyEvent["type"][]).filter(
    (type) => "cue" in CUE_BINDINGS[type],
  );
}

/** Event types that are handled and intentionally silent, with the reason. */
export function silentEvents(): { type: AssemblyEvent["type"]; reason: string }[] {
  return (Object.keys(CUE_BINDINGS) as AssemblyEvent["type"][])
    .filter((type) => "silent" in CUE_BINDINGS[type])
    .map((type) => ({
      type,
      reason: (CUE_BINDINGS[type] as { silent: string }).silent,
    }));
}

/**
 * The cue id to play for an event, or `null` when the event is deliberately
 * silent. The single place the component asks, so the table and the behaviour
 * cannot drift apart.
 */
export function cueFor(event: AssemblyEvent): { id: CueId; intensity: number } | null {
  const binding = CUE_BINDINGS[event.type];
  if (!binding || !("cue" in binding)) return null;
  const intensity = binding.intensity
    ? (binding.intensity as (value: AssemblyEvent) => number)(event)
    : 1;
  return { id: binding.cue, intensity };
}
