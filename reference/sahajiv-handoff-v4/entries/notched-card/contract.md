# Notched Action Card — contract

- **id** `notched-card` · **tier** composite · **evidence** I05 I11 I17 · **status** source
- **root** `.v-notchwrap`
- **api** .v-notchwrap > .v-notch[.-pink\|-blue\|-yellow] (mask cut, --nd circle size, --nc clearance) + .v-ibtn (black circle in the notch) · .v-attached (pink circle on a card corner)
- **isolation canvas** 720x360 · **files** `isolation/notched-card/`

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
| `.v-notchwrap` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** icons · **on by default** yes (motion.js) · **travelling selection / flow roles** press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-attached, v-badge, v-body, v-body-2, v-card, v-card__title, v-ibtn, v-icon, v-meta, v-notch, v-notchwrap
