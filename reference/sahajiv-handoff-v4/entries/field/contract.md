# Field — contract

- **id** `field` · **tier** base · **evidence** I07 · **status** source
- **root** `.v-field`
- **api** .v-field[.-invalid] > .v-label + control + .v-help (reserved line, becomes the error) · aria-describedby / aria-invalid
- **isolation canvas** 480x240 · **files** `isolation/field/`

## Modifiers
| class | meaning |
|---|---|
| `.-invalid` | variant: invalid — error state |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `error` | .v-field.-invalid + [aria-invalid=true] on the control |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-field` | `data-part="root"` |
| `.v-field .v-label` | `data-part="label"` |
| `.v-field .v-input,.v-field .v-textarea` | `data-part="input"` |
| `.v-field .v-help` | `data-part="message"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** inputs · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-field, v-help, v-input, v-label
