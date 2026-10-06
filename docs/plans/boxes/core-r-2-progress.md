# R-2 progress

Branch `task/core-r-2`, ancestor base `1350f8d29749e3944dbdb07cac0c11f1f8af0dab`.
Authority: `/Volumes/CojeevBuild/wt/core-r-2/docs/plans/boxes/core-r-2.md`, R-2 plan row and coordinator rulings in the assignment. This UI worktree has no AGENTS.md/CLAUDE.md; the supplied instructions and the card worktree's reuse rules were read. Disk admission: `rtk proxy df -g /` reports `Available 13` GB. Dependencies were absent; first setup command is `rtk npm ci`.

Owner/reuse: R-2 extends reporting `reports.ts`, `security.ts`, `delivery.ts`, `lifecycle.ts`, `triage.ts` and route composition. Existing D1 reports/outbox/rate_limits, five-minute cron, activation cutoff, lease claim, GitHub HTTP helper and signed-marker reconciliation remain the owners. R-3 owns the native desktop caller; R-1/M-5 own client export/redaction. No second store, queue, Worker, token or dependency. No M-5 code exists in this repository; this Worker reuses its existing `redact`/`scrubPublic` defense, not a replacement desktop detector.

DECISION: route = POST /v1/app-reports because the existing API uses versioned report routes and native HTTP must not inherit website Origin/Turnstile admission.
DECISION: request = {id, installId, category, message, diagnostics, appVersion, platform} because R-3 sends a message and optional redacted export with version/OS; UUID ids reuse isUUID, diagnostics is string|null, platform is macos|windows, unknown keys fail.
DECISION: response = 201 fresh or 200 duplicate, {id, status:"accepted"} because D1 acceptance precedes asynchronous issue creation; no issue creation claim or receipt credential is returned.
DECISION: errors = existing {error:string, retryAfter?:number}, HTTP 400 malformed JSON, 422 invalid fields, 413 caps, 409 conflicting id, 429 admission, 503 configuration/storage because callers can reuse Worker error conventions; 429 also carries Retry-After seconds.
DECISION: duplicate policy = canonical validated payload SHA-256 equality, including installId; same id returns 200 without another job or rate charge, changed payload/source returns 409, including concurrent requests because reports/outbox have unique ids and atomic D1 batches.
DECISION: caps = 16384 wire bytes, 4000 UTF-16 code units of canonical JSON, message 1..2000, diagnostics 0..1600, appVersion 1..64, two UUIDs and exactly one of seven categories because these bound native text/export within the assigned 4000-character ceiling; invalid field lengths are 413, empty required strings are 422.
DECISION: rate limits = 5 new reports per install and 10 per IP per fixed 600000ms window because the existing website limiter uses 10/IP/10 minutes; a stricter install budget leaves room for shared networks. Production requires a >=32-character IP_HASH_SECRET and CF-Connecting-IP; only LOCAL_MODE loopback permits a synthetic local IP. Only keyed hashes of install/IP keys are stored; install id is not authentication.
DECISION: retention = diagnostics 30 days, message 180 days, minimal id/hash/issue/outbox receipt retained because the existing cleanup already owns these periods and durable idempotency must survive prose expiry. Remote GitHub content is not deleted by local cleanup.
DECISION: retries = existing five-minute cron, 20-job batch, five-minute lease, eight attempts total, 60s exponential delay capped at 24h; app ambiguous/crashed outcomes requeue for signed-marker reconciliation before any POST because automatic issue delivery cannot require hand-run triage. Permanent errors or exhausted attempts remain needs_review; activation gating remains in force. Reconciliation scans at most 10 pages of 100 issues and refuses another POST if exhausted.
DECISION: destination = APP_GITHUB_REPOSITORY=luv-jeri/cojeev, pinned on each accepted report, same GITHUB_TOKEN because website GITHUB_REPOSITORY must remain the library destination and config changes must not redirect a retry. App delivery never uses website project/email jobs.
DECISION: labels = [user-report, category] because the server owns labels and exactly one category; intake marks app reports approved without AI/owner triage.
DECISION: shared allocation = migration 0005_app_reports.sql, existing integration.test.mjs/automatic sorted migration discovery, existing root reporting:test runner because workers/reporting has no package.json or separate migration registry. No manifest/lockfile change is needed.
DECISION: compile entry = lockf /Volumes/CojeevBuild/lanes/compile.lock <cmd> because coordinator R3 pins the machine-wide lock; even Miniflare tests compile through esbuild.

## R-3 contract

Native POST to `https://feedback.cojeev.com/v1/app-reports` (beta: `https://feedback-beta.cojeev.com/v1/app-reports`), Content-Type application/json, no shared secret, Origin or Turnstile token. Send exactly:

```json
{"id":"00000000-0000-4000-8000-000000000001","installId":"00000000-0000-4000-8000-000000000002","category":"crash","message":"The window closed unexpectedly.","diagnostics":"Redacted R-1 export","appVersion":"0.1.0","platform":"macos"}
```

Categories: memory, handoff, sharing, updates, skills-beta, crash, ui. `diagnostics` may be null. Preserve the complete payload and report UUID for Retry; a random install UUID persists per installation and is only an abuse key. UUID letter case is normalized to lowercase; other strings retain exact content. Observe the caps above, counting JSON serialization including keys/ids in the 4000 total. 201/200 and matching `{id,status:"accepted"}` permit “Report sent” with id, never “issue created.” Any error keeps the unsent draft; 429 waits Retry-After. A changed report gets a new UUID. Acceptance only promises persistence, and no status/withdrawal endpoint is added here. R-1/M-5 redaction remains required before sending; server scrubbing adds defense. R-2 must not reopen SQ4.

## Evidence ledger

| Done-when | Status | Command / evidence |
|---|---|---|
| Issue delivery, seven categories (synthetic) | passes: false implementation | Pending named red/green test |
| Issue delivery on beta, retained real URLs/labels | passes: deferred A2 / G-REACH-CANDIDATE | Owner token scope + beta deployment + coordinator synthetic beta receipts required; builder cannot write remotely |
| Retry, one issue including uncertain delivery | passes: false implementation | Pending named red/green test |
| Validation | passes: false implementation | Pending named red/green test |
| Admission, per install/IP | passes: false implementation | Pending named red/green test |
| Destination, limits, no app credential | passes: false implementation | Pending focused integration evidence and diff review |
| Production deployment | passes: deferred owner-go / cojeev-ui release pipeline | No deploy, secret or remote D1 command run |
| A2 issue-write token scope | passes: deferred A2 | Owner action; reuse existing GITHUB_TOKEN |
| Desktop reach, Mac/Windows caller | passes: deferred R-3 / W-12 | Contract delivered here; caller belongs to dependent tasks |
| Installed candidate receipts | passes: deferred P-4 / W-15 / G-REACH-FINAL | Published artifacts and owner/teammate actions |
| Astra + Opus reviewed head, green CI, real PR | passes: deferred G-MERGE | Coordinator review at PR time; this branch performs local diff review |

REMOTE-DELTA: 0 changes pending coordinator. No GitHub mutations or gh commands are required by this branch. A2, beta and production gates are recorded above.

## Execution

1. Commit self-contained contract/config/types/migration allocations as integrator edits.
2. Add named tests in the existing Miniflare runner; retain failing output before implementation. Wire route composition as an integrator edit, then implement at existing owners.
3. Run focused Worker regression checks and typecheck under the compile lock; check the running Worker once with isolated fixtures; review the ancestor diff and commit locally.

Check-running time is recorded separately from test writing, implementation/debugging, review and setup at completion.

Integrator commits: `bc6b6d5` contract, `fcb0441` types/migration, `e091a24` repository settings. Route composition is committed separately before implementation; its acceptApp export is supplied by the next implementation commit. Existing sorted migration discovery probes 0005 in the unchanged test bootstrap; no separate invented prose checker/manifest is added.

RED command: `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_' workers/reporting/test/integration.test.mjs` (exit 1, duration 702.903292 ms). These are feature failures against the missing route, before production implementation:
- `app_report_creates_labelled_issue`: “native app report must be accepted without website Origin/Turnstile”; “404 !== 201”.
- `app_report_retry_is_idempotent`: “concurrent retries must share one durable report”; “actual: [ 404, 404 ], expected: [ 200, 201 ]”.
- `app_report_rejects_bad_category_and_oversize`: “404 !== 422” on category `bug` (not in the allowlist).
- `app_report_rate_limited_per_install`: “404 !== 201” on the first allowed report, before reaching the sixth-report assertion.
The initial attempt during dependency extraction failed in Miniflare startup with “Error: spawn Unknown system error -88” (910.173042 ms); it is not counted as RED evidence. The workerd binary finished extraction and the rerun above exercised the route.
