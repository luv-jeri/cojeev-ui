"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { createMotionLane, useChoreography } from "../motion/choreography";
import { useMotionVisibility } from "../motion/use-motion-visibility";

export type ReadingTrailItem = { id: string; label: React.ReactNode };
export type ReadingTrailState = { activeId: string | null; progress: number };
export type ReadingTrailProps = Omit<React.ComponentProps<"nav">, "children"> & {
  /** IDs of sections in this document. Labels and links render on the server. */
  items: readonly ReadingTrailItem[];
  label?: string;
  /** Omit to track the document; pass a mounted scroll container for a panel. */
  scrollRoot?: HTMLElement | null;
  /** Activation line below the scroll viewport's top, in pixels. */
  offset?: number;
};

/** Reading progress runs from the first section to the scroll viewport's end. */
export function getReadingTrailState(
  sections: readonly { id: string; top: number }[],
  scrollTop: number,
  viewportHeight: number,
  scrollHeight: number,
  offset = 24,
): ReadingTrailState {
  const ordered = sections.filter(section => Number.isFinite(section.top)).toSorted((a, b) => a.top - b.top);
  if (!ordered.length) return { activeId: null, progress: 0 };
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const end = Math.max(0, safe(scrollHeight) - safe(viewportHeight));
  const position = Math.min(end, safe(scrollTop));
  const start = Math.min(end, Math.max(0, ordered[0].top - safe(offset)));
  let activeId = ordered[0].id;
  for (const section of ordered) if (section.top <= position + safe(offset) + 1) activeId = section.id;
  if (end > 0 && position >= end - 1) activeId = ordered[ordered.length - 1].id;
  const progress = end <= start ? 1 : Math.max(0, Math.min(1, (position - start) / (end - start)));
  return { activeId, progress };
}

export function ReadingTrail({
  items, label = "On this page", scrollRoot, offset = 24, className, ref, ...props
}: ReadingTrailProps) {
  const host = React.useRef<HTMLElement>(null);
  const list = React.useRef<HTMLOListElement>(null);
  const marker = React.useRef<HTMLSpanElement>(null);
  const restoreFocusTarget = React.useRef<() => void>(() => {});
  const lane = React.useRef<ReturnType<typeof createMotionLane> | null>(null);
  const { quiet, transition } = useChoreography();
  const { enabled, inView } = useMotionVisibility(host);
  // Duplicate/empty IDs cannot represent distinct fragment destinations.
  const idsKey = JSON.stringify(items.map(item => item.id).filter((id, index, all) => id && all.indexOf(id) === index));
  const ids = React.useMemo<string[]>(() => JSON.parse(idsKey), [idsKey]);
  const [state, setState] = React.useState<ReadingTrailState>({ activeId: null, progress: 0 });
  const [markerY, setMarkerY] = React.useState(16);
  const [measured, setMeasured] = React.useState(false);
  const activeId = measured ? state.activeId : ids[0] ?? null;
  const labelId = React.useId();
  const bindRef = React.useCallback((element: HTMLElement | null) => {
    host.current = element;
    if (typeof ref === "function") return ref(element);
    if (ref) ref.current = element;
  }, [ref]);

  React.useEffect(() => {
    let frame = 0;
    let disposed = false;
    const targets = () => ids.map(id => document.getElementById(id)).filter((element): element is HTMLElement => !!element && (!scrollRoot || scrollRoot.contains(element)));
    const measure = () => {
      frame = 0;
      if (disposed || document.hidden) return;
      const viewportTop = scrollRoot ? scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop : 0;
      const position = scrollRoot ? scrollRoot.scrollTop : window.scrollY;
      const viewportHeight = scrollRoot ? scrollRoot.clientHeight : window.innerHeight;
      const scrollHeight = scrollRoot ? scrollRoot.scrollHeight : document.documentElement.scrollHeight;
      const next = getReadingTrailState(targets().map(element => ({ id: element.id, top: element.getBoundingClientRect().top - viewportTop + position })), position, viewportHeight, scrollHeight, offset);
      // Limit semantic updates while retaining a smooth native progress value.
      next.progress = Math.round(next.progress * 1000) / 1000;
      setState(previous => previous.activeId === next.activeId && previous.progress === next.progress ? previous : next);
      setMeasured(true);
      const link = list.current?.querySelector<HTMLElement>(`[data-trail-index="${ids.indexOf(next.activeId ?? "")}"]`);
      if (link && list.current) setMarkerY(link.getBoundingClientRect().top - list.current.getBoundingClientRect().top + link.getBoundingClientRect().height / 2 - 6);
    };
    const schedule = () => { if (!frame && !disposed) frame = window.requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    const observeTargets = () => {
      resize.disconnect();
      resize.observe(scrollRoot ?? document.documentElement);
      if (!scrollRoot) resize.observe(document.body);
      if (host.current) resize.observe(host.current);
      for (const element of targets()) resize.observe(element);
    };
    observeTargets();
    const mutations = new MutationObserver(records => {
      // Our progress text and marker paint must not recursively invalidate geometry.
      if (records.every(record => host.current?.contains(record.target))) return;
      observeTargets();
      schedule();
    });
    mutations.observe(scrollRoot ?? document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["id", "hidden"] });
    const scroller = scrollRoot ?? window;
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    document.addEventListener("visibilitychange", schedule);
    void document.fonts?.ready.then(schedule);
    measure();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [ids, offset, scrollRoot]);

  React.useEffect(() => {
    const element = marker.current;
    if (!element) return;
    const painter = createMotionLane(markerY, value => element.style.setProperty("--trail-marker-y", `${value}px`));
    lane.current = painter;
    painter.jump(markerY);
    return () => { painter.dispose(); lane.current = null; };
    // The painter owns one mounted marker; subsequent geometry retargets it below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (quiet || !enabled || !inView) lane.current?.jump(markerY);
    else lane.current?.to(markerY, transition);
  }, [markerY, quiet, enabled, inView, transition]);

  React.useEffect(() => () => restoreFocusTarget.current(), []);

  const follow = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target || (scrollRoot && !scrollRoot.contains(target))) return;
    event.preventDefault();
    // Keep a genuine same-document URL and back/forward entry without a second jump.
    const fragment = `#${encodeURIComponent(id)}`;
    if (window.location.hash !== fragment) window.history.pushState(window.history.state, "", fragment);
    const behavior = quiet ? "instant" : "smooth";
    if (scrollRoot) {
      // scrollIntoView would also move every scrollable ancestor, including the page.
      const padding = getComputedStyle(scrollRoot).scrollPaddingTop;
      const paddingTop = (Number.parseFloat(padding) || 0) * (padding.endsWith("%") ? scrollRoot.clientHeight / 100 : 1);
      const marginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const top = target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top
        - scrollRoot.clientTop + scrollRoot.scrollTop - paddingTop - marginTop;
      scrollRoot.scrollTo({ top, behavior });
    } else {
      target.scrollIntoView({ behavior, block: "start", inline: "nearest" });
    }
    restoreFocusTarget.current();
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      const restore = () => {
        target.removeEventListener("blur", restore);
        if (target.getAttribute("tabindex") === "-1") target.removeAttribute("tabindex");
        restoreFocusTarget.current = () => {};
      };
      restoreFocusTarget.current = restore;
      target.addEventListener("blur", restore, { once: true });
    }
    target.focus({ preventScroll: true });
  };

  return <nav {...props} ref={bindRef} data-slot="reading-trail" data-quiet={quiet || !enabled || !inView} className={cn("v-reading-trail", className)} aria-label={props["aria-label"] ?? label}>
    <div className="v-reading-trail__heading"><span id={labelId}>{label}</span><span aria-hidden="true">{Math.round(state.progress * 100)}%</span></div>
    <progress className="v-reading-trail__progress" max={100} value={state.progress * 100} aria-label={`${label}: reading progress`} />
    <div className="v-reading-trail__track">
      <span ref={marker} className="v-reading-trail__marker" aria-hidden="true" hidden={!activeId}><svg viewBox="0 0 24 20"><path d="M2 8C2 3 8 1 13 2C18 2 23 5 22 10C21 15 15 18 9 17C4 17 1 13 2 8Z" /></svg></span>
      <ol ref={list} className="v-reading-trail__list">{ids.map((id, index) => <li key={id}><a href={`#${encodeURIComponent(id)}`} data-trail-index={index} aria-current={activeId === id ? "location" : undefined} onClick={event => follow(event, id)}><span className="v-reading-trail__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{items.find(item => item.id === id)?.label}</span></a></li>)}
      </ol>
    </div>
    {!ids.length && <p className="v-reading-trail__empty">No sections to follow.</p>}
  </nav>;
}
