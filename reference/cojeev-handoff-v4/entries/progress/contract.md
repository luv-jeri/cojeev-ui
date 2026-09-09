# Progress — contract

- **id** `progress` · **tier** base · **evidence** I04 I09 I16 · **status** source
- **root** `.v-track`
- **api** .v-track[.-lg\|.-sm\|.-cream\|.-unavail] > i[style=--p;--c] · role=progressbar · .v-prow row (disk + label + track + value "of 10")
- **isolation canvas** 480x240 · **files** `isolation/progress/`

## Modifiers
| class | meaning |
|---|---|
| `.-cream` | variant: cream — cream fill |
| `.-unavail` | variant: unavail — unavailable, never 0 |

## Sizes
`.-lg`, `.-sm`

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-track` | `data-part="root"` |
| `.v-track>i` | `data-part="indicator"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** controls · **on by default** no (motion.js) · **travelling selection / flow roles** paces
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-meta, v-track
