# Scroll Area — contract

- **id** `scroll-area` · **tier** base · **evidence** I07 · **status** source
- **root** `.v-scroll`
- **api** .v-scroll[.-ink] style="--h" · thin warm scrollbar; cream on black panels
- **isolation canvas** 480x240 · **files** `isolation/scroll-area/`

## Modifiers
| class | meaning |
|---|---|
| `.-ink` | variant: ink — ink fill, cream text |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-scroll` | `data-part="root"` |
| `.v-scroll>*` | `data-part="viewport"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-body, v-card, v-scroll
