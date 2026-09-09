# Attachment — contract

- **id** `attachment` · **tier** base · **evidence** I09 I16 I17 · **status** source
- **root** `.v-attach`
- **api** .v-attach · black disk type + __name + __meta + .v-actions (two outline circles)
- **isolation canvas** 480x240 · **files** `isolation/attachment/`

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
| `.v-attach` | `data-part="root"` |
| `.v-attach__name` | `data-part="title"` |
| `.v-attach__meta` | `data-part="description"` |
| `.v-actions` | `data-part="footer"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** icons · **on by default** yes (motion.js) · **travelling selection / flow roles** press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-actions, v-attach, v-attach__meta, v-attach__name, v-disk, v-ibtn, v-icon
