# Calendar — contract

- **id** `calendar` · **tier** base · **evidence** I15 · **status** source
- **root** `.v-cal`
- **api** .v-cal[data-cal][data-selected=YYYY-MM-DD] · grid roles, arrow-key navigation across months, pink selected disk, week numbers · emits v-date
- **isolation canvas** 480x480 · **files** `isolation/calendar/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `selected` | .v-cal__d[aria-selected=true] · data-state=active|inactive |
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-cal` | `data-part="root"` |
| `.v-cal__grid` | `data-part="viewport"` |
| `.v-cal__d` | `data-part="item"` |
| `.v-cal__head .v-ibtn` | `data-part="trigger"` |

## Keyboard
Arrow keys move the focused day across month boundaries; Enter selects; PageUp/Down change month

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-cal
