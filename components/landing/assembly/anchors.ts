/**
 * Section measurement and scroll subscription.
 *
 * The page uses native document scroll — no smooth-scroll library on this route.
 * That keeps the handoff to ordinary content reversible, keeps the browser's own
 * scrollbar, keyboard scrolling and find-in-page intact, and means progress is a
 * pure function of `scrollY` rather than of an animation loop's idea of it.
 *
 * Layout reads are batched: `ResizeObserver` and a resize listener mark the
 * measurements dirty, and the next scroll frame re-reads them once.
 */
import * as React from "react";
import {
  BOUNDARY_BAND,
  BOUNDARY_LEAD,
  CHAPTERS,
  CHAPTER_IDS,
  chapterWeights,
  evaluate,
  focusFromScroll,
  scrollProgress,
  type EvaluatedFrame,
} from "./choreography";

export const SECTION_ATTRIBUTE = "data-assembly-section";

export type ScrollSample = {
  scrollY: number;
  viewportHeight: number;
  progress: number;
  frame: EvaluatedFrame;
  /** Nearest chapter index, by tent weight. */
  chapterIndex: number;
  /** Index of the boundary being crossed, or null when inside a chapter. */
  boundary: number | null;
  /** 0–1 progress through the active boundary. */
  boundaryT: number;
};

export function measureSectionTops(root: ParentNode = document): number[] {
  const nodes = root.querySelectorAll<HTMLElement>(`[${SECTION_ATTRIBUTE}]`);
  const tops: number[] = [];
  nodes.forEach((node) => tops.push(node.offsetTop));
  return tops.sort((a, b) => a - b);
}

export function sampleScroll(
  scrollY: number,
  viewportHeight: number,
  sectionTops: readonly number[],
): ScrollSample {
  const focus = focusFromScroll(scrollY, viewportHeight);
  const progress = sectionTops.length
    ? scrollProgress(focus, sectionTops, viewportHeight)
    : 0;
  const frame = evaluate(progress);
  const weights = chapterWeights(progress);
  let chapterIndex = 0;
  for (let index = 1; index < weights.length; index++) {
    if (weights[index] > weights[chapterIndex]) chapterIndex = index;
  }
  const band = BOUNDARY_BAND * viewportHeight;
  const lead = BOUNDARY_LEAD * viewportHeight;
  let boundary: number | null = null;
  let boundaryT = 0;
  for (let index = 0; index < sectionTops.length - 1; index++) {
    const start = sectionTops[index] - lead;
    const local = (focus - start) / band;
    if (local > 0 && local < 1) {
      boundary = index;
      boundaryT = local;
      break;
    }
  }
  return {
    scrollY,
    viewportHeight,
    progress,
    frame,
    chapterIndex: Math.max(0, Math.min(CHAPTERS.length - 1, chapterIndex)),
    boundary,
    boundaryT,
  };
}

const INITIAL_SAMPLE: ScrollSample = {
  scrollY: 0,
  viewportHeight: 1,
  progress: 0,
  frame: evaluate(0),
  chapterIndex: 0,
  boundary: null,
  boundaryT: 0,
};

/** Idle callback, or a zero timeout where `requestIdleCallback` is absent. */
function whenIdle(task: () => void) {
  const idle = (
    window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (typeof idle === "function") idle(task, { timeout: 200 });
  else window.setTimeout(task, 0);
}

/**
 * Subscribes the page to native scroll.
 *
 * `onSample` fires at most once per animation frame, only while the scroll
 * position actually changes, and once on mount. Section positions are re-read
 * lazily after a resize or a font load rather than on every frame; `tops` holds
 * the current measurement and `version` changes whenever it was re-read.
 */
export function useScrollSample(
  onSample: (sample: ScrollSample) => void,
  enabled = true,
): {
  remeasure: () => void;
  tops: React.RefObject<number[]>;
  version: number;
} {
  const callback = React.useRef(onSample);
  const tops = React.useRef<number[]>([]);
  const dirty = React.useRef(true);
  const frameHandle = React.useRef(0);
  const previous = React.useRef({ scrollY: -1, height: -1 });
  const [version, setVersion] = React.useState(0);

  // Declared before the subscription effect below, so the current handler is
  // installed before anything can call it. Effects run in declaration order.
  React.useEffect(() => {
    callback.current = onSample;
  }, [onSample]);

  const flush = React.useCallback(() => {
    frameHandle.current = 0;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    if (dirty.current) {
      tops.current = measureSectionTops();
      dirty.current = false;
      setVersion((value) => value + 1);
    }
    if (
      scrollY === previous.current.scrollY &&
      viewportHeight === previous.current.height
    )
      return;
    previous.current = { scrollY, height: viewportHeight };
    callback.current(sampleScroll(scrollY, viewportHeight, tops.current));
  }, []);

  const schedule = React.useCallback(() => {
    if (frameHandle.current) return;
    frameHandle.current = window.requestAnimationFrame(flush);
  }, [flush]);

  const remeasure = React.useCallback(() => {
    dirty.current = true;
    previous.current = { scrollY: -1, height: -1 };
    schedule();
  }, [schedule]);

  React.useEffect(() => {
    if (!enabled) return;
    const onScroll = () => schedule();
    const onResize = () => remeasure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const onLoad = () => remeasure();
    window.addEventListener("load", onLoad);
    // Web fonts change section heights after first paint.
    void document.fonts?.ready.then(() => whenIdle(remeasure));
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => remeasure());
    observer?.observe(document.body);
    schedule();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("load", onLoad);
      observer?.disconnect();
      if (frameHandle.current) window.cancelAnimationFrame(frameHandle.current);
      frameHandle.current = 0;
    };
  }, [enabled, remeasure, schedule]);

  return { remeasure, tops, version };
}

export const CHAPTER_TONE = CHAPTERS.map((chapter) => chapter.tone);

export const CHAPTER_MARKER = CHAPTERS.map((chapter) => chapter.marker);

export { INITIAL_SAMPLE, CHAPTER_IDS, BOUNDARY_BAND, BOUNDARY_LEAD };
