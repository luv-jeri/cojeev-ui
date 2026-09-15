# CJ01-1: preserve the Bond, improve startup

Parent checkpoint: CJ01, `feat/cj01-coming-soon` at `3a80781fcb0dece6cb589c90eb1fc9a726e7249f`.
Review branch: `fix/cj01-1-performance`. Measured 2026-09-15.

The existing page now scores **100 Lighthouse performance on mobile and desktop in three consecutive runs each**. These are compressed local production-build measurements, not a promise about every device or a deployed site. Earlier iterations scored 98–99 on mobile; the final six runs are all retained, without selecting only the best result.

| Median of three runs | Mobile | Desktop |
|---|---:|---:|
| Performance scores | 100 / 100 / 100 | 100 / 100 / 100 |
| First contentful paint | 0.90 s | 0.24 s |
| Largest contentful paint | 1.80 s | 0.40 s |
| Total blocking time | 46.5 ms | 0 ms |
| Speed index | 1.28 s | 0.37 s |
| Cumulative layout shift | 0 | 0 |

The supplied handoff baseline was mobile 67 / desktop 98, with mobile FCP 4.5 s and LCP 5.5 s. A fresh initial run on this host scored mobile 51 (FCP 4.4 s, LCP 5.3 s); host load makes the two baseline scores non-identical. Neither baseline is represented as a final measurement.

## What changed

- External, independently cached WOFF2 fonts replace the 410 KB inline base64 font stylesheet for this consumer. The initially used subsets total 102,076 bytes. Original full faces remain available through disjoint Unicode ranges for other characters. Bricolage retains **weight, width and optical-size axes**; DM Sans retains both original axes. No static-font replacement, altered outlines or synthetic headline weight.
- Build-time prerendering emits the **same React tree**, in both theme states. A small bootstrap gives CSS and fonts priority and starts hydration after actual first contentful paint. Early prompt text, Enter and button clicks are retained and replayed after hydration. Development mounts immediately because it has no prerendered tree.
- The original ShaderGradient scene runs in an OffscreenCanvas worker when supported. It uses the same presets, camera, pixel density, linear/flat rendering and motion gates. Unsupported workers fall back to the original scene. Graphics initialization no longer blocks the input thread. The existing still gradient and 3.4-second canvas fade are retained.
- Headline and floating-item geometry reads are batched before writes. The membrane avoids duplicate same-size initialization measurements and refreshes on font load, resize and context restoration.
- Tailwind scans the consumer's actual transitive component imports instead of the entire catalogue. A build/dev plugin regenerates the source list when imports change. The shared stylesheet is about 95 KB raw / 19 KB gzip, down from about 532 KB raw / 337 KB gzip at baseline.

The two page layout stylesheets, story copy and timing, membrane shader, launch manifest and countdown logic are unchanged. [Preserved-file hashes](performance-preserved.json) verify the most sensitive files. [The source manifest](performance-source.json) identifies the measured implementation.

## Verification

- Production build succeeded; see [build output](performance-build.log).
- Existing 118-check story suite: **117 passed initially**, with no browser errors. The remaining assertion sampled the new preview clock before its first second had elapsed (`30:00:00:00`), then correctly observed it ticking. Its old readiness condition implicitly depended on slower network-idle startup. Waiting explicitly for the first tick corrected that test timing; **all nine focused countdown/theme checks then passed**. No countdown code or assertion was weakened. Raw [story](performance-story-checks.json) and [focused rerun](performance-countdown-checks.json) results preserve this distinction.
- Existing lifecycle suite: **21/21 passed**, no browser errors; see [results](performance-lifecycle-checks.json). This covers Enter, replay, pause/resume, hidden-tab behavior, themes, drawer gestures and the other two entry pages.
- Font verification: **4,998 glyph outline and advance comparisons passed**, across the page's weights and optical sizes; all original variable-axis metadata is retained. `scripts/verify-fonts.py` reproduces it.
- Browser review: light/dark rendering, desktop/phone geometry, background worker canvas, continued story motion after resize and zero console errors. See [desktop](performance-desktop-recall.png) and [phone](performance-mobile-recall.png). Under a deliberately slow connection, text entered before hydration survived and Enter completed the story. Enter from the page body before hydration was also verified. This is implementation verification, not new owner visual approval.
- Extended TypeScript check reports **seven existing diagnostics in unchanged files**: the missing `countdown.mjs` declaration and six `bubble.tsx` errors. It reports no diagnostics in changed files. The whole typecheck is **not green**; [raw output](performance-types.log) is retained. No unrelated typing repair or full library release gate was attempted.
- The original-renderer fallback is retained and reviewed, but forced worker-failure simulation was not supported by the in-app browser's CDP interface. Cross-browser/device verification remains a release check.

Final check-running time: story 289.01 s; lifecycle 47.96 s; focused countdown rerun 7.43 s; six Lighthouse runs 77.48 s; extended typecheck 5.23 s. These numbers exclude implementation, test adaptation, debugging, manual visual review and packaging. Earlier experiments are not counted as final verification. See [timings](performance-check-times.json).

## Reproduce

Run from the app directory in the existing runnable preview copy, or install the repository and app dependencies in a full checkout first:

```sh
rtk npm run build
rtk npm run preview -- --port 4346
rtk proxy npx --yes lighthouse@12 http://127.0.0.1:4346/ --only-categories=performance --output=json --output-path=verification/mobile.json --chrome-flags='--headless=new --no-sandbox' --quiet
rtk proxy npx --yes lighthouse@12 http://127.0.0.1:4346/ --only-categories=performance --preset=desktop --output=json --output-path=verification/desktop.json --chrome-flags='--headless=new --no-sandbox' --quiet
rtk proxy npx --yes -p typescript@5.6 tsc -p tsconfig.performance.json
```

Vite preview supplies gzip. Do not compare these scores with a development server or an uncompressed static server. Run Lighthouse serially, with browser tests/builds stopped. No benchmark detection, changed throttling settings, disabled visual effects or audit exclusions were used within the performance category. The scores do not refer to accessibility, SEO or best-practices categories. [All six run metrics](performance-verified-runs.json) and `lighthouse-verified-{mobile,desktop}-{1,2,3}.json` are retained.

Optional font regeneration/proof uses Python with `fonttools[woff]==4.65.0`, Brotli and Zopfli, installed in an isolated environment. Run `scripts/prepare-fonts.py`, then `scripts/verify-fonts.py`. The generated WOFF2 files and OFL licenses are committed; Python is not needed to serve or build the site. The registry's shared base64 font source remains untouched.

The existing browser harness stays in `~/Developer/cojeev-coming-soon-preview/.bond-tools`, as in the original handoff. `performance-smoke.mjs` and `performance-lifecycle.mjs` point its unchanged assertions at production port 4346 and wait for the actual membrane renderer instead of `networkidle`; `performance-countdown.mjs` isolates the corrected first-tick readiness check.

## Delivery boundary and rollback

- [x] CJ01-1 implementation and measured 100 performance target.
- [x] Relevant regression and visual evidence, with timing/typecheck caveats above.
- [ ] Owner review and checkpoint acceptance.
- [ ] Merge/release gates and production approval.

No deployment, launch activation or production configuration change. `public/launch.json` remains byte-identical with `startedAt: null`. Revert this one scoped commit to restore the parent implementation. The iCloud-backed worktree stalls on some object/file reads, so this change is prepared in a fresh sparse review checkout at `~/Developer/cojeev-coming-soon-performance-review`; the original worktree and parent branch are preserved.

## CJ01-1 publication preflight correction

The first PR run exposed React render-ref/effect lint violations and a Next-only navigation rule applied to the Vite app. The startup handoff now restores captured input in a cancellable microtask; imperative animation snapshots update after commit; stopped/compact display state belongs to React; timeline cleanup cancels its own completion. Worker failures and prop updates follow the same lifecycle rules. No page CSS, shader, font or animation timeline changed.

The shared shader modules also lacked root dependencies. Declaring their existing pinned packages exposed the Fiber JSX namespace colliding with unconstrained polymorphic HTML tags. Those `as` types now use the components' existing DOM prop types; Label preserves its wider polymorphism through React.createElement (including the existing legend examples). Root typecheck and all 166 unit tests pass. Root lint passed after lifecycle fixes; the later type-only changes and Label change also passed affected lint. The production build and 21 lifecycle checks passed; the full story rerun is recorded with the publication evidence. These results replace the earlier typecheck limitation for the root build.
