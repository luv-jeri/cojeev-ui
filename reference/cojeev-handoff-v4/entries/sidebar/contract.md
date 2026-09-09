# Sidebar — contract

- **id** `sidebar` · **tier** base · **evidence** I15 I16 I17 I18 · **status** source
- **root** `.v-sidebar`
- **api** .v-sidebar (detached black rail, r24) > .v-brand + .v-collapse + .v-nav (six destinations, pink marker + breathing dot on the current one) + .v-sidebar__foot · width 212 expanded / 76 collapsed · the primitive is sized by its parent, never by the viewport, so it is safe inside a narrow container
- **isolation canvas** 480x640 · **files** `isolation/sidebar/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `collapsed` | .v-sidebar.-mini |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-sidebar` | `data-part="root"` |
| `.v-brand` | `data-part="header"` |
| `.v-collapse` | `data-part="trigger"` |
| `.v-nav` | `data-part="viewport"` |
| `.v-sidebar__foot` | `data-part="footer"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-brand, v-btn, v-collapse, v-frame, v-icon, v-meta, v-nav, v-nav__group, v-nav__item, v-nav__label, v-rail-demo, v-sidebar, v-sidebar__foot
