# Targeted WebKit and final lifecycle corrections

Scope: the two failures in `artifacts/mobile-webkit/results.json`, the delegated Calendar month/Button loader lifecycle gaps, and the dark Button busy-to-idle paint defect found during that exact workflow. The original failure receipt remains unchanged. No full build or registry generation was performed in this stream.

## Corrections and evidence

| Issue | Observed cause and correction | Evidence |
| --- | --- | --- |
| Mobile navigation transient width 468 on a 390 viewport | Revealing the sidebar exposed a newly created ThemeToggle morph SVG before a hidden host could be measured. Without width/height/viewBox, the SVG occupied its intrinsic 300px width at x=168. `motion/use-morph.ts` now initializes the owned layer at zero width and height; `measure()` replaces both when the host is measurable. | Original built assets reproduced navigation failure in 2/4 fresh runs. A diagnostic zero-size rule passed 4/4 with unchanged overflow assertions. Current-source hidden-control fixture passed twice at maximum document width 390 and verified the revealed SVG subsequently received a nonzero measured width. |
| MultiSelect ResizeObserver loop | Floating UI observed the pulsing trigger's changing bounding width; the popover copied that width and fed resizing back into auto-update. `ui/multi-select.tsx` now uses the existing PopoverAnchor around an untransformed wrapper while the Button retains its pulse. | Instrumented original failure identified Floating UI's observer and trigger width changing 324→317→324. Disabling only trigger scale removed the original error. The current-source fixture opened, searched, selected Research, closed with Escape, and restored trigger focus in two WebKit runs with zero runtime errors. |
| Calendar month replacement had no lifecycle | `ui/calendar.tsx` enables DayPicker's native retained month animation by default, using shared timing and quiet settings. Its retained aria-hidden snapshots become inert and lose duplicate descendant ids. `styles/calendar.css` provides caption/week entry and exit keyframes and gives animated tbody a real grid box; WebKit could not animate its previous `display:contents` layout. | Chromium 1440/light and WebKit 390/dark both passed pointer and Enter navigation, rapid reversal, retained old month semantics, animation entry, final removal, and reduced/global Off/Flow Off behavior. Source fixture screenshots were inspected. |
| Button loader had no retained exit | `ui/button.tsx` wraps the conditional indicator in shared MotionPresence/MotionSurface. `styles/button.css` retains the small indicator size during exit. The native Button remains mounted. | Both browser cases passed loader mount, busy semantics, retained exit, removal, and stable Button identity and layout height. Reduced/global Off/Flow Off use immediate quiet replacement. |
| Dark Button retained the previous state's background | The automatic morph adapter captured the host's in-progress CSS background transition as durable `--mfill`. `motion/use-morph.ts` now suspends `transition-property` during the synchronous endpoint read and restores the exact prior inline value and priority. | Before correction, active and Flow Off both showed busy pink and idle disabled brown. After correction, both modes matched the intended CSS endpoints exactly: busy background `rgb(36, 32, 25)` with foreground `rgb(167, 158, 144)`; idle background `rgb(245, 184, 219)` with foreground `rgb(17, 17, 17)`. Final idle screenshot inspected. |

## Runnable focused gates

All three resolve files from their own repository location, serve existing `out/` assets, and bundle the current real component source in memory. They do not build or generate the registry. Optional `--output=...` paths resolve from the repository root. Promotion preserved their tested workflows; only source/output path resolution and formatting changed, so no browser rerun was performed solely for promotion.

- `node scripts/check-webkit-hidden-anchor.mjs`: WebKit 390px touch MultiSelect workflow plus first-frame hidden ThemeToggle reveal.
- `node scripts/check-calendar-button-lifecycle.mjs`: Chromium 1440/light and WebKit 390/dark, native Calendar membership and Button loader lifecycle, three quiet modes.
- `node scripts/check-button-paint.mjs`: WebKit 390/dark active and Flow Off busy/idle morph fill and foreground against an unanimated CSS endpoint clone.

Receipts:

- `output/playwright/webkit-diagnosis/baseline/results.json`: original two-case rerun; navigation passed that run, MultiSelect failed.
- `output/playwright/webkit-diagnosis/navigation-repeat/results.json` and `navigation-svg/results.json`: 2/4 original navigation failures in each trace.
- `output/playwright/webkit-diagnosis/zero-initial-svg/results.json`: diagnostic old-build rule, 4/4 navigation passes.
- `output/playwright/webkit-diagnosis/stable-trigger/results.json`: diagnostic old-build scale rule, MultiSelect pass.
- `output/playwright/webkit-diagnosis/current-consumer/results.json`: current source, 2/2 targeted WebKit passes.
- `output/playwright/calendar-button-lifecycle/final/results.json`: current source, 2/2 lifecycle cases passed before the separately checked endpoint paint correction.
- `output/playwright/button-paint/baseline/results.json` and `final/results.json`: 2/2 failures before and 2/2 passes after the paint correction.

Final `tsc --noEmit`, ESLint on the four owned TypeScript modules, and the six-source whitespace diff check passed. Promoted scripts received syntax checks. No runtime or overflow assertion was relaxed; ResizeObserver errors were not ignored.

## Source freeze and remaining integration

Frozen product paths for this final batch:

- `registry/sahajiv/motion/use-morph.ts`
- `registry/sahajiv/ui/multi-select.tsx`
- `registry/sahajiv/ui/calendar.tsx`
- `registry/sahajiv/styles/calendar.css`
- `registry/sahajiv/ui/button.tsx`
- `registry/sahajiv/styles/button.css`

The parent still owns the fresh registry/build and original production `check-mobile-webkit.mjs --serve --ids=home-and-getting-started,multi-select` rerun. Diagnostic rules against old assets and current-source fixtures prove the individual causes/corrections; they do not substitute for that final rebuilt-docs integration receipt.
