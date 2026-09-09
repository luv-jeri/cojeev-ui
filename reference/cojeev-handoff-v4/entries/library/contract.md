# Library · Skill Card / Hook Intent / Quarantine / Diff — contract

- **id** `library` · **tier** cojeev · **evidence** I17 · **status** derived
- **root** `.v-card.-library`
- **api** skill card (name, scope, enabled switch, origin, usage) · hook row (plain intent, host, coverage) · quarantine notice with restore · config diff before/after + receipt
- **isolation canvas** 960x600 · **files** `isolation/library/`

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
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `checked` | input:checked · data-state=checked|unchecked |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-card.-library` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** press, toggles, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-alert, v-alert__body, v-alert__text, v-alert__title, v-badge, v-body-2, v-btn, v-cap, v-caps, v-card, v-diff, v-diff__col, v-diff__line, v-disk, v-dot, v-icon, v-id, v-meta, v-switch
