# Card and Badge complete-entry demo fidelity

2026-09-08. Worktree `codex/motion-components`; integration base `998264a` (merge of main `040fefa`). Scope: the supplied Card and Badge entry demos, both initial themes, widths 360/390/768/1024/1440/1920. Production Card/Badge and the explicitly authorized demo-wrapper adapter only. Reference files, shared motion and the gate runner were not changed.

## Result

24 unique comparisons PASS: 12 Card and 12 Badge. Every final row has zero measured computed-style differences and zero decoded-pixel differences. Independent source A/A and candidate B/B runs agree in computed state, decoded pixels and raw PNG bytes. No oracle adapters or unavailable-style exemptions were used.

| Component | Theme | 360 | 390 | 768 | 1024 | 1440 | 1920 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Card | Light | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS |
| Card | Dark | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS |
| Badge | Light | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS |
| Badge | Dark | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS | exact PASS |

The original full-entry baseline in main `artifacts/gate-card-badge-demos/results.json` had 24 FAIL. Its original isolation variants had passed because those files omit these composed demo contexts. This supplement does not replace that historical result or claim broader component/motion coverage.

## Source evidence and corrections

1. **Card stats border: production port defect.** Source `css/components.css:87` first defines a two-pixel underline, but the complete cascade at `css/components-2.css:303–305` explicitly clears `.v-stat` borders and box shadows. The port's scoped `.v-stat[data-slot].-ul` rule outranks its later plain reset, retaining the border. At 360px, the yellow card was 130.875px instead of 128.875px and shifted the centered demo. `registry/sahajiv/styles/card.css:11–12` restores the source result for underlined Stat children in Card with sufficient scoped specificity and without `!important`. The apparent watermark displacement disappears with this height correction; no watermark renderer change was needed.

2. **Badge dot geometry: production descendant-style omission.** Source `css/components.css:67` supplies current-color paint; `css/components-2.css:633–634` gives seven-pixel dimensions, a 50% radius, no flex shrink, zero margin and the pending olive paint. The supplied pending/live badges contain plain `.v-dot` spans. Those spans had zero width/height in the port, making both badges seven pixels too narrow. `registry/sahajiv/styles/badge.css:4` restores the authored descendant styling under a production Badge root. The existing public `BadgeIndicator` also uses the exact 50% radius at `registry/sahajiv/ui/badge.tsx:57`, replacing the unrelated Tailwind rounded-full literal.

3. **Combined ink/caps Badge: production modifier omission.** The source demo composes `.v-badge.-ink.-caps`. Source `css/components.css:66` supplies uppercase; `css/components-2.css:627` supplies 10.5px/600 typography, .08em tracking, 26px height and 11px horizontal padding. The port's variant enum selected ink and left the additional caps class without its typography, producing mixed-case Patients at 12.5px/500. `registry/sahajiv/styles/badge.css:3` restores this authored class modifier. The public variant API is unchanged.

4. **Wide Card grid: fixture context omission.** Source `css/components-2.css:350` applies `align-items:start` to `.demo [style*="grid-template-columns:repeat"]`. The full Card demo's raw repeat-grid wrapper depends on that rule; at widths 768 and above the candidate instead stretched the first two cards to 157.188px, versus source 112.188px and 128.875px. Parent explicitly authorized the narrow mapping in `apps/gate/candidate.tsx:96–97`: when the original source element matches that exact authored selector, the candidate wrapper receives `style.alignItems = "start"`. This is demo layout scaffolding, not a new Card default. Card continues to use the source `align-content:start` behavior. The original Badge demo contains no matching repeat-grid wrapper, so this final fixture-only change cannot affect its measured rows.

The source's later border reset is retained as the baseline. No reference-runtime bug was repaired or treated as an accepted visual exception in this batch. No fixture component substitution was necessary for the existing Shape watermarks or `.v-dot` children.

## Reproduction and frozen evidence

Commands ran from `.worktrees/motion`, always through RTK, on alternate port 4325. Browser processes have ended.

```sh
rtk proxy node apps/gate/run.mjs --components=card,badge --demo-only=true --widths=360 --port=4325 --fail-fast=false --out=artifacts/gate-card-badge-demos-fix360 --report=artifacts/gate-card-badge-demos-fix360/GATE.md
rtk proxy node apps/gate/run.mjs --components=card,badge --demo-only=true --widths=360,390,768,1024,1440,1920 --port=4325 --fail-fast=false --out=artifacts/gate-card-badge-demos-fixed --report=artifacts/gate-card-badge-demos-fixed/GATE.md
rtk proxy node apps/gate/run.mjs --components=card --demo-only=true --widths=360,390,768,1024,1440,1920 --port=4325 --fail-fast=false --out=artifacts/gate-card-demo-layout-fixed --report=artifacts/gate-card-demo-layout-fixed/GATE.md
```

- Focused 360 run: 4/4 exact PASS after production fixes.
- First six-width run: all 12 Badge rows and four narrow Card rows exact PASS; eight wide Card FAIL retained in its results. Candidate SHA-256 `da178d6d293afc92e5e572d57b1f5e450a8822f0942ae6ba50001699a31b441d`, unchanged during run.
- Final affected-family run after the fixture adapter: all 12 Card rows exact PASS. Candidate SHA-256 `3b01db6fcbed0784c575d67beb799ba6a0edd997e3cdf671dc683e40737730bc`, unchanged during run.
- Final 24 unique passing rows are the Badge rows from `artifacts/gate-card-badge-demos-fixed/results.json` plus every row from `artifacts/gate-card-demo-layout-fixed/results.json`. Screenshots and per-row state evidence sit beside those files. No failed row is hidden or overwritten by this accounting.

Protocol: complete authored `vriksha.css` and original source scripts, fonts ready, real 1800ms settle, sequential independent reloads, controlled rewind then step without reseeding. Static reduced-motion frames. Exact visible computed state and pixelmatch threshold .1 with anti-alias pixels included; all final cross differences are actually zero. Real animation and interaction coverage remain separate.

Checks passed: scoped TypeScript over all registry sources plus `apps/gate/candidate.tsx`; ESLint on both changed TSX files; PostCSS parse and no-important checks on changed CSS; `git diff --check`. The temporary focused TS config extends root `tsconfig.json`, includes `registry/sahajiv/**/*.ts`, `registry/sahajiv/**/*.tsx`, `apps/gate/candidate.tsx`, excludes node_modules and disables incremental state.

## Remaining scope boundary

No remaining Card/Badge full-entry demo mismatch was measured. The underlying generic Label.Stat reset specificity also exists outside Card; this batch intentionally corrects only its authorized Card context and reports the shared Label issue for its owner. Earlier open shared-motion/full-cascade discrepancies remain separate and are not closed by these static results.
