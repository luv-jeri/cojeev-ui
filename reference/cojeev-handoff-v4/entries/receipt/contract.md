# Action Receipt / Receipt Timeline — contract

- **id** `receipt` · **tier** cojeev · **evidence** I15 (agenda) · **status** derived
- **root** `.v-receipt`
- **api** .v-receipt > (__dot.-ok\|-pending\|-danger\|-you + __row(__title, __meta))× · requested → pending → outcome with evidence · pending never renders as success
- **isolation canvas** 720x420 · **files** `isolation/receipt/`

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
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-receipt` | `data-part="root"` |
| `.v-receipt__dot` | `data-part="indicator"` |
| `.v-receipt__row` | `data-part="item"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, paces, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-btn, v-icon, v-id, v-pulse, v-receipt, v-receipt__dot, v-receipt__meta, v-receipt__row, v-receipt__title
