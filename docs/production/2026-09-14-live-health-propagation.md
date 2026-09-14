# Live health propagation retries — C04-5

## Problem

`scripts/release.mjs live` read the deployed site and API exactly once,
immediately after `wrangler deploy` returned. Cloudflare acknowledges a deploy
before every edge serves the new Worker and asset version, so that first read
can legitimately still answer with the previous release. The deploy job then
failed on `release-mismatch`, or on the live website identity check, for a
condition that clears by itself within seconds — and the repair was to rerun the
whole job.

## Change

One read of the live surface is now `liveProblems()`, which returns sorted fixed
codes instead of throwing free-text errors. The three website route probes gained
their own codes so they can be reasoned about the same way as the health codes:

| Code | Meaning |
| --- | --- |
| `site-unreachable` | the website route did not answer at all |
| `site-contract` | wrong status, missing `x-content-type-options: nosniff`, missing beta `noindex`, or an unreadable `release.json` |
| `site-release-mismatch` | `release.json` served a different release or environment |

`checkLiveRelease()` wraps that in a bounded retry. It retries **only** the codes
a later read can resolve — `http-health`, `release-mismatch`,
`site-unreachable`, `site-release-mismatch` — for at most 5 attempts with waits
of 5s, 10s, 15s and 20s, so at most 50 seconds of added waiting inside a
20-minute job.

Everything else fails on the first attempt: a missing health token, a stalled or
failed delivery queue, email quota, an unconfigured provider, and any broken
header or 404 contract. A run that carries even one permanent code never
retries, even when a propagation code is present alongside it.

One deliberate exception. `checkHealth` reports both "no health token" and "the
admin endpoint did not answer usefully" under `invalid-delivery-health`. When a
token was supplied *and* the public endpoints are also unreachable, that is one
outage rather than a second, permanent configuration defect, so the code is
dropped for that read. If the outage clears while the admin answer is still
unusable, the code reappears on the next read and stops the run at once — the
condition is deferred, never hidden.

## Sanitization

Each retry prints exactly one line:

```
Live checks attempt 2/5: release-mismatch, site-release-mismatch; retrying in 10s
```

Fixed codes and the attempt counter only. No response body, header, URL,
release value or credential is printed, and a test asserts that the health token
and the release SHA never appear in a retry line.

## Verification

Six focused tests in `tests/release-live.test.mjs`, run with
`node --test tests/release-live.test.mjs` — 6 passed:

- a fully propagated release passes on the first read and waits zero times;
- a lagging edge is retried and passes once it catches up, with the exact
  bounded wait sequence asserted;
- a completely unreachable site is retried, then fails after exactly 5 attempts;
- a missing token, a stalled delivery queue and a broken header contract each
  fail on attempt 1 with no waiting;
- a permanent code alongside a propagation code stops immediately;
- the transient set is asserted exactly, so widening it later is a visible edit.

Regression: `node --test tests/operations.test.mjs tests/release.test.mjs` — 25
passed.

ESLint over the repository's lint targets (`app components lib registry/cojeev
apps scripts tests --max-warnings=0`) reported no findings. `npm run lint`
itself cannot execute in this worktree: it invokes `node_modules/eslint/...` by
relative path and the worktree has no `node_modules` of its own, so ESLint was
invoked through the parent checkout's installed binary against the same targets
and flags. The CSS `!important` scan in `scripts/lint.mjs` was not re-run; no
CSS changed.

Not run, and not claimed as passing: the component catalogue, the mobile WebKit,
marketing, smooth-scroll, motion, reporting-browser, analytics-browser and
consumer-install gates. This change touches no component, style or build output.

## Test policy

The owner's exact-source test deferral (B02-6) no longer applies to this work:
the repository-level approval value it depends on was deleted by the coordinator
before this checkpoint, so `Verify release` requires full verification again.
This checkpoint therefore ships with executable tests rather than a deferral,
and no new waiver was created or requested.
