# Typography, action icons and glyph sculpture — local review

The catalogue now contains **115 entries** (66 base components and 49 additions). This slice adds Text Ribbon and Glyph Sculpture, improves existing Text Reveal/Icon/AnimatedIcon, and gives component documentation a readable, copyable guide. It follows the seven additions in [batch 1](REVIEW-EXPANSION-BATCH-01.md).

## Delivered behavior

**Text Ribbon** carries a repeated phrase along original loop, wave, arch, line and figure-eight SVG paths. It measures the text period, supports reverse direction and an optional palette-colored guide, and pauses on hover, focus, explicit controls, quiet settings and visibility changes. Automatic motion is opt-in. Closed paths align short phrase periods; phrases longer than a lap retain their natural size. The complete accessible phrase is exposed once, separately from decorative repeated type. Custom arbitrary paths/curviness are not exposed; figure-eight crossings are deliberate decoration, unsuitable for critical prose.

**Glyph Sculpture** uses original bloom, seed and pebble 3D meshes, a depth buffer and actual font glyphs. It includes native tone, pause, size and orientation controls, optional passive pointer tilt, bounded drawing and an SSR/no-canvas glyph fallback. It is a partial adaptation of Canvas ASCII Object's core. Arbitrary assets, edge-template glyph matching, studio materials and orbit drag/zoom remain outside this builtin sculpture implementation.

**Text Reveal** adds bloom, scale and settle entrances and whole-phrase grouping. The stagger window now compresses evenly for long text instead of making the tail arrive together. Whole-phrase and word grouping preserve joined-script shaping. Entrances remain readable after interruption; this component does not schedule exits. Six individually inspected Remocn entrance concepts are covered; three related entries still need their defining exits adapted.

**Icon and AnimatedIcon** use action-specific SVG-part motion for 20 inspected actions, with six friendly aliases. Directional cues now follow their actual direction. Native pointer/focus behavior, controlled activation, touch, disabled and quiet states were checked. Geometry comes from the existing native pack; no new icon dependency or imported component source was added. The remaining 80 Remocn icon entries are explicitly uninspected, even where an existing geometry mapping is available.

**Copy guide** in the documentation gathers the selected variant/size example, parts, API, usage and accessibility notes. It uses native CopyButton, Collapsible, StateChevron, ScrollArea and typography. The inline Read guide surface allows manual copying when clipboard access fails. Copy never contacts an AI service. It captures variant/size, not arbitrary internal example state; the packet says so. Local review additions remain clearly distinguished from public installation instructions.

Glyph Sculpture is grouped with 3D; text primitives, animated numbers and text motion are grouped under Typography. No routes were renamed.

## Verification and corrections

- Final project **TypeScript and lint pass**. A state-sync effect in the text example was replaced by a keyed child; internal and external variant changes were then exercised. Captured upstream icon source uses `.tsx.txt`, keeping research files out of application compilation without installing upstream dependencies.
- **12 affected default examples / 71 copied snippets pass**, including documented variants and sizes, with zero TypeScript diagnostics. Receipt: `output/playwright/expansion/examples-final.json`.
- Text Ribbon: three focused geometry tests; Chromium 1440/light, Chromium 390/dark and WebKit 390/light checks cover real SVG movement, manual/hover/focus pause, reversal, all five shapes, quiet/offscreen behavior, Unicode, long and empty text. Hidden-document events were explicitly simulated. Both desktop/mobile live docs and real example controls pass.
- The independent review found long phrases compressed into one closed lap. The correction keeps their natural period. A live 390px check measured a 3176.37-unit phrase on a 1055.84-unit path and confirmed the adjusted phrase remains 3176.37 units at its chosen 40px font size. Receipt: `output/playwright/expansion/ribbon/long-loop.json`.
- Glyph Sculpture: three unit/SSR tests, targeted lint, 24 browser assertions, two isolated pointer checks, fallback and integrated mobile documentation checks pass. Natural OS backgrounding and actual hardware context loss were not verified. See `reference/expansion/canvas/glyph-sculpture-result.md`.
- Text Reveal: four static tests and 390/1440px runtime checks cover seven variants, overshoot, interruption, direction, quiet/offscreen behavior, Unicode, joined scripts and long text. A property timing inheritance issue was caught and fixed. See `reference/expansion/remocn/receipts/typography-nine-handoff.json`.
- Icons: four focused tests, all 20 actions across both Icon/AnimatedIcon and Chromium/WebKit, touch and controlled replay, plus the existing 360/1440px lifecycle regression pass. See `.work/skiper-icons/output/verification.json` and `reference/expansion/skiper/icon-mapping.json`.
- Guide copy: three pure tests and Chromium desktop/mobile plus WebKit mobile checks pass. The Clipboard API was stubbed to prove exact payload, success and denied-copy feedback; this is not a physical OS clipboard transfer claim. Native disclosure, keyboard scrolling, selected variant, local availability and legacy installation sections were exercised. Receipt: `output/playwright/expansion/handoff/results.json`.

The fresh bounded source/screenshot review is `.work/expansion/finish-review-02.md`; its one source-derived finding was the long-phrase compression fixed above. No exhaustive 115-component visual audit, physical iPhone check, performance benchmark, release build or publication is claimed.

## Whole-goal status

All **613 canonical source entries** are accounted for. The ledger currently records **28 verified core adaptations, 8 in progress and 577 pending**. Verified means an individually reviewed core behavior adapted and checked in original SahaJiv form; it does not mean exact source code, API, media assets or timing parity. Six entrance treatments and 20 icon entries map into existing native families rather than adding redundant catalogue components.

Remaining work includes additional text/exit families, source navigation/controls/cards/media/compositions, most shaders and 3D effects, and the other icon actions. Source-only inspection, rendered sampling and native verification remain separate in the inventories. This is material progress, not completion of the four-source objective.

No dependency installation, production build, commit, push or publication was performed. Owner review remains the release boundary. The live review is at `http://127.0.0.1:4320/sahajiv-ui/`.
