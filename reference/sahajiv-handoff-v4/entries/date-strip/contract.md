# Date Strip + Weekday Picker — contract

- **id** `date-strip` · **tier** composite · **evidence** I07 · **status** source
- **root** `.v-datestrip`
- **api** .v-datestrip > button[aria-pressed][data-mark][disabled] (b = day number) · .v-weekdays (7 pink circles, checkboxes)
- **isolation canvas** 960x600 · **files** `isolation/date-strip/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `on` | button[aria-pressed=true] · data-state=on|off |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `disabled` | [disabled] / :disabled — flat face var(--v-disabled-face), edge var(--v-disabled-edge), ink var(--v-disabled-ink) |
| `checked` | input:checked · data-state=checked|unchecked |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-datestrip` | `data-part="root"` |
| `.v-datestrip button` | `data-part="item"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** controls · **on by default** no (motion.js) · **travelling selection / flow roles** group
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-datestrip, v-weekdays
