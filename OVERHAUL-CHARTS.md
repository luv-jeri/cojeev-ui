# Chart suite implementation and evidence

Completed 2026-09-08. This report covers the seven new chart entries and the shared chart implementation. Registry generation, copied-example integration, production builds, and the parent agent's wider docs matrix are separate integration work.

## Public surface

| Entry / export | Variants | Default |
| --- | --- | --- |
| `area-chart` / `AreaChart` | `linear`, `step`, `stacked` | `linear` |
| `bar-chart` / `BarChart` | `grouped`, `stacked`, `horizontal` | `grouped` |
| `line-chart` / `LineChart` | `linear`, `smooth`, `step` | `linear` |
| `pie-chart` / `PieChart` | `pie`, `donut` | `pie` |
| `radar-chart` / `RadarChart` | `polygon`, `rounded`, `grid` | `polygon` |
| `radial-chart` / `RadialChart` | `full`, `semicircle` | `full` |
| `chart-tooltip` / `ChartTooltip` | Controlled shared tooltip | — |

Cartesian and radar charts accept `ChartPoint[]` and `ChartSeries[]`; pie and radial charts accept `ChartSlice[]`. The types `ChartPoint`, `ChartSeries`, `ChartSlice`, and `ChartColor` are publicly re-exported from `ui/chart.tsx`. Common presentation props include caption, description, formatter, visible data-table control, and initial/synchronized table visibility. Radial and radar support `max`.

`ChartTooltip` accepts an active label/items record, local pointer coordinates, and container bounds. It can be composed independently; the chart frame handles its pointer and keyboard state for chart consumers.

## Composition and behavior

All six charts share `ChartFrame`: existing Card, Button, and Table components provide the caption, description, legend controls, inspection plot, footer, and semantic data fallback. Cartesian and circular renderers share geometry rather than maintaining six separate interaction systems. SVG paths and palette tokens establish the visual identity without adding a chart package.

Legends actually remove series or slices, arrow keys inspect observations, Home/End reach endpoints, and Escape dismisses details. The SVG has a meaningful name, the figure references its caption/description, and a polite keyboard-only status exposes changed values. The data table remains available in the accessibility tree while visually hidden and can be shown through the footer control. Real screen-reader hardware was not tested.

Shared choreography drives keyed series removal, path/data transitions, plot/empty transitions, and tooltip presence. Tooltip coordinate movement uses a short non-overshooting tween so placement remains bounded; its entering surface remains opaque. Tooltip measurements clamp and flip near edges. Stable React-generated IDs isolate gradients, clip paths, captions, and tooltip references.

Finite-value normalization preserves zero, treats invalid observations as missing, separates positive/negative stacks, and avoids invalid empty geometry. Line/area gaps are retained. Pie ignores negative/invalid amounts; an all-zero pie remains an explicit zero state. Empty inputs show clear content rather than passing as a blank canvas. Examples expose updated, zero, missing, and empty datasets.

## Exact source scope

- Added UI modules: `registry/sahajiv/ui/{area-chart,bar-chart,line-chart,pie-chart,radar-chart,radial-chart,chart-tooltip}.tsx`.
- Added shared helpers: `registry/sahajiv/lib/chart-geometry.ts`, `chart-cartesian.tsx`, `chart-circular.tsx`.
- Extended `registry/sahajiv/ui/chart.tsx` and `registry/sahajiv/styles/chart.css`; preserved the existing ChartRing conditional table announcement.
- Added `components/examples/charts.tsx` with `AreaChartExample`, `BarChartExample`, `LineChartExample`, `PieChartExample`, `RadarChartExample`, `RadialChartExample`, and `ChartTooltipExample`.
- Added `tests/chart-suite.test.ts` and `scripts/check-overhaul-charts.mjs`.
- Table visibility prop reconciliation now occurs through guarded render state, preserving user toggles and later prop changes without an effect that immediately updates state.

## Verification

`rtk proxy npx tsx --test tests/chart-suite.test.ts`: 6/6 passed. These cover invalid/missing/zero domains, diverging stacks, line/area gaps, full-circle pie paths, radar geometry, and bounded tooltip placement.

`rtk proxy npx tsc --noEmit`, `rtk proxy npx eslint registry/sahajiv/ui/chart.tsx`, and `rtk git diff --check` passed after the final table state adjustment.

Reusable browser command:

```sh
rtk proxy node scripts/check-overhaul-charts.mjs --url=http://127.0.0.1:4320/sahajiv-ui --output=output/playwright/overhaul-charts/docs
```

The gate runs all 16 chart variants plus the standalone tooltip at 390px dark and 1440px light, with motion enabled. Every chart case requires real nonzero SVG geometry, pointer and keyboard tooltips, bounded tooltip coordinates, Escape, actual legend removal, visible table controls, no page overflow, and no runtime errors. Each default chart also exercises updated/zero/missing/empty data. It cannot pass an empty placeholder as a chart.

- Initial matrix: 33/34 passed in `output/playwright/overhaul-charts/docs/results.json`. The 390px radial semicircle case timed out waiting for shared preview hydration during concurrent integration; the failed record remains intact.
- Focused radial rerun: 4/4 passed in `output/playwright/overhaul-charts/radial-final/results.json`, including the failed case.
- Visual review found tooltip overshoot and overly transparent entry. After correcting those, area/pie/standalone-tooltip rerun: 12/12 passed in `output/playwright/overhaul-charts/tooltip-final/results.json`. Screenshots there are the final tooltip evidence.
- Thus each requested variant/width/theme case has a successful actual docs run; this is the union of the recorded runs, not a claim that the initial matrix was clean.

Visual inspection included mobile dark area, horizontal bar, smooth line, all pie/radar/radial variants, and the standalone tooltip. Final donut tooltip and standalone tooltip screenshots confirm opaque readable surfaces within narrow bounds. Parent owns remaining 320/768 docs coverage and final integration approval.

## Limits

No new runtime dependency was added. Very large category/series counts, extreme floating-point magnitudes, and long tooltip lists have not received a dedicated usability matrix. This work does not claim exhaustive assistive-technology or browser-engine coverage. Registry closure and copied example compilation are parent-owned and must use their own evidence rather than this source/browser report.

## Final integration corrections

The full production check subsequently caught missing Motion starting values that wrote `d="undefined"` during initial chart mount. Explicit initial SVG attributes now match their finite geometry. Bar dimensions, radar radii and path length use the bounded shared duration curve, avoiding spring undershoot below zero. Decorative position/opacity retains shared spring behavior.

The strengthened chart gate captures console errors as well as uncaught page errors: all 32 chart variant/context cases passed in `output/playwright/overhaul-charts/console-final/results.json`. The standalone tooltip retains its separate two-context proof above. `scripts/check-overhaul-chart-lifecycle.mjs` passed six cases: active, Off and reduced motion at 390/1440, with actual retained bar/radar record exits, crosshair/dot removal, rapid reversal, finite SVG attributes and inert exiting plots. Initial discovery receipts remain preserved.
