# Data Table — contract

- **id** `data-table` · **tier** base · **evidence** I18 · **status** source
- **root** `.v-table-wrap`
- **api** .v-table-wrap > .v-table · th grey 12 · td 72 · .-num right/tabular · status pills · trailing .v-actions · filters are .v-tabs[data-filters] toggle buttons (not tabs) · .v-pager[data-pager] clamps to the filtered count · rows, counts, paging and the empty state all read one dataset (data-demo="runs-table")
- **isolation canvas** 960x560 · **files** `isolation/data-table/`

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
| `on` | [aria-pressed=true] · data-state=on|off |

### Data states
- `full`
- `filtered-empty`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-table-wrap` | `data-part="viewport"` |
| `.v-table` | `data-part="root"` |
| `.v-tabs[data-filters]` | `data-part="filters"` |
| `.v-pager` | `data-part="pagination"` |
| `.v-state.-filtered` | `data-part="empty"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, enters, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-meta, v-pager, v-sr, v-state, v-state__why, v-state__word, v-tab, v-table, v-table-wrap, v-tabs
