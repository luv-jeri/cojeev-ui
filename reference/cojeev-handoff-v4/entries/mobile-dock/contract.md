# Mobile Dock + Attached Panel — contract

- **id** `mobile-dock` · **tier** composite · **evidence** I07 I09 · **status** source
- **root** `.v-dock`
- **api** .v-dock (5 columns, shoulder ::before) > .v-dock__item[aria-current] + .v-dock__action[data-dock-toggle="#panel"] · .v-dockpanel black r28 above the dock · plus rotates to × when open
- **isolation canvas** 480x640 · **files** `isolation/mobile-dock/`

## Modifiers
| class | meaning |
|---|---|
| — | no modifiers |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `open` | .v-dock.-open + .v-dockpanel:not([hidden]) |
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-dock` | `data-part="root"` |
| `.v-dock__item` | `data-part="item"` |
| `.v-dock__action` | `data-part="trigger"` |
| `.v-dockpanel` | `data-part="content"` |

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
v-badge, v-caps, v-disk, v-dock, v-dock__action, v-dock__item, v-dockpanel, v-dockpanel__title, v-icon, v-item, v-item__body, v-item__sub, v-item__title, v-lead, v-marker, v-mobile-scrim
