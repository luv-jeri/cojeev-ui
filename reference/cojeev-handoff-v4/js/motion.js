/* Vriksha · motion.js — the CONSUMER RUNTIME adapter.
   This file is what an application ships: a two-state switch (Off / Subtle) over the shared engine in
   morph.js, with the conservative profile applied. It deliberately exposes no tuning — authoring happens
   in the library workbench (js/authoring-panel.js), and its exported JSON is what you load here.

   Requires morph.js to be loaded first. Keeps the historic window.VMotion API so existing consumers and
   the catalog's Settings example keep working, but there is only ONE engine and one set of handlers. */
(() => {
const M = () => window.VMorph;
const KEY = 'v-motion', VER = 3;
/* The quiet baseline. Identical to VPanel.RUNTIME so the workbench and the runtime cannot drift. */
/* Single source: the engine owns the profile (VMorph.RUNTIME); this adapter no longer keeps a copy. */
const RUNTIME_FALLBACK={cfg:{},tier:{}};
const RT=()=>(M()&&M().RUNTIME)||RUNTIME_FALLBACK;
/* Advisory caps for the runtime profile only. The workbench is intentionally unbounded — a designer must
   be able to author and compare big effects — so these are NOT applied to authoring or to decorative blobs. */
const CAP = {pill:.9, tile:.4, nav:.05, card:.08};

let S = {mode:'subtle', cats:{buttons:true, icons:true, pills:true, cards:false, skeleton:true}};
try {
 const raw = localStorage.getItem(KEY);
 if (raw) { const o = JSON.parse(raw);
  if (o && o.v === VER && (o.mode === 'off' || o.mode === 'subtle')) { S.mode = o.mode; S.cats = {...S.cats, ...(o.cats || {})}; }
  else if (o && (o.mode === 'off' || o.mode === 'subtle')) S.mode = o.mode;   // older payload: keep only the choice
 }
 /* v-morph-cfg-v3 is the key the engine still WRITES (morph.js save()); deleting it on every load silently
   discarded the user's authored values. Only genuinely obsolete versions are migrated away. */
['v-alive-settings','v-morph-cfg','v-morph-cfg-v2','v-motion-cfg'].forEach(k => localStorage.getItem(k) && localStorage.removeItem(k));
} catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({v:VER, mode:S.mode, cats:S.cats})); } catch (e) {}
 dispatchEvent(new CustomEvent('v-motion-change', {detail:{mode:S.mode, cats:{...S.cats}}})); };

function applyProfile() {
 const m = M(); if (!m) return;
 m.reset();
 Object.assign(m.cfg, RT().cfg);
 for (const t in RT().tier) Object.assign(m.TIER[t], RT().tier[t]);
 if (S.mode === 'off') ['rest','reach','merge','hold','jiggleOn','press','echo'].forEach(k => m.cfg[k] = false);
 m.retune();
}
function apply(root = document) {
 const m = M(); if (!m) return;
 /* When the workbench panel is present it owns the configuration; the runtime adapter then only reports
    state so the two can never fight over cfg. */
 /* Only impose the quiet profile when there is no authored configuration to respect: the workbench owns cfg
    while it is loaded, and a saved/imported engine config must survive category changes and reloads. */
 let authored = false; try { authored = !!localStorage.getItem('v-morph-cfg-v3'); } catch (e) {}
 if (!window.VPanel && !authored) applyProfile();
 const live = {}; for (const k in m.CATS) live[k] = S.mode !== 'off' && !!S.cats[k];
 m.autoTag(live, root);
}
const setMode = v => { S.mode = v === 'off' ? 'off' : 'subtle'; save(); apply(); };
const setCat = (k, on) => { S.cats[k] = !!on; save(); apply(); };
window.VMotion = {CAP, get RUNTIME(){return RT()}, mode: () => S.mode, cats: () => ({...S.cats}), setMode, setCat, apply,
 engaged: () => !!(M() && M().bodies && M().bodies.length),
 enable: root => apply(root),
 /* Root-blindness (the §3.70 class of bug): `querySelectorAll` never matches its own root, and a React
    wrapper's root element IS the component — so a rail or card that had been auto-tagged kept its body when
    the consumer disabled motion on it. The root is now tested too.
    Scope is deliberately auto-tagged hosts ONLY. An explicit [data-morph] host belongs to whoever set the
    attribute, and a wrapper's effect re-runs on every prop change: removing that body here left it
    unrebuildable, because remove() clears data-morph and React never restores an attribute it did not
    change itself. An unmounted host's body is reclaimed by the engine's own detached-host sweep. */
 disable: root => { const m = M(); if (!m || !m.remove) return;
  const r = root || document, sel = '[data-auto-morph]';
  if (r.matches && r.matches(sel)) m.remove(r);
  if (r.querySelectorAll) [...r.querySelectorAll(sel)].forEach(el => m.remove(el)); }};
/* ONE authority for tagging: the runtime adapter always tags, whether or not the workbench is loaded or open.
   The workbench still owns the *configuration* (applyProfile is skipped when VPanel exists), but it must not
   own attachment — tying tagging to an open panel left the whole library motionless once the panel correctly
   started closed at overlay widths. */
const start = () => { if (!M()) return setTimeout(start, 60); apply(); };
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
})();
