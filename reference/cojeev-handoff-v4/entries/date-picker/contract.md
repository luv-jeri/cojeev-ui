# Date Picker — contract

- **id** `date-picker` · **tier** base · **evidence** I07 I15 · **status** source
- **root** `.v-menuhost[data-datepicker]`
- **api** .v-menuhost[data-datepicker] > button.v-select.-ink > [data-value] + .v-popover > .v-cal[data-cal] · Escape closes, focus returns
- **isolation canvas** 480x520 · **files** `isolation/date-picker/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-select[aria-expanded=true] · data-state=open|closed |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-menuhost[data-datepicker]` | `data-part="root"` |
| `.v-menuhost[data-datepicker]>.v-select` | `data-part="trigger"` |
| `.v-popover` | `data-part="content"` |
| `.v-cal` | `data-part="viewport"` |

## Keyboard
as Select to open; as Calendar inside

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press, opens
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-cal, v-icon, v-menuhost, v-popover, v-select
