# Theme reveal and native scrollbar refinement

The approved Group A direction in `REFINEMENT-PLAN.md` keeps the existing paper/ink palette and typography. The focal moment is an organic contour expanding from varied viewport corners, edges or centre, revealing the real destination page, including text and components. Rapid reversal retargets the current reveal; quiet mode and unsupported native View Transitions commit the requested theme immediately. Native scrolling, focus and document geometry remain usable.

Scroll feedback uses a seed-shaped thumb, a visible fixed-size grip, a broad practical hit region, a compressed pressed shape and direction/velocity-sensitive leading edge. It only moves while the user scrolls or interacts; no autonomous idle loop is introduced.

The existing `ThemeToggle` callback remains valid. It gains an optional second `{origin:{x,y}}` argument, and activation-time varied origin tracking also supports existing `applyTheme(mode, quiet)` effect callers. `applyTheme(mode, quiet, root?, {origin}?)` supports explicit origin/scope. ScrollArea, ScrollBar and PageScrollBar keep their existing public props.

The two planned full visual batches are preserved in `round1/` and `final/`. Their screenshot inspection found a WebKit-only captured-glyph defect despite passing DOM checks. Root explicitly authorized a bounded compatibility correction and narrow theme confirmations after that budget; the additional directories retain the diagnostic failures. There was no additional scrollbar or broad style hunt. No Next build, registry generation, commit or push was performed by this stream.

## Acceptance

- [x] Dark and light reveal actual destination content through distinct growing organic clip frames, with varied default viewport origins and an exact optional explicit origin.
- [x] Sun/moon animation, rapid reversal, exact final theme, scroll/resize cancellation, focus, Off/reduced and unsupported-API fallback work.
- [x] Document and region thumbs show direction/velocity, hover, press/hold and release; native pointer drag and keyboard scrolling work at narrow and wide widths.
- [x] Idle/offscreen/quiet motion stops without removing usable scrolling.
- [x] Batched Chromium/WebKit evidence and exact changed files are recorded; pending root integration is explicit.

## Runtime reference

The native View Transition new-view pseudo-element represents the destination DOM. Its ready/finished promises and cancellation lifecycle provide the underlying capture/cleanup boundary; Motion owns the changing organic clip geometry. See [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) and [WebKit's Safari 18 implementation notes](https://webkit.org/blog/15443/news-from-wwdc24-webkit-in-safari-18-beta/). Browser behavior still requires the focused proof above.

Latest owner steering supersedes fixed toggle origins: default activation selects a different viewport region from the preceding reveal, jitters its position, varies the lobe phase, and uses a 1.20–1.38 second eased reveal at normal speed. Explicit `applyTheme(..., {origin})` remains available. No randomness runs during rendering or SSR.


## Final implementation files

- `registry/sahajiv/motion/theme-transition.ts`: varied origin selection; native destination capture; interruptible Motion path lane; controlled glyph compatibility paint; quiet, resize, scroll and visibility cancellation; exact final theme and temporary-state cleanup.
- `registry/sahajiv/ui/theme-toggle.tsx`: existing controlled contract and sun/moon Motion retained; optional callback details and activation-time origin capture.
- `registry/sahajiv/styles/theme-toggle.css`: organic destination clip, bounded native retention, glyph mask/paint, fixed-ink label contrast and compact shape.
- `registry/sahajiv/motion/scroll-thumb.ts`: seed contour with signed velocity, pointer lean and pressure; existing document geometry/ref-counted native scrollbar restoration retained.
- `registry/sahajiv/ui/scroll-area.tsx`: one feedback hook shared by Radix regions and the document rail; native pointer/keyboard ownership preserved; decorative grip and contour.
- `registry/sahajiv/styles/scroll-area.css`: 24px hit rails, wider seed paint, fixed-size grip, pressed/hover/scroll color feedback, coarse-pointer positioning.
- `components/examples/motion-primitives.tsx`: ThemeToggle preview copy points to the global appearance control. At the icon owner's request, only `pulse` and `none` were added to its AnimatedIcon preset list.
- `tests/refinement-theme-scroll.test.ts`, `scripts/check-refinement-theme-scroll.mjs`, this report, and `output/playwright/refinement-theme-scroll/`.

No changes to ThemeControl, marketing layouts, menu controls, use-morph, or icon implementation were made by this refinement stream.

## Browser compatibility detail

The root destination capture renders correctly in Chromium and WebKit. WebKit's named new toggle view was visibly empty, even with correct computed dimensions, transform, opacity and retained lifetime. Keeping its old capture prevented disappearance but froze the glyph. A root cutout alone also left its SVG frozen. Those approaches were removed.

The final adapter keeps a small capsule in the destination clip around the activated control. The native captures have a 24px glyph mask; the transition group paints that glyph from the existing Motion-updated SVG. It only serializes the small SVG during the active reveal lane. There is no second control, page clone, copied focus target, background motion timer or font/text recreation. All temporary clip, glyph and mask values are removed on completion/cancellation. The underlying switch keeps its callback, label, ARIA and focus behavior.

The page reveal itself still starts at a varied corner, edge or central region. The small control cutout does not choose the blob origin. The optional explicit origin is measured in viewport pixels. Consumers continue to own theme persistence and call `applyTheme`; ThemeToggle does not mutate application theme state itself.

Track clicks seek once to their position and a held pointer compresses the thumb. Dragging and keyboard input update the real native scroll owner; there is no artificial scroll momentum or automatic repeated page jump while holding the track.

## Reproduction

```sh
rtk proxy node scripts/check-refinement-theme-scroll.mjs --url=http://127.0.0.1:4320/sahajiv-ui
rtk proxy npx tsx --test tests/refinement-theme-scroll.test.ts tests/choreography.test.ts
```

The browser script resolves sources from its own repository location, compiles an in-memory source fixture only, and loads CSS/fonts from the existing server. Optional `--engines=webkit`, `--widths=390`, `--only=theme` and `--output=...` support narrow reproduction. Its fixture checks document and native Radix region scrolling, not a fabricated scroll implementation.

Typecheck and scoped ESLint passed after the final compatibility source edit. The four new geometry/velocity tests plus seven existing choreography/scroll/presence tests passed. The Impeccable detector was run once after the intended design pass and returned `[]`; the later change was a demonstrated rendering compatibility correction.

Integration remains root-owned: new marketing headers and ThemeControl, installed consumer refresh, registry generation and final build are not claimed by this report. The source fixture proves the public components and running stylesheet behavior. WebKit native touch is preserved by the unmodified viewport and CSS touch action; actual touch-swipe automation was run in Chromium only. Both engines have pointer drag and keyboard proof.


## Accepted receipts and final freeze

`output/playwright/refinement-theme-scroll/verified-results.json` contains 8/8 accepted cases, with explicit per-case source receipts: the four unchanged scrollbar cases from `final/results.json`, and the four final theme cases from `glyph-final/results.json`. Both Chromium and WebKit were checked at 390 and 1440 pixels. The diagnostic captures remain present and are not represented as passing final evidence.

The final theme cases prove both destination colors and actual old/new screenshot paint in the same growing organic frame; different origins; explicit 17,23 origin; rapid reversal sampled after actual key dispatch; exact final mode; keyboard focus; immediate Off/reduced/Flow Off; midflight quiet cancellation; scroll/resize cancellation; unsupported-API fallback; and cleanup of all five temporary clip/glyph/mask properties. The live glyph is separately compared with its settled destination silhouette while the reveal is still expanding. Ink-mask agreement is 99.8% for dark and 98.6–100% for light; the blue switch face remains visibly present. Screenshot inspection confirms moon during dark reveal and sun during light reveal in WebKit. Completed interactions including capture/wait overhead measured about 1.39–1.56 seconds; the authored lane remains 1.20–1.38 seconds at normal speed.

The scrollbar cases prove distinct idle/hover/pressed contours, native Radix thumb drag, forward/backward response, PageDown/PageUp, document thumb drag and track click, Home/End/arrow scrolling, 24px hit width, idle/quiet/offscreen stillness, no horizontal document overflow, and restoration of the native document scrollbar marker on unmount. Chromium additionally passed a real CDP touch swipe on the native region. The held thumb screenshots show the compressed seed and fixed three-dot grip at narrow and wide widths.

Final source is frozen. Since the earlier provisional freeze, only `registry/sahajiv/motion/theme-transition.ts` and `registry/sahajiv/styles/theme-toggle.css` changed for the WebKit glyph adapter. Root was notified before refreshing its build/consumer output. No equivalent full scrollbar check was rerun after the theme-only correction.
