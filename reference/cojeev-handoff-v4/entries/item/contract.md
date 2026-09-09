# Item — contract

- **id** `item` · **tier** base · **evidence** I11 I15 I16 · **status** source
- **root** `.v-item`
- **api** .v-item[.-selected\|.-flat] > .v-disk + __body(__title, __sub) + trailing .v-time\|.v-badge\|chevron · .v-list[.-grouped]
- **isolation canvas** 480x240 · **files** `isolation/item/`

## Modifiers
| class | meaning |
|---|---|
| `.-selected` | variant: selected — selected row |
| `.-flat` | variant: flat — no fill |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `selected` | .v-item.-selected · .-selected |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-list` | `data-part="root"` |
| `.v-item` | `data-part="item"` |
| `.v-item__body` | `data-part="content"` |
| `.v-item__title` | `data-part="title"` |
| `.v-item__sub` | `data-part="description"` |
| `.v-time` | `data-part="trailing"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-disk, v-icon, v-item, v-item__body, v-item__sub, v-item__title, v-list, v-time
