# Mini Calendar / Agenda / Weekly Grid — contract

- **id** `calendars` · **tier** composite · **evidence** I15 I18 · **status** source
- **root** `.v-week`
- **api** .v-cal[data-cal] (date selection) · .v-agenda (30-min slots, .v-agenda__now pill+dashed) · .v-week (7 columns, day headers, 30-min rows of 56 px, events positioned by --start/--dur, overlap = side-by-side) · mobile shows agenda, never 7 columns
- **isolation canvas** 1280x720 · **files** `isolation/calendars/`

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
| `.v-week` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** buttons · **on by default** yes (motion.js) · **travelling selection / flow roles** press, enters, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-agenda__now, v-badge, v-btn, v-event, v-event__sub, v-event__title, v-hex, v-hexgroup, v-icon, v-more, v-time, v-week, v-week__col, v-week__day, v-week__gutter, v-week__t, v-weekwrap
