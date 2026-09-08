# SahaJiv UI 0.2.0 — signature overhaul

Implementation and local release checks are complete. Public deployment is in progress; the previous public 0.1.0 deployment is not described as the new release.

## Delivered source

- **89 installable UI entries** plus the shared foundation. All 66 original components remain. The 68 entries named in the overhaul brief have source and rendered review in [OVERHAUL-COMPONENTS.md](OVERHAUL-COMPONENTS.md).
- **36 shapes**, including 12 original, morph-compatible silhouettes inspired by the supplied moodboards. ShapeMorph exposes selection, palette and fill/outline controls. No watermarked reference raster is bundled.
- **Six chart types and dynamic tooltips:** 16 layout variants, responsive geometry, light/dark tokens, actual legend filtering, pointer/keyboard inspection, accessible data tables and updated/zero/missing/empty examples.
- **Agent interfaces:** AgentState and AgentChat compose Bubble, Avatar, InputGroup/Input, Button, Attachment, Questionnaire and MessageScroller. Local demonstrations cover permission, denial, options, cancel, file attachment, progress, failure and retry. These are explicitly simulated; no agent backend is implied.
- **Shared motion:** Motion for React drives selection and popup paint, organic document/region scrollbars, theme/icon morphs, pointer depth and retained content. Off and reduced motion preserve static usable content. [The lifecycle checklist](OVERHAUL-LIFECYCLE.md) records actual conditional boundaries and native-library limits.
- **Library-built documentation:** Fumadocs remains the framework; visible navigation, previews, controls, inputs, scrolling and theme controls use SahaJiv components. [DESIGN.md](DESIGN.md) records the implemented palette, typography, spacing and motion ownership.

## Confirmed checks

| Check | Scope and current result |
| --- | --- |
| TypeScript / lint / build | Final integrated checks passed. Builds produce 95 pages and 90 registry items. |
| Copied examples | 89 defaults and 316 complete variant/size snippets compile. |
| Logic tests | 25 passing tests: settings, deterministic clock, literal spring integrator, generator, choreography, shape topology, chart geometry, field naming and agent state contracts. |
| Non-chart variants | 388 final cases: 194 advertised variant × size combinations at 390px dark and 1440px light. All 26 contact sheets inspected. |
| Charts | All 32 chart variant/context cases pass with console errors checked after the SVG initialization correction; standalone tooltip has its separate passing two-context evidence. Six lifecycle cases prove retained bar/radar membership, crosshair/dot exits, rapid reversal and immediate Off/reduced behavior. |
| Narrow long content | 28 final cases: fourteen real compositions at 320px in both themes, including 205-character prose and a 186-character filename. Four wrapping/clipping defects fixed. |
| Primitive motion | Ten final primitive/context cases pass, including interrupted theme cleanup, actual path interpolation, icon ref/ARIA, additive Card depth, Spinner variants and quiet/offscreen behavior. |
| Production docs | Initial full run covered all 89 entries × 360/768/1440px × two themes. All Preview/copy checks and 87 of 89 component actions passed. Menubar fast keyboard switching and a Text Reveal animation assertion were discovered alongside the chart errors. Four chart entries emitted invalid SVG starting-value errors, subsequently corrected. Final confirmation covers 21 affected entries and all 126 width/theme layouts. One table assertion was updated to wait for actual exit completion; its targeted rerun passed. All six documentation-shell checks passed. The later Menubar fix prevents retained closed menus from dismissing their newly opened sibling; Text Reveal now checks actual intermediate word paint rather than requiring browser-native animation objects. Both workflows also pass against the final static build at 360/1440px in both themes (eight layouts), with four shell checks passing. A replacement CI run will verify the complete release. |
| Safari engine | Final original production gate passed all seven touch journeys with no browser/console errors or navigation overflow. This confirms both initial failures: hidden-navigation SVG sizing and MultiSelect anchor feedback. No physical iPhone claim. |
| Registry consumer | All 89 entries installed through the real shadcn CLI into a fresh external Vite app, imported, typechecked, built and loaded. The final source refresh also passed through the real CLI. Nineteen rendered specimens and selected interactions passed; all 88 CSS files matched. |
| Native and agent lifecycle | 48 verified native/AgentChat cases; two final data/search/pagination contexts; two Calendar/Button contexts including WebKit; two dark Button endpoint comparisons. Each retains its documented native semantics and quiet behavior. |

## Concrete corrections

The audit corrected soft Badge and selected Item contrast, Questionnaire hover paint obscuring labels, linked field descriptions, Slider and Command accessible names, overlay stacking and transform origins, fast Menubar keyboard switching, responsive control layout, long text clipping, ScrollArea composition, and interrupted theme paint. Production browser checks additionally identified missing initial SVG attributes, invalid spring overshoot for chart dimensions, a transformed popup anchor and the intrinsic size of an unmeasured hidden-control SVG. Failures remain in their original local evidence rather than being relabelled as initial passes.

## Reproduce

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run check:examples
npx playwright install chromium webkit
npm run gate
npm run gate:mobile
node scripts/audit-registry-consumer.mjs
```

`npm run dev -- --hostname 0.0.0.0 --port 4320` serves live changes at `/sahajiv-ui/`. The workspace demonstration is at `/sahajiv-ui/workspace/`; the shape catalogue is at `/sahajiv-ui/docs/shape/`.

## Boundaries

The library code remains MIT licensed; bundled fonts retain SIL OFL notices. Original reference-gate differences remain historical evidence, not failures concealed by the new design direction. Caller-owned conditional removal needs a persistent external MotionPresence boundary. cmdk search semantics update immediately; the results surface receives a coordinated transition instead of retaining stale live keyboard options. Native Radix/DayPicker adapters and the bespoke contour solver remain purposeful implementation owners rather than a claim that every CSS rule was replaced by Motion.

Coverage is finite: it does not exhaust every prop, data size, state, browser or hardware combination. Visual review is evidence against the supplied direction, not an invented owner-approved composition. The final publication URL, CI run and exact source revision will be recorded after deployment.
