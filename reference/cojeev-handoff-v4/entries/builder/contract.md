# Agent Builder · Node / Wire / Palette / Inspector / Validation — contract

- **id** `builder` · **tier** cojeev · **evidence** — · **status** derived
- **root** `.v-node`
- **api** .v-node[.-ai\|-selected\|-invalid] + .v-node__port · path.v-wire + .v-wirelabel · .v-palette__item (keyboard: Enter adds to the outline) · .v-inspector edits the selected node — typing a template clears the node error, the sticky .v-validation summary and aria-invalid together · clicking or Tab-ing to a node selects it and loads its fields · canvas is illustrative: dragging is not implemented and says so
- **isolation canvas** 1280x720 · **files** `isolation/builder/`

## Modifiers
| class | meaning |
|---|---|
| `.-ai` | variant: ai — AI node |
| `.-selected` | variant: selected — selected row |
| `.-invalid` | variant: invalid — error state |
| `.-node` | variant: node |

## Sizes
one size (`default`)

## States (how each is expressed)
| state | expression |
|---|---|
| `rest` | default |
| `hover` | :hover (pointer only; the morph body leans toward the pointer where the motion category is on) |
| `focus` | :focus-visible — 2 px ring var(--ring) |
| `active` | :active (press; the body squashes on the pointer axis) |
| `error` | .-invalid + [aria-invalid=true] |

## Parts (class → data-part; classes are never renamed)
| selector | part |
|---|---|
| `.v-node` | `data-part="root"` |

## Keyboard
Tab reaches every control; Enter/Space activate

## Accessibility
- Every icon-only control carries `aria-label`; every input has a label (`<label for>`, wrapping `<label>` or `aria-label`).
- Real `<button>`, `<a>`, `<input>`; text never truncates.
- State is announced through aria (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, `aria-busy`, `aria-invalid`); `data-state` mirrors it for styling and testing and is never the source of truth.
- Focus: 2 px ring `var(--ring)` on `:focus-visible`; overlays trap focus, close on Escape and return focus to the opener.

## Motion
- **category** cards · **on by default** no (motion.js) · **travelling selection / flow roles** none
- Per-element override: `data-morph` on, `data-motion="off"` off. Full contract in `docs/MOTION.md`, rows in `data/motion.json`.

## Classes seen in the catalog demo
v-caps, v-disk, v-field, v-help, v-icon, v-inspector, v-inspector__title, v-label, v-meta, v-native, v-node, v-node__head, v-node__port, v-node__sub, v-palette, v-palette__item, v-textarea, v-validation, v-wire
