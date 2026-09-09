# Notification Drawer + Needs You Access — contract

- **id** `notifications` · **tier** cojeev · **evidence** I12 · **status** derived
- **root** `.v-utility`
- **api** .v-utility bell with unread dot · sheet of durable events (read/unread) · Needs You count links to the read-only inbox
- **isolation canvas** 720x520 · **files** `isolation/notifications/`

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
| `open` | layer :not([hidden]) · data-state=open|closed |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-utility` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** icons · **on by default** yes (motion.js) · **travelling selection / flow roles** group, press, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-dialog__head, v-disk, v-ibtn, v-icon, v-needs, v-needs__meta, v-needs__reason, v-section, v-sheet, v-utility
