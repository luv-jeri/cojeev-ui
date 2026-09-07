# Metric Hero / Card / Compact — contract

- **id** `metric-cards` · **tier** composite · **evidence** I07 I15 I18 I14 · **status** source
- **root** `.v-mhero`
- **api** .v-mhero (96 px value + caption) · .v-card.-pink > .v-mcard (__head disk+title, __value display 44, .v-delta, caption) · .v-compact (title, value+unit, gradient range, caps rows) · .-unavail greys the value, never shows 0
- **isolation canvas** 960x420 · **files** `isolation/metric-cards/`

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
| `.v-mhero` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-caption, v-card, v-compact, v-compact__range, v-compact__rows, v-compact__t, v-compact__v, v-delta, v-disk, v-hero, v-ibtn, v-icon, v-lead, v-mcard, v-mcard__head, v-mcard__row, v-mcard__title, v-mcard__value, v-meta, v-mhero
