"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { sculptureNumber } from "../lib/sculpture-raster";
import { Button } from "./button";
import { Icon } from "./icon";
import { Slider, SliderOutput } from "./slider";
import { Label } from "./label";
import { Meta } from "./typography";

export type SculptureView = { turn: number; pitch: number; zoom: number };
export type SculptureOrbitProps = Omit<React.ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange"> & {
  children: (view: SculptureView & { interacting: boolean }) => React.ReactNode;
  value?: SculptureView;
  defaultValue?: Partial<SculptureView>;
  onValueChange?: (view: SculptureView) => void;
  disabled?: boolean;
  label?: string;
};
export function normalizeSculptureView(view: Partial<SculptureView> = {}): SculptureView {
  const turn = Number.isFinite(view.turn) ? ((view.turn! + 180) % 360 + 360) % 360 - 180 : 0;
  return { turn, pitch: sculptureNumber(view.pitch, 0, -80, 80), zoom: sculptureNumber(view.zoom, 1, .6, 1.15) };
}

/** Explicit orbit stays usable in every stillness mode; touch keeps vertical page scrolling. */
export function SculptureOrbit({ children, value, defaultValue, onValueChange, disabled = false, label = "Sculpture view", className, ...props }: SculptureOrbitProps) {
  const [local, setLocal] = React.useState(() => normalizeSculptureView(defaultValue)), [interacting, setInteracting] = React.useState(false);
  const [disabledSnapshot, setDisabledSnapshot] = React.useState(disabled);
  // Cancel rendered gesture state as the prop changes; it must not revive on re-enable.
  if (disabledSnapshot !== disabled) { setDisabledSnapshot(disabled); if (disabled) setInteracting(false); }
  const view = React.useMemo(() => normalizeSculptureView(value ?? local), [value, local]), latest = React.useRef(view), viewport = React.useRef<HTMLDivElement>(null), id = React.useId();
  const gesture = React.useRef<{ id: number; x: number; y: number; initial: SculptureView; touch: boolean; captured: boolean } | null>(null);
  React.useEffect(() => { latest.current = view; }, [view]);
  const stop = React.useCallback(() => {
    const current = gesture.current; gesture.current = null; setInteracting(false);
    if (current && viewport.current?.hasPointerCapture(current.id)) viewport.current.releasePointerCapture(current.id);
  }, []);
  React.useEffect(() => {
    if (!disabled) return;
    const current = gesture.current; gesture.current = null;
    if (current && viewport.current?.hasPointerCapture(current.id)) viewport.current.releasePointerCapture(current.id);
  }, [disabled]);
  React.useEffect(() => { const hidden = () => { if (document.hidden) stop(); }; window.addEventListener("blur", stop); document.addEventListener("visibilitychange", hidden); return () => { window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", hidden); }; }, [stop]);
  function change(next: Partial<SculptureView>) {
    if (disabled) return;
    const normalized = normalizeSculptureView({ ...latest.current, ...next }); latest.current = normalized;
    if (value === undefined) setLocal(normalized);
    onValueChange?.(normalized);
  }
  const reset = () => change({ turn: 0, pitch: 0, zoom: 1 });
  return <div {...props} className={cn("v-sculpture-orbit", className)} data-slot="sculpture-orbit" data-disabled={disabled || undefined} role="group" aria-label={label}>
    <div ref={viewport} className="v-sculpture-orbit-view" data-slot="sculpture-orbit-viewport" role="group" aria-label={`${label}: rotation`} aria-describedby={`${id}-help`} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0} data-dragging={interacting && !disabled || undefined}
      onPointerDown={event => {
        if (disabled || event.button !== 0 || !event.isPrimary) return;
        const touch = event.pointerType === "touch";
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, initial: latest.current, touch, captured: !touch };
        if (!touch) { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus({ preventScroll: true }); setInteracting(true); }
      }}
      onPointerMove={event => {
        const current = gesture.current;
        if (disabled || !current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x, dy = event.clientY - current.y;
        if (current.touch && !current.captured) {
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 7) { stop(); return; }
          if (Math.abs(dx) < 7) return;
          event.currentTarget.setPointerCapture(event.pointerId); current.captured = true; setInteracting(true);
        }
        const width = Math.max(200, event.currentTarget.clientWidth);
        change({ turn: current.initial.turn + dx / width * 240, pitch: current.touch ? current.initial.pitch : current.initial.pitch + dy / width * 160 });
      }}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      onKeyDown={event => {
        if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
        const step = event.shiftKey ? 20 : 5;
        if (event.key === "ArrowLeft") change({ turn: latest.current.turn - step });
        else if (event.key === "ArrowRight") change({ turn: latest.current.turn + step });
        else if (event.key === "ArrowUp") change({ pitch: latest.current.pitch - step });
        else if (event.key === "ArrowDown") change({ pitch: latest.current.pitch + step });
        else if (event.key === "+" || event.key === "=") change({ zoom: latest.current.zoom + .05 });
        else if (event.key === "-") change({ zoom: latest.current.zoom - .05 });
        else if (event.key === "Home") reset();
        else return;
        event.preventDefault();
      }}>
      {children({ ...view, interacting: interacting && !disabled })}
    </div>
    <div className="v-sculpture-orbit-tools">
      <div className="v-sculpture-orbit-step" role="group" aria-label="Turn and tilt">
        <Button size="sm" variant="ghost" disabled={disabled} aria-label="Turn left" onClick={() => change({ turn: latest.current.turn - 15 })}><Icon name="arrow-left" /></Button>
        <Button size="sm" variant="ghost" disabled={disabled} aria-label="Turn right" onClick={() => change({ turn: latest.current.turn + 15 })}><Icon name="arrow-right" /></Button>
        <Button size="sm" variant="ghost" disabled={disabled} aria-label="Tilt up" onClick={() => change({ pitch: latest.current.pitch - 10 })}><Icon name="arrow-up" /></Button>
        <Button size="sm" variant="ghost" disabled={disabled} aria-label="Tilt down" onClick={() => change({ pitch: latest.current.pitch + 10 })}><Icon name="arrow-down" /></Button>
      </div>
      <div className="v-sculpture-orbit-zoom"><Label as="span" id={`${id}-zoom`}>Zoom</Label><Slider min={.6} max={1.15} step={.05} value={[view.zoom]} onValueChange={next => change({ zoom: next[0] ?? 1 })} aria-labelledby={`${id}-zoom`} disabled={disabled} /><SliderOutput>{Math.round(view.zoom * 100)}%</SliderOutput></div>
      <Button size="sm" variant="secondary" disabled={disabled} onClick={reset}><Icon name="refresh" />Reset view</Button>
    </div>
    <Meta id={`${id}-help`} className="v-sculpture-orbit-help">Drag to turn. Arrow keys rotate, + / − zoom, Home resets. Touch: swipe sideways to turn.</Meta>
  </div>;
}
