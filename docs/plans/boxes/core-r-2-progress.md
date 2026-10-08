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
DECISION: rate limits = 5 new reports per install, 10 per canonical IPv4 /32 or IPv6 /64 (mapped IPv4 shares /32), and 100 globally per fixed 600000ms window because the existing website limiter uses 10/IP/10 minutes; a stricter install budget leaves room for shared networks. Production requires a >=32-character IP_HASH_SECRET and CF-Connecting-IP; only LOCAL_MODE loopback permits a synthetic local IP. Only keyed hashes of install/IP keys are stored; install id is not authentication.
DECISION: retention = diagnostics 30 days, message 180 days, minimal id/hash/issue/outbox receipt retained because the existing cleanup already owns these periods and durable idempotency must survive prose expiry. Remote GitHub content is not deleted by local cleanup.
DECISION: retries = existing five-minute cron, 20-job batch, five-minute lease, eight automatic attempts before needs_review, 60s exponential delay capped at 24h; app ambiguous/crashed outcomes requeue for signed-marker reconciliation before any POST because automatic issue delivery cannot require hand-run triage. Permanent errors or exhausted attempts remain needs_review; activation gating remains in force. Reconciliation scans at most 10 pages of 100 issues and refuses another POST if exhausted.
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

WORKER-CHECK = `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock /usr/bin/time -p node --test workers/reporting/test/*.test.mjs` (final exit 0, 103 passed, no failures/skips).

| Done-when | Status | Command / evidence |
|---|---|---|
| Issue delivery, seven categories (synthetic) | passes: true | `WORKER-CHECK`: “✔ app_report_creates_labelled_issue”; repo, exact labels, saved issue URLs asserted for all seven |
| Issue delivery on beta, retained real URLs/labels | passes: deferred A2 / G-REACH-CANDIDATE | Owner token scope + beta deployment + coordinator synthetic beta receipts required; builder cannot write remotely |
| Retry, one issue including uncertain delivery | passes: true | `WORKER-CHECK`: “✔ app_report_retry_is_idempotent”; uncertain POST and expired lease with missing local receipt reconcile one issue |
| Validation | passes: true | `WORKER-CHECK`: “✔ app_report_rejects_bad_category_and_oversize”; wire/canonical/per-field caps, unknown keys and minimums |
| Admission, per install/IP | passes: true | `WORKER-CHECK`: “✔ app_report_rate_limited_per_install”; install/IP budgets, Retry-After, racing duplicate and window reset |
| Destination, limits, no app credential | passes: true | `WORKER-CHECK` (“ℹ pass 103”) plus `rtk git diff 1350f8d29749e3944dbdb07cac0c11f1f8af0dab`; only APP_GITHUB_REPOSITORY added, website settings retained, no new credential |
| Worker regression and running Worker | passes: true | `WORKER-CHECK`: “ℹ tests 103”, “ℹ pass 103”, “ℹ fail 0”, “✔ app_report_runtime_accepts_and_delivers_without_admin (339.86775ms)” |
| Plain root typecheck | passes: false PRE-EXISTING | `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck`: existing TS2307 image declaration error quoted below |
| Root typecheck with standard Next image declarations | passes: true | `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck -- --types next/image-types/global`: “> tsc --noEmit --types next/image-types/global”, exit 0 |
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

First GREEN for the four required tests (same named command as RED, exit 0, duration 1976.590208 ms):
- “✔ app_report_creates_labelled_issue (1210.664625ms)”
- “✔ app_report_retry_is_idempotent (275.99325ms)”
- “✔ app_report_rejects_bad_category_and_oversize (161.135833ms)”
- “✔ app_report_rate_limited_per_install (61.753208ms)”
- “ℹ tests 4”, “ℹ pass 4”, “ℹ fail 0”, “ℹ skipped 0”.
An earlier implementation run (1535.516375 ms) passed retry/validation/admission but caught absent version/platform context in the issue body. The body now includes the server-generated context; no assertion was changed.

`rtk npm ci` completed: “added 970 packages, and audited 971 packages in 3m”. Setup reports existing dependency audit/deprecation notices; no dependency remediation/lockfile mutation was included.

Initial `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck` (exit 2) caught the new D1 result generic, subsequently corrected. PRE-EXISTING: npm run typecheck: “components/brand/brand-sculpture.tsx(5,23): error TS2307: Cannot find module '@/public/brand/000h-sculpture.webp' or its corresponding type declarations.” The asset exists and import/config match the ancestor; this fresh checkout lacks Next's generated image declaration entrypoint. No reporting source depends on that image.

Worker regression command: `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock node --test workers/reporting/test/*.test.mjs`, first run exit 1, “ℹ tests 99”, “ℹ pass 97”, “ℹ fail 2”, “ℹ duration_ms 15088.124041”. Both legacy migration tests failed with “table reports has 21 columns but 24 values were supplied”: our new three fields were copied into historical 0001 fixtures. Fixture projection now removes exactly those fields as well as existing post-0001 fields; all existing migration assertions are retained. This was caused by R-2, not pre-existing.

Local independent review via requesting-code-review found three Important issues, no Critical: concurrent admission double charge, cross-repository number-only sharing in website triage/detail, and disabled website backlog starving app-only cron. All accepted for correction. Deterministic concurrent RED: `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_concurrent_retry' workers/reporting/test/integration.test.mjs`, exit 1, “racing identical retry at install limit must not be rejected”, duration 1123.450625 ms. The fixture gates only the first two existing-row reads while retaining real D1 writes; admission now rolls back a duplicate's counters with the report/outbox unique-ID failure.

Review regression RED command: `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_issue_numbers|app_report_cron_not_starved' workers/reporting/test/integration.test.mjs`, exit 1, duration 1506.679042 ms:
- “separate repositories cannot share an issue”, “true !== false”.
- “cron must deliver eligible app retry past older disabled website jobs”, “null !== 1”.
Corrections: website triage sharing checks are source-scoped; private detail sharing compares source plus pinned destination; webhook already scopes website rows. Disabled-provider source eligibility is applied in SQL before the shared outbox LIMIT 20. This fixes the number-identity and eligibility owners across sibling paths, rather than masking each caller.

Working runtime probe: `app_report_runtime_accepts_and_delivers_without_admin` boots another isolated Miniflare instance in beta/production-protection mode, with all outbound HTTP routed to the fake GitHub backend. It exercises the real POST route, waitUntil drain and saved issue URL/labels without calling admin triage/drain. This is local synthetic evidence; beta/installed gates above remain deferred.

Review regressions GREEN (combined race/source/eligibility pattern command, exit 0, duration 1778.65075 ms): “✔ app_report_concurrent_retry_uses_one_admission (774.799209ms)”, “✔ app_report_issue_numbers_do_not_change_website_triage (123.033125ms)”, “✔ app_report_cron_not_starved_by_disabled_website_provider (539.020458ms)”; “ℹ pass 3”, “ℹ fail 0”. Read-only follow-up review: “No remaining Critical or Important findings in the updated ancestor diff.” Its minor crash-coverage suggestion was incorporated by clearing the local issue receipt before expiring the lease; the test now asserts signed-marker recovery restores the same URL without another POST.

Final root typecheck (plain command above) exits 2 with only the PRE-EXISTING image declaration error. Supplemental check `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck -- --types next/image-types/global` exits 0: “> tsc --noEmit --types next/image-types/global”. This supplies Next's standard declaration for image imports in the fresh checkout, without suppressing errors or changing source/tsconfig/manifests. No R-2 TypeScript errors remain.

The next full Worker run exercised 103 tests: “ℹ pass 102”, “ℹ fail 1”, “ℹ duration_ms 15842.46125”. All existing website/migration/triage tests and all required app tests passed; only the new runtime missing-IP control failed (“201 !== 503”). Diagnosis: Miniflare injects CF-Connecting-IP regardless of the omitted client header. The test-only edge adapter now removes that injected header for the negative control before calling the real Worker router. Positive runtime requests use the same unmodified router, D1 and outbound drain. The 503 assertion is retained. The narrow rerun also covers the strengthened crash-without-local-receipt check; production code is unchanged since the full run.

Narrow correction check: `rtk proxy lockf /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_runtime|app_report_retry_is_idempotent' workers/reporting/test/integration.test.mjs`, exit 0, duration 1353.916084 ms: “✔ app_report_retry_is_idempotent (821.503792ms)”, “✔ app_report_runtime_accepts_and_delivers_without_admin (233.251292ms)”, “ℹ pass 2”, “ℹ fail 0”. Missing-IP negative control now reaches the true trust boundary; automatic route delivery succeeds in the same production-shaped instance.

Additional passing contract evidence from the Worker regression: `app_report_retry_bounds_and_retention`, `app_report_admission_window_and_atomic_failure`, `app_report_isolated_from_website_triage_and_webhooks`. They exercise eight-attempt exhaustion, permanent failures, expired final lease, 30/180-day local cleanup with retained duplicate identity, ten-minute slot reset, fail-closed missing settings/short protection key, and real D1 transaction rollback before acceptance.

Documentation review: the contract, Decision lines and Done-when ledger were checked against the authoritative card and R-2/R-3 plan rows. `docs/reporting/README.md` adds a short link to this contract. Existing package runner and sorted migration discovery were reused without manifest/lockfile edits. The complete ancestor diff was reviewed, including all four integrator commits and new tests; `rtk git diff --check` exits 0 with no output. No existing assertion, check or test was removed, weakened or skipped. The two historical fixture projections only remove columns that did not exist in schema 0001.

Intended remote delta:

| Change | Exact gh command |
|---|---|
| None; no label/issue/comment/project/release mutations belong to this builder | None |

REMOTE-DELTA: 0 changes pending coordinator. A2 token scope, remote D1 migration/deployment, beta receipts and production owner-go are later gates, not commands executed here. The external ADR 0006 card/review/record requirements were read; PD-3 and the supplied coordinator rulings supersede its older execution/push rules. The pinned ADR 0010 path belongs to the Core repo; no duplicate ADR is created in this Worker repo.

## Final receipt

Final WORKER-CHECK after correcting the runtime fixture (exit 0):
- “✔ app_report_creates_labelled_issue (756.079709ms)”
- “✔ app_report_retry_is_idempotent (281.240208ms)”
- “✔ app_report_rejects_bad_category_and_oversize (160.875583ms)”
- “✔ app_report_rate_limited_per_install (60.966042ms)”
- “✔ app_report_runtime_accepts_and_delivers_without_admin (339.86775ms)”
- “ℹ tests 103”, “ℹ pass 103”, “ℹ fail 0”, “ℹ skipped 0”, “ℹ duration_ms 16811.558167”.
- Timed execution inside the lock: “real 16.85”, “user 8.75”, “sys 1.65”.

Check-running time: final regression 16.85 seconds; all reported Node-test command durations across red/green/debugging checks total 58.63 seconds, including 0.91 seconds of the initial dependency-extraction startup failure. These durations include esbuild/test-fixture bootstrap, exclude compile-lock queue waits, and are separate from approximately three minutes of npm setup and time spent writing tests, implementation/debugging and review. Typecheck time and cumulative lock queue wait were not separately instrumented; no invented duration is claimed. No Rust/native compile or packaging was run. Last disk admission before the final runner: “Available 11” GB.

Review/verification state: complete ancestor-to-working-tree diff reviewed locally and independently, no remaining local Critical/Important findings. Final tested snapshot includes every production/test edit in the upcoming implementation commit; only this receipt/ledger prose was added afterward. Coordinator Astra + Opus/PR/CI review remains deferred G-MERGE. The dependent desktop caller and installed/remote receipts remain at their named gates. No credentials were read/copied and no remote writes, deployment, secret command, remote D1 operation, push or merge occurred.

Completion uses finishing-a-development-branch with the owner's already-selected outcome: keep this branch/worktree, local commit only. No integration menu or cleanup is applicable. All integrator and implementation changes belong to `task/core-r-2` and its ancestor range.

Tested implementation head: `9281058` (`R-2: desktop reports automatically create private labelled issues`). Its production/test tree is the final WORKER-CHECK snapshot; no code changed after verification. Integrator route wiring commit: `e4b8cbc`. This final receipt-only commit records that head and is verified by document/diff review, without repeating app tests. Local branch is `task/core-r-2`; worktree was clean after the implementation commit. No push or merge.
