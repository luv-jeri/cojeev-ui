# Input Group — contract

- **id** `input-group` · **tier** base · **evidence** I15 · **status** source
- **root** `.v-igroup`
- **api** .v-igroup > .v-addon + input + .v-btn\|.v-badge · topbar variant: .v-search (pink disk + cream field + scope chips)
- **isolation canvas** 480x240 · **files** `isolation/input-group/`

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
| `.v-igroup` | `data-part="root"` |
| `.v-addon` | `data-part="addon"` |
| `.v-igroup input` | `data-part="input"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** inputs · **on by default** no (motion.js) · **travelling selection / flow roles** press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-addon, v-badge, v-btn, v-ibtn, v-icon, v-igroup, v-input, v-scope, v-search, v-search__disk, v-sep
