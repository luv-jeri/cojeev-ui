# Checkbox — contract

- **id** `checkbox` · **tier** base · **evidence** I07 · **status** source
- **root** `.v-check`
- **api** label.v-check > input[type=checkbox] · states checked / indeterminate / disabled
- **isolation canvas** 480x240 · **files** `isolation/checkbox/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `checked` | input:checked |
| `indeterminate` | input.indeterminate (JS) · data-state=indeterminate |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `disabled` | [disabled] / :disabled — flat face var(--v-disabled-face), edge var(--v-disabled-edge), ink var(--v-disabled-ink) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-check` | `data-part="root"` |
| `.v-check input` | `data-part="indicator"` |

## Keyboard
Space toggles

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** controls · **on by default** no (motion.js) · **travelling selection / flow roles** toggles, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-check, v-check__body, v-checks
