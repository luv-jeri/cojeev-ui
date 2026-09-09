# Menubar — contract

- **id** `menubar` · **tier** base · **evidence** Ext · **status** derived
- **root** `.v-menubar`
- **api** .v-menubar > .v-menubar__trigger[data-menu] · hover moves between open menus · keyboard as Dropdown
- **isolation canvas** 480x360 · **files** `isolation/menubar/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-menubar__trigger[aria-expanded=true] · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-menubar` | `data-part="root"` |
| `.v-menubar__trigger` | `data-part="trigger"` |
| `.v-menu` | `data-part="content"` |
| `.v-menu__item` | `data-part="item"` |

## Keyboard
as Dropdown; ArrowLeft/Right move between open menus

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-menu, v-menu__item, v-menubar, v-menubar__trigger, v-menuhost
