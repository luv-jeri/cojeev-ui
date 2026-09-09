# Agent Card + Health Line — contract

- **id** `health-line` · **tier** cojeev · **evidence** I15 · **status** derived
- **root** `.v-health`
- **api** .v-health.-ok\|-check\|-you\|-none > icon + .v-word + .v-age + .v-next (one real next action) · four states: Working · Needs a check · Needs You · Not checked yet
- **isolation canvas** 720x420 · **files** `isolation/health-line/`

## Modifiers
| class | meaning |
|---|---|
| `.-ok` | variant: ok — success |
| `.-check` | variant: check — needs a check |
| `.-you` | variant: you — needs you |
| `.-none` | variant: none — not checked yet |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `checked` | input:checked · data-state=checked|unchecked |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-health` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** buttons · **on by default** yes (motion.js) · **travelling selection / flow roles** press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-age, v-btn, v-card, v-disk, v-health, v-icon, v-next, v-word
