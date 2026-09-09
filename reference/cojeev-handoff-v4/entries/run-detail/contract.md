# Run Row / Run Detail / Fork Preview / Test badge — contract

- **id** `run-detail` · **tier** cojeev · **evidence** I18 · **status** derived
- **root** `.v-receipt`
- **api** run row = table row with status pill · detail = .v-receipt timeline with plain summary + technical code behind .v-collapsible + one next action · fork preview lists reuse vs re-run · .v-badge.-test persists on test results
- **isolation canvas** 960x600 · **files** `isolation/run-detail/`

## Modifiers
| class | meaning |
|---|---|
| `.-collapsible` | variant: collapsible |

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
| `.v-receipt` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, unfolds, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-alert, v-alert__body, v-alert__text, v-alert__title, v-badge, v-btn, v-card, v-chev, v-collapsible, v-collapsible__body, v-icon, v-id, v-meta, v-stamp
