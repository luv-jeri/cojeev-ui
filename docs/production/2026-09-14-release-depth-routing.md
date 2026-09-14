# Release verification depth — B01-8

## Problem

Every push to `main` and every pull request into `main` ran the complete release
job, including the 82-minute browser component catalogue. The repository-structure
cleanup and the six release-tooling checkpoints now in flight would each pay that
cost for changes that cannot alter a rendered component — six catalogue runs to
merge six workflow and script repairs, and another for a documentation-only
cleanup.

The existing checkpoint allowlist could not help: it deliberately refuses to
reduce a pull request into `main`, because that is release acceptance.

## What changed

`scripts/ci-scope.mjs` gained a second, separate classifier answering a narrower
question — how much must a *release* run actually execute? — with three answers:

| Depth | Runs |
| --- | --- |
| `full` | everything, including the browser catalogue. The default. |
| `affected` | everything except the browser catalogue gates |
| `docs` | the diff check alone: no install, no build, no artifact, no deployment |

`.github/workflows/verify.yml` runs that classifier **inside the release job**,
not as a separate job whose output the release job trusts. The job's own
entry condition is unchanged, so a push, a manual dispatch, a pull request into
`main` and a failed or blank scope job all still reach it exactly as before.

### What a reduced depth may never switch off

At `affected` depth the release is still fully packaged and verified: lint, type
checking, `npm test`, both Worker suites, the example-source check, the
clean-source release pair build, artifact CSP validation, fresh consumer
installation from each environment artifact, artifact upload, the protected
`Verify release` check itself, the beta and production deploy jobs and the
production environment approval. Only the browser catalogue gates are dropped.

Tests assert this structurally: `build-pair`, `release-csp.mjs` and
`release-install.mjs` are gated on `run_release` and must not mention
`run_catalogue` at all.

At `docs` depth nothing deployable changed, so no release artifact is published
and both deploy jobs are switched off by `needs.verify.outputs.run_release`. The
live site keeps serving the previous release; a documentation merge no longer
redeploys production to say the same thing.

## What earns a reduced depth

**Documentation.** Repository-root `*.md`, and `docs/**` markdown and evidence
images. Verified before allowing it: no string literal naming a root `.md` file
appears anywhere in app, component, registry, worker, script or gate source
except the generated gate reports, so no other root markdown file is read,
embedded or rendered.

Explicitly **not** documentation, after primary review:

- `LICENCE` / `LICENSE` — `scripts/build-registry.mjs` embeds `LICENCE` in the
  `NOTICES.txt` shipped with every registry entry, so a licence change keeps its
  generator, packaging and consumer-installation checks.
- `FONT-NOTICES.md` — carries the bundled fonts' SIL licence obligation and is
  listed in the public snapshot.
- `GATE.md`, `GATE-MOTION.md`, `GATE-INTERACTIONS.md` — generated gate reports
  that the gate tooling writes and reads back.

**Named release, deployment and CI tooling**, by exact path only: the four
workflows, the pinned Wrangler runtime manifests, the classifier and its tests,
`scripts/release.mjs`, `scripts/release-rollback-run.mjs`,
`scripts/operations.mjs`, `scripts/operations-health.mjs`,
`scripts/deployment-diagnostics.mjs` and their focused tests. Deliberately
absent: `scripts/release-config.mjs`, `scripts/release-manifest.mjs`,
`scripts/release-csp.mjs` and `scripts/release-install.mjs`, which decide what
the built site contains or how it is validated, and
`scripts/run-production-gate.mjs`, which is the catalogue runner itself.

**A verified path relocation.** The cleanup moves generated reports and a
documentation link out of the repository root, which touches the gate runner,
the motion gate, `apps/gate/run.mjs`, their test and one app page. A path rule
cannot tell a relocation from a logic change, so these are decided on the
**actual diff**: every added and removed line must name a moved destination
(`GATE.md`, `GATE-MOTION.md`, `INSTALLATION.md`, `BASELINE-STATUS.md`) or be the
one recursive `mkdirSync` a writer needs before writing into a directory that may
not exist. One unrelated line in the same file returns the whole change to the
full job, and an empty or unreadable diff never reduces.

**Paths that own a bounded browser harness.** `scripts/check-docs.mjs`,
`tests/docs-transient-timing.browser.mjs` and their transient-paint and
clock-isolation siblings select their own harness — both negative controls and
the probe included — instead of the catalogue. Reduced browser evidence, never
no browser evidence.

## Fail-safe behaviour

`full` is returned for: any unknown or non-exempt path anywhere in the change, an
empty diff, an unreadable diff or `merge-base` failure, a path containing an
empty, `.` or `..` segment, a manual dispatch, any event that is not a push or a
pull request, and any unexpected error. Every published value is flattened to a
single line, so no reason text can forge another output. A reduced depth is
reported in the job summary together with an explicit statement that what it
omitted was **not run** and is not reported as passing.

## Security and protection boundaries (unchanged)

The depth step receives only `github.event_name` and the pull-request or push
SHAs, as environment variables, never interpolated into a shell command. No
secret is available to it, and a test asserts that. Branch protection, the
required `Verify release` check, the production environment approval, fork
pull-request secret isolation, pinned action hashes and per-environment
isolation are untouched. Because the reduction happens *inside* `Verify release`
rather than by routing a main pull request to a different job, the required check
still runs and still fails when any selected check fails; there is no path by
which a skipped job reports green.

The gate evidence upload now accepts `GATE.md`, `docs/gates/GATE.md` and
`docs/gates/GATE-MOTION.md`. `if-no-files-found: ignore` means this is correct
both before and after the cleanup moves the report, so the two changes have no
ordering dependency.

## Verification

- `node --test tests/ci-scope.test.mjs` — 142 passed (130 pre-existing, 12 new).
  The new tests cover each depth, the licence and generated-report exclusions,
  path traversal, the diff-aware relocation rule and its negative case, the
  bounded browser harness selection, output completeness and single-line safety,
  event handling, a real git range read end to end, and the workflow wiring:
  which steps may be gated on `run_catalogue` and which may not, that `npm ci`
  and the release build can never diverge, that the depth step sees no secret,
  and that both deploy jobs require `run_release`.
- `node --test tests/release-live.test.mjs tests/operations.test.mjs
  tests/release.test.mjs` — 31 passed.
- ESLint over `scripts/ci-scope.mjs` and `tests/ci-scope.test.mjs` with
  `--max-warnings=0`: no findings.
- `.github/workflows/verify.yml` parses; the pre-existing workflow-contract tests
  ("deployment still depends on the full job and its digests", "the full job
  keeps every gate it had before the split") still pass unchanged.

Not run: `tests/production-gate.test.mjs` fails in this worktree for an
environmental reason unrelated to this change — it calls
`realpathSync('<cwd>/node_modules')` and this worktree has no `node_modules` of
its own. All 14 of its tests fail identically on the unmodified file. It is not
reported as passing. The component catalogue, mobile, marketing, smooth-scroll,
motion, reporting-browser, analytics-browser and consumer-install gates were not
run either.

## Accepted tradeoff

On a reduced release run, browser-gate coverage of that commit depends on this
allowlist being right. Packaging, artifact integrity, consumer installation,
deployment approval and live health do not. The allowlist is exact-path, the
relocation rule reads the real diff, and every unknown answer is the complete
job.

An alternative design — routing main pull requests to the `checkpoint` job and
adding a final status job that depends on both — was considered and rejected
here: it requires changing which check is required by branch protection, which is
the owner's to change, and it introduces a job that can report green while the
release job was skipped.

## Test policy

`OWNER_DEFER_TESTS_TREE`, the repository value behind the B02-6 exact-source test
deferral, was deleted by the coordinator and its absence verified before this
checkpoint. Full verification is required again; no new waiver was created or
requested. The `Record exact-source owner test deferral` step is left in place
and inert — with no approved tree value it always resolves to `deferred=false` —
rather than removed, because removing it is a separate decision.
