# Kbd — contract

- **id** `kbd` · **tier** base · **evidence** Ext · **status** derived
- **root** `.v-kbd`
- **api** .v-kbd
- **isolation canvas** 480x240 · **files** `isolation/kbd/`

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
| `open` | details[open] · data-state=open|closed |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-kbd` | `data-part="root"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** pills · **on by default** yes (motion.js) · **travelling selection / flow roles** breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-body, v-kbd
