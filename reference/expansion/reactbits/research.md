# React Bits expansion research

Pinned source: `4bb4491b3879b115eb6758fae7f5b6c3ec7eb0a3` from the official DavidHDev/react-bits repository. Catalogue: 171 canonical components across Text Animations (32), Animations (38), Components (45), Backgrounds (56). Four JS/TS and CSS/Tailwind variants count once. Each catalogue entry has matching TS source paths in the pinned tree. The live sidebar also says 171. Pro blocks/products advertised by the site are a separate paid offering and are not represented as accessible canonical component source.

## Reuse boundary

The pinned LICENSE.md is MIT + Commons Clause and explicitly excludes redistribution of components themselves, including bundles and ports. The requested MIT library cannot simply pull these sources and recolor them. This pass uses original SahaJiv implementations based on high-level behavior; source receipts retain upstream provenance and are outside shipped registry payloads. No React Bits source has been imported into registry code.

## Individually inspected this pass

- Split Text: GSAP-based segmented entrance. Existing TextReveal is the right native overlap; grapheme units and directional arrival improve it. Automatic line measurement is not covered by the first batch.
- Blur Text: staggered words/letters become sharp while entering. Native TextReveal gains the soften effect with a bounded delay and readable quiet state.
- Rotating Text: automatic and programmatic phrase/character changes. Native WordRelay uses stable grid layout, opt-in automatic cycling, pointer/focus pause and shared visibility/quiet controls. The first pass does not claim all imperative controls or staggered character variants.
- Text Loop: measured SVG text motion on configurable paths. A straight Marquee is not an equivalent; original curved ribbon work remains pending.

Four official desktop preview screenshots and page/control snapshots are under output/playwright/expansion/reactbits. These are rendered samples, not complete interaction, mobile or performance audits of the source. All other 167 rows remain individually uninspected.

## Documentation findings

Observed useful features: grouped catalogue filter, preview/code tabs, prop controls beside a demo, copy for AI, favourites, related examples, JS/TS and CSS/Tailwind selection, and export-oriented background/shape/texture tools. SahaJiv already has live controls, source code, usage/accessibility and related links plus shape export. Potential additions: deliberate use/avoid guidance, local saved examples, self-contained copy-for-AI packets and cross-category search. Keep these as real actions and avoid adding inert controls. The separate tools and paid product are not evidence of completed component work.

## Text Ribbon follow-through

The Text Loop source’s measured repeated SVG typography is now adapted as the original native **Text Ribbon**. It offers five independently authored loop, wave, arch, line and figure-eight paths, forward/backward travel, opt-in autoplay, explicit pause, hover/focus pause, measured periods, native palette guide strokes and shared stillness. Its single accessible phrase is separate from decorative repeated text. Short closed-loop phrases use a whole-period fit; overlong phrases retain their natural scale rather than squeezing into a lap.

Chromium desktop/mobile and mobile WebKit passed actual offset progression, hover/focus/manual pause, direction changes, all five path renders at maximum supported size, quiet/offscreen/simulated visibility, Unicode/RTL, long and empty input. Live desktop/mobile docs and their native controls pass. The source-related entry is verified for this reviewed curved-typography core; custom arbitrary paths and curviness controls are not exposed, and exact upstream API, frame timing or typography parity is not claimed. Figure-eight crossings are intentionally decorative and unsuitable for critical prose.

Receipts: `output/playwright/expansion/ribbon/results.json`, `ribbon/long-loop.json`, `ribbon-docs/results.json`; focused tests `tests/text-ribbon.test.ts`. The long-phrase issue came from the independent finish review and was reproduced/checked with a phrase over three times the path length: actual letter size stays unchanged.
