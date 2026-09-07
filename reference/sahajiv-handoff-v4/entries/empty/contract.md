# Empty — contract

- **id** `empty` · **tier** base · **evidence** I12 · **status** source
- **root** `.v-empty`
- **api** .v-empty > .v-shape + __title + __text + .v-btn · variants: first-run (shape) · cleared (word only) · error (crescent, "Ooops!", Retry) · filtered-empty uses .v-state.-filtered
- **isolation canvas** 960x360 · **files** `isolation/empty/`

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

### Data states
- `first-run`
- `cleared`
- `error`
- `filtered-empty`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-empty` | `data-part="root"` |
| `.v-empty__title` | `data-part="title"` |
| `.v-empty__text` | `data-part="description"` |
| `.v-empty .v-btn` | `data-part="action"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-card, v-empty, v-empty__text, v-empty__title, v-icon, v-shape, v-state, v-state__why, v-state__word
