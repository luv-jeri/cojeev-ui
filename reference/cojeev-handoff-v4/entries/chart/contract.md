# Chart — contract

- **id** `chart` · **tier** base · **evidence** I07 I09 I15 I16 I18 · **status** source
- **root** `.v-bars`
- **api** .v-bars > i[style=--p][.-ink\|-dash\|-pink] + .v-axis · svg.v-line path.-hist\|-next\|-cross · .v-ring[data-segs][data-sw] · .v-prow (ranked) · dashed = missing (data-missing) never colour alone · each chart ships a table alternative
- **isolation canvas** 960x480 · **files** `isolation/chart/`

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

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-bars` | `data-part="root"` |
| `.v-bars>i` | `data-part="item"` |
| `.v-axis` | `data-part="label"` |
| `.v-line` | `data-part="root"` |
| `.v-ring` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** controls · **on by default** no (motion.js) · **travelling selection / flow roles** unfolds, paces, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-axis, v-bars, v-caption, v-card, v-card__title, v-chev, v-collapsible, v-collapsible__body, v-disk, v-hero, v-icon, v-line, v-prow, v-prow__lab, v-prow__val, v-ring, v-ring__c, v-sr, v-table, v-track
