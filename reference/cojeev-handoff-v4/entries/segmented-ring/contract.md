# Segmented Ring — contract

- **id** `segmented-ring` · **tier** composite · **evidence** I09 I18 · **status** source
- **root** `.v-ring`
- **api** .v-ring[data-segs="colour:value,…"][data-sw][data-gap][.-draw] style="--sz" > .v-ring__c · thick rounded arcs, drawn once · the centre total, the legend and the .v-sr data table are all generated from data-segs, so they cannot disagree · under 420 px the ring shrinks and the legend stacks
- **isolation canvas** 480x360 · **files** `isolation/segmented-ring/`

## Modifiers
| class | meaning |
|---|---|
| `.-draw` | variant: draw — draws once on mount |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-ring` | `data-part="root"` |
| `.v-ring__c` | `data-part="indicator"` |

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
v-caption, v-hero, v-meta, v-ring, v-ring__c, v-tnum
