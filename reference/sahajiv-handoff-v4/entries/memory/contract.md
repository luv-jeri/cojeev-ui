# Memory · Entry Card / Search / Recall / Import review — contract

- **id** `memory` · **tier** sahajiv · **evidence** — · **status** derived
- **root** `.v-card.-memory`
- **api** entries render from one demo dataset (data-demo="memory") · the search box filters titles, bodies and tags, updates the per-agent counts and shows a filtered-empty state · Review opens a real conflict dialog: each conflict offers keep mine / take theirs / skip, Cancel abandons, Import writes a simulated receipt · recall panel reports what was observed, never a fabricated score
- **isolation canvas** 960x640 · **files** `isolation/memory/`

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

### Data states
- `full`
- `filtered-empty`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-card.-memory` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, unfolds, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-alert, v-alert__body, v-alert__text, v-body-2, v-btn, v-card, v-chev, v-collapsible, v-collapsible__body, v-icon, v-input, v-meta, v-reclist, v-search, v-search__disk, v-state, v-state__why, v-state__word
