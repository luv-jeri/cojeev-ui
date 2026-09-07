# Combobox — contract

- **id** `combobox` · **tier** base · **evidence** I07 · **status** source
- **root** `.v-combo`
- **api** .v-combo[data-combo] > .v-input > input + .v-menu > .v-menu__item · filter, highlight, ArrowUp/Down, Enter, Escape · emits v-pick
- **isolation canvas** 480x360 · **files** `isolation/combobox/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-menu:not([hidden]) · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-combo` | `data-part="root"` |
| `.v-combo .v-input input` | `data-part="trigger"` |
| `.v-combo .v-menu` | `data-part="content"` |
| `.v-combo .v-menu__item` | `data-part="item"` |

## Keyboard
typing filters; ArrowUp/Down highlight; Enter picks; Escape closes

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** inputs · **on by default** no (motion.js) · **travelling selection / flow roles** group, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-combo, v-disk, v-icon, v-input, v-menu, v-menu__item
