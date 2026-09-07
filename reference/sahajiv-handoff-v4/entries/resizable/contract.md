# Resizable — contract

- **id** `resizable` · **tier** base · **evidence** Ext I16 · **status** derived
- **root** `.v-resizable`
- **api** .v-resizable[data-resizable][.-v] style="--split:50%" > __pane + __handle + __pane · pointer drag, ArrowLeft/Right, role=separator
- **isolation canvas** 720x320 · **files** `isolation/resizable/`

## Modifiers
| class | meaning |
|---|---|
| `.-v` | variant: v — vertical |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-resizable` | `data-part="root"` |
| `.v-resizable__pane` | `data-part="content"` |
| `.v-resizable__handle` | `data-part="thumb"` |

## Keyboard
ArrowLeft/Right move the handle (role=separator)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-meta, v-resizable, v-resizable__handle, v-resizable__pane
