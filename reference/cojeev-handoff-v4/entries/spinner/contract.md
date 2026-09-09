# Loading — contract

- **id** `spinner` · **tier** base · **evidence** Ext · **status** derived
- **root** `.v-pulse`
- **api** .v-pulse[data-label] is the ONE loading language: the seed — a pebble in the interaction pink that slowly becomes the four-point brand star and settles back, turning as it works, with an ink centre that breathes · announces "Working" · inside a button it replaces the icon and locks the width · sizes via --pulse, hue via --pulse-c · a still star under reduced motion · no ring spinners anywhere
- **isolation canvas** 480x240 · **files** `isolation/spinner/`

## Modifiers
| class | meaning |
|---|---|
| `.-point` | variant: point |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `busy` | [aria-busy=true] — label swapped for .v-pulse, width locked |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-pulse` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** skeleton · **on by default** yes (motion.js) · **travelling selection / flow roles** press, paces
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-async, v-async__row, v-btn, v-pulse, v-quiet, v-skel, v-skel-group
