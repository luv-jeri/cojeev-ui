# Stepper — contract

- **id** `stepper` · **tier** base · **evidence** Ext · **status** derived
- **root** `.v-stepper-flow`
- **api** .v-stepper-flow[data-stepper] · numbered stages joined by a hairline; the current stage carries the gliding selection shape, completed stages fill olive with a check, and Back/Next move both the state and the announcement
- **isolation canvas** 720x240 · **files** `isolation/stepper/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `selected` | .v-step[aria-current=step] · .-done for completed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-stepper-flow` | `data-part="root"` |
| `.v-step` | `data-part="item"` |
| `.v-step__n` | `data-part="indicator"` |
| `.v-step__t` | `data-part="label"` |

## Keyboard
Back/Next buttons move the current step

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group, press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-quiet, v-step, v-step__n, v-step__t, v-stepper-flow
