# Select — contract

- **id** `select` · **tier** base · **evidence** I07 I11 I15 · **status** source
- **root** `.v-menuhost[data-select]`
- **api** .v-menuhost[data-select] > button.v-select[.-ink\|.-block\|.-sm] > [data-value] + .v-listbox.v-menu > .v-menu__item[aria-selected] · listbox keyboard · emits v-change
- **isolation canvas** 480x360 · **files** `isolation/select/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-select[aria-expanded=true] + .v-listbox:not([hidden]) · data-state=open|closed |
| `selected` | .v-menu__item[aria-selected=true] |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-menuhost[data-select]` | `data-part="root"` |
| `.v-menuhost[data-select]>.v-select` | `data-part="trigger"` |
| `.v-listbox` | `data-part="content"` |
| `.v-listbox .v-menu__item` | `data-part="item"` |

## Keyboard
ArrowUp/Down move, Enter picks, Escape closes and returns focus

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-disk, v-icon, v-listbox, v-menu, v-menu__item, v-menuhost, v-select
