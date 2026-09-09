# Input — contract

- **id** `input` · **tier** base · **evidence** I07 I15 · **status** source
- **root** `.v-input`
- **api** .v-input[.-cream\|.-sm] · beige pill, pink focus ring + tint, reserved message line via Field · disabled 50 %
- **isolation canvas** 480x240 · **files** `isolation/input/`

## Modifiers
| class | meaning |
|---|---|
| `.-cream` | variant: cream — cream fill |

## Sizes
`.-sm`

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `disabled` | [disabled] / :disabled — flat face var(--v-disabled-face), edge var(--v-disabled-edge), ink var(--v-disabled-ink) |
| `error` | .-invalid + [aria-invalid=true] |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-input` | `data-part="root"` |
| `.v-input input` | `data-part="input"` |
| `.v-input .v-disk` | `data-part="addon"` |
| `.v-clear` | `data-part="clear"` |

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
v-affix, v-caps, v-clear, v-disk, v-field, v-help, v-icon, v-input, v-label
