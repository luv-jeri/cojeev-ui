/* Vriksha · authoring-panel.js — the animation authoring sidebar for the component library.
   This is the LIBRARY AUTHORING PRODUCT: every switch, tier and value of the living-shape engine is here,
   so a designer can author, compare and export motion without leaving the component they are looking at.
   It drives the shared engine in js/morph.js — panel state, preview, saved config and exported config are
   one object (VMorph.cfg + VMorph.TIER). Nothing here is a cosmetic copy.

   Requires: js/morph.js (engine) · optional: js/v.js (icons)
   Mounts: a docked right sidebar on roomy desktops, an accessible drawer below 1180 px.
   API: VPanel.open() · close() · toggle() · applyScope(root) · state() */
(() => {
const M = () => window.VMorph;
const LS = 'v-authoring-v1';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- control definitions: units, ranges, plain-English help ---------- */
const TIER_LABELS = {pill:'Pill — buttons, selects, badges', tile:'Tile — icon disks, circles', nav:'Nav — nav rows, tabs, list rows', card:'Card — cards, panels, sheets', blob:'Blob — decorative shapes', spinner:'Spinner — loaders'};
const F = {
 // key, label, min, max, step, unit, toDisplay, fromDisplay
 amp:      ['Rest breath', 0, 3, .01, '%', v => v * 100, v => v / 100, 'How much the outline moves while nothing is happening. 0 % is perfectly still. Example: 0.8 % on a 48 px button is under half a pixel; 3 % is a visible pulse.'],
 reach:    ['Reach', 0, 24, .5, 'px', v => v, v => v, 'How far the nearest edge stretches toward the cursor before it arrives. Example: 4 px is a nudge, 16 px is a clear tentacle.'],
 inside:   ['Hold bump', 0, 12, .1, 'px', v => v, v => v, 'Height of the soft bump that follows the cursor while it is inside the shape.'],
 R:        ['Sensing distance', 20, 240, 2, 'px', v => v, v => v, 'How close the cursor must be before the edge starts reacting.'],
 sig:      ['Lobe width', 6, 120, 1, 'px', v => v, v => v, 'How wide the reaching lobe is along the edge. Small is a pointed tentacle; large is a broad swell.'],
 press:    ['Press squash', 0, 12, .1, '%', v => v * 100, v => v / 100, 'How much the body squashes while pressed.'],
 lobes:    ['Arms', 0, 24, 1, '', v => v, v => v, 'How many arms grow from the rim. 0 keeps the true silhouette; 4 is a splat, 6 a flower, 16 a scalloped edge.'],
 depth:    ['Arm length', 0, .4, .005, '×', v => v, v => v, 'How far the arms reach, as a fraction of the shorter side. 0.16 = 16 %.'],
 spread:   ['Arm thickness', .15, 1.2, .01, '×', v => v, v => v, 'Arm width against the gap to the next arm. Low is thin threads with wide gaps; 1 makes the arms touch.'],
 asym:     ['Irregularity', 0, 1, .02, '', v => v, v => v, 'How hand-drawn the arms look. 0 is a perfectly even star; 0.8 is uneven in place, length and width.']};
const FEEL = {
 curve:      ['Approach easing', .4, 2, .05, '', 'Shape of the approach. Below 1 the edge reacts as soon as you enter the field; above 1 it waits until you are close, then moves quickly.'],
 lobeK:      ['Reach speed', 20, 320, 5, '', 'Stiffness of the reach. Low is syrupy, high is twitchy.'],
 lobeZ:      ['Reach bounce', .3, 1.4, .02, 'ζ', 'Damping. 1 settles cleanly, below 1 overshoots, above 1 is sluggish.'],
 mergeZ:     ['Merge bounce', .2, 1.2, .02, 'ζ', 'Damping used for 0.6 s as the cursor crosses inside — low values overshoot like a drop merging.'],
 arcK:       ['Slide-along speed', 5, 140, 1, '', 'How fast the lobe follows the cursor around the edge.'],
 holdK:      ['Hold follow speed', 10, 220, 5, '', 'How fast the inside bump follows the cursor.'],
 pressK:     ['Release speed', 40, 320, 5, '', 'Rebound speed after a press is released.'],
 jiggle:     ['Let-go wobble', 0, 1.5, .05, '×reach', 'Size of the wobble when the edge loses the cursor, as a multiple of Reach.'],
 jiggleDecay:['Wobble fade', .4, 4, .05, '/s', 'How quickly that wobble dies out. Higher is shorter.'],
 restSpeed:  ['Breath speed', 0, 3, .05, '×', 'Speed of the resting breath. 0 freezes it.'],
 drift:      ['Arm drift', 0, 3, .05, '×', 'How much blob arms wander over time. 0 is a fixed shape.']};
const STYLE = {
 quality:  ['Smoothness', 1, 6, .25, 'px/pt', 'Distance between outline points. 1.5 is silky and heavier; 4 is lighter with tiny facets. 2.5 is the balance.'],
 grain:    ['Grain', 0, .4, .01, '', 'Paper texture over the body. Static, never animated.'],
 sheen:    ['Sheen', 0, 1.5, .05, '', 'Strength of the faint top highlight.'],
 echoOff:  ['Echo distance', 0, 20, .5, 'px', 'Distance of the thin outline echo from the body.'],
 echoScale:['Echo size', .9, 1.2, .005, '×', 'Size of the echo relative to the body.'],
 dots:     ['Satellite dots', 0, 6, 1, '', 'Small dots just outside the rim.']};
const EFFECTS = [['rest','Rest breath','The shape breathes while idle. Off means completely still.'],['reach','Reach','The nearest edge stretches toward an approaching cursor.'],['merge','Merge on entry','A dimple runs around the rim as the cursor crosses inside.'],['hold','Hold inside','A soft bump follows the cursor while it is inside.'],['jiggleOn','Let-go wobble','One damped wobble when the cursor leaves.'],['press','Press squash','The body squashes along the pointer axis while pressed.'],['echo','Outline echo','A thin offset outline drawn alongside the body.']];
const PRESET_ORDER = [['runtime','Runtime default — what a consuming app ships'],['still','Still — shapes only'],['calm','Calm — barely there'],['breathe','Breathe — balanced'],['snappy','Snappy — fast, precise'],['gooey','Gooey — slow, stretchy'],['drift','Drift — slow wander'],['lively','Lively — quick to react'],['playful','Playful — bouncy'],['crisp','Crisp — no texture'],['sketch','Sketch — echo line + dots']];
/* The conservative profile a consuming application ships by default. Authoring is deliberately unbounded;
   this preset is how you get back to the quiet baseline, and it is what `exportJSON` produces for runtime. */
/* Single source: read the engine's profile rather than duplicating it here. */
const RUNTIME_LOCAL={cfg:{},tier:{}};
const RUNTIME=new Proxy(RUNTIME_LOCAL,{get:(t,k)=>{const e=window.VMorph&&window.VMorph.RUNTIME;return e?e[k]:t[k]}});

const CSS = `
/* ---- Vriksha authoring workbench ----
   Panel-scoped layout on the shared tokens. Calm cream canvas, ink structure, one tinted stage for the live
   shapes, and colour used only to say group or state. No nested beige cards, no parallel component system. */
:root{--ap-w:376px}
/* Shares the bottom rail with the catalog's Components pill (opposite corner, same baseline) so the two
   mobile entry points read as a pair rather than a collision. */
.ap-tab{position:fixed;right:18px;bottom:14px;z-index:68;height:44px;padding:0 18px;border-radius:999px;background:var(--v-ink);color:var(--v-on-ink);font:500 13.5px var(--font-text);display:flex;align-items:center;gap:9px;box-shadow:var(--shadow-float);cursor:pointer}
.ap-tab::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--v-pink)}
.ap-tab[hidden]{display:none}
.ap-scrim{position:fixed;inset:0;background:rgba(17,17,17,.34);z-index:69}
.ap-scrim[hidden]{display:none}
body.-ap-docked{padding-right:var(--ap-w)}
.ap{container:ap/size;position:fixed;top:0;right:0;bottom:0;width:var(--ap-w);z-index:70;display:flex;flex-direction:column;
 background:linear-gradient(180deg,color-mix(in oklab,var(--v-pink) 7%,var(--v-canvas)) 0,var(--v-canvas) 190px);
 border-left:1px solid var(--v-edge);box-shadow:-1px 0 0 color-mix(in oklab,var(--v-pink) 22%,transparent);
 padding:18px 18px 16px;font:13px/1.45 var(--font-text);color:var(--v-text);overflow:hidden}
.ap>*{flex:0 0 auto;min-height:0}
.ap[hidden]{display:none}

/* header: one purpose sentence, technical detail lives in help */
.ap h2{margin:0 0 2px;font-family:var(--font-display);font-size:23px;font-weight:500;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
.ap h2 .dot{width:9px;height:9px;border-radius:50%;background:var(--v-pink);flex:none}
.ap h2 button{margin-left:auto}
.ap-purpose{margin:-6px 0 12px}
.ap-purpose summary{font-size:11.5px;color:var(--v-text-2);cursor:pointer;list-style:none}
.ap-purpose summary::-webkit-details-marker{display:none}
.ap-purpose summary::before{content:"? ";font-weight:700;color:var(--v-text)}
.ap-purpose[open] summary{color:var(--v-text)}
.ap-purpose div{margin-top:6px;padding:10px 12px;background:var(--v-beige);border-radius:10px;font-size:11.5px;line-height:1.5;color:var(--v-text-2)}
.ap .sub{margin:0 0 12px;font-size:12px;line-height:1.4;color:var(--v-text-2);max-width:34ch}

/* preset: the strongest control in the panel, with a truthful custom state */
.ap-ctl.-preset{background:none;border:0;padding:0;margin-bottom:12px;display:grid;gap:6px}
.ap select[data-preset],.ap select[data-flow-select]{width:100%;height:42px;border-radius:12px;border:1px solid var(--v-edge);background:var(--v-beige);
 padding:0 14px;font:500 13.5px var(--font-text);color:var(--v-text);cursor:pointer;appearance:none;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23111' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:15px}
.ap select[data-preset],.ap select[data-flow-select]:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.ap .preset-state{font-size:11.5px;color:var(--v-text-2);display:flex;align-items:center;gap:6px}
.ap .preset-state b{color:var(--v-text);font-weight:600}

/* live stage: tinted, generous clearance for the biggest authored effect, tier named, replay to hand */
.ap-prev{position:relative;background:
 radial-gradient(120% 90% at 50% -10%,color-mix(in oklab,var(--v-yellow) 15%,transparent) 0,transparent 65%),
 var(--surface-quiet);
 border:1px solid color-mix(in oklab,var(--v-edge) 70%,transparent);border-radius:24px;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.5);
 padding:26px 18px 14px;margin-bottom:14px;display:grid;gap:14px;justify-items:center;overflow:hidden}
.ap-prev .row{display:flex;gap:22px;align-items:center;justify-content:center;min-height:104px;padding:8px 2px}
.ap-prev .row>*{flex:none}
.ap-prev .hint{font-size:11px;color:var(--v-text-2);text-align:center;max-width:30ch}
.ap-prev .stage-bar{display:flex;align-items:center;gap:8px;width:100%}
.ap-prev .stage-bar .tier{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--v-text-2)}
.ap-prev .stage-bar .sp{flex:1}
.ap-prev .stage-bar button{height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--v-edge);background:var(--v-canvas);font:500 11.5px var(--font-text);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.ap-prev .stage-bar button:hover{background:var(--v-beige)}

/* six sections: an even grid, unmistakable active state */
/* the tray is a toggle group: the panel owns no tabpanels, it swaps .ap-body content */
.ap-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-bottom:14px;
 padding:4px;border-radius:14px;background:color-mix(in oklab,var(--v-beige) 70%,transparent)}
.ap-tabs button{height:32px;padding:0 6px;border-radius:10px;border:0;background:transparent;
 color:var(--v-text-2);font:500 12px var(--font-text);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
 transition:background var(--t-micro),color var(--t-micro)}
.ap-tabs button:hover{background:color-mix(in oklab,var(--v-canvas) 80%,transparent);color:var(--v-text)}
.ap-tabs button[aria-pressed="true"],.ap-tabs button[aria-pressed="true"],.ap-tabs button.-on{
 background:var(--v-ink);border-color:var(--v-ink);color:var(--v-on-ink);box-shadow:inset 0 -3px 0 var(--v-pink);font-weight:600}
.ap-tabs button:focus-visible{outline:2px solid var(--ring);outline-offset:2px}

/* controls: hierarchy from type and rules, not from nested cards */
.ap-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:6px;display:grid;gap:2px;align-content:start;
 scrollbar-width:thin;scrollbar-color:var(--v-border) transparent}
.ap-body::-webkit-scrollbar{width:8px}.ap-body::-webkit-scrollbar-thumb{background:var(--v-border);border-radius:4px}
.ap-sec{margin:18px 0 4px;font-family:var(--font-display);font-size:13px;font-weight:500;letter-spacing:-.005em;
 text-transform:none;color:var(--v-text);display:flex;align-items:center;gap:9px}
.ap-sec::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--v-olive);flex:none}
.ap-sec::after{content:"";flex:1;height:1px;background:color-mix(in oklab,var(--v-border) 55%,transparent)}
.ap-body>select{width:100%;height:38px;border-radius:10px;border:1px solid var(--v-edge);background:var(--v-beige);padding:0 12px;font:500 13px var(--font-text);cursor:pointer;margin-bottom:6px}
.ap-ctl{padding:11px 0;border-bottom:1px solid color-mix(in oklab,var(--v-border) 45%,transparent);display:grid;gap:8px}
.ap-ctl:last-of-type{border-bottom:0}
.ap-ctl .hd{display:flex;align-items:center;gap:7px}
.ap-ctl .hd b{font-weight:500;font-size:12.5px;flex:1;min-width:0}
.ap-ctl .hd .u{font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--v-text-2);white-space:nowrap}
.ap-body label .ap-help,.cats .ap-help{margin-left:auto}
.ap-help{width:19px;height:19px;flex:none;border-radius:50%;border:1px solid var(--v-edge);background:var(--v-canvas);
 color:var(--v-text);font:600 11px var(--font-text);cursor:help;display:grid;place-items:center}
.ap-help:hover,.ap-help:focus-visible{background:var(--v-ink);color:var(--v-on-ink);border-color:var(--v-ink)}
.ap-ctl .in{display:grid;grid-template-columns:minmax(0,1fr) 68px;gap:10px;align-items:center}
.ap-ctl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:22px;background:none;cursor:pointer}
.ap-ctl input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:var(--v-border)}
.ap-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-7px;border-radius:50%;background:var(--v-pink);border:1.5px solid var(--v-ink);cursor:pointer}
.ap-ctl input[type=range]::-moz-range-track{height:4px;border-radius:2px;background:var(--v-border)}
.ap-ctl input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--v-pink);border:1.5px solid var(--v-ink)}
.ap-ctl input[type=range]:focus-visible{outline:2px solid var(--ring);outline-offset:4px}
.ap-ctl input[type=number]{height:32px;border-radius:8px;border:1px solid var(--v-edge);background:var(--v-canvas);
 padding:0 8px;font:500 12px/1 var(--font-text);font-variant-numeric:tabular-nums;text-align:right;cursor:text}
.ap-ctl .sub,.ap-body>.sub{font-size:11.5px;color:var(--v-text-2);line-height:1.45;padding:8px 0 2px;max-width:36ch}

/* categories and effects: compact, scannable rows */
.ap-sw{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;margin:2px 0 8px}
.ap-sw label,.ap-body label.ap-row,.cats label{display:flex;align-items:center;gap:10px;min-height:36px;padding:0 10px;
 border:1px solid transparent;border-radius:10px;background:color-mix(in oklab,var(--v-beige) 55%,transparent);
 font-size:12.5px;cursor:pointer;transition:background var(--t-micro),border-color var(--t-micro)}
.ap-sw label:hover{border-color:color-mix(in oklab,var(--v-edge) 60%,transparent);background:var(--v-beige)}
.ap-sw label:has(input:checked),.cats label:has(input:checked){background:color-mix(in oklab,var(--v-pink) 26%,var(--v-canvas));border-color:color-mix(in oklab,var(--v-pink) 55%,transparent)}
.ap-sw label:has(input:checked){background:var(--sel-bg);border-color:var(--sel-edge);color:var(--sel-ink)}
.ap-sw label:has(input:focus-visible){outline:2px solid var(--ring);outline-offset:2px}
.ap-sw label:has(input:disabled){opacity:.55;cursor:not-allowed}
.ap-body label:last-child,.cats label:last-child{border-bottom:0}
.ap-sw input,.ap-body label input,.cats input{appearance:none;-webkit-appearance:none;width:17px;height:17px;flex:none;margin:0;
 border:1.5px solid var(--v-edge);border-radius:5px;background:var(--v-canvas);display:grid;place-items:center;cursor:pointer}
.ap-sw input:checked,.ap-body label input:checked{background:var(--v-pink);border-color:var(--v-ink)}
.ap-sw input:checked::after,.ap-body label input:checked::after{content:"";width:9px;height:5px;border:2px solid var(--v-ink);border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}
.ap-sw input:disabled{cursor:not-allowed}
.ap-sw .lbl,.ap-body label .lbl,.cats .lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.ap-body label small,.cats small{color:var(--v-text-2);font-size:11px}

/* footer: primary, secondary, then a deliberate utility pair that cannot wrap apart */
.ap-foot{border-top:1px solid var(--v-border);padding-top:12px;margin-top:10px;display:grid;gap:8px}
.ap-foot .btns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
.ap-foot .btns button{height:38px;padding:0 12px;border-radius:12px;font:500 12.5px var(--font-text);cursor:pointer;
 border:1px solid var(--v-edge);background:var(--v-canvas);color:var(--v-text);white-space:nowrap;
 transition:background var(--t-micro),color var(--t-micro)}
.ap-foot .btns button:hover{background:var(--v-beige)}
.ap-foot .btns button:first-child{background:var(--v-ink);border-color:var(--v-ink);color:var(--v-on-ink)}
.ap-foot .btns button:first-child:hover{background:var(--v-ink-soft)}
.ap-foot .btns button:first-child{background:var(--v-ink);border-color:var(--v-ink);color:var(--v-on-ink)}
.ap-foot .btns button:nth-child(n+3){grid-column:auto;background:var(--v-canvas)}
.ap-foot .btns button:hover{background:color-mix(in oklab,var(--v-beige) 88%,var(--v-ink))}
.ap-foot .btns button:first-child:hover{background:var(--v-ink-soft)}
.ap-foot .msg{font-size:11.5px;line-height:1.4;color:var(--v-text-2);min-height:1.4em}
.ap-foot .msg.-bad{color:var(--status-danger-ink)}
.ap-foot .msg.-ok{color:var(--status-ok-ink)}
.ap textarea[data-json]{width:100%;min-height:96px;border-radius:10px;border:1px solid var(--v-edge);background:var(--v-beige);
 padding:10px;font:11.5px/1.5 ui-monospace,Menlo,monospace;cursor:text;resize:vertical}

@media (max-width:1180px){body.-ap-docked{padding-right:0}.ap{width:min(376px,94vw);box-shadow:var(--shadow-float)}}
@media (max-height:900px){.ap-prev .hint{display:none}}
@media (max-height:860px){.ap-prev{padding:14px 12px 12px}.ap-prev .row{min-height:76px}.ap-prev .row>span{width:60px!important;height:60px!important}}
@media (max-height:780px){.ap .sub{display:none}}
@media (max-height:640px){.ap-prev .row{min-height:56px}.ap-prev .row>span{width:44px!important;height:44px!important}}
@container ap (max-height:560px){.ap-prev{display:none}}
@media (max-height:560px){.ap-prev{display:none}.ap-foot .msg{display:none}.ap-foot .btns button{height:32px;font-size:11.5px}}
@media (max-height:480px){.ap{gap:6px;padding:12px 12px 10px}.ap h2{font-size:17px}.ap-tabs button{height:30px}}
@media (prefers-reduced-motion:reduce){.ap *{transition:none!important}}
`;

let S = {open:null, tier:'pill', tab:'flow'};
try { const raw = localStorage.getItem(LS); if (raw) { const o = JSON.parse(raw); if (o && typeof o === 'object') S = {...S, open:o.open ?? null, tier:TIER_LABELS[o.tier] ? o.tier : 'pill', tab:o.tab || 'shape'}; } } catch (e) {}
const persist = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} };

let panel, tab, scrim, msgEl, bodyEl, tabsEl, prevEl;
const docked = () => innerWidth > 1180;
/* Below 1180 the panel floats over the page with a scrim, so it must BE a dialog: named, modal, focus-contained,
   Escape-dismissed, restoring focus to whatever opened it, with the rest of the document inert. Docked (desktop)
   it is an ordinary sidebar and keyboard navigation stays free. Semantics re-sync on resize while open. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let opener = null, trapped = false;
function inertBackground(on) {
 [...document.body.children].forEach(el => {
  if (el === panel || el === scrim || el === tab) return;
  if (on) { el.setAttribute('data-ap-inert', ''); el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
  else if (el.hasAttribute('data-ap-inert')) { el.removeAttribute('data-ap-inert'); el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
 });
}
function trap(e) {
 if (e.key !== 'Tab' || docked() || panel.hidden) return;
 const f = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
 if (!f.length) return;
 const first = f[0], last = f[f.length - 1];
 if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
 else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
let userOpened = false;
function syncSemantics() {
 if (panel.hidden) { panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); inertBackground(false);
  if (trapped) { document.removeEventListener('keydown', trap, true); trapped = false; } return; }
 if (docked()) {
  panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); inertBackground(false);
  if (trapped) { document.removeEventListener('keydown', trap, true); trapped = false; }
 } else if (userOpened) {
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
  inertBackground(true);
  if (!trapped) { document.addEventListener('keydown', trap, true); trapped = true; }
 } else { /* overlay width but not opened by the person: stay closed rather than trap the page */
  panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); inertBackground(false);
  if (trapped) { document.removeEventListener('keydown', trap, true); trapped = false; }
 }
}

/* ---------- validation ---------- */
const NUM = new Set([...Object.keys(F), ...Object.keys(FEEL), ...Object.keys(STYLE)]);
const BOOL = new Set(EFFECTS.map(e => e[0]));
function validate(obj) {
 const errs = [];
 if (!obj || typeof obj !== 'object') return {errs:['Not a JSON object.']};
 const cfg = obj.cfg || {}, tiers = obj.TIER || obj.tier || {};
 if (typeof cfg !== 'object' || typeof tiers !== 'object') return {errs:['Expected { "cfg": {…}, "TIER": {…} }.']};
 for (const k in cfg) {
  if (BOOL.has(k)) { if (typeof cfg[k] !== 'boolean') errs.push(`cfg.${k} must be true or false.`); continue; }
  if (!(k in (M().FACTORY.cfg))) { errs.push(`cfg.${k} is not a known setting.`); continue; }
  if (typeof cfg[k] !== 'number' || !isFinite(cfg[k])) errs.push(`cfg.${k} must be a finite number.`);
 }
 for (const t in tiers) {
  if (!M().TIER[t]) { errs.push(`Tier "${t}" does not exist. Known tiers: ${Object.keys(M().TIER).join(', ')}.`); continue; }
  for (const k in tiers[t]) {
   if (!(k in M().FACTORY.TIER[t])) { errs.push(`${t}.${k} is not a known tier value.`); continue; }
   if (typeof tiers[t][k] !== 'number' || !isFinite(tiers[t][k])) errs.push(`${t}.${k} must be a finite number.`);
  }
 }
 return {errs, cfg, tiers};
}
function applyConfig(obj) {
 const {errs, cfg, tiers} = validate(obj);
 if (errs.length) return errs;                       // current values are untouched on failure
 Object.assign(M().cfg, cfg);
 for (const t in tiers) Object.assign(M().TIER[t], tiers[t]);
 M().retune(); M().save(); render();
 return null;
}

/* ---------- panel ---------- */
/* Control definitions come in two historic tuple shapes: the tier fields carry converters at 5–6 and help at
   7, while FEEL/STYLE carry help at 5. Reading them positionally called a help STRING as a converter, which
   threw a TypeError the moment the Feel or Style tab opened. Every definition is now normalised to one
   explicit schema before use. */
function domainFor(key,tier){const D=window.VMorph&&window.VMorph.DOMAIN;if(!D||!D[key])return null;const dm=D[key];return {min:dm.min,max:(dm.max&&dm.max[tier]!=null)?dm.max[tier]:null}}
function schema(def) {
 const [label, min, max, step, unit] = def;
 const hasConv = typeof def[5] === 'function';
 return {label, min, max, step, unit: unit || '',
  toD: hasConv ? def[5] : (v => v),
  fromD: hasConv && typeof def[6] === 'function' ? def[6] : (v => v),
  help: hasConv ? (def[7] || '') : (typeof def[5] === 'string' ? def[5] : '')};
}
function slider(store, key, def, isTier) {
 const S0 = schema(def);
 let {label, min, max, step, unit, toD, fromD} = S0;
 if (isTier) { const dm = domainFor(key, S.tier); if (dm) { if (dm.min != null) min = toD(dm.min); if (dm.max != null) max = dm.max; } }
 const hint = S0.help;
 const el = document.createElement('div'); el.className = 'ap-ctl';
 el.innerHTML = `<div class="hd"><b>${label}</b><span class="u"></span><button class="ap-help" type="button" data-h="${(hint || '').replace(/"/g, '&quot;')}" aria-label="What ${label} does">?</button></div>
 <div class="in"><input type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}"><input type="number" min="${min}" max="${max}" step="${step}" aria-label="${label} value"></div><div class="err" role="alert"></div>`;
 const [rg, nu] = el.querySelectorAll('input'), u = el.querySelector('.u'), err = el.querySelector('.err');
 /* Snap to the control's step grid and write it BACK, so the model itself is always on-grid: a range input
    silently rounds its display to the nearest legal step, so an off-grid value made the two inputs disagree
    on first render (0.96 vs 0.95) before anything was touched. */
 const snap = v => { const st = +step || 1, mn = +min || 0; return +(Math.round((+v - mn) / st) * st + mn).toFixed(4); };
 const show = () => {
  const raw = +(+toD(store[key])).toFixed(4), d = snap(raw);
  if (d !== raw && isFinite(d)) store[key] = fromD(d);
  rg.value = d; nu.value = d; u.textContent = unit;
  nu.setAttribute('aria-invalid', 'false'); err.textContent = '';
 };
 const commit = raw => {
  const n = parseFloat(raw);
  if (!isFinite(n)) { nu.setAttribute('aria-invalid', 'true'); err.textContent = 'Enter a number.'; return; }
  if (n < min || n > max) { nu.setAttribute('aria-invalid', 'true'); err.textContent = `Must be between ${min} and ${max}${unit ? ' ' + unit : ''}.`; }
  else { nu.setAttribute('aria-invalid', 'false'); err.textContent = ''; }
  store[key] = fromD(clamp(n, min, max)); show(); push();
 };
 rg.oninput = () => commit(rg.value);
 nu.onchange = () => commit(nu.value);
 show(); return el;
}
let pushT = 0;
function push() { clearTimeout(pushT); pushT = setTimeout(() => { M().retune(); M().save(); paintPreview(); }, 50); }

function render() {
 if (!panel) return;
 tabsEl.innerHTML = [['flow','Flow'],['shape','Shape'],['rest','Rest & reach'],['feel','Feel'],['style','Style'],['fx','Effects'],['scope','Components']]
  .map(([id, l]) => `<button type="button" aria-pressed="${S.tab === id}" data-t="${id}">${l}</button>`).join('');
 tabsEl.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { S.tab = b.dataset.t; persist(); render(); });
 const T = M().TIER[S.tier], C = M().cfg;
 bodyEl.innerHTML = '';
 const add = n => bodyEl.appendChild(n);
 const sec = t => { const d = document.createElement('div'); d.className = 'ap-sec'; d.textContent = t; add(d); };
 const tierPicker = () => {
  const w = document.createElement('div'); w.className = 'ap-ctl';
  w.innerHTML = `<div class="hd"><b>Tier</b><button class="ap-help" type="button" data-h="Each tier is a separate configuration. Editing one never changes another." aria-label="What a tier is">?</button></div>
  <select aria-label="Tier being configured">${Object.entries(TIER_LABELS).map(([k, l]) => `<option value="${k}"${k === S.tier ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  w.querySelector('select').onchange = e => { S.tier = e.target.value; persist(); render(); paintPreview(); };
  add(w);
 };
 if (S.tab === 'shape') {
  tierPicker(); sec('Silhouette');
  ['lobes','depth','spread','asym'].forEach(k => add(slider(T, k, F[k], true)));
  const n = document.createElement('p'); n.className = 'sub';
  n.textContent = 'Every tier ships with 0 arms so components keep their true shape. True silhouettes (heart, star, flower, splat, pebble and 18 more) come from data-shape and are unaffected by these arms.';
  add(n); add(resetTier());
 }
 if (S.tab === 'rest') { tierPicker(); sec('Movement'); ['amp','reach','inside','R','sig','press'].forEach(k => add(slider(T, k, F[k], true))); add(resetTier()); }
 if (S.tab === 'feel') { sec('Springs and timing'); Object.keys(FEEL).forEach(k => add(slider(C, k, FEEL[k]))); }
 if (S.tab === 'style') { sec('Texture and outline'); Object.keys(STYLE).forEach(k => add(slider(C, k, STYLE[k]))); }
 if (S.tab === 'fx') {
  sec('Independent switches');
  const g = document.createElement('div'); g.className = 'ap-sw';
  g.innerHTML = EFFECTS.map(([k, l, h]) => `<label><input type="checkbox" ${C[k] ? 'checked' : ''} data-fx="${k}"><span>${l}</span><button class="ap-help" type="button" data-h="${h}" aria-label="What ${l} does">?</button></label>`).join('');
  g.querySelectorAll('[data-fx]').forEach(i => i.onchange = () => { C[i.dataset.fx] = i.checked; push(); });
  add(g);
  const rm = document.createElement('label'); rm.className = 'ap-ctl'; rm.style.cursor = 'pointer';
  rm.innerHTML = `<div class="hd"><b>Safe static mode</b><button class="ap-help" type="button" data-h="Turns every autonomous and pointer-driven effect off and keeps the true silhouettes. This is also what visitors with prefers-reduced-motion get automatically." aria-label="What safe static mode does">?</button></div><div class="in" style="grid-template-columns:auto 1fr"><input type="checkbox" ${!Object.values({r:C.rest, e:C.reach, m:C.merge, h:C.hold, j:C.jiggleOn, p:C.press}).some(Boolean) ? 'checked' : ''} aria-label="Safe static mode"><span class="sub">All motion off, shapes intact</span></div>`;
  rm.querySelector('input').onchange = e => { const off = e.target.checked; ['rest','reach','merge','hold','jiggleOn','press','echo'].forEach(k => C[k] = off ? false : M().FACTORY.cfg[k]); push(); render(); };
  add(rm);
  const note = document.createElement('p'); note.className = 'sub';
  note.textContent = document.documentElement.dataset.reducedMotion === 'on' || matchMedia('(prefers-reduced-motion: reduce)').matches
   ? 'Your system asks for reduced motion, so the engine is already static regardless of these switches.'
   : 'Visitors who ask their system for reduced motion always get the static shapes, whatever is set here.';
  add(note);
 }
 if (S.tab === 'flow') flowTab(add, sec);
 if (S.tab === 'scope') {
  sec('Which component groups react');
  const cats = M().CATS, saved = catState();
  const g = document.createElement('div'); g.className = 'ap-sw';
  g.innerHTML = Object.keys(cats).map(k => `<label><input type="checkbox" ${saved[k] ? 'checked' : ''} data-cat="${k}"><span>${k[0].toUpperCase() + k.slice(1)}</span></label>`).join('');
  g.querySelectorAll('[data-cat]').forEach(i => i.onchange = () => { const c = catState(); c[i.dataset.cat] = i.checked; try { localStorage.setItem('v-authoring-cats', JSON.stringify(c)); } catch (e) {} applyScope(); });
  add(g);
  const n = document.createElement('p'); n.className = 'sub';
  n.textContent = 'Only the previews you can see are wired up, so a hundred entries never animate at once. Scroll to a component and it becomes live.';
  add(n);
 }
 paintPreview();
}
/* ---------- Selection: the travelling active state (js/flow.js + css/flow.css) ----------
   These are VFlow's real settings; consumers read the same object. Nothing here touches the morph engine. */
function flowTab(add, sec) {
 const VF = window.VFlow;
 if (!VF) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'js/flow.js is not loaded on this page.'; add(p); return; }
 const c = VF.get();
 sec('How the active state travels');
 const pick = document.createElement('div'); pick.className = 'ap-ctl';
 pick.innerHTML = `<div class="hd"><b>Character</b><button class="ap-help" type="button" data-h="One selection body per group moves to the newly chosen item instead of a new fill appearing. This chooses HOW it moves, everywhere at once. A group can pin its own with data-flow=&quot;pebble&quot; or opt out with data-flow=&quot;off&quot;." aria-label="What the character is">?</button></div>
  <select data-flow-select aria-label="Selection character">${Object.entries(VF.VARIANTS).map(([k, v]) => `<option value="${k}"${k === c.variant ? ' selected' : ''}>${v.label}${k === VF.DEFAULTS.variant ? ' — default' : ''}</option>`).join('')}<option value="off"${c.variant === 'off' ? ' selected' : ''}>Off — no travel</option></select><p class="sub" data-flow-note></p>`;
 const note = pick.querySelector('[data-flow-note]');
 const showNote = v => { note.textContent = VF.VARIANTS[v] ? VF.VARIANTS[v].note : 'The active state changes in place: nothing moves between items.'; };
 showNote(c.variant);
 pick.querySelector('select').onchange = e => { VF.set({ variant: e.target.value }); showNote(e.target.value); };
 add(pick);
 const sw = document.createElement('div'); sw.className = 'ap-sw';
 sw.innerHTML = `<label><input type="checkbox" ${c.hover ? 'checked' : ''} data-flow-hover><span>Hover ghost</span><button class="ap-help" type="button" data-h="A quieter body follows the pointer across the group’s items. Off leaves only the travelling selection. Pointer-less devices never see it." aria-label="What the hover ghost is">?</button></label>`;
 sw.querySelector('[data-flow-hover]').onchange = e => VF.set({ hover: e.target.checked });
 add(sw);
 sec('Timing and strength');
 const rng = (key, label, min, max, step, unit, help, fmt) => {
  const el = document.createElement('div'); el.className = 'ap-ctl';
  el.innerHTML = `<div class="hd"><b>${label}</b><span class="u">${unit}</span><button class="ap-help" type="button" data-h="${help}" aria-label="What ${label} does">?</button></div><div class="in"><input type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}"><input type="number" min="${min}" max="${max}" step="${step}" aria-label="${label} value"></div>`;
  const [rg, nu] = el.querySelectorAll('input');
  const show = () => { const v = +VF.get()[key]; rg.value = v; nu.value = fmt ? fmt(v) : v; };
  const commit = raw => { const n = parseFloat(raw); if (!isFinite(n)) return; VF.set({ [key]: clamp(n, min, max) }); show(); };
  rg.oninput = () => commit(rg.value); nu.onchange = () => commit(nu.value); show(); return el;
 };
 add(rng('speed', 'Speed', .5, 2.5, .05, '×', 'Multiplies every duration. 1 is the authored timing; 2 is twice as fast; 0.5 is slow motion for reviewing a character.', v => +v.toFixed(2)));
 add(rng('intensity', 'Intensity', 0, 2, .05, '×', 'How far the landing squash, wobble, ripple and halo go. 0 keeps the travel but removes the flourish; 2 doubles it.', v => +v.toFixed(2)));
 add(rng('hoverStrength', 'Hover strength', 0, 2, .05, '×', 'Opacity of the hover ghost. 1 is the authored tint.', v => +v.toFixed(2)));
 const foot = document.createElement('div'); foot.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
 const rb = document.createElement('button'); rb.className = 'v-btn -sm -secondary'; rb.type = 'button'; rb.textContent = 'Reset selection motion';
 rb.onclick = () => { VF.reset(); render(); say('Selection motion reset: Glide, hover on, speed 1, intensity 1.', 'ok'); };
 const ex = document.createElement('a'); ex.className = 'v-link'; ex.href = '../explorations/flow-motion.html'; ex.textContent = 'Compare the characters side by side'; ex.style.fontSize = '13px';
 foot.append(rb, ex); add(foot);
 const n = document.createElement('p'); n.className = 'sub';
 n.textContent = 'One setting for the whole library: the travelling selection, the landing squash on every press, overlays growing from what opened them, accordions unfolding, fills and thumbs travelling, alerts and toasts arriving. Saved in this browser and read by every page that loads js/flow.js; in a consuming app, call VFlow.set({…}) with the same keys.';
 add(n);
}
function resetTier() {
 const b = document.createElement('button'); b.className = 'v-btn -sm -secondary'; b.type = 'button';
 b.textContent = 'Reset this tier';
 b.onclick = () => { Object.assign(M().TIER[S.tier], M().FACTORY.TIER[S.tier]); M().retune(); M().save(); render(); say(`${S.tier} tier reset to library defaults.`, 'ok'); };
 return b;
}
function catState() {
 let c = null; try { c = JSON.parse(localStorage.getItem('v-authoring-cats') || 'null'); } catch (e) {}
 if (!c) c = {buttons:true, icons:true, pills:true, cards:true, nav:true, inputs:false, controls:true, surfaces:false, skeleton:true};
 if (c.skeleton === undefined) c.skeleton = true;
 return c;
}
function say(t, tone) { if (!msgEl) return; msgEl.textContent = t; msgEl.className = 'msg' + (tone ? ' -' + tone : ''); }

/* ---------- preview: always live, always the current tier ---------- */
let replayTimer = 0, replayGen = 0;
function paintState(){const el=panel&&panel.querySelector('[data-preset-state]');if(!el)return;
 const sel=panel.querySelector('[data-preset]');const v=sel&&sel.value;
 el.innerHTML='';const b=document.createElement('b');b.textContent=v?(sel.options[sel.selectedIndex].text.split(' — ')[0]):'Custom';
 el.append(b,document.createTextNode(v?' preset — moving any control makes it custom.':' — your own values, not a preset.'))}
function paintPreview() {
 if (!prevEl) return;
 replayGen++; clearTimeout(replayTimer); replayTimer = 0;   /* cancel a journey in flight */
 const eng = M(); if (eng && eng.remove) [...prevEl.querySelectorAll('[data-morph]')].forEach(el => eng.remove(el));
 const shape = S.tier === 'blob' ? 'heart' : null;
 prevEl.innerHTML = `<div class="stage-bar"><span class="tier">${String(TIER_LABELS[S.tier]||S.tier).split(' — ')[0]}</span><span class="sp"></span><button type="button" data-stage-replay>Replay effect</button></div><div class="row">
  ${S.tier === 'blob'
   ? `<span data-morph="fill" data-tier="blob" data-shape="heart" style="width:96px;height:96px;--mfill:var(--v-pink)"></span>
      <span data-morph="fill" data-tier="blob" data-shape="star-8" style="width:84px;height:84px;--mfill:var(--v-blue)"></span>
      <span data-morph="fill" data-tier="blob" data-shape="flower-6" style="width:84px;height:84px;--mfill:var(--v-yellow)"></span>`
   : `<button class="v-btn" type="button" data-morph="fill" data-tier="${S.tier}" style="background:transparent;--mfill:var(--v-ink)">Primary</button>
      <button class="v-btn -accent" type="button" data-morph="fill" data-tier="${S.tier}" style="background:transparent;--mfill:var(--v-pink);color:#111">Accent</button>
      <span class="v-badge -olive" data-morph="fill" data-tier="${S.tier}" style="background:transparent;--mfill:var(--v-olive);color:#111">Olive</span>`}
 </div><p class="hint">Move the pointer in and out, then press. This preview always uses the tier shown above.</p>`;
 if (window.V && window.V.init) window.V.init(prevEl);
 M().init(prevEl);
}

/* ---------- scope: only visible previews are wired ---------- */
let io = null;
function applyScope(root) {
 const cats = catState(), engine = M(); if (!engine) return;
 const live = {}; for (const k in engine.CATS) live[k] = !!cats[k];
 const scope = (root && root.querySelectorAll) ? root : document;
 const targets = [...scope.querySelectorAll('.demo, .ap-prev, .spec')];
 /* The callback reads the CURRENT category state each time; capturing `live` in the closure meant every
    later checkbox change was ignored by an observer still holding the first snapshot. */
 if (!io) io = new IntersectionObserver(es => es.forEach(e => {
  const now = {}; const cs = catState(); for (const k in engine.CATS) now[k] = !!cs[k];
  if (e.isIntersecting) engine.autoTag(now, e.target);
  else if (engine.remove) [...e.target.querySelectorAll('[data-auto-morph]')].forEach(el => engine.remove(el));
 }), {rootMargin: '120px'});
 io.disconnect(); targets.forEach(t => io.observe(t));
 if (prevEl) engine.autoTag(live, prevEl);
}

/* ---------- mount ---------- */
function mount() {
 if (panel) return;
 const st = document.createElement('style'); st.id = 'v-ap-css'; st.textContent = CSS; document.head.appendChild(st);
 panel = document.createElement('aside'); panel.className = 'ap'; panel.id = 'v-authoring';
 panel.setAttribute('aria-label', 'Animation authoring');
 panel.innerHTML = `<h2><span class="dot"></span>Motion authoring<button class="v-ibtn -sm" type="button" data-close aria-label="Hide the authoring panel" style="box-shadow:none">✕</button></h2>
 <p class="sub">Author the motion for this library, then export it.</p><details class="ap-purpose"><summary>What these values are</summary><div>These are the real engine settings: what you see here is what <code>exportJSON()</code> writes and what a consuming app loads. Presets are starting points — moving any control makes the state custom.</div></details>
 <div class="ap-ctl"><div class="hd"><b>Personality preset</b><button class="ap-help" type="button" data-h="A preset writes a whole set of values at once. Runtime default is the conservative profile a consuming application ships." aria-label="What presets do">?</button></div>
 <select data-preset aria-label="Personality preset"><option value="">— custom —</option>${PRESET_ORDER.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
 <div class="ap-prev" data-prev></div>
 <div class="ap-tabs" role="group" aria-label="Authoring sections"></div>
 <div class="ap-body"></div>
 <div class="ap-foot"><div class="btns">
  <button class="v-btn -sm" type="button" data-copy>Copy JSON</button>
  <button class="v-btn -sm -secondary" type="button" data-paste>Paste JSON</button>
  <button class="v-btn -sm -secondary" type="button" data-replay>Replay</button>
  <button class="v-btn -sm -secondary" type="button" data-reset>Reset all</button></div>
  <textarea data-json hidden placeholder='{ "cfg": { … }, "TIER": { … } }' aria-label="Configuration JSON"></textarea>
  <button class="v-btn -sm" type="button" data-apply hidden>Apply this JSON</button>
  <p class="msg" role="status" aria-live="polite"></p></div>`;
 document.body.appendChild(panel);
 scrim = document.createElement('div'); scrim.className = 'ap-scrim'; scrim.hidden = true; document.body.appendChild(scrim);
 tab = document.createElement('button'); tab.type = 'button'; tab.className = 'ap-tab'; tab.hidden = true;
 tab.innerHTML = '<span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--v-pink);display:inline-block"></span>Motion authoring';
 document.body.appendChild(tab);
 tabsEl = panel.querySelector('.ap-tabs'); bodyEl = panel.querySelector('.ap-body');
 msgEl = panel.querySelector('.msg'); prevEl = panel.querySelector('[data-prev]');
 const jsonEl = panel.querySelector('[data-json]'), applyEl = panel.querySelector('[data-apply]');
 panel.querySelector('[data-close]').onclick = () => close(true);
 tab.onclick = () => open();
 scrim.onclick = () => close(true);
 panel.addEventListener('keydown', e => { if (e.key === 'Escape' && !docked()) { e.stopPropagation(); close(true); } });
 panel.querySelector('[data-preset]').onchange = e => {
  if (!e.target.value) return;
  if (e.target.value === 'runtime') { M().reset(); Object.assign(M().cfg, RUNTIME.cfg); for (const t in RUNTIME.tier) Object.assign(M().TIER[t], RUNTIME.tier[t]); M().retune(); M().save(); }
  else M().preset(e.target.value);
  render(); paintState(); say('Preset applied. Any control you move now makes it custom.', 'ok');
 };
 panel.querySelector('[data-copy]').onclick = async () => {
  const s = M().exportJSON();
  try { await navigator.clipboard.writeText(s); say('Copied. Paste it into another project or into the box below.', 'ok'); }
  catch (e) { jsonEl.hidden = false; jsonEl.value = s; say('Clipboard unavailable — the JSON is in the box below.'); }
 };
 panel.querySelector('[data-paste]').onclick = () => { jsonEl.hidden = applyEl.hidden = !jsonEl.hidden; if (!jsonEl.hidden) jsonEl.focus(); };
 applyEl.onclick = () => {
  let parsed;
  try { parsed = JSON.parse(jsonEl.value); }
  catch (e) { say('That is not valid JSON: ' + e.message + ' — nothing was changed.', 'bad'); return; }
  const errs = applyConfig(parsed);
  if (errs) { say('Not applied (' + errs.length + ' problem' + (errs.length > 1 ? 's' : '') + '): ' + errs.slice(0, 3).join(' ') + ' Your current values are unchanged.', 'bad'); return; }
  jsonEl.hidden = applyEl.hidden = true; say('Applied. The preview and every wired component use these values now.', 'ok');
 };
 panel.querySelector('[data-reset]').onclick = () => { M().reset(); panel.querySelector('[data-preset]').value = ''; render(); say('Every tier and setting is back to the library defaults.', 'ok'); };
 panel.querySelector('[data-replay]').onclick = () => replay();
 render();
 const decide = () => {
  if (S.open === false) { close(false); return; }
  if (S.open === true || docked()) open(false); else close(false);
 };
 decide();
 addEventListener('resize', () => { if (S.open === false) return; if (docked() && panel.hidden) open(false); else if (!docked() && !panel.hidden) { document.body.classList.remove('-ap-docked'); scrim.hidden = false; } syncSemantics(); });
}
/* A persisted open state is only honoured where the panel docks. At overlay widths the page must never LOAD
   inert: restoring into the modal branch made the whole catalog aria-hidden and unfocusable before the user
   had touched anything. Modal semantics therefore apply only to an explicit user open. */
function open(explicit = true) {
 if (!explicit && !docked()) { close(false); return; }
 panel.hidden = false; tab.hidden = true;
 if (docked()) { document.body.classList.add('-ap-docked'); scrim.hidden = true; }
 else { document.body.classList.remove('-ap-docked'); scrim.hidden = false; }
 if (explicit) { S.open = true; persist(); userOpened = true; }
 if (!opener) opener = (document.activeElement && document.activeElement !== document.body && document.activeElement !== panel) ? document.activeElement : tab;
 syncSemantics();
 if (!docked()) { const f = panel.querySelector(FOCUSABLE); (f || panel).focus(); }
 applyScope(); paintPreview(); paintState();
}
function close(explicit = true) {
 userOpened = false;
 panel.hidden = true; tab.hidden = false; scrim.hidden = true;
 document.body.classList.remove('-ap-docked');
 syncSemantics();
 if (explicit) { S.open = false; persist();
  const back = opener && opener.isConnected && opener.offsetParent !== null ? opener : tab;
  back.focus(); }
 opener = null;
}
/* Replay: a synthetic pointer journey so the authored effect can be judged without a mouse */
function replay() {
 const target = prevEl.querySelector('[data-morph]'); if (!target) return;
 replayGen++; const gen = replayGen; clearTimeout(replayTimer);
 const r = target.getBoundingClientRect();
 const path = [[r.left - 70, r.top + r.height / 2], [r.left - 8, r.top + r.height / 2], [r.left + r.width * .5, r.top + r.height / 2], [r.right + 8, r.top + r.height / 2], [r.right + 70, r.top + r.height / 2]];
 let i = 0, t0 = performance.now();
 const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
 const send = (x, y, type = 'pointermove') => { const ev = new PointerEvent(type, {clientX:x, clientY:y, bubbles:true, pointerType:'mouse'}); (type === 'pointermove' ? document : target).dispatchEvent(ev); };
 target.dispatchEvent(new PointerEvent('pointerover', {clientX:path[0][0], clientY:path[0][1], bubbles:true}));
 const step = now => {
  const seg = 620, k = Math.min(1, (now - t0) / seg), e = ease(k);
  const [ax, ay] = path[i], [bx, by] = path[i + 1];
  send(ax + (bx - ax) * e, ay + (by - ay) * e);
  if (k < 1) return requestAnimationFrame(step);
  if (++i < path.length - 1) { t0 = now; return requestAnimationFrame(step); }
  send(path[2][0], path[2][1], 'pointerdown'); setTimeout(() => send(path[2][0], path[2][1], 'pointerup'), 220);
  say('Replayed: approach, cross in, press, leave.', 'ok');
 };
 requestAnimationFrame(step);
 say('Replaying a pointer journey…');
}
window.VPanel = {open, close, toggle: () => panel.hidden ? open() : close(), applyScope, state: () => ({...S}), validate, applyConfig, RUNTIME};
const start = () => { if (!M()) return setTimeout(start, 60); mount(); applyScope(); };
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
})();
