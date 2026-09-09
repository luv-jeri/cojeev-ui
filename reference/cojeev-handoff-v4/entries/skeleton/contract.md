# Skeleton — contract

- **id** `skeleton` · **tier** base · **evidence** Ext · **status** derived
- **root** `.v-skel`
- **api** .v-skel[.-line\|.-disk\|.-card] inside .v-skel-group — a familiar placeholder that mirrors the layout it replaces, with a slow warm sweep (cream travelling through beige) rather than a grey pulse · lines vary in width so a paragraph reads as a paragraph · sweep stops under reduced motion
- **isolation canvas** 480x240 · **files** `isolation/skeleton/`

## Modifiers
| class | meaning |
|---|---|
| `.-line` | variant: line |
| `.-disk` | variant: disk |
| `.-card` | variant: card |
| `.-skel-group` | variant: skel-group |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

### Data states
- `loading`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-skel-group` | `data-part="root"` |
| `.v-skel` | `data-part="item"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** skeleton · **on by default** yes (motion.js) · **travelling selection / flow roles** paces
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-async, v-async__row, v-card, v-pulse, v-quiet, v-skel, v-skel-group
