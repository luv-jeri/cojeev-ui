# Dialog — contract

- **id** `dialog` · **tier** base · **evidence** Ext I07 · **status** derived
- **root** `.v-dialog`
- **api** .v-dialog[data-dialog] r28 cream · [data-dialog-open] · [data-close] · focus trap · Escape · scrim click · focus returns to opener
- **isolation canvas** 720x480 · **files** `isolation/dialog/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-dialog:not([hidden]) · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-dialog` | `data-part="content"` |
| `[data-dialog-open]` | `data-part="trigger"` |
| `.v-dialog__head` | `data-part="header"` |
| `.v-dialog__actions` | `data-part="footer"` |
| `[data-close]` | `data-part="close"` |

## Keyboard
focus trapped inside; Escape closes; focus returns to the opener

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-dialog, v-dialog__actions, v-dialog__head, v-field, v-help, v-ibtn, v-icon, v-input, v-label, v-section
