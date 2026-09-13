# B01-5 — proportionate checks for the privacy and creator copy

The owner's proportionate-verification rule in `docs/checkpoint-workflow.md` asks that a small
checkpoint run the checks that actually cover it. The prepared E02-1 copy change edits body copy in
exactly two files, `app/privacy/page.tsx` and `components/landing/creator-page.tsx`, and both were
absent from the classifier's allowlist, so each of them cost the complete release job.

This checkpoint changes CI classification only. It contains no product, dependency, workflow or
release-protection change, and it makes no claim about the unpublished E02 copy itself.

## Reproduced cause

Before the change, `classify(['app/privacy/page.tsx'])` and
`classify(['components/landing/creator-page.tsx'])` both returned `full`, with the reason
`not on the checkpoint allowlist: …`. `app/privacy/page.tsx` was in fact an explicit negative case
in `tests/ci-scope.test.mjs` ("a page that imports the shared stylesheet"), so the full run was
deliberate rather than accidental, and had to be replaced by a case that is still a neighbour:
`app/getting-started/page.tsx`.

## Bounded change

Two exact paths join the existing `maintenance` kind introduced by B01-4. No prefix, suffix or
directory rule; no new suite, job or workflow step. The suite is unchanged — `quick` plus
`maintenance`, which is lint, type checking and the three unit suites, then one plain static build
followed by the journeys that open the affected routes.

| Added path | Rendered by | Opened and asserted by |
| --- | --- | --- |
| `app/privacy/page.tsx` | `/privacy/` | `node scripts/check-landing-guides.mjs --serve` — awaits the page's own `<h1>` (“A little clarity.”), the shared guide/prose declarations and no horizontal overflow, at 390px and 1440px |
| `components/landing/creator-page.tsx` | `/about/` and `/work-with-me/` | the same guide check for `/about/` (awaits the component's `<h1>`, “Hi, I’m Sanjay”), and `npm run gate:marketing` for `/work-with-me/` — the component's "Find me on GitHub" link and its target, no overflow and no page errors, in both themes at three widths |

`components/landing/creator-page.tsx` is additionally rendered server-side, with contact enabled and
disabled, by `tests/launch-environment.test.ts`, which the `quick` suite already runs.

Copy only exists once a page is rendered, so the reduced scope keeps `run_build=true`: the two files
are read from a freshly built static export, never from lint and unit tests alone.

### What still runs the full job

Everything not named. The negatives are executable cases in `tests/ci-scope.test.mjs`, not prose:

- `app/about/page.tsx` and `app/work-with-me/page.tsx` — the route files that render the allowlisted
  component are themselves unlisted.
- `app/getting-started/page.tsx` — a sibling guide page.
- `components/landing/guide-shell.tsx`, `components/landing/marketing-shell.tsx`,
  `components/landing/landing-page.tsx`, `components/landing/shape-playground.css`.
- `components/analytics/analytics-preferences.tsx` — the interactive control the privacy page embeds.
  Its behaviour is not covered by a copy check, so a change to it stays on the full job.
- `components/landing/creator-page.tsx.bak` and every other backup or lookalike path.
- `scripts/check-refinement-marketing.mjs`, deliberately absent because it is a release gate.
- Any diff that mixes a named path with an unknown one still resolves to `full` as a whole.

Unchanged: pushes, manual dispatch and every pull request into `main` still run the complete release
gate through workflow conditions that read no classifier output; a failed, blank or unrecognised
scope still runs it; branch protections, release artifacts, environment separation, credential
isolation (`persist-credentials: false`) and the production approval gate are untouched. The
catalogue gate, release pair, consumer installation and release artifacts do not run in the scoped
job. **A maintenance pass is checkpoint evidence, never release acceptance.**

## Verification

Run in `.worktrees/b01-policy-scope`. Node resolves dependencies from the parent checkout; this
worktree has no `node_modules` of its own, and none was installed.

Behavioural red before green, in that order:

- With the tests added and the allowlist untouched: `node --test tests/ci-scope.test.mjs` —
  **130 tests, 124 pass, 6 fail.** The failures were the four new classification rows, the
  forced-full guard extended with the two paths, and the new consumer-coverage contract test, each
  reporting `full` where `checkpoint` / `quick,maintenance` was expected.
- After adding the two exact paths to the `maintenance` group: **130 tests, 130 pass, 0 fail.**

The new contract test asserts the coverage claim against the tree rather than against prose: it
reads every `page.tsx`/`layout.tsx` under `app/` that renders `components/landing/creator-page`,
requires the resulting route set to be exactly `/about/`, `/privacy/`, `/work-with-me/`, requires
each route to appear in `check-landing-guides.mjs` or `check-refinement-marketing.mjs`, requires the journeys to be
guarded by `run_maintenance`, and requires the build step to precede them. A third route rendering
the component, or a layout-level render, fails this test instead of silently riding along.

The two journeys the reduced scope selects were then run for real, against the static export already
served on `http://127.0.0.1:4322/cojeev-ui`:

- `BASE_URL=… WIDTHS=1440 node scripts/check-landing-guides.mjs` — exit 0.
  `/getting-started/` (7 prose links), `/privacy/` (2 prose links) and `/about/` all passed, each
  after its `<h1>` was found.
- `BASE_URL=… WIDTHS=1440 node scripts/check-refinement-marketing.mjs` — exit 0. Light and dark
  both passed, including the `creator route and GitHub contact` check, with no page errors.

Self-classification of this checkpoint's own file list — `scripts/ci-scope.mjs`,
`tests/ci-scope.test.mjs`, this note and the checklist — is `checkpoint`, suites
`prose,quick,ci-contract`, with `run_maintenance=false` and `run_build=false`: changing the
classifier re-runs the classifier's own contract, not the journeys it selects for other files. The
prepared E02-1 file list classifies as `checkpoint`, suites `quick,maintenance`, `run_build=true`.

That export was built from an earlier commit in another working copy, so those two runs are evidence
that the selected commands genuinely open and assert these routes — not acceptance of any copy
change. CI builds the export from the pull request commit.

### Not run, and not claimed as passing

Primary follow-up resolved the local setup failures below by linking the existing shared
dependencies read-only and running Next route type generation. Lint and TypeScript then passed, and both
previously affected unit files passed all 19 tests. The earlier 470/485 run remains an initial
failed run, not a pass; the whole suite was not rerun locally. Primary also removed redundant
source-text assertions that merely froze page heading wording; the actual browser checks remain.

- `npm run lint` and `npm run typecheck` could not complete here: this worktree has no local
  `node_modules`, so ESLint produced no JSON, and `tsc` reported one pre-existing unresolved image
  module (`@/public/brand/000h-sculpture.webp`) that needs `next typegen` output. No TypeScript or
  product source was changed by this checkpoint. CI runs both.
- `npm test` as a whole: **485 tests, 470 pass, 15 fail**, all 15 environmental. They are the
  `real gate …` cases in `tests/production-gate.test.mjs` and the real-CLI install case in
  `tests/registry-notices.test.mjs`, which call `realpathSync` on `<worktree>/node_modules` and fail
  with `ENOENT` because it does not exist here. Neither file imports `scripts/ci-scope.mjs`.
- The component catalogue gate, mobile WebKit, smooth scroll, example source, analytics, transient
  paint, clock isolation, consumer installation, the release pair, and any deployment.
- The full 390/768/1440 × light/dark marketing matrix and the 390px guide pass; only 1440px was run
  locally.
- No UI verification of E02 copy. The copy is unpublished and outside this checkpoint.

## Risks

- The `/about/` assertion for `components/landing/creator-page.tsx` is its `<h1>`, overflow and page
  errors; `/work-with-me/` adds the GitHub link and both themes. A copy edit that renders cleanly but
  reads badly passes CI, exactly as it would in the full job — reduced scope does not replace owner
  reading of the text.
- The two route files that render the creator component stay on the full job, so moving copy out of
  the component and into a route file would not inherit this reduced scope. That is intended.
