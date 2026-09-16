"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import type { CaptureArea, CaptureProgress } from "@/lib/reporting/capture";

const bounds = () => ({ width: document.documentElement.clientWidth, height: innerHeight });
const clampArea = (area: CaptureArea, limit = bounds()): CaptureArea => {
  const width = Math.min(Math.max(1, Math.round(area.width)), limit.width);
  const height = Math.min(Math.max(1, Math.round(area.height)), limit.height);
  return { width, height, x: Math.min(Math.max(0, Math.round(area.x)), limit.width - width), y: Math.min(Math.max(0, Math.round(area.y)), limit.height - height) };
};
// A ready-made rectangle means keyboard users can capture immediately and adjust afterwards.
const defaultArea = (): CaptureArea => {
  const limit = bounds();
  return clampArea({ x: limit.width * 0.2, y: limit.height * 0.2, width: limit.width * 0.6, height: limit.height * 0.6 }, limit);
};
const FIELDS = { x: "Left px", y: "Top px", width: "Width px", height: "Height px" } as const;

export function AreaPicker({ onDone }: { onDone: (area: CaptureArea | null) => void }) {
  const [area, setArea] = useState<CaptureArea>(defaultArea);
  const [chosen, setChosen] = useState(false);
  const toolbar = useRef<HTMLDivElement>(null), start = useRef<{ x: number; y: number } | null>(null), done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    // Read the outgoing focus before the toolbar takes it, or cleanup restores the removed toolbar.
    const restore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    toolbar.current?.focus();
    // Page actions stay suppressed only while the overlay is mounted: diagnostics ignore these clicks.
    document.documentElement.dataset.reportingPicking = "true";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); done.current(null); return; }
      if (event.key === "Tab") {
        const focusable = [toolbar.current, ...Array.from(toolbar.current?.querySelectorAll<HTMLElement>("input,button:not(:disabled)") ?? [])].filter(Boolean) as HTMLElement[];
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        event.preventDefault(); event.stopImmediatePropagation();
        focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]?.focus();
      }
    };
    const resize = () => setArea(value => clampArea(value));
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", resize);
    return () => { delete document.documentElement.dataset.reportingPicking; document.removeEventListener("keydown", key, true); window.removeEventListener("resize", resize); if (restore?.isConnected) restore.focus(); };
  }, []);
  const point = (event: React.PointerEvent) => ({ x: event.clientX, y: event.clientY });
  const field = (key: keyof CaptureArea) => (
    <label key={key}>{FIELDS[key]}<Input type="number" min={0} step={1} value={area[key]} onChange={event => { setChosen(true); setArea(value => clampArea({ ...value, [key]: Number(event.target.value) })); }} /></label>
  );
  return createPortal(<div data-reporting-chrome="" className="report-picker report-area-picker">
    <div
      className="report-area-surface"
      onPointerDown={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); start.current = point(event); setChosen(true); setArea(clampArea({ ...point(event), width: 1, height: 1 })); }}
      onPointerMove={event => { if (!start.current) return; const end = point(event), origin = start.current; setArea(clampArea({ x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.abs(end.x - origin.x), height: Math.abs(end.y - origin.y) })); }}
      onPointerUp={() => { start.current = null; }}
      onPointerCancel={() => { start.current = null; }}
    >
      <div className="report-area-outline" style={{ left: area.x, top: area.y, width: area.width, height: area.height }} />
    </div>
    <div className="report-picker-toolbar" ref={toolbar} tabIndex={0} role="dialog" aria-label="Select area" aria-describedby="area-help">
      <strong>Select the area to capture</strong>
      <p id="area-help">Drag on the page to draw a rectangle, or type the numbers below. Escape cancels. Page actions are paused while you select.</p>
      <p className="report-help" aria-live="polite">{chosen ? "Area" : "Suggested area"} {area.width} × {area.height} px</p>
      <div className="report-crop-fields">{(["x", "y", "width", "height"] as const).map(field)}</div>
      <div className="report-row"><Button variant="outline" onClick={() => done.current(null)}>Cancel</Button><Button onClick={() => done.current(clampArea(area))}>Capture area</Button></div>
    </div>
  </div>, document.body);
}

const PHASES: Record<CaptureProgress["phase"], string> = {
  preparing: "Getting ready…",
  reading: "Reading the page…",
  assets: "Embedding images…",
  rendering: "Rendering the screenshot…",
  ready: "Screenshot ready.",
};
export function captureLabel(progress: CaptureProgress) {
  return progress.phase === "assets" && progress.total ? `Embedding images — ${progress.current ?? 0} of ${progress.total}…` : PHASES[progress.phase];
}

export function CaptureStatus({ progress, onCancel }: { progress: CaptureProgress; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const toolbar = useRef<HTMLDivElement>(null), cancel = useRef<HTMLButtonElement | HTMLAnchorElement>(null), stop = useRef(onCancel);
  useEffect(() => { stop.current = onCancel; }, [onCancel]);
  useEffect(() => { const timer = setInterval(() => setElapsed(value => value + 1), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const restore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // The report drawer stays open behind a full-page capture, so Cancel is focused and Tab is
    // held here: otherwise the only way to stop a capture would be the pointer.
    cancel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); stop.current(); return; }
      if (event.key === "Tab") { event.preventDefault(); event.stopImmediatePropagation(); cancel.current?.focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); if (restore?.isConnected) restore.focus(); };
  }, []);
  return createPortal(<div data-reporting-chrome="" className="report-picker">
    <div className="report-picker-toolbar" ref={toolbar} role="dialog" aria-label="Capturing a screenshot">
      <strong role="status">{captureLabel(progress)}</strong>
      <p className="report-help" aria-live="off">{elapsed}s elapsed</p>
      <p>Requests that already started cannot be stopped, and nothing is attached until you review the screenshot.</p>
      <div className="report-row"><Button ref={cancel} variant="outline" onClick={onCancel}>Cancel screenshot</Button></div>
    </div>
  </div>, document.body);
}
