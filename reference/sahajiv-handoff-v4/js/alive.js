/* Vriksha · alive.js — behaviour for the living layer.
   One gliding selection shape per group, one small creature that reacts to approach, and the async/dropzone/
   stepper helpers. Event-driven; no polling; nothing runs when a group is offscreen or motion is reduced. */
(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const COARSE = matchMedia('(pointer: coarse)');
const all = (s, r = document) => [...r.querySelectorAll(s)];
const own = new WeakSet();

/* ---------- 1 · Gliding selection ----------
   Owned by js/flow.js (VFlow) + css/flow.css. alive.js only forwards the groups it finds, so consumers that call
   VLive.init(root) or VLive.glide(el) keep working; flow.js self-initialises when it loads after this file. */
const GROUPS = () => (window.VFlow && VFlow.GROUPS) || '[role="tablist"],[data-filters],.v-seg,.v-pager,.v-weekdays,.v-tabs,.v-nav';
const glide = g => { if (window.VFlow) VFlow.attach(g); else addEventListener('v-flow-ready', () => VFlow.attach(g), { once: true }); };

/* ---------- 2 · The creature ---------- */
/* ---------- 2 · The seed ----------
   The loading mark is the system's own silhouette language: a pebble that slowly becomes the four-point brand
   star and settles back. Both outlines are sampled from polar functions at the same 64 points, so SMIL
   interpolates them cleanly at every frame — nothing is hand-drawn, nothing can self-intersect. It turns
   slowly while it works and carries a small ink centre. No heart, no chase: a loader says "working", quietly. */
const seedPath = f => { const N = 64, pts = []; for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2; const r = f(t); pts.push((50 + r * Math.cos(t)).toFixed(2) + ' ' + (50 + r * Math.sin(t)).toFixed(2)); } return 'M' + pts.join('L') + 'Z'; };
const PEBBLE = seedPath(t => 41 + 2.4 * Math.cos(3 * t + .6) + 1.4 * Math.sin(5 * t));
const STAR4 = seedPath(t => 21 + 23 * Math.pow(Math.abs(Math.cos(2 * t)), 1.9));
const PUFF = seedPath(t => 36 + 6 * Math.abs(Math.cos(4 * t)));
const SEED_KF = `<animate attributeName="d" dur="4.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.3;.45;.75;1" keySplines=".45 0 .2 1;.45 0 .2 1;.45 0 .2 1;.45 0 .2 1" values="${PEBBLE};${STAR4};${STAR4};${PUFF};${PEBBLE}"/>`;
function creature(el) {
 /* Rebuild the markup whenever it is missing — a React re-render replaces this element's children with its
    own, so an early "already owned" return left the blob permanently empty for consumers. Ownership governs
    the listeners below; the presence of the SVG governs the markup. */
 if (!el.querySelector('svg')) {
  el.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="seed" d="${RM.matches ? STAR4 : PEBBLE}">${RM.matches ? '' : SEED_KF}</path><circle class="core" cx="50" cy="50" r="5"/></svg>` +
   (el.dataset.label ? `<span class="v-pulse__label">${el.dataset.label}</span>` : '');
 }
 if (own.has(el)) return; own.add(el);
 if (!el.getAttribute('role')) { el.setAttribute('role', 'status'); }
 if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.dataset.label || 'Working');
}

/* ---------- 3 · Dropzone (simulated: nothing is uploaded) ---------- */
function dropzone(el) {
 if (own.has(el)) return; own.add(el);
 el.tabIndex = el.tabIndex < 0 ? 0 : el.tabIndex;
 if (!el.getAttribute('role')) el.setAttribute('role', 'button');
 const say = t => { let s = el.querySelector('[data-drop-result]'); if (!s) { s = document.createElement('p'); s.className = 'v-pulse__nofix v-quiet'; s.style.fontSize = '12.5px'; s.setAttribute('data-drop-result', ''); s.setAttribute('role', 'status'); el.appendChild(s); } s.textContent = t; };
 const stop = e => { e.preventDefault(); e.stopPropagation(); };
 ['dragenter', 'dragover'].forEach(t => el.addEventListener(t, e => { stop(e); el.classList.add('-over'); }));
 ['dragleave', 'drop'].forEach(t => el.addEventListener(t, e => { stop(e); el.classList.remove('-over'); }));
 el.addEventListener('drop', e => {
  const n = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files.length : 0;
  say(n ? `${n} file${n === 1 ? '' : 's'} recognised — nothing was uploaded or read in this demo.` : 'Nothing to add — this demo never uploads.');
 });
 el.addEventListener('click', () => say('A real picker would open here. This demo never uploads or reads a file.'));
 el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
}

function init(root = document) {
 try{inkGuard(root)}catch(e){}
 try{scrollGuard(root)}catch(e){}/* a nav’s ink depends on the surface behind it, so it is settled at init like any other decoration */
 /* Include the root itself. A React wrapper's root element IS the component (span.v-pulse, div.v-drop), and
    querySelectorAll never matches its own root — which is why <Loading /> stayed an empty span. */
 const self = (sel, fn) => { if (root.nodeType === 1 && root.matches && root.matches(sel)) fn(root); };
 /* the engine's own init also discovers field groups without markup; the per-group forward stays for pages that load alive.js alone */
 if (window.VFlow && VFlow.init) VFlow.init(root); else { all(GROUPS(), root).forEach(glide);          self(GROUPS(), glide); }
 all('.v-pulse', root).forEach(creature);     self('.v-pulse', creature);
 all('.v-drop', root).forEach(dropzone);      self('.v-drop', dropzone);
 watchAmbient(root);
}
/* pause offscreen decoration: one shared observer stops the creature and the shimmer when they scroll out of
   view, and the whole page's ambient animation stops when the document is hidden. Visible loaders keep
   animating — that is their job — but nothing animates where nobody can see it. */
const AMBIENT='.v-pulse,.v-skel,.v-skel-group>*,.v-nav__item[aria-current="page"]';
const pauseIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{
 e.target.classList.toggle('-paused',!e.isIntersecting)}),{rootMargin:'80px'}):null;
function watchAmbient(root=document){if(!pauseIO)return;
 all(AMBIENT,root).forEach(el=>{if(el.dataset.pauseWatched)return;el.dataset.pauseWatched='1';pauseIO.observe(el)})}
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('-doc-hidden',document.hidden)});
/* ---- Ink guard: a nav takes its ink from the surface behind it ----
   The rail's current destination measured 1.04:1 in dark mode, and the same class of defect flipped the
   other way for a nav on an ink card in light mode. No stylesheet can settle it, because the answer depends
   on the painted ancestor. This reads that ancestor once per nav item and stamps data-ink, which alive.css
   turns into the readable half of each colour pair. Runs on init, on a theme change and on a palette change. */
const _lum = c => { const q = String(c).match(/[\d.]+/g); if (!q) return 1;
 const [r,g,b] = q.slice(0,3).map(Number).map(v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4) });
 return .2126*r + .7152*g + .0722*b };
/* "The surface behind the text" starts at the ELEMENT, not at its parent: a selected tab paints its own ink
   fill, so the ancestor is irrelevant to whether its label can be read. Starting at the parent is what gave
   a selected pill dark-on-dark (1.12:1) while every resting tab beside it was correct. */
/* Composite a translucent colour onto what is behind it. Starting the walk at the element was right for a
   selected tab (an OPAQUE fill) and wrong for the rail's current destination, whose fill is a 14%-alpha cream
   tint: the old test accepted any non-transparent background, so the guard judged a tint as a light surface
   and handed the item the readable-on-cream mulberry over ink — 2.99:1, on the most important item in a nav.
   Anything below ~90% alpha is a veil, not a surface, so keep walking and stack the veils. */
const _over = (fg, bg) => { const F = String(fg).match(/[\d.]+/g), B = String(bg).match(/[\d.]+/g);
 if (!F || !B) return bg; const a = F.length > 3 ? parseFloat(F[3]) : 1;
 return 'rgb(' + [0,1,2].map(i => Math.round(parseFloat(F[i]) * a + parseFloat(B[i]) * (1 - a))).join(',') + ')' };
const _alpha = c => { const m = String(c).match(/[\d.]+/g); return m && m.length > 3 ? parseFloat(m[3]) : 1 };
const _behind = el => {
 const veils = [];
 for (let p = el; p; p = p.parentElement) {
  const bg = getComputedStyle(p).backgroundColor;
  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;
  if (_alpha(bg) < .9) { veils.push(bg); continue }
  return veils.reduceRight((acc, v) => _over(v, acc), bg);
 }
 return veils.reduceRight((acc, v) => _over(v, acc),
  getComputedStyle(document.body).backgroundColor || 'rgb(251,244,230)');
};
/* A pane that scrolls says so. Stamped by the same pass, and re-stamped on its own scroll so the fade
   disappears once you have reached the end — an affordance that lies about having more is worse than none. */
function scrollGuard(root = document) {
 const SEL = '.v-table-wrap,.v-scroller,.v-cmd__list';
 const list = [...(root.querySelectorAll ? root.querySelectorAll(SEL) : [])];
 if (root.nodeType === 1 && root.matches && root.matches(SEL)) list.unshift(root);
 list.forEach(el => {
  const mark = () => {
   const room = el.scrollWidth - el.clientWidth;
   /* `scrollbar-gutter:stable` reserves ~11px, so a pane's real maximum scrollLeft is short of
      scrollWidth - clientWidth and a 2px epsilon could never register the end — the "there is more" fade
      stayed on after you had reached it. The tolerance has to cover the reserved gutter. */
   if (room < 2) el.removeAttribute('data-scrollable');
   else el.dataset.scrollable = (el.scrollLeft >= room - 14) ? 'end' : 'more';
  };
  if (!el.dataset.scrollWatched) { el.dataset.scrollWatched = '1';
   /* Read the position on the NEXT frame: a scroll handler can run before scrollLeft has settled, which left
      the "there is more" fade showing after you had already reached the end. */
   el.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
   /* Observing only the PANE's box misses the normal case for a data table: the rows arrive after init, the
      pane's box never changes and only its CONTENT width does, so the observer never fired and one of the
      most prominent entries silently kept a hard edge. Watch the content box too, and re-mark when the
      subtree changes — which also covers a consumer's async fetch, filter or paging. */
   if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => requestAnimationFrame(mark));
    ro.observe(el); [...el.children].forEach(c => ro.observe(c)); el.__scrollRO = ro }
   if ('MutationObserver' in window) new MutationObserver(() => requestAnimationFrame(() => {
    if (el.__scrollRO) [...el.children].forEach(c => { try { el.__scrollRO.observe(c) } catch (e) {} });
    mark() })).observe(el, { childList: true, subtree: true });
  }
  mark();
 });
}
function inkGuard(root = document) {
 const SEL = '.v-nav__item,.v-tab,.v-dock__item,.v-dock__action';
 const list = [...(root.querySelectorAll ? root.querySelectorAll(SEL) : [])];
 if (root.nodeType === 1 && root.matches && root.matches(SEL)) list.unshift(root);
 /* Choose by CONTRAST, not by a luminance threshold. A single cut-off has to guess about the middle of the
    range — and the selected pill's pink fill sits exactly there, which is how a selected tab ended up cream
    on pink at 1.12:1 while every resting tab beside it was right. Comparing both concrete inks against the
    measured ground and keeping the better one cannot be wrong about a mid-tone. */
 list.forEach(el => {
  const g = _lum(_behind(el));
  if (g == null) return;
  const r = ink => (Math.max(g, ink) + .05) / (Math.min(g, ink) + .05);
  el.dataset.ink = r(_lum('rgb(246,239,226)')) >= r(_lum('rgb(17,17,17)')) ? 'light' : 'dark' });
}
addEventListener('v-theme', () => inkGuard());
addEventListener('v-palette', () => inkGuard());
/* A theme flip settles in stages: CSS variables switch, then the motion engine re-reads and repaints every
   body's fill on its own rAF pair. Reading the surface one frame in caught the OLD tint, so the guard chose
   ink for a surface that had already gone dark — which is why two hosts still measured 1.04 and 2.99 in dark
   mode while light mode was clean. Judge once immediately, then again after the repaint has landed. */
const _reguard = () => { inkGuard(); scrollGuard();
 requestAnimationFrame(() => requestAnimationFrame(() => { inkGuard(); scrollGuard() })) };
new MutationObserver(_reguard)
 .observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode','data-skin'] });
addEventListener('v-theme', _reguard);
window.VLive = { init, glide, creature, watchAmbient, inkGuard, scrollGuard, replace: () => { if (window.VFlow) VFlow.replace(); } };
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', () => init()) : init();
})();
