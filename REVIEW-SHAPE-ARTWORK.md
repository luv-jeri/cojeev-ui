# Shape artwork and workbench

Implemented September 8, 2026. Local source only; no build, installation, generated registry payload, commit or publishing was performed by this stream.

## API

`ShapeArtwork` is exported from `registry/sahajiv/ui/shape-artwork.tsx`. It accepts native SVG props/ref and:

| Prop | Default | Meaning |
| --- | --- | --- |
| `name` | `daisy-12` | One of the 12 typed `SignatureShapeName` silhouettes |
| `tone` | `pink` | `pink`, `olive`, `blue`, or `yellow`; current palette roles |
| `rotation` | `0` | Foreground rotation in degrees |
| `filled` | `true` | False draws the foreground as an outline |
| `shadow` | `true` | Include the cast shadow |
| `shadowAngle` | `45` | Cast direction clockwise from the right |
| `echo` | `true` | Include the rear outline |
| `echoAngle` | `-18` | Rear rotation relative to the foreground |
| `label` | absent | Accessible graphic label; otherwise decorative |

The face, shadow and rear outline use one shared Motion value for their fixed-topology contour. Name changes retarget it through shared choreography; Off, reduced motion, hidden pages and offscreen rendering settle it. No idle movement, CSS filter shadow, or independently drifting foreground is added. Rotation and layer settings follow props directly.

`shapeArtworkSvg(options, colors?)` returns standalone original vector markup. The optional `colors` object resolves `fill`, `shadow` and `echo`; omitted values use the current default palette's literal fallbacks. The landing download reads actual computed paint, so palette and theme overrides are baked into the SVG. Its target contour and selected settings are exported, rather than a transient morph frame.

`shapeArtworkCode(options)` returns the installed-component React import and all selected state as JSX props. Equivalent angles are normalized to -180…180; non-finite values use defaults. XML attributes/text and JSX string literals are escaped.

## Workbench and integration

`ShapePlayground` is a named export from `components/landing/shape-playground.tsx`. Root has replaced the old inline workbench and imported `components/landing/shape-playground.css` plus `registry/sahajiv/styles/shape-artwork.css`.

It uses native SahaJiv ToggleGroup/ToggleGroupItem single selection for 12 shapes and four tones; `v-seg` opts into the user's current shared Flow selection movement. Sliders control foreground rotation, shadow direction and rear-outline rotation. Switches control filled mode and layer visibility; hidden layers disable their corresponding angle slider. Typography, Button, CodeBlock and the entrance use existing library components. All foreground remains stationary after the heading entrance; only the low-intensity DepthBackground particles drift.

Download SVG creates a Blob URL, clicks a temporary download link and removes it. URLs are revoked after one second and any remaining URLs/timers are cleared on unmount. Visible status explains success or failure. CodeBlock's existing CopyButton handles the React snippet, including clipboard rejection and its visible manual-copy fallback.

Only the new `shape-artwork` key was added to example index/manifest and component additions/guides. The docs example directly imports library primitives and changes local artwork state. It does not depend on the landing component.

## Focused evidence

- `rtk proxy node --import tsx --test tests/shape-artwork.test.ts` — four tests passed. All 12 live/static contours and both fill modes have matching layers, geometry, transforms and opacity; toggles remove the same groups; non-finite inputs and partial colors fall back safely; SVG/JSX escaping and every copied prop are checked.
- Bounds proof checks every cubic control point. A cubic is inside its control-point convex hull; rotation preserves radius. Adding the largest layer offset and round stroke stays under radius 70 for all signatures, so `viewBox="-20 -20 140 140"` contains every supported rotation/direction, rather than just sampled screenshots.
- Scoped ESLint passed for the new component, landing workbench, docs example and tests. Both the landing workbench and docs example server-rendered with the artwork and accessible copy controls.
- One Impeccable detector pass reported advisory type-ramp and fallback-color differences. Type sizes were moved to documented sizes/tokens. `#14171B` is the actual current token fallback; the legacy DESIGN.md palette is older than the current source roles. No new palette role was introduced.
- Root owns the integrated desktop/mobile browser batch, real download/copy proof, and canonical typecheck. This report does not claim those browser checks from source-only tests.

## Changed paths

- `registry/sahajiv/ui/shape-artwork.tsx`
- `registry/sahajiv/styles/shape-artwork.css`
- `components/landing/shape-playground.tsx`
- `components/landing/shape-playground.css`
- `components/examples/shape-artwork.tsx`
- `components/examples/index.ts` — new key only
- `components/examples/manifest.ts` — new key only
- `data/component-additions.json` — new key only
- `data/component-guides.json` — new key only
- `tests/shape-artwork.test.ts`
- `REVIEW-SHAPE-ARTWORK.md`
