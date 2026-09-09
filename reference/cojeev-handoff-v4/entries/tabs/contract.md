# Tabs — contract

- **id** `tabs` · **tier** base · **evidence** I11 I16 I18 · **status** source
- **root** `.v-tabs`
- **api** .v-tabs.-underline\|-lenses[data-tabs] > .v-tab[role=tab][aria-selected][aria-controls] + [role=tabpanel][aria-labelledby] · roving tabindex, Arrow/Home/End, Enter/Space · a group with no panels is NOT a tablist: use .v-tabs[data-filters] with aria-pressed buttons (see Data Table)
- **isolation canvas** 720x320 · **files** `isolation/tabs/`

## Modifiers
| class | meaning |
|---|---|
| `.-underline` | variant: underline — underline tabs |
| `.-lenses` | variant: lenses — lens tabs |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `selected` | .v-tab[aria-selected=true] · data-state=active|inactive |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `on` | [aria-pressed=true] · data-state=on|off |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-tabs` | `data-part="root"` |
| `.v-tab` | `data-part="trigger"` |
| `[role=tabpanel]` | `data-part="content"` |

## Keyboard
ArrowLeft/Right, Home/End move focus (roving tabindex); Enter/Space select

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, paces, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-attach, v-attach__meta, v-attach__name, v-badge, v-bubble, v-disk, v-icon, v-item, v-item__body, v-item__sub, v-item__title, v-marker, v-meta, v-needs, v-needs__meta, v-needs__reason, v-prow, v-prow__lab, v-scroller, v-tab, v-tabs, v-track
