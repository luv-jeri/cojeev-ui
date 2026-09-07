# Explainer Card / Viewer / Version History — contract

- **id** `explainers` · **tier** sahajiv · **evidence** I17 · **status** derived
- **root** `.v-card.-work`
- **api** viewer has two real variants — Interactive (step list) and Written summary (the four-step text) — as proper tabs with panels · the oversized fallback shows the written summary in place rather than claiming one exists · version history lists source run, version and what it supersedes
- **isolation canvas** 960x600 · **files** `isolation/explainers/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |
| `error` | .-error modifier |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-card.-work` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, unfolds, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-btn, v-card, v-chev, v-collapsible, v-collapsible__body, v-icon, v-meta, v-state, v-state__why, v-state__word, v-steps, v-tab, v-tabs
