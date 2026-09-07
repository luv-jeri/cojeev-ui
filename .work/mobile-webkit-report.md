# Mobile WebKit platform check

Target: local main development app at `http://127.0.0.1:4320/sahajiv-ui`; no deployment. Playwright 1.63.0, WebKit 26.6 (browser build 2359), iPhone 13 emulation at 390 × 844, mobile/touch enabled, light theme. This is Safari-engine evidence, not a physical iPhone test. The original engine reports `navigator.maxTouchPoints=0` despite coarse-pointer matching and functioning Playwright touch taps; closeout records actual touch/pointer events.

Initial run: 25.18 seconds; five scenarios passed and two exposed layout defects. All seven produced zero page errors and zero console errors. Main HEAD was `53a1b40f176bc0f039144b21d46c892508341e91` with the tracked production diff hash recorded in the raw receipt. This was a live development checkout, not a frozen release build.

| Scenario | Initial evidence |
| --- | --- |
| Home / getting started | Home rendered; touch navigation to Button and through Browse to Getting started worked. Getting started failed at transient document width 445px. Its final component link awaited closeout. |
| Button | Touch success, disabled pending state, visible local failure, and successful retry passed. |
| Tabs | Touch selected Ideas, Reading, and Notes with matching content. |
| Motion settings | All nine presets, Activity preview, Off/on persistence, and close worked. Post-close document width briefly reached 641px. Separate inspection found real internal panel overflow. |
| MultiSelect | Touch open, search Research, select, Escape dismissal, focus restoration, and resulting selection passed. |
| ShapeScene | Real WebGL rendered 2,922 sampled colors. Touch pause stopped draw calls at 279 across the observation interval. |
| Marquee | Touch pause froze the actual track transform; resume and repeated pause worked. |

## Diagnosed corrections

The open Motion panel was 366px wide, with client width 354px and scroll width 385px. Its MotionControls grid had 322px available but an implicit track of 358.78px. The nowrap action row imposed that intrinsic minimum. Temporary browser-only CSS proved the correction: wrap `.v-motion-controls__row`, give its direct div children `min-width:0`, and constrain the single-column Sheet grid to `minmax(0,1fr)`. Panel scroll width then equalled client width 354px; rows ended at x350. Root implemented the wrapping rules in Adjuster and the reusable grid constraint in SheetContent. This was intrinsic sizing rather than conflicting selector specificity.

The close overflow was a separate, real transient defect. Two sampled frames expanded the document, maximum 641px at 66ms. The visible mobile Motion settings trigger owned an SVG with stale inline width 440px / viewBox `-10 -10 440 52`. Its actual host was only 118.06px wide after the initial 1.05 scale of `vf-land` (340ms), alongside `vf-glow` (640ms). The SVG rendered 462px wide and extended to x640.77; header and action-group bounds stayed correct. Visual viewport remained 390px at scale 1. This is not an iOS focus-zoom diagnosis. Motion owner confirmed the cause: the SVG was appended before absolute positioning, so its default inline width of 300px plus the button gap expanded the host to 420px during measurement. Their insertion-order fix `4556732` is integrated; original evidence remains preserved.

Long code lines and table cells extend within their intended scroll containers; after animation completion the page itself is 390px. The portable script now waits on actual finite animation promises and two animation frames for settled assertions, while separately sampling every frame across navigation and Motion close so settling cannot conceal transient expansion.

## Closeout

Both affected scenarios passed in **8.357 seconds** on clean main `9ac1fcd09966dcd696cb06a45c4f970816225a31`, after the panel sizing correction and morph insertion-order fix. Together with the original five unaffected passes, all seven requested journeys have passing evidence. This is cumulative coverage across the explicitly recorded revisions; it is not a repeated seven-case run of the final build.

- Home and Getting started both measured 390px. All requested component links completed by touch. Browse-to-Getting-started captured 11 frames, maximum document width 390px, zero overflowing frames.
- All nine motion presets, Activity preview, Off/on, and close passed. Open panel width was 366px, client and scroll widths both 354px, and horizontal scroll offset zero. Closing captured 48 frames, maximum document width 390px, zero overflowing frames.
- Both closeout cases recorded actual `pointerType:"touch"` and `touchstart` events, with zero page errors and zero console errors. The `maxTouchPoints=0` engine reporting quirk does not change the observed input event evidence.

The five unaffected scenarios were not repeated. Physical iPhone Safari and a deployed public URL remain unverified by this bounded task. Root owns the final production-build/CI gate.

## Reproduction and receipts

Run `node scripts/check-mobile-webkit.mjs --url=http://127.0.0.1:4320/sahajiv-ui --checkout=/absolute/path/to/tested/checkout --output=/tmp/mobile-webkit`. `--ids=home-and-getting-started,motion-settings` limits the closeout. Install the browser once with `npx playwright install webkit` if absent. For CI, `node scripts/check-mobile-webkit.mjs --serve` starts a temporary Vite preview of `out/` with `configFile:false`, base `/sahajiv-ui/`, host `127.0.0.1`, and an ephemeral port, then closes it at completion. An explicit `--url` overrides serving. The script uses direct executable/library calls and has no RTK dependency. Its WebGL-unavailable branch requires the explicit message and four static authored shapes, preserving meaningful Linux CI fallback coverage.

- `.work/mobile-webkit-initial-receipt.json`: untouched original seven-scenario result.
- `.work/mobile-webkit-closeout-receipt.json`: final two-scenario PASS with frame-by-frame maxima and actual touch events.
- `.work/mobile-webkit-diagnostic-receipt.json`: measured panel CSS before/after and transient host, ancestor, and animation evidence.
- Screenshots and extended diagnostics remain in the owning worktree under `output/playwright/mobile-webkit-release/` and `output/playwright/mobile-webkit-closeout/`.

Only the portable check and report/receipts are owned by this checkpoint. No production edits were made here. Node syntax check and focused ESLint passed.
