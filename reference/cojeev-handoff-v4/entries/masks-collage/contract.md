# Shape Masks / Collage — contract

- **id** `masks-collage` · **tier** composite · **evidence** I03 I13 I20 · **status** source
- **root** `.v-collage`
- **api** .v-mask.-circle\|-blob (photo clip) · .v-collage (beige r40 canvas, ≤7 shapes, 2 photos, black .v-caption-pill) · z-order photo < shape < label · flat, no shadows
- **isolation canvas** 720x480 · **files** `isolation/masks-collage/`

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

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-collage` | `data-part="root"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-caption-pill, v-collage, v-mask, v-shape
