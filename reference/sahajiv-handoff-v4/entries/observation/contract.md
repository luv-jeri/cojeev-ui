# Observation Badge / Stamp / Capability / Evidence — contract

- **id** `observation` · **tier** sahajiv · **evidence** I16 · **status** derived
- **root** `.v-stamp`
- **api** .v-stamp[.-stale] ("observed 09:12") · .v-badge.-live (dot + word) · .v-cap.-yes\|-no\|-unknown · details.v-collapsible for evidence · presence never implies liveness
- **isolation canvas** 720x320 · **files** `isolation/observation/`

## Modifiers
| class | meaning |
|---|---|
| `.-stale` | variant: stale — stale observation |

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
| `.v-stamp` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** pills · **on by default** yes (motion.js) · **travelling selection / flow roles** unfolds, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-cap, v-chev, v-collapsible, v-collapsible__body, v-dot, v-icon, v-stamp
