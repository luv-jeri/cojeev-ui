# Floating Sidebar — contract

- **id** `floating-sidebar` · **tier** composite · **evidence** I15 I16 I17 I18 · **status** source
- **root** `.v-sidebar`
- **api** the same .v-sidebar primitive placed in .v-shell: detached, inset 28, pink collapse tab on the right edge, groups above and Stop all in the foot · .-mini collapses to 76 px · hidden under 720 where the dock takes over
- **isolation canvas** 960x640 · **files** `isolation/floating-sidebar/`

## Modifiers
| class | meaning |
|---|---|
| `.-shell` | variant: shell |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-sidebar` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-brand, v-btn, v-collapse, v-frame, v-icon, v-meta, v-nav, v-nav__group, v-nav__item, v-nav__label, v-rail-demo, v-sidebar, v-sidebar__foot
