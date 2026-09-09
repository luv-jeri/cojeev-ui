# Breadcrumb — contract

- **id** `breadcrumb` · **tier** base · **evidence** I16 · **status** source
- **root** `.v-crumbs`
- **api** .v-crumbs > .v-ibtn.-dashed (back) + a + separator icon + [aria-current=page]
- **isolation canvas** 480x240 · **files** `isolation/breadcrumb/`

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

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-crumbs` | `data-part="root"` |
| `.v-crumbs a` | `data-part="item"` |
| `[aria-current=page]` | `data-part="page"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** press, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-crumbs, v-ibtn, v-icon
