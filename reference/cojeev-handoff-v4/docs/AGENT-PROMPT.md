# AGENT-PROMPT.md — give this to any coding or design agent building Cojeev

You are building screens for **Cojeev** with the **Cojeev Design System** (class prefix `.v-`, unchanged). Do not invent a visual style. Everything you need is in this folder; read in this order: `DESIGN.md` (rules), `TOKENS.md` (values), `COMPONENTS.md` (class API for every component), `PATTERNS.md` (page layouts), `MORPH-PROMPT.md` (alive surfaces). Open `catalog/index.html` to see every component live and copy its markup (each entry has a **Markup** button).

## Load order (plain HTML / any framework)
```html
<link rel="stylesheet" href="vriksha/css/vriksha.css">
<script src="vriksha/js/v.js" data-base="vriksha"></script>   <!-- icons, shapes, rings, count-up -->
<script src="vriksha/js/ui.js"></script>                       <!-- menus, dialogs, combobox, calendar… -->
<script src="vriksha/js/flow.js"></script>                     <!-- the travelling selection -->
<script src="vriksha/js/morph.js"></script>                    <!-- the morph body engine -->
<script src="vriksha/js/motion.js"></script>                   <!-- Off / Subtle runtime over the engine -->
```
The class contract (`entries/<id>/contract.md`, `data/port-map.json`), the isolation pages and `data/registry.json` are the whole interface for a port. Tailwind is not used here; do not add it.

## Non-negotiables
- Colours only from tokens: canvas `#FBF4E6`, beige `#EEE7DA`, ink `#111111`, pink `#F5B8DB`, yellow `#F5D867`, olive `#9AAB63`, blue `#B6CAEB`, danger `#E1443E`. Mulberry `#9C3E6E` is the focus ring only. No gradients, shadows (except `.v-popover`/`.v-sheet` float), blur, emoji.
- Fonts: `--font-display` Bricolage Grotesque for hero/display/section; `--font-text` DM Sans for everything else. Sizes from the six-step scale; caps labels 11 px tracked; numbers tabular.
- Radii: pills 999, rows 16, cards 20, panels 24, sheets 28. Flat surfaces; grouping by whitespace.
- Black = structure (sidebar, primary buttons, selects, assistant). Pink = interaction. Yellow/pink/olive/blue = categories, fixed per destination (Work blue/star-8 · Automations yellow/cross · Memory olive/blob-4 · Library pink/heart · AI Apps blue/droplet · Settings beige/circle · Needs You pink/star-4 · Runs yellow/crescent).
- Every icon-only control has `aria-label`; every input has a `<label for>`, a wrapping `<label>` or an `aria-label`. Real `<button>`, `<a>`, `<input>`. Text never truncates; long labels wrap.
- Capability truth: show observed-at (`.v-stamp`); null usage → "unavailable" (`.v-usage.-unavail`), never 0; pending ≠ success (`.v-receipt__dot.-pending`); a session file changing is not "live"; Needs You rows have one action "Open in <host>" and no reply control; project filter (`Viewing: X`) never changes the default project silently.
- Fixture data is labelled DEMO DATA (`.v-fixture`). Demos never call a model, host or shell.

## How to compose a page
1. Pick the page family in `PATTERNS.md` (dashboard, workspace, hub, table, weekly grid, mobile).
2. Start from `.v-shell` (or `.v-mobile`), add `.v-pagehead`.
3. Fill with atoms from `COMPONENTS.md`; product families (health line, receipt, needs-you row, data state) are presets of those atoms — use them, do not restyle.
4. Give every data surface its five states (`.v-state.*`).
5. Motion needs no markup: buttons, icon buttons, pills and skeletons carry the morph body by category (motion.js); cards stay static unless you add `data-morph`; `data-motion="off"` removes it from one element. The travelling selection attaches to every selection group automatically.
6. Check at 360, 390, 768, 1024, 1440, 1920 and with `prefers-reduced-motion`.

## Motion
**MOTION.md is the single source of truth.** Two engines: the morph body (`morph.js` + `motion.js`, on by category — buttons, icons, pills, skeleton; cards off; per element `data-morph` on / `data-motion="off"` off) and the travelling selection (`flow.js` + `flow.css`, automatic for selection groups). Bounded: the enforced cap is `tier.reach` in CSS px (pill 3 · tile 2.4 · nav 1.2 · card 1), nothing animates at rest in the RUNTIME profile, refused under `prefers-reduced-motion` or without a fine pointer. Timings are tokens (`--t-*`, `--e-flow-*`); `data-seed` and `V.clock(t)` make every frame reproducible. Never reintroduce always-on morphing, sheen or grain; the `v-alive` class and the organism lab are retired (`fixtures/organism.html` only).


## Two rules that are easy to get wrong
- **Tabs vs filters.** Only use `role="tablist"` when you also write `[role=tabpanel]` elements and `aria-controls`. A group that narrows a list is `.v-tabs[data-filters] role="group"` with `aria-pressed` buttons.
- **One dataset per surface.** Rows, counts, pagination, empty states and any chart's text alternative must read the same array. If a filter can disagree with what is on screen, it is wrong.

## When something is missing
If a component you need is not in `COMPONENTS.md`, compose it from existing atoms and add it to the catalog registry (`catalog/reg-*.js`) with evidence "Ext". Never fork a copy of a style into a page.

## Navigation contract
Destinations, in order: **Work** (home) · **Automations** · **Memory** · **Library** (skills + hooks) · **AI Apps** · **Settings / System**. Ask Cojeev, Needs You, Quick Note and notifications are **global affordances** in the topbar (or the mobile dock), never destinations. Free Models is a view inside AI Apps.
