# Compact Summary / Live Activity Widget — contract

- **id** `widgets` · **tier** composite · **evidence** I12 I13 · **status** source
- **root** `.v-widget`
- **api** .v-widget (cream, value + 4 progress rows + 2 circle buttons) · .v-capsule (black pill: avatar, pink name pill, progress line, circle controls)
- **isolation canvas** 720x420 · **files** `isolation/widgets/`

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
| `.v-widget` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, paces, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-avatar, v-caps, v-capsule, v-capsule__line, v-capsule__name, v-compose, v-hero, v-ibtn, v-icon, v-meta, v-prow, v-prow__lab, v-prow__val, v-track, v-widget, v-widget__top
