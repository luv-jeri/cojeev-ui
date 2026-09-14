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
of 4s, 8s, 12s and 16s.

The bound is a real wall-clock budget of 60 seconds for the whole check, reads
included, not a sleep total. Every request is issued through a fetcher that
aborts it at the deadline, and every wait is truncated to whatever is left, so
slow reads consume the budget exactly as sleeping does and the deploy job cannot
be held open by a hanging edge. The worst case is the budget plus the one read
already in flight when it expires.

Everything else fails on the first attempt: a missing health token, a stalled or
failed delivery queue, email quota, an unconfigured provider, and any broken
header, status or 404 contract. A run that carries even one permanent code never
retries, even when a propagation code is present alongside it.

## The missed case, and the guard that fixes it

The first version ran the three route probes on every read, including reads where
public health had already said this release was not being served yet. A route
probe that answers with anything other than the expected status produces
`site-contract`, which is permanent — so an edge mid-rollout, answering 503 or
404 on *every* endpoint, failed on the first attempt and never retried. That is
precisely the case this checkpoint exists for.

Reproduced in-process with a stub fetcher, no network, before the fix:

```
Live checks failed after 1 attempt: http-health, site-contract
waits performed: 0
```

An independent review reproduced the same failure and offered two repairs. The
smaller one is taken here, and it restores the ordering the original `live`
command had: **public health gates the route contract.** One guard before the
loop — if the read carries `http-health` or `release-mismatch`, the routes are
not probed at all, and the read returns its health codes plus `site-unchecked`.

This is deliberately *not* the broader alternative of reclassifying route-probe
statuses as transient. A wrong status is still a permanent `site-contract`
failure; it is simply not attributed to this release until public health says
this release is the one answering.

The code vocabulary is unchanged: no new code is reported for the skip. A draft
added one and it was removed on review as unnecessary state, because the read
already carries `http-health` or `release-mismatch`, which is both why success is
impossible at that point and why the run retries.

**The invariant the guard rests on:** an unready read always carries one of those
two codes, so `liveProblems` can never return an empty list without having
actually probed the routes. Success therefore still requires the correct release
*and* the full route contract, never one without the other. A test drives that
invariant across four different unready edges, asserting both that the read is
non-empty and that every code it reports is one a later read can resolve.

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
Live checks attempt 2/5: release-mismatch, site-release-mismatch; retrying in 8s
```

Fixed codes and the attempt counter only. No response body, header, URL,
release value or credential is printed, and a test asserts that the health token
and the release SHA never appear in a retry line.

## Verification

Eight focused tests in `tests/release-live.test.mjs`, run with
`node --test tests/release-live.test.mjs` — 8 passed:

- a fully propagated release passes on the first read and waits zero times;
- a lagging edge is retried and passes once it catches up, with the exact
  bounded wait sequence asserted;
- a completely unreachable site is retried, then fails after exactly 5 attempts,
  naming the propagation budget in the message;
- a missing token, a stalled delivery queue and a broken header contract each
  fail on attempt 1 with no waiting;
- a permanent code alongside a propagation code stops immediately;
- the transient set is asserted exactly, so widening it later is a visible edit;
- an injected clock proves the budget is wall-clock time: reads that each consume
  18s stop the retries early, even though the wait list alone would still permit
  five attempts;
- the deadline is observed **firing**, not merely present: a stub that never
  resolves on its own is ended only by the budget's own abort signal, with a 50ms
  budget against the real clock and real timers. The measured run took 52.8ms,
  against a 15s per-request timeout and a 4s first wait, so the test completing
  at all is the evidence. This replaces an earlier assertion that only checked
  the signals were `AbortSignal` instances, which both the primary and the
  review called out as too weak;
- an edge answering 503 on every endpoint retries the full budget and never
  reports `site-contract`;
- recovery after a 503 and after a 404 health outage both pass, and the routes
  are read exactly once, after readiness, never against the failing edge;
- a stale release followed by the new one passes, with the stale edge's routes
  never requested;
- after readiness the route contract is authoritative again: a dropped header and
  a wrong status each fail on the first ready read with no waiting;
- a stalled delivery queue reported by a reachable admin endpoint during a public
  outage still stops the run at once, and a missing token stays permanent during
  an outage.

Thirteen tests in total. Regression:
`node --test tests/release-live.test.mjs tests/operations.test.mjs tests/release.test.mjs`
— 38 passed. `node --check` on both changed files: clean.

## CI lifetime correction for the deadline test

Run `34809526859` cancelled `tests/release-live.test.mjs:107` with
`cancelledByParent: Promise resolution is still pending but the event loop has
already resolved`, and the seven sibling tests after it never executed. No
product assertion failed, and nothing about the release code was implicated.

Cause: the deadline test's stub fetcher returns a promise that settles only when
the budget's abort signal fires. Unlike a real `fetch`, that stub holds no
referenced I/O handle, and `AbortSignal.timeout()` does not keep Node's event
loop alive. With nothing referenced, the loop could drain while the promise was
still pending and the runner cancelled the test.

Correction, confined to that test: hold one `setTimeout` — referenced, and
bounded at 2s, longer than the 50ms budget but shorter than the elapsed bound the
test already asserts — for the duration of the assertion, cleared unconditionally
in `t.after`. The abort requirement and the elapsed-time bound are unchanged, no
production code was touched, no assertion was weakened into a sleep or a fake
success, and no suite timeout was raised.

This was not reproduced locally: the file passed locally before the change, both
plainly and under `--import tsx`, so the repair follows from the mechanism rather
than from a local reproduction. What local runs do show is that the timer is
cleared rather than left to expire — the three focused files complete in ~0.33s
plain and ~0.44s under tsx, far below the 2s bound, and report `cancelled 0`.

## Known limits, recorded rather than fixed

- **An exhausted budget is reported with propagation codes, not a timeout code.**
  When the deadline passes, `boundedFetcher`'s throw is swallowed into
  `http-health`, so the failure reads `http-health, site-unchecked` rather than
  saying the deadline expired. The thrown message does name the budget
  (`within the 60s propagation budget`), so the run ends correctly and is not
  misreported, but an operator reading the codes alone sees a diagnosis of the
  site rather than of the clock. The review classed this as minor; it is left
  for a separate change rather than widened into this correction.
- **The `invalid-delivery-health` fold also masks a wrong or expired health token
  for the duration of an outage.** With a token supplied and `http-health`
  present, that code is dropped as one outage. If the token is genuinely bad, the
  code reappears on the first read after recovery and stops the run, so the
  masking is self-correcting — but it is by design, not by accident, and is
  recorded here as such.
- **A route contract defect is only ever detected after public health reports
  ready.** A site that never becomes ready fails on its health codes, and its
  route contract is reported as `site-unchecked` rather than diagnosed. That is
  the intended ordering: an unready edge's headers belong to the previous
  release.

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
