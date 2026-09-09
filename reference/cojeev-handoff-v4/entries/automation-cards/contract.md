# Automation Idea / Definition / Schedule / Upgrade — contract

- **id** `automation-cards` · **tier** cojeev · **evidence** I15 · **status** derived
- **root** `.v-card.-automation`
- **api** idea card (repeated work + evidence + "Build this") · definition card (name, health line, schedule pill, on/off switch) · schedule editor (supported fields + timezone + preview) · .v-upgrade panel (dismissible)
- **isolation canvas** 960x600 · **files** `isolation/automation-cards/`

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
| `.v-card.-automation` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, toggles, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-age, v-badge, v-body, v-btn, v-card, v-disk, v-health, v-ibtn, v-icon, v-meta, v-native, v-shape, v-switch, v-title, v-upgrade, v-weekdays, v-wm, v-word
