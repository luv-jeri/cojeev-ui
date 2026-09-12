# B01-2 — Focused checks for three bounded launch changes

Date: 13 September 2026. Child of checkpoint B01. Branch `fix/b01-2-focused-launch-checks`, base
`5358d25aded2c7b030d394e289475bc030a82578`. Classifier and workflow only: no product code,
no dependency, no release protection and no deployment configuration was changed.

## Why

Three launch checkpoints were prepared in isolated worktrees, and all three resolve to the complete
90-minute release job today because none of their paths is on the conservative allowlist:

| Checkpoint | Prepared at | What actually changed |
| --- | --- | --- |
| I03 licence notices | `licensing` `5f5aba7` | a notices generator, the text file it writes and the four registry payloads it regenerates |
| E08-1 reporting consent | `diagnostic-opt-in` `05cc9ae` | one line of the reporting widget, its browser journey and a new focused consent check |
| G01 loading baseline | `performance` `f712294` | one standalone measurement script that nothing imports |

Repeating the whole component catalogue for each of these is the behaviour the owner corrected on
12 September. Skipping release acceptance is not the alternative: the full job still runs for every
push to main, every manual dispatch and every pull request into main, and those conditions read no
output of the classifier.

## What each change now runs

The allowlist is still exact paths only. A prefix or directory rule would let an unreviewed
neighbour ride along, so every path below is named individually.

### I03 — `registry-generation`

Paths: `scripts/build-registry.mjs`, `scripts/registry-notices.mjs`, `tests/registry-notices.test.mjs`,
`registry/cojeev/NOTICES.txt`, `registry.json`, `public/registry.json`, `public/r/registry.json`,
`public/r/cojeev.json`.

Suites: `quick`, `registry-generation`, `install-consumer`.

- **Generation consistency.** `node scripts/build-registry.mjs`, then
  `git diff --exit-code` over those generated paths. A committed payload or notices file that no
  longer matches what its generator produces from the sources in this commit fails the job. It runs
  *before* `npm run build`, because that script regenerates the same files and would otherwise
  overwrite the evidence.
- **A real fresh-consumer install and build.** `node scripts/run-install-verification.mjs`, which
  serves the candidate registry on loopback and installs it into an empty project with the pinned
  `shadcn@4.21.0`, then type-checks and builds that project. This is the check that matters for I03:
  the notice only reaches a recipient as an installed file, so a JSON assertion would prove nothing.
- **Unit suites**, which include `tests/registry-notices.test.mjs` — I03's own test spawns the real
  CLI and reads the consumer's disk.

No component catalogue, no browser gate, no release pair.

### E08-1 — `reporting-consent`

Paths: `components/reporting/reporting-widget.tsx`, `scripts/check-reporting-consent.mjs`,
`scripts/check-reporting-browser.mjs`.

Suites: `quick`, `reporting-consent` (which implies a real `npm run build`).

- **The focused consent check.** `node scripts/check-reporting-consent.mjs` mounts the actual
  `ReportingWidget` and asserts a new bug draft attaches no browser details until the reader asks,
  through persistence and reload, with every external request blocked.
- **The complete Worker-backed journey, unchanged.** The fixture is rebuilt against the loopback
  Worker (`NEXT_PUBLIC_REPORTING_API_URL: http://127.0.0.1:8787`) and
  `node scripts/run-reporting-browser.mjs` runs the existing receipt, attachment and maintainer
  journeys. Both steps are guarded by the same `run_reporting` flag, so the journey cannot be
  dropped while the consent check runs.
- **The reporting contract tests**, via `npm run reporting:test` in the quick suite.

The widget is product code and the next change to it will be larger than one line. A test asserts
that this path can never earn a reduced scope on consent evidence alone, and that it always forces
a real build.

### G01 — quick checks only

Path: `scripts/measure-loading-baseline.mjs`. Suites: `quick`.

Lint (which parses it, so this is also its syntax check), type checking and the unit suites. CI
takes no performance samples: a test asserts that no job in the workflow ever invokes this script.
Fifteen samples on a shared runner would measure that runner, not the product, and the baseline it
is compared against was taken deliberately on known hardware.

## What still runs the complete release job

Everything not named above, which includes each of these deliberately:

- `LICENCE`, `LICENSE`, `LICENSE.md` — see the omitted check below.
- Every other file under `components/reporting/`: `admin.tsx`, `capture-controls.tsx`,
  `request-board.tsx`, `turnstile.tsx`, `reporting.css`.
- Every file under `workers/reporting/`, including its own tests.
- `scripts/run-reporting-browser.mjs` and `scripts/reporting-browser-fixture.mjs` — the harness that
  starts the Worker fixture, not the journey E08-1 repaired.
- Every registry payload other than the base item and the three catalogue indexes, and every source
  file the generator reads, such as `registry/cojeev/lib/bloom-engine.ts`.
- Any other measurement or check script, and any backup or lookalike of an allowlisted path.

Unchanged from before: an empty diff, a failed diff lookup, an unknown path anywhere in the diff,
component source, shared styles, motion, dependencies and configuration all resolve to `full`.

## Omitted checks

A scoped pass is checkpoint evidence. It is never release acceptance, and the checks below are
**not run** and are not reported as passing for any of the three changes:

- The component catalogue gate (`npm run gate`) and the mobile, marketing and smooth-scroll gates.
- The exact-revision beta/production release pair, its CSP check, its digests and
  `scripts/release-install.mjs`.
- `npm run check:examples`.
- For I03 and G01: every browser journey, including the analytics and reporting ones.
- For E08-1 and G01: the fresh-consumer install.
- For E08-1 and I03: the transient-paint harness.
- For G01: any browser run and any build at all.

Each run prints its own selected and omitted suites in the job summary, next to the statement that
the run is not release acceptance.

**One known gap, named rather than papered over.** `LICENCE` stays classified as prose. The notices
generator reads it verbatim, so editing the licence without regenerating would ship a
`NOTICES.txt` whose licence text no longer matches the repository's, and a prose-only run would not
notice. Editing the licence *and* rebuilding puts `registry/cojeev/NOTICES.txt` in the same diff,
which does run the consistency check, so only the un-regenerated case is exposed. Closing it is one
line — give `LICENCE` a kind whose suites include `registry-generation` — but that changes the
reviewed prose classification of a path this checkpoint was not scoped to touch, so it is left for
the reviewer to decide.

The generation-consistency step compares modified and deleted generated files. A brand-new payload
cannot slip past it, because a new registry entry arrives with new source files that are not on the
allowlist and already force the full job.

## Verification actually run

Node v22.22.0 throughout, dependencies read from the existing `analytics-fixture/node_modules`
(symlinked read-only, removed afterwards). The three task worktrees were read only: nothing was
written to their code, output or checkout, and `git status` in each was unchanged afterwards.

| Command | Result |
| --- | --- |
| `node --test tests/ci-scope.test.mjs` (before implementation) | **17 of 90 fail** — every new row and workflow assertion, red as intended |
| `node --test tests/ci-scope.test.mjs` (after) | **90/90 pass** |
| `node --import tsx --test tests/*.test.ts tests/*.test.mjs` | **436/436 pass**, 12.8 s |
| `classify()` over the real `5358d25..5f5aba7` diff of `licensing` | `checkpoint` — `prose,quick,registry-generation,install-consumer` |
| `classify()` over the real `5358d25..05cc9ae` diff of `diagnostic-opt-in` | `checkpoint` — `prose,quick,reporting-consent` |
| `classify()` over the real `5358d25..f712294` diff of `performance` | `checkpoint` — `prose,quick` |
| `classify()` over this branch's own diff | `checkpoint` — `prose,quick,ci-contract` |
| `node scripts/build-registry.mjs && git diff --exit-code -- registry.json public/registry.json public/r registry/cojeev/NOTICES.txt` | exit 0 — 173 items, committed output already matches its generator |
| `node scripts/check-reporting-consent.mjs` in `diagnostic-opt-in` | **PASS** — new bug drafts omit diagnostics; explicit inclusion and removal persist through reload |
| `node --check` and `eslint --max-warnings=0` on G01's committed measurement script | exit 0 for both |

Not run locally, and stated as such: `npm run build`, `node scripts/run-install-verification.mjs`
and `node scripts/run-reporting-browser.mjs`. Each needs a full Next build, which was deliberately
not attempted against the external dependency symlink. They are existing release-job commands that
this change reuses verbatim and does not modify.

## Ordering dependency

The reporting steps call `scripts/check-reporting-consent.mjs`, which E08-1 introduces. This branch
must merge after — or be rebased onto — I03 and E08-1. If it lands first, a pull request touching
only the reporting widget fails loudly on a missing file rather than silently skipping a check,
which is the safe direction, but it should not happen.
