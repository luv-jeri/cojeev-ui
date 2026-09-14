# G07 — unused private code cleanup

13 September 2026 · base `f3fa84b` · branch `chore/g07-unused-private-code`.
Scope: [G07](../superpowers/plans/2026-09-12-launch-master-checklist.md), not a redesign.

## Change and review

- Removed the unreferenced `components/landing/launch-faq.tsx` and its two exclusive CSS rules.
- Preserved the shared `.launch-prose a` rule; `guide-shell.tsx` still uses it.
- Removed only the uncalled `deleteDraft` export in `lib/reporting/draft.ts`.
- Preserved draft loading, saving, workspace migration and all IndexedDB guards.

Before removal, reference searches found only the declarations, FAQ stylesheet
rules and checklist prose, with no callers or imports. Neither target is in
`registry.json` or `PUBLIC-SNAPSHOT.json`. The primary review repeated the
source reference search and checked the entire diff. No live route or installable
component changes; no stored browser data is deleted by this source cleanup.

## Verification

The executor ran these checks successfully:

- `npm run typecheck` and `npm run lint`.
- `node tests/reporting-drafts.browser.mjs` — legacy migration and independent workspace persistence passed.
- `node --import tsx --test tests/reporting-contract.test.ts tests/reporting-browser-client.test.ts tests/reporting-browser-fixture.test.mjs` — 13 passed.
- `git diff --check HEAD` — clean.

The fresh worktree initially lacked generated `next-env.d.ts`, causing an
unrelated image-import type error. Restoring the parent's ignored generated
declarations resolved it; no declaration or dependency change is included.

The full build, catalogue and live reporting-provider suites were not run for
this unused-code removal. No visual approval is claimed or needed for an
unrendered component. CI checkpoint results and the merged commit are recorded
on the checkpoint PR. Reverting that commit restores the removed source.
