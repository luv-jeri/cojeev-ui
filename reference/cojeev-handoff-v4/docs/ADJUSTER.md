# ADJUSTER.md — settings contract (read and write the same keys)

Every setting the design system persists, its storage, range, default and effect. A React panel that reads and writes these keys
gets the same behaviour from the same stylesheets and engines. All values are JSON in `localStorage`. Changes are applied live;
`flow.js` also listens to the `storage` event so two tabs stay in step.

## Consumer runtime — `js/motion.js` · key `v-motion`

Payload `{ "v": 3, "mode": "off" | "subtle", "cats": { "buttons": bool, "icons": bool, "pills": bool, "cards": bool, "skeleton": bool } }`

| setting | values | default | what it changes |
|---|---|---|---|
| `mode` | `off`, `subtle` | `subtle` | `off` sets `cfg.rest/reach/merge/hold/jiggleOn/press/echo = false` on the engine (bodies stay static). Event `v-motion-change` on `window` |
| `cats.buttons` | bool | `true` | auto-tags `.v-btn:not(.-ghost), .v-select, .v-toggle, .v-native, .v-dock__action, .v-menubar__trigger, .v-cal__month, .v-caption-pill` with `data-morph` (tier pill) |
| `cats.icons` | bool | `true` | icon buttons / disks (tier tile) |
| `cats.pills` | bool | `true` | badges, stamps (tier pill) |
| `cats.cards` | bool | `false` | `.v-card, .v-record, .v-alert, .v-state …` (tier card) |
| `cats.skeleton` | bool | `true` | `.v-skel, .v-pulse` (tier blob) |

API: `VMotion.setMode(v)`, `VMotion.setCat(k, on)`, `VMotion.mode()`, `VMotion.cats()`, `VMotion.enable(root)`, `VMotion.disable(root)`. Payloads with `v !== 3` keep only `mode`. Obsolete keys `v-alive-settings`, `v-morph-cfg`, `v-morph-cfg-v2`, `v-motion-cfg` are deleted on load.

## Engine profile — `js/morph.js` · key `v-morph-cfg-v3` (authored values; absent = RUNTIME profile)

Payload `{ "cfg": {…}, "TIER": { "pill"|"tile"|"nav"|"card"|"blob"|"spinner": {…} } }`. When this key exists, motion.js does **not** impose the RUNTIME profile (an authored configuration is respected). `VMorph.save()` writes it, `VMorph.reset()` removes it, `VMorph.exportJSON()` / `importJSON()` round-trip it.

| `cfg` key | type / range | RUNTIME default | effect |
|---|---|---|---|
| `rest`, `reach`, `merge`, `hold`, `jiggleOn`, `press`, `echo` | bool | `false, true, true, true, true, true, false` | enable each behaviour |
| `lobeK` / `lobeZ` | number | `130` / `1` | reach spring stiffness / damping ratio |
| `mergeZ` | number | `.8` | damping while crossing in (.6 s) |
| `arcK`, `holdK`, `pressK` | number | `40`, `80`, `170` | spring stiffness for lobe position, hold, press |
| `jiggle`, `jiggleDecay` | number | `.35`, `1.6` | release wobble amplitude (× reach) and decay per second |
| `curve` | number | `1.2` | exponent of the reach window |
| `quality` | px | `2.5` | rim sample spacing |
| `grain`, `sheen` | 0..1 | `.08`, `.6` | texture opacity (only on `.v-alive` bodies) |
| `restSpeed`, `drift` | number | `1`, `1` | rest-breath speed, lobe drift (decorative blobs) |
| `dots`, `echoOff`, `echoScale` | number | `0`, `6`, `1.04` | decorative satellites / echo outline |

| `TIER[t]` key | range (authoring domain `VMorph.DOMAIN`, per tier max) | RUNTIME pill / tile / nav / card / blob | effect |
|---|---|---|---|
| `reach` | 0 … 24 / 24 / 12 / 12 / 32 px | `3 / 2.4 / 1.2 / 1 / 3` | **the px cap** of the lobe |
| `inside` | 0 … 12 / 12 / 6 / 6 / 16 px | `1.2 / 1 / .5 / .4 / 1.2` | hold bulge cap |
| `press` | 0 … .12 / .12 / .04 / .04 / .16 | `.02 / .02 / .008 / .004 / .03` | press depth as a fraction of min(w,h) |
| `amp` | 0 … .03 / .03 / .01 / .01 / .08 | `0` (blob `.006`) | rest breath amplitude |
| `R` | 0 … 240 / 240 / 160 / 160 / 320 px | `80 / 64 / 64 / 56 / 64` | pointer attraction radius |
| `sig` | 1 … 120 / 120 / 80 / 160 / 160 px | `24 / 18 / 24 / 44 / 22` | lobe width (gaussian σ) |
| `lobes`, `depth`, `asym`, `spread` | number | `0, 0, 0, .55` | decorative multi-lobe shapes |

Per element the same values can be pinned: `data-tier`, `data-r`, `data-reach`, `data-inside`, `data-amp`, `data-lobes`, `data-depth`, `data-asym`, `data-spread`, `data-shape`; fill `--mfill`, stroke `--mstroke`.

## Travelling selection — `js/flow.js` · key `v-flow-v1`

Payload `{ "variant": string, "hover": bool, "speed": number, "intensity": number, "hoverStrength": number }`

| setting | values | default | CSS it writes (on `:root`) |
|---|---|---|---|
| `variant` | `glide`, `stretch`, `jelly`, `comet`, `drop`, `rubber`, `pebble`, `ripple`, `halo`, `off` | `glide` | `html[data-flow]`; `--flow-ease` = `var(--e-flow-<variant>)`, `--flow-dur` = `--t-flow-<variant>` ÷ speed, `--flow-land` keyframes name, `--flow-glow` (`vf-ring` ripple, `vf-glow` halo, else `none`); each group gets `data-flow-v` |
| `hover` | bool | `true` | `html[data-flow-hover="on|off"]` — the pointer ghost |
| `speed` | `.25` … (1 = authored, 2 = twice as fast) | `1` | `--flow-speed` (divides every flow duration and the JS phase timers) |
| `intensity` | `0` … (1 = authored) | `1` | `--flow-intensity` (squash, ripple, halo, breathe amplitudes) |
| `hoverStrength` | `0` … | `1` | `--flow-hover` (ghost opacity multiplier) |

API: `VFlow.get()`, `VFlow.set({…})`, `VFlow.reset()`, `VFlow.init(root)`, `attach(group)`, `detach(group)`, `replace()`, `appear(el, grow)`, `pulse(el)`, `clock(t)`. Per-group markup overrides: `data-flow="off" | "<variant>"`, `data-flow-hover="off"`, `data-flow-group`, `data-flow-fields`.

## Catalog workbench — `js/authoring-panel.js` (catalog only, not a product setting)

| key | payload | default |
|---|---|---|
| `v-authoring-v1` | `{ "open": bool\|null, "tier": "pill"\|"tile"\|"nav"\|"card"\|"blob", "tab": "flow"\|… }` | `{open:true, tier:"blob", tab:"flow"}` (seeded by catalog/index.html on first load) |
| `v-authoring-cats` | `{ buttons, icons, pills, cards, nav, inputs, controls, surfaces, skeleton: bool }` | `{buttons:true, icons:true, pills:true, cards:true, nav:true, inputs:false, controls:true, surfaces:false, skeleton:true}` |
| `v-nav-<group>` | `"1"` \| `"0"` | open — the catalog's rail groups |

## Theme (attributes, not storage)

`<html data-mode="light|dark">` (default light) switches the `:root[data-mode="dark"]` token block. `data-seed="<n>"` seeds the morph engine (MOTION.md §5). Skins from the legacy kit (`data-skin`) are not part of this system.
