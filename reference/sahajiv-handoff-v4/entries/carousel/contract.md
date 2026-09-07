# Carousel — contract

- **id** `carousel` · **tier** base · **evidence** I11 · **status** source
- **root** `.v-carousel`
- **api** .v-carousel[data-carousel] > __track (scroll-snap) + __nav · .v-deck (offset stacked cards)
- **isolation canvas** 960x360 · **files** `isolation/carousel/`

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
| `.v-carousel` | `data-part="root"` |
| `.v-carousel__track` | `data-part="viewport"` |
| `.v-carousel__track>*` | `data-part="item"` |
| `.v-carousel__nav button` | `data-part="trigger"` |
| `.v-carousel__dots button` | `data-part="indicator"` |

## Keyboard
Prev/Next buttons; the track scrolls with arrow keys when focused

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-body-2, v-card, v-card__title, v-carousel, v-carousel__nav, v-carousel__track, v-deck, v-ibtn, v-icon
