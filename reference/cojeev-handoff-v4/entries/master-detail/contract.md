# Connected Master / Detail — contract

- **id** `master-detail` · **tier** composite · **evidence** I15 · **status** source
- **root** `.v-md`
- **api** .v-md > __list (.v-item.-selected bridges into the detail with a pink bar) + __detail (pink panel) · collapses to stacked under 900 px
- **isolation canvas** 960x520 · **files** `isolation/master-detail/`

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
| `selected` | .-selected |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-md` | `data-part="root"` |
| `.v-md__list` | `data-part="viewport"` |
| `.v-md__list .v-item` | `data-part="item"` |
| `.v-md__detail` | `data-part="content"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-btn, v-disk, v-icon, v-id, v-item, v-item__body, v-item__sub, v-item__title, v-md, v-md__actions, v-md__chips, v-md__detail, v-md__facts, v-md__head, v-md__host, v-md__list, v-md__title, v-md__titles, v-meta, v-time
