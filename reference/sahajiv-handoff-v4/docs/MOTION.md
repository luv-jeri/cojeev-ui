# MOTION.md — the single source of truth for motion in the SahaJiv Design System

This document supersedes the motion paragraphs in AGENT-PROMPT.md, DESIGN.md and MORPH-PROMPT.md. Where they disagree, this file wins.
Data form: `data/motion.json` (one row per component per interaction). Settings: `ADJUSTER.md`.

## 1 · Decision (confirmed 2026-09-07)

The **morph body is IN**, bounded. Two engines ship, both loaded by `catalog/index.html` and every isolation page:

| engine | files | what it does | switched on by |
|---|---|---|---|
| Morph body | `js/morph.js` (engine) + `js/motion.js` (consumer runtime) | an aria-hidden SVG body behind a control that leans toward the pointer, bulges under it, squashes on press | **by category in motion.js**: `buttons`, `icons`, `pills`, `skeleton` on; `cards` off; `nav`, `inputs`, `controls`, `surfaces` off. Per element: `data-morph="fill|stroke|both"` **on**, `data-motion="off"` **off** |
| Travelling selection | `js/flow.js` + `css/flow.css` | one body per group carries the active state and moves to the next item; a ghost follows the pointer; the same character paces presses, overlays, disclosure, indicators, arrivals | **automatic** for every group in `VFlow.GROUPS`; `data-flow="off"` disables a subtree, `data-flow="<character>"` pins one, `data-flow-hover="off"` drops the ghost |

Categories map to selectors in `morph.js` `CATS` (recorded per entry in `data/registry.json → category`). `motion.js` is a two-state switch — **Off / Subtle** — over the engine's `RUNTIME` profile; it exposes no tuning. Authoring happens in the catalog workbench (`js/authoring-panel.js`) and is not a product setting.

## 2 · Tokens

Three product durations and two curves: `--t-micro 120ms · --t-element 200ms · --t-max 300ms · --enter cubic-bezier(.2,.8,.2,1) · --exit cubic-bezier(.4,0,1,1)`. Under `prefers-reduced-motion` the three durations are `0ms`.

The travelling selection has **its own per-character timing** — that is the feature, and it is not forced onto the three product durations. Every value is a token in `css/tokens.css` and is read by both `css/flow.css` and `js/flow.js` (`--t-flow-<character>` travel, `-h` height, `-land` landing; phase beats `--t-flow-stretch-p1`, `--t-flow-drop-gather`, `--t-flow-drop-shoot`, `--t-flow-rubber-lead`; shared `--t-flow-hover .22s`, `--t-flow-radius .3s`, `--t-flow-fade .18s`, `--t-flow-still 60ms`, `--t-flow-land-hold 900ms`; curves `--e-flow-<character>`). `js/flow.js` writes the current character onto `:root` as `--flow-ease`, `--flow-dur` (already divided by the speed setting), `--flow-land`, `--flow-glow`; everything outside the group (presses, overlays, disclosure, indicators, arrivals) reads only those four. ui.js delays: `--t-tooltip 220ms`, `--t-hovercard 300ms`, `--t-toast 5000ms`, `--t-focus-settle 120ms`. Loops: `--t-skel 1.4s`, `--t-skel-sheen 2.4s`, `--t-pulse 2.1s`.

## 3 · The morph body — integrator (write the same one in React)

Each body keeps six scalar springs: `lobe` (reach toward the pointer, px), `arc` (rim position of the lobe, px along the perimeter), `hold` (bulge under the pointer, px), `press` (0..1 press depth), `dirS.x`, `dirS.y` (unit direction toward the pointer). Every spring is the same damped spring:

```
spring(s, dt):                       # s = {x, v, to, k, z}
  k = s.k                            # stiffness
  c = 2 * sqrt(k) * s.z              # damping (z = 1 critical, < 1 under-damped)
  t = min(dt, 0.1)                   # frame delta in seconds, never more than 100 ms
  while t > 0:
    h = min(0.004, t)                # FIXED SUB-STEP of 4 ms (semi-implicit Euler)
    s.v += ((s.to - s.x) * k - s.v * c) * h
    s.x += s.v * h
    t -= h
  if |s.to - s.x| < 0.0008 and |s.v| < 0.0008:   # rest threshold: snap and stop
    s.x = s.to; s.v = 0
```

Per frame (`frame(now)`): `dt = min(0.05, (now - t0)/1000)` seconds, `T = now/1000`. Initial conditions: every spring `x = v = to = 0`; `jiggle = 0`, `ripple = 0`, `mergeT = 0`; the rim is sampled once per size (rounded rect `rim()` or true shape `fromShape()`, ~1 sample per `cfg.quality` px).

Targets each frame (pointer P, rim sample q nearest P at rim distance `dist`, tier values from `RUNTIME.tier[tier]`):

- **reach** `lobe.to = near && cfg.reach ? tier.reach × (½(1 − cos(π(1 − dist/tier.R))))^cfg.curve : 0` — **this is where the px cap is applied**: `tier.reach` is the maximum lobe amplitude in CSS px (the window is ≤ 1). `near` = pointer outside the box and `dist < tier.R`.
- **hold** `hold.to = inside ? tier.inside × max(.35, 1 − min(dist,60)/80) : (focused ? tier.inside × .6 : 0)`.
- **press** `press.to = 1` while pointerdown on the host, else `0`; `press.k = 260` while held, `cfg.pressK` on release. Host transform `scale(1 − p·.03, 1 − p·.015)` while `p > .004`, removed below.
- **merge** on crossing into the box: `mergeT = .6 s`, during which `lobe.z = cfg.mergeZ`, `lobe.k = 105`; otherwise `lobe.z = cfg.lobeZ`, `lobe.k = cfg.lobeK`.
- **release wobble** on leaving `near`: `jiggle = 1`, decays `jiggle −= dt × cfg.jiggleDecay`; drawn as `gaussian(rim) × tier.reach × cfg.jiggle × e^(−3.2t) × cos(3.4πt)`, t = 1 − jiggle.
- **rest breath** (only when `cfg.rest`, off in the RUNTIME profile): `tier.amp × min(w,h) × (…sin(T·.38 + seed)…)`.

Rim displacement per sample `k = idle + hold·(g·1.2 − .15) + press·tier.press·min(w,h)·(−.9c² + .5(1−c²)) + ripple + jiggle` plus the lobe `lobe · g · dir`, where `g = exp(−Δarc² / (2·tier.sig²))` is the gaussian around the lobe's arc position. The path is Catmull-Rom (rounded bodies) or a polyline (true shapes) and written to `path[d]` only when the string changed.

RUNTIME profile (what motion.js applies to consumers; the workbench is unbounded):

```
cfg  : lobeK 130 · lobeZ 1 · mergeZ .8 · arcK 40 · holdK 80 · pressK 170 (260 held) · jiggle .35 · jiggleDecay 1.6 /s · curve 1.2 · quality 2.5 px · rest off
tier : pill  reach 3   px · inside 1.2 · press .02 · R 80 · sig 24
       tile  reach 2.4 px · inside 1   · press .02 · R 64 · sig 18
       nav   reach 1.2 px · inside .5  · press .008 · R 64 · sig 24
       card  reach 1   px · inside .4  · press .004 · R 56 · sig 44
       blob  reach 3   px · inside 1.2 · press .03 · R 64 · sig 22   (skeleton, decorative shapes)
```

Correction to earlier documents: AGENT-PROMPT.md quoted "caps button 0.90 · icon button 0.40 · nav 0.05 · card 0.08 px, 75 ms retention, ≤ 550 ms recoil". Those numbers are the advisory `CAP` constant in `motion.js`, which is **not enforced anywhere**; the enforced caps are `tier.reach` above. There is no 75 ms hold timer; retention is the spring settling. The release wobble settles in `1/jiggleDecay = 625 ms`. The rows in `data/motion.json` carry the real values.

## 4 · The travelling selection

One `.v-glide__pill` per group; `js/flow.js` measures the active item (`aria-selected / aria-pressed / aria-current / .-selected / label:has(:checked)`), writes `--glide-x/y/w/h/r/o` onto the pill and lets CSS transition it. Characters: glide (default), stretch, jelly, comet, drop, rubber, pebble, ripple, halo — each with its own tokens (§2). Distance scaling `--glide-d`: .8 at ~0 px → 1 at ~120 px → 1.25 at 300+ px, applied to the travel duration and to the JS phase timers. A group's first paint is still (`.-still` for `--t-flow-still`). Reduced motion: no transition, no landing; `data-flow="off"` the same.

## 5 · Reproducibility

- **Seed.** `data-seed="42"` on `<html>` before the scripts load, or `V.seed(42)` at any time. With a seed, each body's seed is `FNV-1a(domPath + '#' + seed) mod 100000 / 1000` — a function of the element's position in the **authored** document, not of build order: nodes the engines inject (`svg.v-morph`, `#v-morph-defs`, the `.v-glide__*` layers) are skipped when counting siblings, so a body's seed is the same whether a neighbour's body or its group's glide layers were seated before or after it. Without a seed the engine uses `Math.random()` as before. `Math.random()` appears nowhere else in the shipped engines (`demo-behaviour.js` uses it for demo ids only).
- **Clock.** `V.clock(t)` steps every animation in the system to time **t in milliseconds on the `performance.now()` / `requestAnimationFrame` axis (zero = the document's time origin)**. It (1) calls `VMorph.clock(t)`: the engine stops self-scheduling and runs exactly one `frame(t)` per call, with `dt = min(50 ms, t − previous t)` (the first call sets `dt = 0`); (2) calls `VFlow.clock(t)`: the multi-phase timers (stretch/drop/rubber beats, the 16 ms placement debounce, the 60 ms still window, the 900 ms landing hold) fire when their due time ≤ t instead of on `setTimeout`; (3) pauses every CSS animation/transition (`document.getAnimations()`) and sets each one's `currentTime = t − t₀`, where t₀ is the clock value at which that animation was first seen — so start `V.clock` before the interaction you record. `V.clock(null)` releases everything. `V.now` holds the last value.
- **Byte-identical frames.** With the same seed, the same sequence of `V.clock(t)` values, the same synthetic pointer positions (`pointermove` clientX/Y) and the same layout (viewport, fonts, canvas), two runs produce identical `path[d]` strings for every body and identical `--glide-*` values, because every source of variation is either seeded, clock-driven or a pure function of layout. The one thing outside this contract is sub-pixel rasterisation, which is the renderer's, not the design system's. `fixtures/determinism.html` runs the check.
- **Which pages carry a seed.** Every `entries/*/demo.html` and `isolation/**` page sets `data-seed="42"` on `<html>`; `catalog/index.html` does not (it is a showcase). A seed fixes the bodies' shapes but not the clock, so two loads of a seeded page still differ until `V.clock(t)` is stepped. To pixel-compare any page: `V.seed(n)` (or `data-seed`), `VMorph.rewind()`, then `V.clock(t)` at fixed instants — in that order.
- Pointer position is not part of the clock: drive it with synthetic `pointermove`/`pointerdown`/`pointerup` events; the engine reads `clientX/clientY`.

## 6 · Reduced motion — how "durations 0" is enforced

`base.css` carries `@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0s!important;animation-iteration-count:1!important;transition-duration:0s!important;scroll-behavior:auto!important}}`. The `!important` there is structural: the guard must beat every transition and animation declaration in every sheet, including the unlayered `flow.css`, and a media block cannot be won by layer order. `flow.css` adds its own guards for the travelling body and the landing keyframes. The audit fixtures (`fixtures/imp-audit.html`, `fixtures/regress-check.html`) test reduced motion as a third condition beside light and dark by forcing those media blocks on in the CSSOM.

## 7 · What never moves

Text, labels, field groups, `.v-marker`, `.v-prose`, tooltips (`NEVER_SEL` in morph.js). Nothing loops forever except a genuine in-progress indicator (`.v-pulse`, `.v-skel`). Nothing animates on scroll. Under `prefers-reduced-motion`: static bodies, no travel, loops still, durations 0.
