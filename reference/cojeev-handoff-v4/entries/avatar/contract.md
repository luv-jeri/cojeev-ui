# Avatar — contract

- **id** `avatar` · **tier** base · **evidence** I04 I11 I18 · **status** source
- **root** `.v-avatar`
- **api** .v-avatar[.-square][.-lg] · .v-hex + .v-hexgroup · .v-avatar-wrap > .v-edit (star-4 badge)
- **isolation canvas** 480x240 · **files** `isolation/avatar/`

## Modifiers
| class | meaning |
|---|---|
| `.-square` | variant: square — square avatar |

## Sizes
`.-lg`

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
| `.v-avatar` | `data-part="root"` |
| `.v-avatar>span` | `data-part="fallback"` |
| `.v-avatar-stack` | `data-part="group"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** controls · **on by default** no (motion.js) · **travelling selection / flow roles** breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-avatar, v-avatar-stack, v-avatar-wrap, v-edit, v-hex, v-hexgroup, v-icon, v-meta, v-more, v-shape
