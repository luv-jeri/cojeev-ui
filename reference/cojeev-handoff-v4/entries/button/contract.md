# Button — contract

- **id** `button` · **tier** base · **evidence** I07 I15 I18 · **status** source
- **root** `.v-btn`
- **api** .v-btn[.-accent\|-secondary\|-ghost\|-outline\|-danger][.-sm\|-lg\|-block] · states: :hover :active :focus-visible :disabled [aria-busy] · add data-morph for the alive body
- **isolation canvas** 480x240 · **files** `isolation/button/`

## Modifiers
| class | meaning |
|---|---|
| `.-accent` | variant: accent — pink interaction fill |
| `.-secondary` | variant: secondary — beige fill |
| `.-ghost` | variant: ghost — text only |
| `.-outline` | variant: outline — hairline edge, no fill |
| `.-danger` | variant: danger — destructive, danger fill |
| `.-block` | variant: block — full width |

## Sizes
`.-sm`, `.-lg`

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `disabled` | [disabled] / :disabled — flat face var(--v-disabled-face), edge var(--v-disabled-edge), ink var(--v-disabled-ink) |
| `busy` | [aria-busy=true] — label swapped for .v-pulse, width locked |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-btn` | `data-part="root"` |
| `.v-btn .v-pulse` | `data-part="indicator"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** buttons · **on by default** yes (motion.js) · **travelling selection / flow roles** press, paces
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-icon, v-meta, v-pulse
