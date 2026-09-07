# Command — contract

- **id** `command` · **tier** base · **evidence** Ext I15 · **status** derived
- **root** `.v-cmd`
- **api** .v-cmd[data-command] > __input + __list (.v-menu__group / .v-menu__item) + __empty · filter across groups, arrow keys, Enter
- **isolation canvas** 480x420 · **files** `isolation/command/`

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
| `.v-cmd` | `data-part="root"` |
| `.v-cmd__input input` | `data-part="trigger"` |
| `.v-cmd__list` | `data-part="content"` |
| `.v-cmd__list .v-menu__item` | `data-part="item"` |
| `.v-menu__group` | `data-part="group"` |
| `.v-cmd__empty` | `data-part="empty"` |

## Keyboard
typing filters across groups; arrows; Enter

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** group, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-cmd, v-cmd__empty, v-cmd__input, v-cmd__list, v-disk, v-icon, v-kbd, v-menu__group, v-menu__item
