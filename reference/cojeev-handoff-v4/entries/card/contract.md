# Card — contract

- **id** `card` · **tier** base · **evidence** I07 I11 I15 I17 · **status** source
- **root** `.v-card`
- **api** .v-card[.-pink\|-yellow\|-olive\|-blue\|-ink\|-cream\|-featured][.-sm\|-panel][.-lift] > .v-wm.v-shape (watermark) + __head + __title
- **isolation canvas** 480x240 · **files** `isolation/card/`

## Modifiers
| class | meaning |
|---|---|
| `.-pink` | variant: pink — category pink |
| `.-yellow` | variant: yellow — category yellow |
| `.-olive` | variant: olive — category olive |
| `.-blue` | variant: blue — category blue |
| `.-ink` | variant: ink — ink fill, cream text |
| `.-cream` | variant: cream — cream fill |
| `.-featured` | variant: featured — 1.5 px pink outline on cream |
| `.-panel` | variant: panel — panel radius 24 |
| `.-lift` | variant: lift — lifts on hover |

## Sizes
`.-sm`

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-card` | `data-part="root"` |
| `.v-card__head` | `data-part="header"` |
| `.v-card__title` | `data-part="title"` |
| `.v-wm` | `data-part="watermark"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-body-2, v-card, v-card__title, v-shape, v-stat, v-stats, v-wm
