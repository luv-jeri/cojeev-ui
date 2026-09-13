# B01-6 — release job timeout headroom

The combined release run [34778271915](https://github.com/luv-jeri/cojeev-ui/actions/runs/34778271915)
on `7fb6d51390c8d9edf366e26a3bb3a1c6ddaa53ae` exceeded its outer 90-minute job limit.
GitHub's annotation explicitly reports that limit; this was not an assertion failure.

The catalogue/motion gate completed successfully in **81m 41s**
(19:44:54–21:06:35 UTC). Mobile checks were cancelled after 90 seconds.
Marketing, reporting, analytics, fresh-consumer builds and release-artifact upload
did not finish. The run is **cancelled, not passed**, and cannot authorize deployment.

An earlier complete run [34748534759](https://github.com/luv-jeri/cojeev-ui/actions/runs/34748534759)
took 87m 13s overall, with 73m 30s in the catalogue/motion gate. Its roughly
14 minutes of other work plus the latest 82-minute catalogue already exceeds
90 minutes. The previous cap had insufficient room for observed runner variation.

## Change and boundary

Increase only the outer `Verify release` timeout to **120 minutes**. All steps,
assertions, individual test limits, three bounded catalogue workers, artifact
identity checks, protected main requirements and production approval remain unchanged.
Checkpoint jobs retain their 20-minute limit and affected-check selection.

This is scheduling headroom, **not a performance improvement**. It does not reduce
test coverage or make a cancelled run pass. A future measured scheduling optimisation
can reduce wall-clock time independently; it is not bundled with this correction.

## Verification

The original GitHub timeout is the executable failure evidence. The local parsed
workflow comparison passed: after normalising only this timeout, all other workflow
data is identical to the base. All 144 existing CI-scope/production-gate tests passed.
The budget check rejects the previous 90-minute configuration and accepts the
updated bounded configuration. Scoped ESLint and whitespace checks passed.
The checkpoint PR uses the existing `ci-contract` suite, not a duplicate catalogue run.
Combined-release acceptance remains open until a fresh complete run succeeds.

The existing CI contract's exact-90-minute expectation is updated to cover the
measured work plus 20% runner headroom, with a maximum of 120 minutes. Gate-presence,
deployment-dependency and failure-propagation assertions are preserved.

## Rollback

Revert this scoped change to restore the old limit. That may reintroduce premature
job cancellation, but changes no application, production data, credentials or runtime.
