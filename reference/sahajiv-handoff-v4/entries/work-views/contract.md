# Work · Tabs with real panels — contract

- **id** `work-views` · **tier** sahajiv · **evidence** I15 I16 · **status** derived
- **root** `.v-tabs.-lenses`
- **api** .v-tabs.-lenses[data-tabs] > .v-tab[role=tab][aria-controls][aria-selected] + [role=tabpanel][id][hidden] · six views: Now · Needs You · Tasks · History · Agents · Explainers · arrow keys move, the selected tab shows its panel (ui.js)
- **isolation canvas** 960x600 · **files** `isolation/work-views/`

## Modifiers
| class | meaning |
|---|---|
| `.-lenses` | variant: lenses — lens tabs |

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

### Data states
- `full`
- `empty`

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-tabs.-lenses` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** nav · **on by default** no (motion.js) · **travelling selection / flow roles** group, press, enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-age, v-badge, v-body-2, v-btn, v-card, v-disk, v-health, v-icon, v-item, v-item__body, v-item__sub, v-item__title, v-list, v-meta, v-needs, v-needs__meta, v-needs__reason, v-receipt, v-receipt__dot, v-receipt__meta, v-receipt__row, v-receipt__title, v-stamp, v-tab, v-tabs, v-word
