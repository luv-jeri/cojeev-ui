# Profile Header / Identity Band / Record Card — contract

- **id** `profile-record` · **tier** composite · **evidence** I11 I16 · **status** source
- **root** `.v-profile`
- **api** .v-profile (portrait + star edit badge, display name, caps metadata) · .v-band (olive id band) · .v-record > __head[.-blue\|-pink\|-olive] (disk, title, id pill, watermark) + __body (.v-kv) + __foot
- **isolation canvas** 960x480 · **files** `isolation/profile-record/`

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
| `.v-profile` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** enters, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-avatar, v-avatar-wrap, v-badge, v-band, v-disk, v-edit, v-icon, v-id, v-kv, v-profile, v-profile__meta, v-profile__name, v-record, v-record__body, v-record__foot, v-record__head, v-record__title, v-shape, v-stat, v-wm
