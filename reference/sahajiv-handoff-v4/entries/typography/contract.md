# Typography — contract

- **id** `typography` · **tier** base · **evidence** I03 · **status** source
- **root** `.v-prose`
- **api** .v-hero .v-display .v-section .v-title .v-lead .v-body .v-body-2 .v-control .v-meta .v-caps .v-value(.u) .v-id · .v-prose for documents · Bricolage Grotesque (display) + DM Sans (text) stand in for Acorn + TT Commons
- **isolation canvas** 720x480 · **files** `isolation/typography/`

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

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-prose` | `data-part="root"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** none · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-body-2, v-caps, v-hero, v-id, v-meta, v-prose, v-value
