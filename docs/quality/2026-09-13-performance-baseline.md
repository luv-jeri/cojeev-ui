# Loading performance baseline — 13 September 2026

Status: **Measured baseline recorded. No optimization has been applied, and no budget below is approved.**

This is the "before" measurement for loading work: a repeatable, bounded set of numbers taken from the existing production export under one explicitly stated device and network condition, so that a later change can be shown to help or hurt. It deliberately measures loading only. It is not a full catalogue sweep, not a Lighthouse score, and not an accessibility or visual review.

Every number below came from the run recorded in this document. Where a metric could not be measured it is marked unavailable rather than estimated.

## What was measured, and why it represents this revision

The measurement used the already-built production export at `analytics-fixture/out`, served read-only. The export was not rebuilt and not modified.

Equality between that export's source and this checkpoint's base commit `5358d25` was verified before treating it as representative:

| Check | Result |
| --- | --- |
| Export's source worktree revision | `0ed8d06`, clean working tree, an ancestor of `5358d25` |
| `git diff --name-only 0ed8d06 5358d25 -- app components lib public data registry next.config.ts package.json package-lock.json postcss.config.mjs tsconfig.json` | empty — no product file and no dependency lock differs |
| Complete diff between the two revisions | 14 files, all of them documentation, CI scripts or tests (`docs/`, `scripts/check-docs.mjs`, `scripts/verify-install.mjs`, `tests/`) |
| `registry.json` in the export versus the committed `registry.json` | identical, SHA-256 `c503f2622a2867863e5a790cf70d76043e5571aab1bf388f59e34544da8b3381` |
| Rendered copy present in the export | homepage, `/privacy/`, `/requests/` and `/docs/` each contain their current source strings |

`registry.json` is a build product that `npm run build` regenerates immediately before `next build`, so its byte equality is direct evidence that the export was produced from source matching this revision. This is source-level and build-product-level equality; the export was not rebuilt to prove byte-identical output, so a rebuild could still differ in chunk hashes.

## Environment

| Setting | Value |
| --- | --- |
| Artifact under test | `/private/tmp/000h-phase1-jKXhib/analytics-fixture/out` (existing export, read-only, unmodified) |
| Source revision of that artifact | `0ed8d06`, product files identical to base `5358d25` |
| Server | Vite 7.3.6 preview, `127.0.0.1`, random port, base `/cojeev-ui/`, gzip enabled, `cache-control: no-cache` |
| Browser | Chromium 153.0.8010.12 via Playwright 1.63.0, headless, dedicated temporary profile created and deleted per run |
| Node | v22.22.0 |
| Viewport | 1440 × 900, device pixel ratio 1 |
| CPU | 4× slowdown (`Emulation.setCPUThrottlingRate`) |
| Network | 1638.4 kbps down (204.8 KiB/s), 750 kbps up, 150 ms latency — Chrome's "Slow 4G" preset |
| Cache | disabled; every run is a cold load |
| Settle window | 3000 ms after the load event, so post-load prefetch is captured |
| Runs | 3 per route; timings reported as the median, byte totals from the final run |
| Outbound traffic | every non-loopback request aborted and logged; **zero were attempted on any route** |
| Captured | 2026-09-12T18:50:30Z |

The export carries no PostHog project key and no `NEXT_PUBLIC_REPORTING_API_URL`, so the analytics and reporting clients ship in the bundle but stay inert. Zero outbound requests is therefore a property of this build's configuration as well as of the interception. A configured beta or production build would add analytics and reporting traffic that this baseline does not represent.

## Loading and main-thread metrics

Median of three runs.

| Route | TTFB | FCP | LCP | LCP element | DOMContentLoaded | Load | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 5.7 ms | 5380 ms | 5380 ms | `h1#hero-title.v-hero` | 5594 ms | 5594 ms | 0.0102 |
| `/docs/` | 6.2 ms | 5592 ms | 5592 ms | `h1.v-display` | 5755 ms | 5756 ms | 0 |
| `/docs/accordion-gallery/` | 6.4 ms | 5728 ms | 5860 ms | `img.v-accordion-gallery__image` | 6031 ms | 6032 ms | 0.0290 |
| `/privacy/` | 6.5 ms | 4820 ms | 4820 ms | `p` | 4917 ms | 4917 ms | 0.0001 |
| `/requests/` | 8.0 ms | 4672 ms | 4672 ms | `h1` | 4779 ms | 4780 ms | 0.0002 |

| Route | Long tasks | Total long-task time | Longest task | Blocking time beyond 50 ms | DOM nodes |
| --- | --- | --- | --- | --- | --- |
| `/` | 6 | 1018 ms | 531 ms | 635 ms | 1115 |
| `/docs/` | 8 | 1941 ms | 1366 ms | 1541 ms | 1251 |
| `/docs/accordion-gallery/` | 8 | 2154 ms | 1609 ms | 1754 ms | 1725 |
| `/privacy/` | 3 | 299 ms | 122 ms | 149 ms | 235 |
| `/requests/` | 3 | 336 ms | 121 ms | 186 ms | 217 |

TTFB is single-digit because the server is on loopback. It carries no information about production hosting and must not be read as a hosting result.

"Blocking time beyond 50 ms" is the sum of `max(0, duration − 50)` over observed `longtask` entries across the whole measured window. It is a main-thread work indicator from the Long Tasks API, not a Lighthouse Total Blocking Time, which is defined against a different interval and is not claimed here.

Layout shift is small everywhere, and the route worth naming is `/docs/accordion-gallery/`. Its median CLS is 0.0290, but its final run recorded a single shift of 0.0571 attributed to a `section` element — larger than the route's own median, so CLS there varies run to run between roughly 0.029 and 0.057 and comes from one shifting section rather than from many small movements. It is the largest single shift observed anywhere in the set; the next largest is 0.0018 on the homepage. Per-run CLS values were not retained, only the median and the worst single shift, so the spread is bounded rather than characterised.

**INP: unavailable.** This is a load-only measurement with no scripted interaction, so no interaction latency was produced and none is reported. No approximation has been substituted.

## Bytes: transfer, decoded, and prefetch

Transfer is gzip bytes actually received over the wire, including response headers, from `Network.loadingFinished`. Decoded is bytes after decompression, from `Network.dataReceived`.

"Initial" is everything requested up to the load event. "Prefetch and post-load" is everything requested after it — chiefly Next's router prefetching route payloads and their chunks.

"Inlined" is payload delivered inside a `data:` URL. **These bytes are a subset already counted inside the initial totals** — the fonts arrive inside a stylesheet, the images inside the HTML document. Chromium reports them as separate requests with their own byte counts, so counting them as network transfer would double-count them; they are separated here instead. The request counts in the last column are therefore disjoint — an inlined entry is not also counted as an initial request — while the inlined bytes are not: those already sit inside an initial response. This matters: the earlier, uncorrected form of this measurement overstated every route's transfer by roughly 300 KiB.

| Route | Initial transfer | Initial decoded | Prefetch transfer | Prefetch decoded | Inlined (subset of initial) | Requests initial / post-load / inlined |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 987.7 KiB | 3066.3 KiB | 208.6 KiB | 756.7 KiB | 347.2 KiB | 34 / 42 / 14 |
| `/docs/` | 1032.6 KiB | 3294.8 KiB | 9.1 KiB | 10.7 KiB | 300.4 KiB | 36 / 26 / 2 |
| `/docs/accordion-gallery/` | 1057.3 KiB | 3432.3 KiB | 11.3 KiB | 24.8 KiB | 316.4 KiB | 37 / 18 / 6 |
| `/privacy/` | 889.8 KiB | 2718.5 KiB | 266.4 KiB | 832.4 KiB | 304.3 KiB | 28 / 34 / 3 |
| `/requests/` | 851.8 KiB | 2597.5 KiB | 271.7 KiB | 863.2 KiB | 300.4 KiB | 26 / 28 / 2 |

Byte totals were identical across all three runs on every route, so this part of the baseline is deterministic and safe to compare against later.

Initial payload by resource type:

| Route | Script | Stylesheet | Document | Inlined font | Inlined image |
| --- | --- | --- | --- | --- | --- |
| `/` | 29 files, 499 KiB / 1632 KiB | 4 files, 428 KiB / 1176 KiB | 61 KiB / 259 KiB | 2 faces, 300 KiB | 12 images, 47 KiB |
| `/docs/` | 32 files, 563 KiB / 1828 KiB | 3 files, 427 KiB / 1174 KiB | 43 KiB / 293 KiB | 2 faces, 300 KiB | — |
| `/docs/accordion-gallery/` | 33 files, 574 KiB / 1860 KiB | 3 files, 427 KiB / 1174 KiB | 57 KiB / 398 KiB | 2 faces, 300 KiB | 4 images, 16 KiB |
| `/privacy/` | 24 files, 443 KiB / 1468 KiB | 3 files, 426 KiB / 1171 KiB | 21 KiB / 80 KiB | 2 faces, 300 KiB | 1 image, 4 KiB |
| `/requests/` | 22 files, 414 KiB / 1383 KiB | 3 files, 421 KiB / 1145 KiB | 17 KiB / 70 KiB | 2 faces, 300 KiB | — |

### Prefetch is uneven, and the light pages prefetch the most

`/privacy/` and `/requests/` each pull about 266–272 KiB after load — roughly 30% again on top of their own initial payload — while the two docs routes pull under 12 KiB. The route payload files those requests target all exist in the export (1090 `.txt` payloads), so this is real prefetched content and not a wave of 404s.

The asymmetry is worth an owner decision rather than a silent fix: the cheapest pages in the site are the ones spending the most post-load bandwidth, and on a metered or slow connection that is charged to a visitor who may never follow the link.

## Prioritized measured hotspots

Ranked by measured impact on the critical path, highest first.

### 1. Two web font faces are base64-inlined into the largest render-blocking stylesheet — about 306 KiB gzip on every route

`_next/static/chunks/1yxscuwxml--j.css` is 1,156,910 bytes decoded and 427,393 bytes gzipped. Two `data:font/woff2;base64` faces inside it account for 410,180 of those decoded bytes. Re-compressing the same file with those two data URLs removed gives **114,693 bytes gzipped**, so the inlined faces are **312,700 bytes gzip, 73.2% of the file**. The underlying font binaries are 307,635 bytes, so base64 itself costs only about 5 KiB once gzipped — the cost is structural, not encoding.

The consequences are all measurable: the stylesheet is render-blocking, so first paint cannot happen until all 427 KiB has arrived; at 204.8 KiB/s that is about 2.04 s of critical path, of which about 1.49 s is font binary. The fonts cannot be preloaded in parallel, cannot be fetched with their own priority, and cannot be cached independently of the CSS, so any CSS change re-downloads both faces. This applies identically to all five routes.

One caveat matters for judging any fix, and it is arithmetic rather than opinion: de-inlining moves these bytes **off the render-blocking path, it does not delete them**. The 305.4 KiB of gzipped data URL would be replaced by 300.4 KiB of separately fetched woff2, a net saving of only 4.9 KiB in total transfer. The win is that first paint would no longer wait for font binary, and that the fonts become independently cacheable and preloadable — not a byte reduction. Anyone reading the per-KiB conversion in hotspot 3 should not apply it to this item.

### 2. The initial script payload is 414–574 KiB gzip across 22–33 chunks, and it is what the main thread spends its time on

Scripts are the largest non-inlined category on four of five routes. The two docs routes carry the most (563 and 574 KiB gzip, 1.83 and 1.86 MiB decoded) and also show the most main-thread work: 8 long tasks, 1941 ms and 2154 ms of long-task time, with a single task of 1366 ms and 1609 ms respectively. `/privacy/` and `/requests/`, with roughly 140 KiB less script, show 3 long tasks and under 340 ms. The correlation across the set is direct.

### 3. First paint is bandwidth-bound on the whole initial payload

Predicted download time for each route's initial transfer at the emulated 204.8 KiB/s, against measured FCP:

| Route | Initial transfer | Predicted download | Measured FCP | Difference |
| --- | --- | --- | --- | --- |
| `/` | 987.7 KiB | 4823 ms | 5380 ms | +557 ms |
| `/docs/` | 1032.6 KiB | 5042 ms | 5592 ms | +550 ms |
| `/docs/accordion-gallery/` | 1057.3 KiB | 5163 ms | 5728 ms | +565 ms |
| `/privacy/` | 889.8 KiB | 4345 ms | 4820 ms | +475 ms |
| `/requests/` | 851.8 KiB | 4159 ms | 4672 ms | +513 ms |

The residual is 475–565 ms across every route — a tight, consistent band. First paint is therefore gated by the arrival of essentially the entire initial payload plus about half a second of main-thread work, not by the stylesheet alone. Any byte genuinely **removed** from the initial payload converts to first-paint time at roughly 4.9 ms per KiB under these conditions. This is the single most useful fact in this document for judging a later change — and the reason hotspot 1, which relocates bytes rather than removing them, must be assessed on render-blocking behaviour instead of on this rate.

### 4. The HTML documents are large, and on docs routes they are the third-biggest initial resource

`/docs/accordion-gallery/` ships a 398 KiB decoded document (57 KiB gzip) and `/docs/` a 293 KiB one. The homepage document decodes to 259 KiB, of which 47 KiB is 12 inlined `data:` images. These are real bytes on the critical path, though an order of magnitude below items 1 and 2.

## Proposed budgets — for owner review, not approved

These are proposals derived from the measurements above. Nothing here is a decision, and none of it has been agreed. They are written as per-route ceilings under the exact condition in the Environment section, so a later run of the same script can check them mechanically.

| Budget | Proposed ceiling | Current worst route | Rationale |
| --- | --- | --- | --- |
| Initial transfer (gzip) | 900 KiB | 1057.3 KiB (`/docs/accordion-gallery/`) | Needs script reduction, not the font change: de-inlining nets only 4.9 KiB. Bringing the docs routes to the lightest route's script weight (414 KiB) would put the worst route at about 897 KiB |
| Render-blocking stylesheet transfer (gzip) | 150 KiB | 427 KiB | Reachable by de-inlining the two faces alone, without touching application code: the same file measures 114.7 KiB once they are removed |
| Initial script transfer (gzip) | 450 KiB | 574 KiB | Within reach of the two lightest routes today (414 KiB), so it asks the docs routes to match pages that already exist |
| Post-load prefetch transfer (gzip) | 100 KiB | 271.7 KiB (`/requests/`) | Needs an owner decision on prefetch policy, not only an implementation change |
| Long tasks over 50 ms | 5 per route | 8 | Directly observable; the light routes already sit at 3 |
| Longest single task | 350 ms | 1609 ms | A 1.6 s uninterrupted task is the clearest main-thread defect in the set |
| CLS | 0.05 | 0.0571 (worst single run, `/docs/accordion-gallery/`) | Met on four routes and by the fifth route's median, but exceeded by that route's worst run; the shifting `section` needs reserved space before this can be called met |
| LCP | to be set after the first optimization pass | 5860 ms | Absolute timings here include no real hosting or CDN, so a production LCP target cannot honestly be derived from this run |

## Limitations

- **INP is unavailable** and no substitute has been recorded. Measuring it needs a separate interaction-driven run.
- **LCP and every other absolute timing are local-server figures.** TTFB is single-digit milliseconds because the server is on loopback, so these values cannot be read as production numbers. Their value is as a like-for-like reference for a later run of the same script.
- **One condition only.** Throttled desktop at 1440 × 900, Slow 4G, 4× CPU. No mobile viewport, no unthrottled pass, no second device class.
- **gzip only.** The local server serves gzip. Production hosting may serve brotli, which would reduce transfer figures; the ranking of hotspots would not change, since the largest item is already-compressed font binary.
- **Cold cache every run.** Repeat visits, which benefit from Next's immutable asset hashing, are not represented.
- **Chromium only**, headless, version 153.0.8010.12. No WebKit or Gecko figures.
- **No analytics or reporting traffic is represented**, because this export has neither endpoint configured. A configured build would load and send more.
- **Three runs per route.** Byte totals were identical across runs; timings are medians of three and will vary with machine load.
- **The export was not rebuilt.** Representativeness rests on source and build-product equality, documented above, not on a reproduced build.
- **No Lighthouse run and no Chrome DevTools MCP trace** was available in this environment; metrics come from the Performance APIs and the CDP Network domain directly. No Lighthouse score, Speed Index or Total Blocking Time is claimed.

## Repeating this measurement

```sh
npm ci
npm run build   # or point --export at an existing export
node scripts/measure-loading-baseline.mjs --export=out --runs=3
```

`scripts/measure-loading-baseline.mjs` serves the export read-only on a random loopback port, drives a disposable Chromium profile under the fixed condition recorded above, refuses and logs every non-loopback request, and writes the full per-asset result to `artifacts/performance-baseline/baseline.json` (ignored by Git). It modifies nothing in the export and touches no application code.
