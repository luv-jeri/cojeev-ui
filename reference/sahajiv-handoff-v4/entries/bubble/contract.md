# Bubble — contract

- **id** `bubble` · **tier** base · **evidence** I09 I16 · **status** source
- **root** `.v-chat`
- **api** .v-chat > .v-chat__row[.-me] > .v-avatar? + .v-bubble[.-me][.-tail] · __time · cream on ink, pink for the person, tail on the last bubble of a run
- **isolation canvas** 480x240 · **files** `isolation/bubble/`

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
| `.v-chat` | `data-part="root"` |
| `.v-chat__row` | `data-part="item"` |
| `.v-bubble` | `data-part="content"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** enters, breathes
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-avatar, v-bubble, v-chat, v-chat__gap, v-chat__row, v-chat__time
