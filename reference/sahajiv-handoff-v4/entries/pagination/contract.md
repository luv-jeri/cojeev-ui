# Pagination — contract

- **id** `pagination` · **tier** base · **evidence** Ext I18 · **status** derived
- **root** `.v-pager`
- **api** .v-pager[data-pager][data-pages][data-page] · windowed pages, prev/next, "Page n of N" · emits v-page
- **isolation canvas** 480x240 · **files** `isolation/pagination/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `selected` | [aria-current=page] |
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-pager` | `data-part="root"` |
| `.v-pager button` | `data-part="item"` |

## Keyboard
Tab to a page button, Enter

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-pager
