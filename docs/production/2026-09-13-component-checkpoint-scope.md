# B01-3 — focused component-polish verification

The owner requested continuation and again rejected a full catalogue run for every small change on 13 September 2026.

## Reproduced cause

Running the classifier against the exact PR diffs at base `c750ec8` returned:

- PR #25 (`313e43a`): `full`, because `components/component-preview.tsx` was not allowlisted.
- PR #26 (`70ccb59`): `full`, because its committed evidence PNG was not allowlisted.

The earlier B01-2 fix covered licence generation, report consent and performance measurement only. It did not cover these polish changes. Cancelling each new full run was not a lasting repair.

## Bounded change

Name only the two approved polish surfaces, their stylesheet payloads, four existing browser suites and six evidence images. No directory-wide component or image exemption. Unknown paths, shared selector/motion engines, component implementations, dependencies and release configuration still select full verification.

The component checkpoint runs existing quick checks, committed registry regeneration consistency, one static build, then the real choice, disclosure, shared workbench and compact-navigation journeys. This covers the affected controls plus shared-preview consumers without rendering every component in the catalogue. The runner uses the current export on loopback, serializes journeys and fails on any child error. Local verification can use an explicit loopback preview instead of rebuilding unchanged source. No public URL is accepted as candidate evidence.

Unchanged: complete final-release gate, branch protections, release artifacts, environment separation and production approval. A scoped pass remains checkpoint evidence, not release acceptance. An approved future change with broader semantic impact must still receive broader review; a filename is not a proof of scope.

## Verification

- Three regression assertions first failed: component paths selected full, evidence PNGs selected full, and no focused runner was wired into CI.
- Focused classifier, workflow contract, runner and partition tests pass after the repair. Runner fixtures prove actual child-process failure propagation, refusal of public targets and serving the local export.
- Changed JavaScript lint passes. No product source was changed by B01-3.
- `DOCS_BASE_URL=http://127.0.0.1:4321 node scripts/run-component-polish.mjs` (runner from this branch, cwd combined preview `70a771f`): all four real browser journeys passed. Choice preserved six shapes/marks/answers over 24 captures; Accordion passed reversal/height/keyboard over 12 captures; workbench passed six width/theme states, live clipboard and draft retention; compact navigation passed light/dark. This local check used dev output, not a new static release artifact. CI runs against a fresh static build.

## Other progress in the same continuation

- PR #16 native-popup evidence merged as `9590bc3`; background-tab and broader F03 acceptance remain open.
- PR #17 negative-promotion evidence merged as `eba5fdd`; three focused rejection tests freshly passed. Live restore/rollback remains open.
- PR #19 optional-analytics hold merged as `c750ec8`; both enable variables freshly read as `false`. This does not rewrite deployed bytes or close privacy acceptance.
- Local `http://127.0.0.1:4321/` runs `70a771f`: release `c750ec8` plus the two application commits from #25/#26. This is a review composition, not a deployment or a merge of those PRs.
