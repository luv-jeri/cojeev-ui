# Marker — contract

- **id** `marker` · **tier** base · **evidence** Ext I09 · **status** derived
- **root** `.v-marker`
- **api** .v-marker[.-ok\|.-danger] · dashed rule with a short status note inside a transcript
- **isolation canvas** 480x240 · **files** `isolation/marker/`

## Modifiers
| class | meaning |
|---|---|
| `.-ok` | variant: ok — success |
| `.-danger` | variant: danger — destructive, danger fill |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-marker` | `data-part="root"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-bubble, v-marker
