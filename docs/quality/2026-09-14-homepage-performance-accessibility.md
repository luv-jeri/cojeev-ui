# Homepage performance and accessibility — 14 September 2026

Scope: the homepage only, desktop, on a local production build. Checkpoints **G01-1** (this
measurement), **G02-1** (`6931629`, fonts off the critical path) and **F05-1** (`c4dcd14`, heading
order and label-in-name). G01, G02 and F05 all stay open; the limits are listed at the end.

## Harness

Reproducible on any machine with the repository and Node 22.22.0:

```
COJEEV_BASE_PATH='' NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT=production \
NEXT_PUBLIC_SITE_URL=https://000h.cojeev.com \
NEXT_PUBLIC_REPORTING_API_URL=https://feedback.cojeev.com \
NEXT_PUBLIC_ANALYTICS_ENABLED=false NEXT_PUBLIC_CONTACT_ENABLED=false \
npm run build
# serve out/ on 127.0.0.1:4346 with brotli on text and immutable caching on /_next/static/
npx lighthouse@13.4.1 http://127.0.0.1:4346/ --preset=desktop --chrome-flags="--headless=new"
node scripts/check-landing-performance.mjs http://127.0.0.1:4346/
```

`COJEEV_REGISTRY_URL` is deliberately left unset: setting it rewrites the URL in 171 generated
registry JSON files, which has nothing to do with page performance.

The build emitted the same stylesheet chunk name and size as production
(`0adu3yqf7_ked.css`, 1,157,766 bytes) before the change, which is what makes the comparison valid.
The harness is still faster than production in absolute terms — loopback, no CDN round trip — so it
is used for deltas only. **These are localhost numbers, not production Core Web Vitals.**

## Payload on the critical path

| | before | after |
|---|---|---|
| render-blocking site stylesheet, decoded | 1,157,766 | 747,642 |
| the same file, brotli q6 | 410,316 | 102,213 |
| Lighthouse `render-blocking-insight` wastedMs for that file | 451 ms | 210 ms |
| all stylesheets, Lighthouse transfer total | 428,231 | 120,128 |
| fonts | inlined in the stylesheet | 2 requests, 307,632 bytes, separately cacheable |

Production transferred 435,753 bytes for that stylesheet; this harness compresses the identical file
to 410,316, so before/after uses harness numbers throughout.

Two notes against over-claiming. Brotli recovers almost all of the base64 expansion — `fonts.css`
source is 410,700 bytes and compresses to 308,675, against 307,632 for the raw `.woff2` pair — so
inlining cost about 1 KB over the wire, not a third. And Lighthouse counts `data:` font URLs as
transfer, so total-byte-weight was never a physical-network figure before or after. The change worth
having is *which* bytes block the first paint, plus the fonts now surviving unrelated CSS edits in
cache.

## Lighthouse 13.4.1, desktop preset

| Run | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|---|---|---|
| Production live (coordinator's baseline) | 85 | 98 | 92 | 100 | 869 | 1669 | 151 | 0.01 | 2243 |
| Local baseline, same tree, 1 run | 96 | 98 | 100 | 100 | 706 | 1366 | 64 | 0.009 | 826 |
| Local, fonts extracted, median of 3 | 96 | 100 | 100 | 100 | 744 | 1311 | 29 | 0.009 | 761 |
| Local, fonts extracted + preload, median of 3 | 96 | 100 | 100 | 100 | 523 | 1323 | 12 | 0.009 | 741 |

Individual final runs: performance 96 / 97 / 96, FCP 549 / 523 / 523, TBT 12 / 12 / 12.

**The performance score did not improve on this harness and no improvement is claimed.** It already
scored 96 before any change, because loopback removes the network cost the fix addresses. What moved
repeatably is FCP (706 -> 523 ms) and TBT (64 -> 12 ms). Accessibility 98 -> 100 is deterministic.

The local baseline is a single run taken while other agents' browser probes were active on the
machine; treat its FCP and TBT as indicative. Every after-number is a median of three runs taken
while other heavy probes were paused.

Whether production reaches nearer 100 is **unmeasured** and needs a deploy plus a clean production run.

## Accessibility

`heading-order`: one node, the hero demo's `CardTitle` h3 sitting directly under the h1. Repaired with
one visually hidden h2 that also names the demo group. `CardTitle` is unchanged — h3 is correct on the
docs pages, where an h2 always precedes it.

`label-content-name-mismatch`: ten nodes, each an `aria-label` that did not contain the control's own
visible text. Nine now take their name from their visible text plus a hidden continuation. The tenth,
the appearance trigger, keeps an `aria-label` pluralised to "Colours and contrast" because its visible
label is `display:none` below 640px in responsive mode, where an implicit name would collapse to a
fragment. The brand link keeps the real "000h by Cojeev" name and its artwork: the first zero is drawn
as the mark, so the visible glyphs read "00hby Cojeev" and can never contain the brand name.

Both rules are clean in axe-core 4.13.0 and in Lighthouse.

## Application evidence

`node scripts/check-landing-performance.mjs` — 26 of 26 checks pass against the final build: both
faces loading and applied; two separate woff2 requests; axe clean on the two rules; the four repaired
accessible names; Motion Drawer open and Escape; Dock, Agent State, Pattern Background and Animated
Icon responding; the lazily loaded Semantic Bloom answering Gather/Scatter; the shape studio's
randomise button working under its visible name; the `#featured-components` hash landing on the
section; skip link first in tab order, brand link next; no console errors; the appearance trigger
still named at 390px; the reporting launcher's text still rendered at 390px; hero and demo under
reduced motion; and with JavaScript disabled, the hero heading, all six featured components, the shape
studio section and the hero demo heading all present.

`npm run typecheck` and `npm run lint` pass. Screenshots (desktop light/dark hero, featured, shape
studio, reduced motion, no-JS, mobile light/dark) were taken to the ignored `artifacts/` path and are
not committed.

## Not done, and why

1. **Best practices 92 on production** — both failing audits are the single Cloudflare-injected
   `static.cloudflareinsights.com/beacon.min.js` that the CSP blocks. The local build scores 100 with
   the identical CSP. Provider configuration; `script-src` was not widened.
2. **The stylesheet is still 747,642 decoded bytes and still render-blocking** (210 ms wastedMs).
   `app/globals.css` imports all 157 registry component stylesheets on every route. This is now the
   largest critical-path item and the main driver of the 611 ms Style & Layout main-thread group.
   Splitting it per route touches docs CSS owned by another branch — that is the rest of **G02**.
3. **1,774,912 raw bytes of initial JavaScript across 29 script tags**, 415,457 of it the full Lucide
   pack imported synchronously by `Icon`. Deferring it would leave server-rendered icon paths with no
   client counterpart at hydration, breaking the no-JavaScript guarantee. That is **G03**, and it
   needs its own design.
4. **`unused-javascript` (101 KiB) is mostly Next route prefetch**, not homepage code — the Orama
   search bundle and a sibling arrive because in-viewport `/docs/` links are prefetched. Disabling
   prefetch would trade navigation speed for a diagnostic number. Part of **G04**.
5. **The below-fold brand sculpture is 640x640 for a 128px slot** (21 KiB). `images.unoptimized` is
   set for the static export, so `sizes` has no effect. Lazy and below the fold, so it moves no scored
   metric.
6. **Mobile throttling, and the docs, privacy and reporting routes, are unmeasured**, as are agreed
   budgets — the rest of **G01**.
