# B01-4 — proportionate checks for the G07 unused-code removal

This implements the owner's proportionate-verification rule in the checkpoint workflow. G07 removes an unused component, its exclusive CSS and one unused private export; it passed primary and independent review, lint, type checking and its focused draft browser test. The prepared commit `cf69813` was pushed to `chore/g07-unused-private-code`, but its PR was held because the classifier still gave its paths a full release run.

## Reproduced cause

Classifying the exact prepared commit before this change, `classify(changedPaths({ base: 'f3fa84b', head: 'cf69813' }))`, returned `full` with the reason `not on the checkpoint allowlist: components/landing/landing.css`. The three files it touches — `components/landing/launch-faq.tsx`, `components/landing/landing.css`, `lib/reporting/draft.ts` — were named nowhere, so every unused-code removal in them cost the 90-minute release job.

## Bounded change

A new `maintenance` kind names exactly five paths: the three files G07 edits, plus the two checks that exercise them (`scripts/check-landing-guides.mjs`, `tests/reporting-drafts.browser.mjs`). No prefix, suffix or directory rule. Everything beside them still selects the full job, including sibling landing components, the guide and marketing shells, the pages that import the stylesheet, other files under `lib/reporting/`, and `scripts/check-refinement-marketing.mjs`, which is deliberately absent because it is a release gate.

The suite is `quick` plus `maintenance`: lint, type checking and the three unit suites, then one plain static build followed by the journeys that actually consume the named files.

| Check | Covers |
| --- | --- |
| `npm run gate:marketing` | `/` and `/work-with-me/`, both themes, three widths |
| `node scripts/check-landing-guides.mjs --serve` | `/getting-started/`, `/privacy/`, `/about/` at 390px and 1440px |
| `node tests/reporting-drafts.browser.mjs` | real IndexedDB migration, per-kind save and clear in `lib/reporting/draft.ts` |

`components/landing/landing.css` is shared by five routes. The existing marketing gate opens two of them, so the new check opens the other three and asserts the shared guide declarations themselves: the `.launch-prose` grid, the `.launch-guide` reading width, the rule above each prose section, and `text-decoration: underline` with a `4px` offset on every prose link. That underline is the exact declaration the G07 diff edits, and the browser's own default underline has a `2px` offset, so the offset is asserted too — checking only `underline` would pass on a page whose shared rule had been deleted.

A test recursively reads `landing.css` consumers from page and layout files under `app/` and compares pages with both check scripts. An uncovered nested page fails; a new layout import fails until explicit descendant coverage is added.

Unchanged: pushes, manual dispatch and every pull request into `main` still run the complete release gate through conditions that read no classifier output; a failed, blank or unrecognised scope still runs it; branch protections, release artifacts, environment separation, credential isolation (`persist-credentials: false`) and the production approval gate are untouched. The catalogue gate, release pair, consumer installation and release artifacts do not run in the scoped job. **A maintenance pass is checkpoint evidence, never release acceptance.**

## Verification

Run in `.worktrees/b01-maintenance` against the shared read-only `node_modules` and the existing static export on `http://127.0.0.1:4322/cojeev-ui`. No dependency install, no rebuild, no catalogue run.

Red before green, each mutation reverted afterwards:

- Removing `components/landing/landing.css` from the allowlist: 5 tests failed, including the real G07 file list and the mixed-suite union.
- Removing the guide-route step from `verify.yml`: the maintenance workflow contract test failed.
- Removing `/privacy/` from the new check's routes: the consumer-coverage test failed.
- Patching a private copy of the static export to drop the shared `.launch-prose a` rule, exactly as a careless `landing.css` cleanup would: `check-landing-guides.mjs` failed on both guide pages (`underline|2px` against the expected `underline|4px`) and exited 1, while `/about/`, which uses none of those rules, correctly still passed.

Green:

- `node --import tsx --test tests/ci-scope.test.mjs` — 120 pass, 0 fail. Includes unknown-path, lookalike, backup-file and mixed-diff negatives: a maintenance path beside `app/page.tsx` or beside `registry/cojeev/styles/tokens.css` still resolves to `full`.
- `npm run lint` — exit 0. `npx next typegen` exited 1 in this worktree without build output. After recreating the ignored generated `next-env.d.ts` locally, the separate `npm run typecheck` exited 0; no TypeScript source was changed.
- `npm test` — 474 pass, 0 fail.
- `node tests/reporting-drafts.browser.mjs` — pass.
- `BASE_URL=http://127.0.0.1:4322/cojeev-ui WIDTHS=1440 node scripts/check-refinement-marketing.mjs` — both themes pass, no browser errors. CI runs the full 390/768/1440 set against a fresh build.
- `BASE_URL=http://127.0.0.1:4322/cojeev-ui node scripts/check-landing-guides.mjs` — six route/width combinations pass; the shared styles were proved on 7 prose links on `/getting-started/` and 2 on `/privacy/`.
- The prepared G07 commit now classifies as `checkpoint`, suites `prose,quick,maintenance`, with `run_build=true` and `run_polish`, `run_registry`, `run_install`, `run_analytics`, `run_transient`, `run_reporting` all false.

Not run and not claimed as passing: the component catalogue gate, mobile WebKit, smooth scroll, example source, analytics, consumer installation, the release pair and any deployment. The static export used locally was built from the parent checkout before G07, which is why the marketing journey is evidence that the command and journey work here, not acceptance of the G07 commit itself; CI builds the export from the pull request commit.

## Independent review and primary corrections

Separate standards and spec reviews identified an overly broad named-gate exception and top-level-only route discovery. The primary narrowed the exception to the marketing journey, made page/layout discovery recursive, reproduced rejection of an uncovered nested page, removed the temporary fixture and reran all 120 scope tests successfully. Stale review notes about B02's unfinished evidence and temporary symlink were resolved in that separate checkpoint. The draft-store scope remains limited to the reviewed unused-export removal; functional reporting changes need their affected report journeys, not this cleanup's acceptance evidence.
