# Alert — contract

- **id** `alert` · **tier** base · **evidence** I12 I16 · **status** source
- **root** `.v-alert`
- **api** .v-alert.-info\|-ok\|-warn\|-danger\|-pink · icon + __title + __text · word carries meaning, never colour alone
- **isolation canvas** 720x240 · **files** `isolation/alert/`

## Modifiers
| class | meaning |
|---|---|
| `.-info` | variant: info — informational |
| `.-ok` | variant: ok — success |
| `.-warn` | variant: warn — warning |
| `.-danger` | variant: danger — destructive, danger fill |
| `.-pink` | variant: pink — category pink |

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
| `.v-alert` | `data-part="root"` |
| `.v-alert__blob` | `data-part="icon"` |
| `.v-alert__title` | `data-part="title"` |
| `.v-alert__text` | `data-part="description"` |
| `.v-alert__close` | `data-part="close"` |
| `.v-alert__actions` | `data-part="footer"` |

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
v-alert, v-alert__actions, v-alert__blob, v-alert__body, v-alert__close, v-alert__kicker, v-alert__text, v-alert__title, v-btn, v-ibtn, v-icon
