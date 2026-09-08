/** A fixed-topology contour in a 20 × 100 viewBox. Only its edges deform. */
export function scrollThumbPath(engagement: number, bias: number) {
  const active = Math.max(0, Math.min(1, Number.isFinite(engagement) ? engagement : 0));
  const bend = Math.max(-1, Math.min(1, Number.isFinite(bias) ? bias : 0)) * active;
  const left = 6 - active * 2.8;
  const right = 14 + active * 2.8;
  const waist = 1 + active * 2;
  const shoulder = 27 + bend * 12;
  const f = (n: number) => Number(n.toFixed(3));
  return `M 10 1 C ${f(right - 1)} 1 ${f(right)} 5 ${f(right)} 12 C ${f(right + active)} ${f(shoulder)} ${f(right - waist)} 38 ${f(right - waist)} 50 C ${f(right - waist)} 65 ${f(right + active * .7)} ${f(82 + bend * 8)} ${f(right)} 90 C ${f(right)} 97 12 99 10 99 C ${f(left + 1)} 99 ${f(left)} 95 ${f(left)} 88 C ${f(left - active)} ${f(73 - bend * 12)} ${f(left + waist)} 62 ${f(left + waist)} 50 C ${f(left + waist)} 36 ${f(left - active * .6)} ${f(18 - bend * 8)} ${f(left)} 10 C ${f(left)} 4 8 1 10 1 Z`;
}

/** The overlay follows document scroll; it never creates a second scroll owner. */
export function pageScrollGeometry(scrollSize: number, viewportSize: number, trackSize: number, scrollTop: number) {
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const content = safe(scrollSize), viewport = safe(viewportSize), track = safe(trackSize);
  const maxScroll = Math.max(0, content - viewport);
  const thumbSize = maxScroll === 0 ? track : Math.min(track, Math.max(36, track * viewport / Math.max(1, content)));
  const travel = track - thumbSize;
  const thumbOffset = maxScroll === 0 ? 0 : Math.min(maxScroll, safe(scrollTop)) / maxScroll * travel;
  return { maxScroll, thumbSize, thumbOffset, travel };
}

type ScrollRoot = Pick<Element, "getAttribute" | "setAttribute" | "removeAttribute">;
const pageScrollRoots = new WeakMap<ScrollRoot, { users: number; original: string | null }>();
/** StrictMode-safe ownership of the native scrollbar override. */
export function acquirePageScrollbar(root: ScrollRoot) {
  const state = pageScrollRoots.get(root) ?? { users: 0, original: root.getAttribute("data-page-scrollbar") };
  if (state.users++ === 0) { pageScrollRoots.set(root, state); root.setAttribute("data-page-scrollbar", "mounted"); }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--state.users === 0) {
      if (state.original === null) root.removeAttribute("data-page-scrollbar");
      else root.setAttribute("data-page-scrollbar", state.original);
      pageScrollRoots.delete(root);
    }
  };
}
