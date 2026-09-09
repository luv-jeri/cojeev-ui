# DESIGN.md — Cojeev Design System

Vriksha is the visual system for **Cojeev**, an AI-work companion for a non-technical owner. It reconstructs the *Intelly* design language (Behance 191973409, 21 boards, analysed in `research/REFERENCE-ANALYSIS.md`) for a different product, then adds one signature of its own: surfaces that are quietly alive. Evidence labels throughout: **explicit** (printed on a board) · **observed** · **measured** (sampled from pixels) · **inferred** (our proposal).

## 1. Principles as rules
1. **Warm flat ground.** Cream canvas `#FBF4E6`, beige panels `#EEE7DA`, no card shadows, no borders except selected/featured (1.5 px pink) and dashed "meta" pills. Group by surface and whitespace. (observed)
2. **Black is structure.** Sidebar, primary pill buttons, compact selects, assistant panel, current-value marks, count badges, caption pills. Never black for large content surfaces. (observed)
3. **Pink is interaction; four pastels are categories.** Pink = selected nav, selected date, search disk, dock action, assistant CTA, edit badge, now-marker. Yellow · pink · olive · blue identify categories across card fill, icon disk, chart segment, status pill, shape. Tell the two pink roles apart by shape: pill/circle = interaction, card/segment = category. (observed; separation inferred)
4. **One big number** per metric surface; units and captions recede (caps 10–11 grey). (observed)
5. **Shapes mean something.** 23 silhouettes (`vriksha/js/morph.js` SHAPES, `assets/shapes/`); each destination owns one. Shapes appear as tonal watermarks (same hue 12 % darker, clipped top-right), as category tiles with one centred word, as ring-gap icon disks, and in empty/error states. Never decorative confetti in dense views. (observed; mapping inferred)
6. **Connected geometry** is the identity: selected row flows into detail, dock shoulder wraps the action, assistant close protrudes, utility circles join, notches host circles. (observed)
7. **Motion is a response, not a state.** Surfaces are still until the pointer approaches; then the boundary nearest it leans a fraction of a pixel and settles once. Caps and rules in `MOTION.md`. (Cojeev signature; inferred)
8. **Capability truth.** Observed-at stamps visible; null ≠ zero (word "unavailable"); pending ≠ success; a file changing is not liveness; Needs You is read-only with one action "Open in <host>". (product rule)

## 2. Tokens
`css/tokens.css` is the single source; `TOKENS.md` lists every token with its evidence label. Highlights: accents `#F5B8DB #9AAB63 #B6CAEB #F5D867` (explicit, I03); canvas `#FBF4E6`, beige `#EEE7DA`, beige-2 `#F3ECDF`, ink `#111111`, text `#0E0B0B / #5F5B55 / #A19C97`, danger `#E1443E` (measured); mulberry `#9C3E6E` is the **focus ring only** (owner decision). Semantic aliases use shadcn names (`--background --card --primary --accent --muted --ring --chart-1..5 --sidebar*`). Category map: Work blue/star-8 · Automations yellow/cross · Memory olive/blob-4 · Library pink/heart · AI Apps blue/droplet · Settings beige/circle · Needs You pink/star-4 · Runs yellow/crescent.

## 3. Typography
Display **Bricolage Grotesque** (500), text **DM Sans** (400/500/600/700) — stand-ins for Acorn / TT Commons (explicit names, binaries unlicensed; see ASSET-AND-FONT-LEDGER). Roles: hero 72–96 / .95 · display 44 / 1.05 · section 26 · title 21 / 600 · lead 17 / 600 · body 15 / 1.45 · control 14 / 500 · meta 12 · caps 11 / .06 em uppercase · value 700 tabular with unit at .3 em · ids in the text face, tabular. Two-line display names allowed; text never truncates in controls.

## 4. Space, layout, density
4-px grid (`--s-1…--s-16`). Desktop shell measured from I15 → 1440: inset 28, sidebar 212 detached, sidebar→content 52, content:rail ≈ 2:1 with rail 360 and gap 40, card gap 16, card padding 24, topbar row 44. Mobile (I07, 393): side padding 24, dock 72 + safe area, date columns 44. Layout families: dashboard + agenda rail · profile/record workspace · content hub + resource rail · full table · weekly time grid · mobile single column. Breakpoints are **container queries** on `.v-shell` (1180 rail stacks · 900 sidebar → 76 px icon rail · 720 sidebar hidden, dock takes over with Work · Automations · [Ask] · Memory · More). Test widths: 360 390 768 1024 1440 1920.

## 5. Geometry
Radii: pill 999 · xs 4 · sm 8 · md 12 · card-sm 16 · card 20 · panel 24 · sheet 28 · frame 40. Icon disks 32/40/48 with 16/20/24 glyphs at 1.6 stroke, round joins. Utility circles 44 overlapping −4. Dock action 56 in a 24-px shoulder. Assistant close 48, centred on the top edge, 24 in from the right. Notch: circle 56 + 12 clearance. Hex avatar 24 flat-top. Edit badge star-4 36 overlapping 10. Tracks 10 (row) / 14 (ranked) / 6 (compact). Ring stroke ≈ 0.12 ⌀, rounded caps, gaps hold disks. Table row 72, header 44. Nav row 40, active bar 2 × 24 + breathing 6 px dot.

## 6. Icons and shapes
Outline set (Lucide-derived, 115 symbols in `assets/icons.svg`, stroke recalibrated to 1.6) inlined by `js/v.js` from `data-icon`. Custom vectors: 23 shapes (SVG files + morph bodies), hex mask, blob/circle photo masks. No emoji. Cojeev's own mark replaces the Intelly running figure and the "y" avatar.

## 7. Component anatomy
Pills h 32/40/48, padding 0 16/20/24. Cards padding 20–24. Rows padding 12 16, min-height 64 (72 in tables). Icon gap 12 in rows, 8 in pills. Borders: none by default; 1 px `--v-border` on outline circles and the cream search field; 1 px dashed `--v-text-2` for meta pills; 1.5 px pink featured; 1.5 px danger invalid. Hover deepens fill one step (`--v-*-deep` / ink-soft); pressed adds translateY 1 px (alive bodies squash instead); focus-visible = 2 px mulberry ring offset 2; disabled = `--v-disabled-fill` with text-2. Full class API per component: `COMPONENTS.md`.

## 8. States
Controls: default · hover · pressed · focus-visible · selected/checked · indeterminate · disabled · invalid · loading (aria-busy) · pending (ink-soft pill + spinner, never olive). Data composites (`.v-state`): loading (beige skeleton mirroring layout) · empty (shape + title + reason + one action) · filtered-empty (dashed panel, one line, clear filter) · partial (yellow-soft, names what is missing) · stale (stamp strikes through with word "stale") · unavailable (word + striped track, never 0) · error (danger word + plain reason + retry; technical code behind a disclosure) · pending (spinner dot in receipts). Receipts are durable panels, not toasts; toasts confirm, receipts prove.

## 9. Motion
Ordinary transitions: 120 / 200 / 300 ms, enter `cubic-bezier(.2,.8,.2,1)`, exit `(.4,0,1,1)`. Draw-in 600 ms (rings, tracks), count-up 700 ms. Paper tension as in principle 7 — caps in `VMotion.CAP`, storage `v-motion {v:2}` (older payloads are normalised to the quiet default). Native focus, pressed and selected states do the ordinary interaction work.


## 10. Accessibility
Ink on any accent ≥ 8:1; text-2 on beige 5.6:1; text-3 decorative only; cream on ink 17:1; pink on ink 9:1; danger on beige 3.9:1 → ≥ 14 px bold or with icon. Pink fills take ink text, never white. Real `<button> <a> <input>`; Escape closes layers; focus trapped and returned; menus/combobox/listbox/calendar keyboard per WAI-ARIA (ui.js); dock and utility bar are real buttons; tooltips give icon-only controls their name; RTL flips layout via logical properties but never mirrors shapes or photos.

## 11. Usage
Load `css/vriksha.css` (+ `js/v.js` for icons/shapes/rings/count-up, `js/ui.js` for behaviour, `js/morph.js` for alive bodies). Compose from atoms; product families are presets, not new styles. Never add shadows, gradients, blur, emoji, or a fifth accent. Fixture data is labelled DEMO DATA. Agents: read `AGENT-PROMPT.md` first.
