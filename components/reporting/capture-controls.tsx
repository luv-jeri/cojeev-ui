"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { LIMITS, type Pin } from "@/lib/reporting/contracts";
import { structuralPath } from "@/lib/reporting/diagnostics";
import { cropImage, type Crop } from "@/lib/reporting/capture";

export function FilePreview({ file }: { file: File }) {
  const previewRef = useCallback((node: HTMLVideoElement | HTMLImageElement | null) => {
    if (!node) return;
    const url = URL.createObjectURL(file); node.src = url;
    return () => { node.removeAttribute("src"); URL.revokeObjectURL(url); };
  }, [file]);
  // User-owned blob previews must stay local and bypass image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return file.type.startsWith("video/") ? <video ref={previewRef} className="report-media" controls preload="metadata" aria-label={file.name} /> : <img ref={previewRef} className="report-media" alt={`Attachment preview: ${file.name}`} />;
}

export function CropEditor({ file, onAccept, onCancel }: { file: File; onAccept: (file: File) => void; onCancel: () => void }) {
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 100, height: 100 });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const area = useRef<HTMLDivElement>(null), start = useRef<{ x: number; y: number } | null>(null);
  const point = (event: React.PointerEvent) => {
    const rect = area.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  };
  return <section className="report-crop" aria-labelledby="crop-title">
    <h3 id="crop-title">Review your screenshot</h3><p className="report-help">Check every visible detail. Form fields and private regions are excluded, but other personal content may still appear. Drag to crop, or adjust the fields below.</p>
    <div ref={area} className="report-crop-image" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); start.current = point(event); }} onPointerMove={event => {
      if (!start.current) return; const end = point(event), origin = start.current;
      setCrop({ x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.max(1, Math.abs(end.x - origin.x)), height: Math.max(1, Math.abs(end.y - origin.y)) });
    }} onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }}>
      <FilePreview file={file} /><div className="report-crop-outline" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }} />
    </div>
    <div className="report-crop-fields">{(["x", "y", "width", "height"] as const).map(key => <label key={key}>{({ x: "Left %", y: "Top %", width: "Width %", height: "Height %" })[key]}<Input type="number" min={key === "width" || key === "height" ? 1 : 0} max={100} step={1} value={Math.round(crop[key])} onChange={event => {
      const next = { ...crop, [key]: Math.max(key === "width" || key === "height" ? 1 : 0, Math.min(100, Number(event.target.value))) };
      next.x = Math.min(next.x, 99); next.y = Math.min(next.y, 99); next.width = Math.min(next.width, 100 - next.x); next.height = Math.min(next.height, 100 - next.y); setCrop(next);
    }} /></label>)}</div>
    {error && <p role="alert" className="report-error">{error}</p>}
    <div className="report-row"><Button variant="outline" onClick={onCancel} disabled={busy}>Discard screenshot</Button><Button loading={busy} onClick={async () => { setBusy(true); try { onAccept(await cropImage(file, crop)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not crop this screenshot."); } finally { setBusy(false); } }}>Use this crop</Button></div>
  </section>;
}

export function PinPicker({ initial, onDone }: { initial: Pin[]; onDone: (pins: Pin[]) => void }) {
  const [pins, setPins] = useState(initial), [target, setTarget] = useState<Element | null>(null), [rect, setRect] = useState<DOMRect | null>(null);
  const toolbar = useRef<HTMLDivElement>(null), current = useRef<Element | null>(null);
  const done = useRef(onDone), pinsRef = useRef(pins);
  useEffect(() => { done.current = onDone; pinsRef.current = pins; }, [onDone, pins]);
  useEffect(() => {
    toolbar.current?.focus();
    document.documentElement.dataset.reportingPicking = "true";
    const selectTarget = (element: Element) => { current.current = element; setTarget(element); setRect(element.getBoundingClientRect()); };
    const eligible = (node: Element | null): node is Element => !!node && !node.closest("[data-reporting-chrome],[data-private],input,textarea,select,[contenteditable],script,style,nextjs-portal") && /^[a-z][a-z0-9]*$/.test(node.tagName.toLowerCase()) && node.getBoundingClientRect().width > 0;
    const add = (element: Element, x?: number, y?: number) => {
      const bounds = element.getBoundingClientRect(); const path = structuralPath(element);
      setPins(items => items.length >= LIMITS.pins || items.some(pin => pin.path === path) ? items : [...items, { path, tag: element.tagName.toLowerCase(), x: Math.min(100000, Math.max(0, (x ?? bounds.x + bounds.width / 2) + scrollX)), y: Math.min(100000, Math.max(0, (y ?? bounds.y + bounds.height / 2) + scrollY)) }]);
    };
    const intercept = (event: Event) => { if (event.target instanceof Element && event.target.closest("[data-reporting-chrome]")) return; event.preventDefault(); event.stopImmediatePropagation(); };
    const click = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest("[data-reporting-chrome]")) return; intercept(event); if (eligible(event.target as Element)) add(event.target as Element, event.clientX, event.clientY); };
    const move = (event: PointerEvent) => { if (eligible(event.target as Element)) selectTarget(event.target as Element); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); done.current(pinsRef.current); return; }
      if (event.key === "Tab") {
        const focusable = [toolbar.current, ...Array.from(toolbar.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])].filter(Boolean) as HTMLElement[];
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        const next = (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        event.preventDefault(); event.stopImmediatePropagation(); focusable[next]?.focus(); return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault(); event.stopImmediatePropagation();
        const candidates = Array.from(document.querySelectorAll("a,button,h1,h2,h3,p,img,video,[role=button],[data-slot]")).filter(eligible);
        const index = candidates.indexOf(current.current!); const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const next = candidates[(index + step + candidates.length) % candidates.length]; if (next) { next.scrollIntoView({ block: "nearest", behavior: "instant" }); selectTarget(next); } return;
      }
      if ((event.key === "Enter" || event.key === " ") && (event.target === toolbar.current || !(event.target instanceof Element && event.target.closest("[data-reporting-chrome]")))) { event.preventDefault(); event.stopImmediatePropagation(); if (current.current) add(current.current); }
    };
    const scroll = () => setRect(current.current?.getBoundingClientRect() ?? null);
    document.addEventListener("pointerdown", intercept, true); document.addEventListener("pointerup", intercept, true); document.addEventListener("click", click, true); document.addEventListener("auxclick", intercept, true); document.addEventListener("contextmenu", intercept, true); document.addEventListener("pointermove", move, true); document.addEventListener("keydown", key, true); window.addEventListener("scroll", scroll, true);
    return () => { delete document.documentElement.dataset.reportingPicking; document.removeEventListener("pointerdown", intercept, true); document.removeEventListener("pointerup", intercept, true); document.removeEventListener("click", click, true); document.removeEventListener("auxclick", intercept, true); document.removeEventListener("contextmenu", intercept, true); document.removeEventListener("pointermove", move, true); document.removeEventListener("keydown", key, true); window.removeEventListener("scroll", scroll, true); };
  }, []);
  return createPortal(<div data-reporting-chrome="" className="report-picker">
    {rect && <div className="report-pin-outline" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />}
    <div className="report-picker-toolbar" ref={toolbar} tabIndex={0} role="dialog" aria-label="Pin elements" aria-describedby="pin-help"><strong>Pin the elements involved · {pins.length}/{LIMITS.pins}</strong><p id="pin-help">Click to pin. Arrow keys browse elements; Enter pins. Escape finishes. Page actions are paused.</p><p className="report-help" aria-live="polite">{target ? `Selected ${target.tagName.toLowerCase()}` : "Choose an element on this page."}</p><div className="report-row"><Button variant="outline" disabled={!pins.length} onClick={() => setPins(items => items.slice(0, -1))}>Undo pin</Button><Button onClick={() => onDone(pins)}>Done</Button></div></div>
  </div>, document.body);
}
