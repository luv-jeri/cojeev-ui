# AI Apps · App card, Capability matrix, Usage limit, Model row — contract

- **id** `ai-apps` · **tier** sahajiv · **evidence** I18 · **status** derived
- **root** `.v-card.-ai`
- **api** app card (identity, version, sign-in, observed time) · capability matrix as a real table of .v-cap cells with an evidence column · .v-usage[.-unavail] (used, window, reset; null renders "unavailable", never 0) · model rows with effort values and their source
- **isolation canvas** 960x600 · **files** `isolation/ai-apps/`

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
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |

### Data states
- `full`
- `unavail`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-card.-ai` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** group, paces, enters, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-cap, v-card, v-disk, v-dot, v-icon, v-meta, v-sr, v-tab, v-table, v-table-wrap, v-tabs, v-track, v-usage, v-usage__row
