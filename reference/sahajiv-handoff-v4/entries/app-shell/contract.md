# App Shell + Page Header — contract

- **id** `app-shell` · **tier** sahajiv · **evidence** I15 · **status** source
- **root** `.v-shell`
- **api** .v-shell > .v-sidebar + .v-page (.v-topbar, .v-main > .v-content + .v-rail) · tracks are content-driven ('auto minmax(0,1fr)') with both children explicitly placed, so hiding or collapsing the rail can never squeeze the page into the rail's column · .-navbar keeps the destinations as a pill row where the rail is hidden · container-query breakpoints 1180 / 900 / 720 are written on the shell's children, because a container query never matches the element that declares the container · globals: Ask SahaJiv, Needs You, Quick Note, notifications
- **isolation canvas** 1280x800 · **files** `isolation/app-shell/`

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
| `selected` | [aria-selected=true] / [aria-current] · data-state=active|inactive |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-shell` | `data-part="root"` |
| `.v-sidebar` | `data-part="nav"` |
| `.v-page` | `data-part="viewport"` |
| `.v-topbar` | `data-part="header"` |
| `.v-content` | `data-part="content"` |
| `.v-rail` | `data-part="aside"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** surfaces · **on by default** no (motion.js) · **travelling selection / flow roles** group, press
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-agenda, v-agenda__t, v-body-2, v-brand, v-btn, v-cal__month, v-card, v-content, v-disk, v-display, v-event, v-event__sub, v-event__title, v-ibtn, v-icon, v-input, v-item, v-item__body, v-item__sub, v-item__title, v-main, v-mcard__value, v-meta, v-nav, v-nav__item, v-nav__label, v-page, v-pagehead, v-rail, v-search, v-search__disk, v-shape, v-shell, v-sidebar, v-stat, v-stats, v-tab, v-tabs, v-time, v-topbar, v-utility, v-wm
