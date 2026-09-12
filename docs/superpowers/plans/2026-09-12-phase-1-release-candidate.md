# Phase 1 — a traceable, tested release candidate

Approved by Sanjay on 12 September 2026. This phase establishes the working release process and completes verification; it does not approve a production deployment or resolve the later product/design, privacy, launch or marketing phases.

## Global constraints

- Preserve the original dirty checkout and the restored homepage. Begin from release revision `cc971887e4e6825bd5568815cb76ebf22c602e04`.
- Follow `docs/checkpoint-workflow.md`: one checkpoint, scoped commit and PR; conventional `feat`, `fix` or `chore` naming without an agent/vendor prefix. Checkpoint PRs target `chore/production-beta` until the release PR is ready for its later merge gate. The original PR #2 is retained as historical discussion after branch renaming.
- No direct main push, protection bypass, production promotion, secret disclosure, paid activation or registry submission.
- Keep every existing release check for the combined candidate. Use proportionate checkpoint verification as directed by the owner on 12 September: prose-only changes get diff/link checks; narrow repairs get affected executable checks. A cancelled required check cannot close a checkpoint, and a scoped pass is not full release acceptance.
- Build beta and production from the same reviewed commit, preserving their separate URLs and artifact digests. Installation evidence is distinct from download requests.

### Task 1: W01 — land checkpoint rules

Carry only the durable original checkout's `docs/checkpoint-workflow.md`, `docs/superpowers/plans/2026-09-12-launch-master-checklist.md` and scoped checkpoint addition to `AGENTS.md` into this isolated release worktree. Preserve existing instructions; include this approved phase plan. Do not copy unrelated application changes.

Branch: `chore/w01-checkpoint-workflow`. Commit: `chore(workflow): define checkpoint delivery rules`, with `Checkpoint: W01` in the body. Check links, compare copied documents and inspect the complete staged diff. Human-facing prose needs no artificial source-text tests. Open its own PR; leave W01 unchecked until review/checks/merge are complete.

### Task 2: B01 — finish CI within its budget

Diagnose run `34666264387`: the serial catalogue gate consumed the remaining 90-minute job budget; subsequent release checks were skipped. Enable the existing bounded `COJEEV_DOCS_SHARDS=3` path in `.github/workflows/verify.yml`, preserving every later check and existing evidence/provenance assertions. Verify the real runner's partition aggregation and failure propagation with focused executable tests, without rewriting its architecture or asserting source-text snippets. Where a new behavioral defect is exposed, capture red/green evidence before correcting it.

Branch: `fix/b01-ci-partitions`. Commit: `fix(ci): complete release checks within the job budget`, with `Checkpoint: B01` in the body. Record old timing, focused tests and the full remote-run result in `docs/production/2026-09-12-phase-1-ci.md`. Open a separate PR. B01 closes only after the whole required run succeeds within its unchanged budget.

Owner-approved runtime correction: add a small conservative changed-path selector for documentation and known test/CI/installer repairs. Run their affected checks without the full catalogue. Unknown application/shared/dependency changes, manual full verification and promotion into main retain the complete workflow. Preserve separate checkpoint and release evidence. The B01 code PR can merge with its scoped checks; the B01 release-runtime outcome stays open until the combined candidate run succeeds. Do not require the complete suite separately on every stacked documentation or test-fix PR.

### Task 3: B02/B03 — verify the complete candidate and release controls

After the scoped changes are reviewed, run the complete release workflow against the exact candidate: lint, types, unit/reporting/hosting tests, both environment builds, CSP, Pages compatibility, examples, catalogue/motion/mobile/landing tests, reporting and analytics browser fixtures, clean-consumer installs. Check pinned tooling, fork-PR credential isolation, serialized deployments, preserved manual Pages support and production approval. Record source, check URL, counts, failures and sanitized evidence. Use separate `chore(verification)` checkpoint PRs for B02 and B03; do not mark a skipped check passed.

Inspection opened child checkpoint **B03-1**: the fresh-consumer script invokes `shadcn@latest` twice. In its own `fix/b03-1-pin-consumer-installer` branch and PR, use the already reviewed exact root dependency version (currently 4.21.0), verify real installation/build in a fresh consumer, and leave component code/dependencies unchanged. Record the evidence under `docs/production/2026-09-12-phase-1-release-controls.md`. This is part of the approved pinned-tooling requirement, not a dependency upgrade.

### Task 4: B04 — prove artifact identity and environment separation

Inspect the successful run's release manifest and beta/prod artifact digests, verify both were built from its exact source commit, and inspect consumer installation and cross-environment rejection results. Record this evidence in a scoped `chore(release)` B04 PR. Do not rebuild a newer revision after approval.

### Task 5: A03/C01/C02/C03 — inventory owner-assisted prerequisites

Read current account availability and protected environment secret/variable names without extracting secret values. Record missing GitHub issue, Cloudflare deployment, health/auth/webhook and isolated Turnstile prerequisites. Ask only for concrete owner actions still needed. This inventory does not certify credentials work or authorize replacing existing Resend secret bundles.

## Hard completion gate

Phase 1 is complete only when W01 and B01 have reviewed, appropriately checked, merged checkpoint PRs; every required combined-candidate check finishes successfully; both artifact identities and installation results are recorded; and outstanding account prerequisites are clearly listed. The release PR (successor to historical PR #2) remains unmerged until its later product, service and owner gates are satisfied. No production launch is claimed here.
