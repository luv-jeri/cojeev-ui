# Drawer — contract

- **id** `drawer` · **tier** base · **evidence** I07 · **status** source
- **root** `.v-drawer`
- **api** .v-drawer[data-drawer] black bottom panel attached above the dock · [data-drawer-open] · Escape / scrim / [data-close]
- **isolation canvas** 480x480 · **files** `isolation/drawer/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-drawer:not([hidden]) · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-drawer` | `data-part="content"` |
| `[data-drawer-open]` | `data-part="trigger"` |
| `[data-close]` | `data-part="close"` |

## Keyboard
as Dialog

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-disk, v-dockpanel__title, v-drawer, v-ibtn, v-icon, v-item, v-item__body, v-item__title
