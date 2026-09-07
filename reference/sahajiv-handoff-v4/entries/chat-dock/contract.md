# Contextual Chat Dock + Context Header + Typed Action Card — contract

- **id** `chat-dock` · **tier** sahajiv · **evidence** I09 I16 · **status** source
- **root** `.v-assist`
- **api** .v-assist.-mini → .-anchored · context chips name what the answer was drawn from · typed action cards carry proposed / running / done with the result reachable — "Open summary" opens a real dialog holding the summary and its provenance · sending a demo message appends a contextual reply and a running card that completes
- **isolation canvas** 720x600 · **files** `isolation/chat-dock/`

## Modifiers
| class | meaning |
|---|---|
| `.-mini` | variant: mini — collapsed 76 px |
| `.-anchored` | variant: anchored — anchored dock |

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
| `.v-assist` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-assist, v-assist__close, v-assist__title, v-badge, v-btn, v-bubble, v-card, v-ibtn, v-icon, v-igroup, v-meta, v-scroller
