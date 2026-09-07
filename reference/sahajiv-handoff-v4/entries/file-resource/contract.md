# File / Resource / Featured Media Cards — contract

- **id** `file-resource` · **tier** composite · **evidence** I16 I17 · **status** source
- **root** `.v-file`
- **api** .v-file (tag, date, ⋮, title, thumb) · .v-resource > __head[.-blue] + __body + __link · .v-feature (pink 1.5 px outline, media + text panel, play circle)
- **isolation canvas** 960x520 · **files** `isolation/file-resource/`

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
| `.v-file` | `data-part="root"` |

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
v-badge, v-body-2, v-disk, v-dot, v-feature, v-feature__body, v-feature__media, v-file, v-file__thumb, v-file__title, v-file__top, v-ibtn, v-icon, v-kv, v-meta, v-play, v-resource, v-resource__body, v-resource__head, v-resource__link, v-title
