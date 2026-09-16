# Verified release artifacts — B04

13 September 2026. This records successful combined verification and the identity of its saved packages. It is not a deployment, live-service acceptance or production approval.

Integration note — 17 September 2026: this historical artifact record was reconciled onto `main` at `93f20ca`. It still identifies only the 13 September packages and test-merge revision below; no check was rerun and no current release or deployment claim is made.

## The verified source

[Run 34748534759](https://github.com/luv-jeri/cojeev-ui/actions/runs/34748534759), attempt 1, completed successfully. The Verify release job ran from 08:49:47 to 10:17:00 UTC: **87 minutes 13 seconds**, within its 90-minute limit but with little remaining margin. All required verification stages passed; no failing stage was bypassed. Beta and production deployment jobs were intentionally skipped because this was a pull-request verification.

| Identity | Value |
| --- | --- |
| Release PR | [#15](https://github.com/luv-jeri/cojeev-ui/pull/15) |
| Reviewed branch head | `3e8495c669c3f4df9c55907df3172a9a9c359d25` |
| GitHub test-merge commit actually built | `78c23c10be92757d08d7258b808c3649edee4efa` |
| Main parent at verification | `49292870ca75712b558baa3b802e8f2469750815` |
| Identical Git tree of branch head and test merge | `74c8225aaf8f3f1bc1b21233a41a2ab1fff20efa` |

GitHub runs pull-request checks on a temporary merge commit. Its commit API confirms the two parents above, and its tree exactly matches the reviewed branch head. The package release IDs correctly use the **test-merge commit**, not the branch-head SHA. Never relabel these bytes as a later main commit.

## Saved packages and independent read-back

The successful run uploaded `release-78c23c10be92757d08d7258b808c3649edee4efa`, artifact ID `10316111427` (54,678,285 bytes compressed). The primary downloaded that artifact and used the repository's verifier to check both packages against the independent digests recorded by the build step.

| Package | Manifest SHA-256 |
| --- | --- |
| Beta | `c490861c879e26dbd1dfd60f86a556d4a4d94032ed84ea8fdefc09d6016c7b82` |
| Production | `c051db6587a819372f1e0aa0041bbe7b96e767a72dcbbd633f9bc400f1796e7e` |

Each manifest lists 1,609 files. The verifier checked file inventories/hashes, environment and commit identity, packaged configuration, public release identity and forbidden cross-environment dependencies. Both commands returned **Artifact verified**, using Node 22.22.0:

```sh
node scripts/release.mjs verify beta 78c23c10be92757d08d7258b808c3649edee4efa ARTIFACT_ROOT/beta c490861c879e26dbd1dfd60f86a556d4a4d94032ed84ea8fdefc09d6016c7b82
node scripts/release.mjs verify production 78c23c10be92757d08d7258b808c3649edee4efa ARTIFACT_ROOT/production c051db6587a819372f1e0aa0041bbe7b96e767a72dcbbd633f9bc400f1796e7e
```

A read-only negative check supplying the branch-head SHA instead of the package's test-merge SHA exited 1 with `Artifact identity or manifest digest mismatch`. No artifact was modified and nothing was rebuilt for this read-back.

## Environment separation

| Setting | Beta | Production |
| --- | --- | --- |
| Website | `beta.000h.cojeev.com` | `000h.cojeev.com` |
| Website Worker | `cojeev-ui-registry-beta` | `cojeev-ui-registry` |
| Reporting Worker | `cojeev-ui-reporting-beta` | `cojeev-ui-reporting` |
| D1 database | `cojeev-ui-beta-reports` | `cojeev-ui-reports` |
| Private media bucket | `cojeev-ui-beta-report-media` | `cojeev-ui-report-media` |

The primary read the packaged configurations, distinct D1 identifiers and custom-domain declarations. Both public `release.json` files match their environment and the test-merge commit. Representative button dependencies point only to their matching environment. The shared `cojeev.json` foundation includes the project's MIT notice; individual components receive it through that foundation dependency.

## Checks passed in the same run

Lint, type checking, unit/reporting/hosting tests, both environment builds and packaged CSP checks, Pages compatibility build, code examples, full catalogue/motion gate, mobile, marketing, smooth-scroll, local receipt/attachment/maintainer journeys, silent/disabled/enabled analytics checks, and fresh consumer installation/build from **each** packaged environment all passed. Installer: `shadcn@4.21.0`; Node: `22.22.0`.

The full catalogue/motion stage took 73m30s. This is evidence for the combined candidate, not a reason to restore catalogue runs on small checkpoints. The scoped checks remain in place.

## Outstanding at the time of the 13 September verification

- PR #15 had not yet merged; beta prerequisites and owner release decisions were then open. PR #15 has since merged; this historical record is not current release status.
- The packages were tested locally in CI. Actual domains, Turnstile, private/public reporting, inbox receipt, recovery and production promotion remain separate acceptance tasks.
- Local consumer verification serves packaged dependencies through a temporary local registry; it does not prove live domain routing.
- Business/privacy facts, restored-homepage acceptance, credential setup and protected production approval are not inferred from green CI.
- Shadcn submission identity is approved as `@cojeev` with the existing 000h mark, but no upstream submission has been made. Verify the actual published payload first.
- If main receives a different commit, its artifact must retain that actual identity. These test-merge packages cannot be silently promoted as different-source bytes.

This record may remain in repository history without re-running the full suite; any later candidate needs evidence for its own exact revision.
