# Textarea — contract

- **id** `textarea` · **tier** base · **evidence** Ext · **status** derived
- **root** `.v-textarea`
- **api** textarea.v-textarea · beige r16, pink focus · composer pattern adds a send .v-ibtn
- **isolation canvas** 480x240 · **files** `isolation/textarea/`

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
| `.v-textarea` | `data-part="root"` |
| `.v-composer` | `data-part="root"` |
| `.v-composer__bar` | `data-part="footer"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** inputs · **on by default** no (motion.js) · **travelling selection / flow roles** press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-composer, v-composer__bar, v-field, v-help, v-ibtn, v-icon, v-label, v-meta, v-textarea
