/* Vriksha · flow.js — the travelling selection (VFlow).
   One body per group carries the active state and MOVES to the next active item; a quieter ghost follows the
   pointer. All paint and timing live in css/flow.css; this file measures, resolves settings and drives the
   multi-phase characters (stretch, drop, rubber) that need two or three beats.

   Settings   VFlow.get() · VFlow.set({variant, hover, speed, intensity, hoverStrength}) · VFlow.reset()
              persisted under localStorage "v-flow-v1"; the catalog's authoring panel edits them ("Selection").
   Per group  data-flow="off" disables · data-flow="<variant>" pins a character · data-flow-hover="off" drops
              the ghost · data-no-glide (legacy) = off. Any ancestor with data-flow="off" disables the subtree.
   Groups     VFlow.GROUPS (auto) · [data-flow-group] for any other set of items · [data-flow-fields] on a form
              or fieldset makes the focus wash travel between its .v-input / .v-textarea controls.
   API        VFlow.init(root) · attach(group) · detach(group) · replace() (re-measure, no animation). */
(() => {
const KEY = 'v-flow-v1';
const DEFAULTS = { variant: 'glide', hover: true, speed: 1, intensity: 1, hoverStrength: 1 };
const VARIANTS = {
 glide:   { label: 'Glide',    note: 'One spring with a touch of overshoot, then a small squash as it lands. Calm and familiar; the library default.' },
 stretch: { label: 'Stretch',  note: 'Liquid: the body first reaches across to cover both the old and the new home, then contracts onto the new one.' },
 jelly:   { label: 'Jelly',    note: 'A soft body that squashes along the direction of travel and wobbles as it settles. Best in small doses.' },
 comet:   { label: 'Comet',    note: 'The pill moves quick and clean while a fainter body follows a beat behind and folds into it.' },
 drop:    { label: 'Ink drop', note: 'The body gathers into a small drop, the drop shoots across, and blooms into the new home. Three beats.' },
 rubber:  { label: 'Rubber',   note: 'The leading edge leaps first and the trailing edge is pulled after it, snapping in with a little give.' },
 pebble:  { label: 'Pebble',   note: 'In flight the body loosens into one of Vriksha\u2019s organic pebbles and firms back into the pill on arrival.' },
 ripple:  { label: 'Ripple',   note: 'A clean glide, then a single ring spreads from the body on landing, like a drop meeting water.' },
 halo:    { label: 'Halo',     note: 'A soft pink light swells around the body while it moves and settles as it lands. Strongest on the ink rail.' } };
const RM = matchMedia('(prefers-reduced-motion: reduce)');
/* the same character, read by every other component (css/flow.css §6): its travel curve, its base duration and
   its landing keyframes; ripple and halo add a ring or a glow. Written onto :root by applyRoot(). */
const CHAR = {
 glide: { e: 'cubic-bezier(.34,1.32,.44,1)', d: .42, l: 'vf-land' }, stretch: { e: 'cubic-bezier(.3,1.15,.4,1)', d: .3, l: 'vf-land' },
 jelly: { e: 'cubic-bezier(.3,1.3,.45,1)', d: .5, l: 'vf-jellyx' }, comet: { e: 'cubic-bezier(.2,.8,.2,1)', d: .34, l: 'vf-land' },
 drop: { e: 'cubic-bezier(.3,1.25,.4,1)', d: .3, l: 'vf-bloom' }, rubber: { e: 'cubic-bezier(.3,1.3,.4,1)', d: .36, l: 'vf-land' },
 pebble: { e: 'cubic-bezier(.32,1.25,.42,1)', d: .46, l: 'vf-lean' }, ripple: { e: 'cubic-bezier(.2,.8,.2,1)', d: .36, l: 'vf-land', g: 'vf-ring' },
 halo: { e: 'cubic-bezier(.3,1.2,.4,1)', d: .4, l: 'vf-land', g: 'vf-glow' }, off: { e: 'linear', d: 0, l: 'none' } };
/* what else the character governs — selectors shared with css/flow.css §6 and read by the catalog's coverage badges */
const ROLES = {
 press: '.v-btn,.v-ibtn,.v-item,.v-attach,.v-card.-lift,.v-toggle,.v-chip,.v-cal__d,.v-dock__action,.v-select,.v-resizable__handle',
 toggles: '.v-switch,.v-check,.v-radio',
 opens: '.v-dialog,.v-sheet,.v-drawer,.v-menu,.v-popover,.v-hovercard,.v-tip,.v-toast,[data-tooltip],[data-hovercard]',
 unfolds: '.v-acc>details,.v-collapsible',
 paces: '.v-track,.v-skel,.v-pulse,.v-ring,.v-bars,.v-slider',
 enters: '.v-alert,.v-badge,.v-marker,.v-empty,.v-state,.v-bubble',
 breathes: '.v-avatar,.v-hex,.v-kbd,.v-crumbs a,.v-bars>i,.v-ratio,.v-table tbody tr' };
const SURF = '.v-dialog,.v-sheet,.v-drawer,.v-menu,.v-popover,.v-hovercard,.v-tip,.v-toast', FEED = ROLES.enters;
const GROUPS = '[role="tablist"],[data-filters],.v-seg,.v-pager,.v-weekdays,.v-tabs,.v-nav,.v-quest__opts,.v-iradios,.v-md__list,.v-datestrip,.v-menu,.v-cmd__list,.v-list,.v-stepper-flow,.v-carousel__dots,.v-dock,.v-cal__grid,[data-flow-group],[data-flow-fields]';
/* groups whose items are not buttons/tabs/labels: [group, item, anchor the body is measured from] */
const SPECIAL = [['.v-menu', '.v-menu__item', null], ['.v-cmd__list', '.v-menu__item', null], ['.v-list', '.v-item', null], ['.v-stepper-flow', '.v-step', '.v-step__n'], ['.v-carousel__dots', 'button', null], ['.v-dock', '.v-dock__item', null], ['.v-cal__grid', '.v-cal__d', null]];
/* not .v-cal__grid: the calendar rebuilds its grid on every pick, so there is no persistent body to travel */
const ITEMS = 'button,[role="tab"],label,.v-nav__item,.v-item';
const FIELD_ITEMS = '.v-input,.v-textarea,.v-igroup,.v-native,.v-otp input';
const ACTIVE = '[aria-selected="true"],[aria-pressed="true"],[aria-current="page"],[aria-current="true"],[aria-current="step"],.-on,.-selected,label:has(input:checked)';
const LAYERS = ['v-glide__pill', 'v-glide__hover', 'v-glide__trail'];
const PHASES = ['-phase1', '-gather', '-shoot', '-lead', '-land'];
const all = (s, r = document) => [...r.querySelectorAll(s)];
const groups = new Set();
let cfg = load();

function load() { let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} return Object.assign({}, DEFAULTS, s && typeof s === 'object' ? s : {}); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
function applyRoot() {
 const h = document.documentElement;
 h.dataset.flow = cfg.variant; h.dataset.flowHover = cfg.hover ? 'on' : 'off';
 h.style.setProperty('--flow-speed', String(Math.max(.25, +cfg.speed || 1)));
 h.style.setProperty('--flow-intensity', String(Math.max(0, +cfg.intensity ?? 1)));
 h.style.setProperty('--flow-hover', String(Math.max(0, +cfg.hoverStrength ?? 1)));
 const c = CHAR[cfg.variant] || CHAR.glide, sp = Math.max(.25, +cfg.speed || 1);
 const d = cfg.variant === 'off' ? 0 : tokMs('--t-flow-' + cfg.variant, c.d * 1000) / 1000, e = cfg.variant === 'off' ? c.e : tokStr('--e-flow-' + cfg.variant, c.e);
 h.style.setProperty('--flow-ease', e); h.style.setProperty('--flow-dur', (d / sp).toFixed(3) + 's');
 h.style.setProperty('--flow-land', c.l); h.style.setProperty('--flow-glow', c.g || 'none');
 groups.forEach(g => g.__flow && g.__flow.resolve());
}
const speed = () => Math.max(.25, +cfg.speed || 1);
/* timings come from tokens.css (--t-flow-*, --e-flow-*); the literals in CHAR are only the fallback when a token is missing */
const tokRaw = n => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); } catch (e) { return ''; } };
const tokMs = (n, fb) => { const v = tokRaw(n); if (!v) return fb; const x = parseFloat(v); return isFinite(x) ? (/ms$/.test(v) ? x : x * 1000) : fb; };
const tokStr = (n, fb) => tokRaw(n) || fb;
/* ---- clock: with V.clock(t) engaged, phase timers advance on t (ms) instead of setTimeout ---- */
const CLK = { t: null, q: [] };
function schedTimer(fn, ms) { if (CLK.t != null) { const h = { at: CLK.t + ms, fn }; CLK.q.push(h); return h; } return setTimeout(fn, ms); }
function clearTimer(h) { if (h && typeof h === 'object') { const i = CLK.q.indexOf(h); if (i >= 0) CLK.q.splice(i, 1); } else clearTimeout(h); }
function clock(t) { if (t == null) { const was = CLK.t; CLK.t = null; CLK.q.splice(0).forEach(h => setTimeout(h.fn, Math.max(0, h.at - (was || 0)))); return; }
 CLK.t = t; CLK.q.sort((a, b) => a.at - b.at); while (CLK.q.length && CLK.q[0].at <= t) CLK.q.shift().fn(); }

const isOff = g => g.hasAttribute('data-no-glide') || g.dataset.flow === 'off' || !!g.closest('[data-flow="off"]');
const kindOf = g => g.hasAttribute('data-flow-fields') ? 'fill' : g.classList.contains('-underline') || g.classList.contains('v-dock') ? 'bar' : 'pill';

function attach(g) {
 if (!g || g.nodeType !== 1) return;
 if (g.__flow) { g.__flow.resolve(); return; }
 if (isOff(g) || !g.children.length) return;
 const kind = kindOf(g), spec = SPECIAL.find(([s]) => g.matches(s)), isMenu = g.classList.contains('v-menu');
 const itemSel = kind === 'fill' ? FIELD_ITEMS : spec ? spec[1] : ITEMS, anchor = spec && spec[2];
 const items = () => all(itemSel, g).filter(x => x.offsetParent !== null && x.closest(GROUPS) === g);
 /* counted unfiltered: a group inside a closed popover, dialog or menu attaches now and paints when it is shown */
 if (all(itemSel, g).filter(x => x.closest(GROUPS) === g).length < 2) return;
 /* one body means one choice: a group of checkboxes (weekdays, multi-select tiles) has no single home to travel to */
 if (kind !== 'fill' && g.querySelector('input[type="checkbox"]') && !g.querySelector('input[type="radio"]')) return;
 g.classList.add('v-glide');
 const mk = c => { const s = document.createElement('span'); s.className = c; s.setAttribute('aria-hidden', 'true'); s.appendChild(document.createElement('i')); return s; };
 let pill = mk(LAYERS[0]), hov = mk(LAYERS[1]), trail = mk(LAYERS[2]);
 const seat = () => { if (!trail.isConnected) g.prepend(trail); if (!hov.isConnected) g.prepend(hov); if (!pill.isConnected) g.prepend(pill); };
 seat();
 let prev = null, lastActive = null, timers = [], dScale = 1;
 /* phase timers follow the same distance and speed scaling as the CSS durations they pace */
 const later = (fn, ms) => timers.push(schedTimer(fn, ms * dScale / speed()));
 const box = el => {
  const m = anchor && el.querySelector(anchor) || el;
  const gr = g.getBoundingClientRect(), r = m.getBoundingClientRect();
  const cs = getComputedStyle(m);
  const b = { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height, r: cs.borderRadius && cs.borderRadius !== '0px' ? cs.borderRadius : '999px' };
  /* the dock's marker is the 20 px rule 14 px above the item's foot; underline tabs run the item's width */
  if (kind === 'bar') { const dock = g.classList.contains('v-dock'), w = dock ? 20 : b.w, off = dock ? 14 : 0; b.x += (b.w - w) / 2; b.w = w; b.y = b.y + b.h - off - 2.5; b.h = 2.5; b.r = '2px'; }
  return b;
 };
 const paint = (L, b, p = 'glide', o = 1) => {
  const s = g.style;
  if (L === hov) { s.setProperty('--hov-x', Math.round(b.x) + 'px'); s.setProperty('--hov-y', Math.round(b.y) + 'px'); s.setProperty('--hov-w', Math.round(b.w) + 'px'); s.setProperty('--hov-h', Math.round(b.h) + 'px'); s.setProperty('--hov-r', b.r); s.setProperty('--hov-o', o); return; }
  /* pill and trail share the group's --glide-* so existing consumers reading them keep working; the trail
     lags purely by its own transition */
  s.setProperty('--glide-x', Math.round(b.x) + 'px'); s.setProperty('--glide-y', Math.round(b.y) + 'px');
  s.setProperty('--glide-w', Math.round(b.w) + 'px'); s.setProperty('--glide-h', Math.round(b.h) + 'px');
  s.setProperty('--glide-r', b.r); s.setProperty('--glide-o', o);
 };
 /* a menu's highlight is its roving focus (dropdown, context, menubar) or aria-selected (combobox, command, listbox) */
 /* fields read document.activeElement rather than :focus — :focus only matches while the document itself has focus,
    so a field focused while the tab is in the background would have no body */
 const active = () => kind === 'fill' ? items().find(x => x === document.activeElement || x.contains(document.activeElement)) || null : items().find(x => x.matches(ACTIVE) || (isMenu && x === document.activeElement)) || null;
 const land = () => { const i = pill.firstElementChild; i.style.animation = 'none'; void i.offsetWidth; i.style.animation = ''; pill.classList.add('-land'); later(() => pill.classList.remove('-land'), tokMs('--t-flow-land-hold', 900)); };
 let busy = false, burst = 0, burstT = 0;
 function place(animate = true) {
  if (!g.isConnected) { detach(g); return; }
  if (busy) return; /* never re-enter: a paint that triggers an observer that asks to paint again is one paint */
  /* runaway breaker: a host that rewrites itself in reaction to every paint would otherwise ping-pong with this
     group forever. More than 120 placements in one second is not a user, so the group is released. */
  const now = Date.now(); if (now - burstT > 1000) { burstT = now; burst = 0; }
  if (++burst > 120) { console.warn('VFlow: runaway placement, releasing', g); detach(g); return; }
  busy = true;
  try { placeInner(animate); } finally { busy = false; }
 }
 function placeInner(animate) {
  seat();
  const a = active();
  all('[data-glide-active]', g).forEach(x => x !== a && x.removeAttribute('data-glide-active'));
  if (!a) { g.style.setProperty('--glide-o', '0'); prev = null; lastActive = null; return; }
  if (!a.hasAttribute('data-glide-active')) a.setAttribute('data-glide-active', ''); /* never a redundant mutation: other observers may be watching this node */
  /* a silent re-measure (resize, collapse, a consumer's VLive.replace()) that finds a DIFFERENT winner is a
     selection change and travels; only the same winner in a new place is re-seated without motion. ui.js calls
     replace() right after it sets aria-current on the rail, which used to paint the destination outright. */
  if (!animate && lastActive && a !== lastActive && prev) animate = true;
  lastActive = a;
  const b = box(a), v = g.dataset.flowV || cfg.variant;
  const moved = prev && (Math.abs(b.x - prev.x) > .5 || Math.abs(b.y - prev.y) > .5 || Math.abs(b.w - prev.w) > .5 || Math.abs(b.h - prev.h) > .5);
  /* the same target again (a click handler and the attribute observer both asking) leaves a journey in flight alone */
  if (!moved && prev) return;
  timers.forEach(clearTimeout); timers = []; PHASES.forEach(c => pill.classList.remove(c));
  if (animate && moved && !RM.matches && v !== 'off') {
   const dx = b.x - prev.x, dy = b.y - prev.y, horiz = Math.abs(dx) >= Math.abs(dy);
   g.dataset.dir = horiz ? 'x' : 'y';
   /* a hop to the neighbour is quicker than a leap across the group: .8× at ~0 px, 1× at ~120 px, 1.25× at 300+ */
   dScale = Math.min(1.25, Math.max(.8, .8 + Math.hypot(dx, dy) / 600));
   g.style.setProperty('--glide-d', dScale.toFixed(2));
   if (v === 'stretch') {
    const u = { x: Math.min(b.x, prev.x), y: Math.min(b.y, prev.y), r: b.r };
    u.w = Math.max(b.x + b.w, prev.x + prev.w) - u.x; u.h = Math.max(b.y + b.h, prev.y + prev.h) - u.y;
    pill.classList.add('-phase1'); paint(pill, u);
    later(() => { pill.classList.remove('-phase1'); paint(pill, b); land(); }, tokMs('--t-flow-stretch-p1', 165));
   } else if (v === 'drop') {
    const d = Math.max(6, Math.min(12, b.h));
    const c0 = { x: prev.x + prev.w / 2 - d / 2, y: prev.y + prev.h / 2 - d / 2, w: d, h: d, r: '999px' };
    const c1 = { x: b.x + b.w / 2 - d / 2, y: b.y + b.h / 2 - d / 2, w: d, h: d, r: '999px' };
    pill.classList.add('-gather'); paint(pill, c0);
    const tg = tokMs('--t-flow-drop-gather', 140), ts = tokMs('--t-flow-drop-shoot', 180);
    later(() => { pill.classList.remove('-gather'); pill.classList.add('-shoot'); paint(pill, c1); }, tg);
    later(() => { pill.classList.remove('-shoot'); paint(pill, b); land(); }, tg + ts);
   } else if (v === 'rubber') {
    const lead = Object.assign({}, b);
    if (horiz) { if (dx >= 0) { lead.x = prev.x; lead.w = b.x + b.w - prev.x; } else { lead.w = prev.x + prev.w - b.x; } lead.y = prev.y; lead.h = prev.h; }
    else { if (dy >= 0) { lead.y = prev.y; lead.h = b.y + b.h - prev.y; } else { lead.h = prev.y + prev.h - b.y; } lead.x = prev.x; lead.w = prev.w; }
    pill.classList.add('-lead'); paint(pill, lead);
    later(() => { pill.classList.remove('-lead'); paint(pill, b); land(); }, tokMs('--t-flow-rubber-lead', 200));
   } else { paint(pill, b); land(); }
  } else paint(pill, b);
  prev = b;
 }
 const resolve = () => {
  if (isOff(g)) { detach(g); return; }
  const own = g.dataset.flow;
  g.dataset.flowV = own && VARIANTS[own] ? own : cfg.variant;
 };
 /* a timer, not requestAnimationFrame: rAF is paused in hidden or throttled documents, and a selection that
    changed while the tab was away must still be in the right place when it comes back */
 let qT = 0, reseat = false;
 const q = () => { if (qT) return; qT = schedTimer(() => { qT = 0; if (reseat) { reseat = false; place(false); } place(); }, 16); };
 g.addEventListener('click', q);
 g.addEventListener('keyup', e => { if (/Arrow|Home|End| |Enter/.test(e.key)) q(); });
 g.addEventListener('change', q);
 if (kind === 'fill' || isMenu) { g.addEventListener('focusin', q); g.addEventListener('focusout', e => { if (!g.contains(e.relatedTarget)) q(); }); }
 g.dataset.flowKind = kind;
 const hideHov = () => g.style.setProperty('--hov-o', '0');
 g.addEventListener('pointerover', e => {
  const it = e.target.closest && e.target.closest(itemSel);
  if (!it || !g.contains(it) || it.closest(GROUPS) !== g || it.hasAttribute('data-glide-active')) { hideHov(); return; }
  paint(hov, box(it), 'hover', 1);
 });
 g.addEventListener('pointerleave', hideHov);
 g.addEventListener('pointerdown', hideHov); /* the selection is about to travel; the ghost steps aside */
 const mo = new MutationObserver(ms => {
  /* the layers' own changes (landing, phases) and the group's own class flags (-still) must never re-enter */
  const own = m => m.target === g || LAYERS.some(c => m.target.nodeType === 1 && (m.target.classList.contains(c) || (m.target.parentElement && m.target.parentElement.classList.contains(c))));
  if (ms.every(m => own(m) && m.type !== 'childList')) return;
  /* a re-render that threw the layers away is re-seated silently; everything else travels — an immediate
     place(false) here used to paint the destination before the animated pass could stage its phases, which is
     why stretch, rubber and drop collapsed into a plain slide on attribute-driven groups */
  /* a re-render that threw the layers away is re-seated on the next tick without motion; then the normal pass */
  if (ms.some(m => m.type === 'childList') && !pill.isConnected) reseat = true;
  q();
 });
 mo.observe(g, { attributes: true, childList: true, subtree: true, attributeFilter: ['aria-selected', 'aria-pressed', 'aria-current', 'class', 'data-flow', 'data-flow-hover'] });
 let roT = 0; const ro = new ResizeObserver(() => { if (roT) return; roT = setTimeout(() => { roT = 0; place(false); }, 16); }); ro.observe(g);
 g.__flow = { place, resolve, kind, dispose() { mo.disconnect(); ro.disconnect(); clearTimer(qT); clearTimeout(roT); timers.forEach(clearTimer); [pill, hov, trail].forEach(l => l.remove()); all('[data-glide-active]', g).forEach(x => x.removeAttribute('data-glide-active')); g.classList.remove('v-glide'); delete g.dataset.flowV; delete g.dataset.dir; delete g.dataset.flowKind; ['--glide-x','--glide-y','--glide-w','--glide-h','--glide-r','--glide-o','--hov-x','--hov-y','--hov-w','--hov-h','--hov-r','--hov-o'].forEach(p => g.style.removeProperty(p)); } };
 g.__glide = place; /* legacy handle used by alive.js consumers */
 groups.add(g);
 /* first paint is still: the body appears in place and only travels from the next change on */
 g.classList.add('-still'); resolve(); place(false);
 schedTimer(() => g.classList.remove('-still'), tokMs('--t-flow-still', 60));
}
function detach(g) { if (!g || !g.__flow) return; g.__flow.dispose(); delete g.__flow; delete g.__glide; groups.delete(g); }
function init(root = document) {
 autoFields(root);
 all(GROUPS, root).forEach(attach);
 if (root.nodeType === 1 && root.matches && root.matches(GROUPS)) attach(root);
}
function replace() { groups.forEach(g => g.isConnected ? g.__flow.place(false) : detach(g)); }
function set(patch) {
 const next = Object.assign({}, cfg, patch || {});
 if (!VARIANTS[next.variant] && next.variant !== 'off') next.variant = DEFAULTS.variant;
 cfg = next; save(); applyRoot();
 dispatchEvent(new CustomEvent('v-flow', { detail: get() }));
}
const get = () => Object.assign({}, cfg);
const reset = () => set(Object.assign({}, DEFAULTS));

/* ---- the same character everywhere else ---- */
/* fields: any container holding two or more controls becomes a focus-wash group without markup; the walk stops at
   a form, a fieldset or the catalog's demo stage so unrelated fields on one page never share a wash */
function autoFields(root) {
 if (root.nodeType !== 9 && root.nodeType !== 1) return;
 all('.v-otp', root).forEach(o => { if (!o.hasAttribute('data-flow-fields')) o.setAttribute('data-flow-fields', 'auto'); });
 all(FIELD_ITEMS, root).forEach(f => {
  if (f.closest('[data-flow-fields]')) return;
  let p = f.parentElement;
  while (p && p !== document.body && !p.matches('form,fieldset,.demo,main') && all(FIELD_ITEMS, p).filter(x => !x.closest('[data-flow-fields]')).length < 2) p = p.parentElement;
  if (!p || p === document.body || p.matches('.demo,main')) return;
  if (all(FIELD_ITEMS, p).length >= 2) p.setAttribute('data-flow-fields', 'auto');
 });
}
const quiet = () => RM.matches || cfg.variant === 'off';
/* the last pointer or keyboard activation: an overlay grows from there */
let trig = null;
addEventListener('pointerdown', e => { trig = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.getBoundingClientRect) { const r = e.target.getBoundingClientRect(); trig = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: Date.now() }; } }, true);
/* restart an attribute-driven animation: remove, force a style flush, set again */
const restart = (el, attr, val) => { el.removeAttribute(attr); void el.offsetWidth; el.setAttribute(attr, val); };
function appear(el, grow) {
 if (quiet() || el.closest('[data-flow="off"]')) return;
 if (grow) {
  const r = el.getBoundingClientRect(), fresh = trig && Date.now() - trig.t < 1500;
  el.style.setProperty('--flow-ox', Math.round(fresh ? trig.x - r.left : r.width / 2) + 'px');
  el.style.setProperty('--flow-oy', Math.round(fresh ? trig.y - r.top : r.height) + 'px');
 }
 restart(el, 'data-flow-in', grow ? 'grow' : 'enter');
 /* a group inside a growing surface measured itself against a scaled box; re-seat it once the surface is at rest */
 if (grow) { const seat = () => all('.v-glide', el).forEach(g => g.__flow && g.__flow.place(false)); el.addEventListener('animationend', function h(ev) { if (ev.target !== el) return; el.removeEventListener('animationend', h); seat(); }); setTimeout(seat, 900 / Math.max(.25, +cfg.speed || 1)); }
}
function pulse(el) { if (quiet() || el.closest('[data-flow="off"]') || el.closest('.v-glide')) return; restart(el, 'data-flow-land', ''); }
addEventListener('pointerup', e => { const el = e.target.closest && e.target.closest(ROLES.press); if (el && !el.disabled) pulse(el); }, true);
addEventListener('keyup', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const el = e.target.closest && e.target.closest(ROLES.press); if (el) pulse(el); }, true);
addEventListener('change', e => {
 const t = e.target; if (!t.matches) return;
 if (t.matches('.v-slider')) { const o = t.closest('.v-sliderwrap') && t.closest('.v-sliderwrap').querySelector('output'); if (o) pulse(o); return; }
 if (!t.matches('input[type="checkbox"],input[type="radio"]')) return;
 const host = t.closest('.v-switch,.v-check,.v-radio,.v-iradio,.v-quest__opt'); if (!host) return;
 pulse(host.matches('.v-check,.v-radio') ? t : host);
}, true);
/* surfaces that open and feedback that arrives after the page is up; new groups are attached as they appear.
   The first 1.5 s after load are quiet so a page's own render never animates every alert on it. */
let quietUntil = Date.now() + 1500;
addEventListener('load', () => { quietUntil = Date.now() + 1500; });
const SMALL = 400;
new MutationObserver(ms => {
 const now = Date.now();
 for (const m of ms) {
  if (m.type === 'attributes') {
   const el = m.target; if (el.nodeType !== 1 || now < quietUntil) continue;
   if (m.attributeName === 'hidden') { if (!el.hidden && el.matches(SURF + ',' + FEED)) appear(el, el.matches(SURF)); }
   else if (el.matches('.v-hovercard.-show,.v-tip.-show') && !/-show/.test(m.oldValue || '')) appear(el, true);
   continue;
  }
  for (const n of m.addedNodes) {
   if (n.nodeType !== 1) continue;
   if (n.matches(GROUPS)) attach(n); else if (n.firstElementChild && n.querySelectorAll('*').length < SMALL) all(GROUPS, n).forEach(attach);
   if (now < quietUntil) continue;
   if (n.matches(SURF)) appear(n, true); else if (n.matches(FEED)) appear(n, false);
   else if (n.firstElementChild) { const kids = all(SURF + ',' + FEED, n); if (kids.length <= 12) kids.forEach(k => appear(k, k.matches(SURF))); }
  }
 }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['hidden', 'class'], attributeOldValue: true, childList: true, subtree: true });

applyRoot();
addEventListener('resize', replace, { passive: true });
addEventListener('storage', e => { if (e.key === KEY) { cfg = load(); applyRoot(); } });
window.VFlow = { get, set, reset, init, attach, detach, replace, appear, pulse, clock, VARIANTS, DEFAULTS, GROUPS, ROLES };
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', () => init()) : init();
dispatchEvent(new Event('v-flow-ready'));
})();
