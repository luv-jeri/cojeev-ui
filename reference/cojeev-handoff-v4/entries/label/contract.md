# Label — contract

- **id** `label` · **tier** base · **evidence** I07 · **status** source
- **root** `.v-label`
- **api** .v-label[.-sm] (bold display label) · .v-caps (10–11 px tracked caption for stats)
- **isolation canvas** 480x240 · **files** `isolation/label/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
`.-sm`

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-label` | `data-part="root"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** none · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-label, v-stat, v-stats
