# Data State Panel — contract

- **id** `data-state` · **tier** sahajiv · **evidence** — · **status** derived
- **root** `.v-state`
- **api** .v-state.-loading\|-empty\|-filtered\|-partial\|-stale\|-unavail\|-error > __word + __why + action · null usage → "unavailable", never 0 · pending ≠ success
- **isolation canvas** 960x420 · **files** `isolation/data-state/`

## Modifiers
| class | meaning |
|---|---|
| `.-loading` | variant: loading — loading |
| `.-empty` | variant: empty — empty |
| `.-filtered` | variant: filtered — filtered-empty |
| `.-partial` | variant: partial — partial data |
| `.-stale` | variant: stale — stale observation |
| `.-unavail` | variant: unavail — unavailable, never 0 |
| `.-error` | variant: error — error |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `error` | .-error modifier |

### Data states
- `loading`
- `empty`
- `filtered`
- `partial`
- `stale`
- `unavail`
- `error`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-state` | `data-part="root"` |
| `.v-state__word` | `data-part="title"` |
| `.v-state__why` | `data-part="description"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, paces, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-btn, v-icon, v-skel, v-stamp, v-state, v-state__why, v-state__word
