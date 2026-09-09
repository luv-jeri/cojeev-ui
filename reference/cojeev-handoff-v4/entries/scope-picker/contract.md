# Project Scope Picker + Default Project Action — contract

- **id** `scope-picker` · **tier** cojeev · **evidence** I11 · **status** derived
- **root** `.v-scopecard`
- **api** .v-select.-block with a disk · viewing ≠ default: an .v-alert.-info names both · default change is a separate .v-btn with outcome
- **isolation canvas** 480x420 · **files** `isolation/scope-picker/`

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
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |
| `open` | layer :not([hidden]) · data-state=open|closed |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-scopecard` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** buttons · **on by default** yes (motion.js) · **travelling selection / flow roles** group, press, opens, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-alert, v-alert__blob, v-alert__body, v-alert__text, v-alert__title, v-badge, v-btn, v-caps, v-disk, v-icon, v-listbox, v-menu, v-menu__item, v-menuhost, v-scopecard, v-select
