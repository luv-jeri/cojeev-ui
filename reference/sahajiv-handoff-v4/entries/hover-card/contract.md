# Hover Card — contract

- **id** `hover-card` · **tier** base · **evidence** Ext · **status** derived
- **root** `[data-hovercard]`
- **api** [data-hovercard="#id"] trigger + .v-hovercard > .v-popover · 300 ms delay, stays while hovered, focus opens
- **isolation canvas** 480x360 · **files** `isolation/hover-card/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-hovercard .v-popover.-show |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `[data-hovercard]` | `data-part="trigger"` |
| `.v-hovercard>.v-popover` | `data-part="content"` |

## Keyboard
focus on the trigger opens; blur or Escape closes

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** none · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-age, v-body, v-disk, v-health, v-hovercard, v-icon, v-meta, v-popover, v-word
