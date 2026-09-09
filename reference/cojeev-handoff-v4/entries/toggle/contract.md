# Toggle — contract

- **id** `toggle` · **tier** base · **evidence** I07 I18 · **status** source
- **root** `.v-toggle`
- **api** .v-toggle[data-toggle][aria-pressed][.-pink\|.-circle]
- **isolation canvas** 480x240 · **files** `isolation/toggle/`

## Modifiers
| class | meaning |
|---|---|
| `.-pressed` | variant: pressed |
| `.-pink` | variant: pink — category pink |
| `.-circle` | variant: circle — circular |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `on` | .v-toggle[aria-pressed=true] · data-state=on|off |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `disabled` | [disabled] / :disabled — flat face var(--v-disabled-face), edge var(--v-disabled-edge), ink var(--v-disabled-ink) |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-toggle` | `data-part="root"` |

## Keyboard
Space/Enter toggle

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** buttons · **on by default** yes (motion.js) · **travelling selection / flow roles** press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-icon, v-toggle, v-togglewell
