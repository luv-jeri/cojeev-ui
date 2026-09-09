# Sheet — contract

- **id** `sheet` · **tier** base · **evidence** I16 · **status** source
- **root** `.v-sheet`
- **api** .v-sheet[data-sheet] cream side panel r24 · [data-sheet-open] · stacked = second sheet with depth · Escape, scrim, [data-close]
- **isolation canvas** 960x600 · **files** `isolation/sheet/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-sheet:not([hidden]) · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-sheet` | `data-part="content"` |
| `[data-sheet-open]` | `data-part="trigger"` |
| `[data-close]` | `data-part="close"` |

## Keyboard
as Dialog

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-age, v-body-2, v-btn, v-dialog__head, v-health, v-ibtn, v-icon, v-section, v-sheet, v-word
