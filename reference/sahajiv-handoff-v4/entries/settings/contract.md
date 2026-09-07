# Settings · System checks, Appearance, Motion — contract

- **id** `settings` · **tier** sahajiv · **evidence** — · **status** derived
- **root** `.v-settings-grid`
- **api** grouped sections, each with a plain explanation: System checks (name, result word, observed time, run action, fix-with-chat) · Appearance (mode, text size) · Motion (Off / Subtle plus where it applies — mirrors js/motion-panel.js; no raw tuning is exposed as a product choice)
- **isolation canvas** 960x600 · **files** `isolation/settings/`

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
| `on` | [aria-pressed=true] · data-state=on|off |
| `checked` | input:checked · data-state=checked|unchecked |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-settings-grid` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** buttons · **on by default** yes (motion.js) · **travelling selection / flow roles** group, press, toggles, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-btn, v-card, v-icon, v-item, v-item__body, v-item__title, v-meta, v-native, v-sechead, v-seg, v-settings-grid, v-switch
