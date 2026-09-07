# Dropdown Menu — contract

- **id** `dropdown-menu` · **tier** base · **evidence** I18 · **status** source
- **root** `[data-menu]`
- **api** [data-menu="#id"] trigger + .v-menu (group, item, sep, -danger) · ArrowUp/Down, Home/End, typeahead, Escape returns focus
- **isolation canvas** 480x360 · **files** `isolation/dropdown-menu/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | [data-menu][aria-expanded=true] · .v-menu:not([hidden]) · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `[data-menu]` | `data-part="trigger"` |
| `.v-menu` | `data-part="content"` |
| `.v-menu__item` | `data-part="item"` |
| `.v-menu__sep` | `data-part="separator"` |
| `.v-menu__group` | `data-part="group"` |

## Keyboard
ArrowUp/Down, Home/End, typeahead, Escape returns focus

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** none · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-ibtn, v-icon, v-menu, v-menu__group, v-menu__item, v-menu__sep, v-menuhost
