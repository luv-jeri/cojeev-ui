# Collapsible — contract

- **id** `collapsible` · **tier** base · **evidence** Ext I11 · **status** derived
- **root** `.v-collapsible`
- **api** details.v-collapsible > summary + __body · for technical detail behind plain language
- **isolation canvas** 480x240 · **files** `isolation/collapsible/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | details[open] · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-collapsible` | `data-part="root"` |
| `.v-collapsible>summary` | `data-part="trigger"` |
| `.v-collapsible__body` | `data-part="content"` |
| `.v-collapsible .v-chev` | `data-part="indicator"` |

## Keyboard
Enter/Space toggles

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** unfolds
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-chev, v-collapsible, v-collapsible__body, v-icon, v-id
