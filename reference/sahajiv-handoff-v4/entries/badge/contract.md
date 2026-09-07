# Badge — contract

- **id** `badge` · **tier** base · **evidence** I03 I18 · **status** source
- **root** `.v-badge`
- **api** .v-badge.-pink\|-yellow\|-olive\|-blue\|-ink\|-cream\|-*-soft\|-danger\|-pending\|-count\|-dashed\|-caps\|-test\|-live[.-sm\|-lg]
- **isolation canvas** 480x240 · **files** `isolation/badge/`

## Modifiers
| class | meaning |
|---|---|
| `.-pink` | variant: pink — category pink |
| `.-yellow` | variant: yellow — category yellow |
| `.-olive` | variant: olive — category olive |
| `.-blue` | variant: blue — category blue |
| `.-ink` | variant: ink — ink fill, cream text |
| `.-cream` | variant: cream — cream fill |
| `.-pink-soft` | variant: pink soft tint |
| `.-yellow-soft` | variant: yellow soft tint |
| `.-olive-soft` | variant: olive soft tint |
| `.-blue-soft` | variant: blue soft tint |
| `.-danger` | variant: danger — destructive, danger fill |
| `.-pending` | variant: pending — pending, never success |
| `.-count` | variant: count — numeric count |
| `.-dashed` | variant: dashed — dashed edge |
| `.-caps` | variant: caps — tracked caps label |
| `.-test` | variant: test — TEST ONLY marker |
| `.-live` | variant: live — observed live marker |

## Sizes
`.-sm`, `.-lg`

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-badge` | `data-part="root"` |
| `.v-badge .v-dot` | `data-part="indicator"` |

## Keyboard
none (static)

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** pills · **on by default** yes (motion.js) · **travelling selection / flow roles** enters
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-badge, v-dot
