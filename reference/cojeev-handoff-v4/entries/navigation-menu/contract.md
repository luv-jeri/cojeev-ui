# Navigation Menu — contract

- **id** `navigation-menu` · **tier** base · **evidence** I15 · **status** source
- **root** `.v-nav`
- **api** .v-nav > __group + __item[aria-current=page] (pink text, 2 px marker) + __count · lives inside .v-sidebar · six destinations only — Ask Cojeev, Needs You, Quick Note and notifications are global affordances, never nav rows
- **isolation canvas** 480x480 · **files** `isolation/navigation-menu/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `selected` | .v-nav__item[aria-current=page] · data-state=active|inactive |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-nav` | `data-part="root"` |
| `.v-nav__group` | `data-part="group"` |
| `.v-nav__item` | `data-part="item"` |
| `.v-nav__count` | `data-part="indicator"` |

## Keyboard
Tab between items; Enter follows

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-icon, v-nav, v-nav__group, v-nav__item, v-nav__label
