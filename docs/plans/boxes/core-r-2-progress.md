# R-2 progress

Branch `task/core-r-2`, ancestor base `1350f8d29749e3944dbdb07cac0c11f1f8af0dab`.
Authority: `/Volumes/CojeevBuild/wt/core-r-2/docs/plans/boxes/core-r-2.md`, R-2 plan row and coordinator rulings in the assignment. This UI worktree has no AGENTS.md/CLAUDE.md; the supplied instructions and the card worktree's reuse rules were read. Disk admission: `rtk proxy df -g /` reports `Available 13` GB. Dependencies were absent; first setup command is `rtk npm ci`.

Owner/reuse: R-2 extends reporting `reports.ts`, `security.ts`, `delivery.ts`, `lifecycle.ts`, `triage.ts` and route composition. Existing D1 reports/outbox/rate_limits, five-minute cron, activation cutoff, lease claim, GitHub HTTP helper and signed-marker reconciliation remain the owners. R-3 owns the native desktop caller; R-1/M-5 own client export/redaction. No second store, queue, Worker, token or dependency. No M-5 code exists in this repository; this Worker reuses its existing `redact`/`scrubPublic` defense, not a replacement desktop detector.

DECISION: route = POST /v1/app-reports because the existing API uses versioned report routes and native HTTP must not inherit website Origin/Turnstile admission.
DECISION: request = {id, installId, category, message, diagnostics, appVersion, platform} because R-3 sends a message and optional redacted export with version/OS; UUID ids reuse isUUID, diagnostics is string|null, platform is macos|windows, unknown keys fail.
DECISION: response = 201 fresh or 200 duplicate, {id, status:"accepted"} because D1 acceptance precedes asynchronous issue creation; no issue creation claim or receipt credential is returned.
DECISION: errors = existing {error:string, retryAfter?:number}, HTTP 403 any app Origin header, 415 app Content-Type other than exact application/json, 400 malformed JSON, 422 invalid fields, 413 caps, 409 conflicting id, 429 admission, 503 configuration/storage because callers can reuse Worker error conventions; 429 also carries Retry-After seconds.
DECISION: duplicate policy = canonical validated payload SHA-256 equality, including installId; same id returns 200 without another job or rate charge, changed payload/source returns 409, including concurrent requests because reports/outbox have unique ids and atomic D1 batches.
DECISION: caps = 16384 wire bytes, 4000 UTF-16 code units of canonical JSON, message 1..2000, diagnostics 0..1600, appVersion 1..64 matching ^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$, two UUIDs and exactly one of seven categories because these bound native text/export within the assigned 4000-character ceiling; invalid field lengths are 413, empty required strings are 422.
DECISION: rate limits = 5 new reports per install, 10 per canonical IPv4 /32 or IPv6 /64, 20 per IPv4 /24 or IPv6 /48, 100 per ASN when edge metadata is available, and 2,000 globally per fixed 600000ms window. Mapped IPv4 shares both IPv4 tiers. The global limit is a storage backstop: 2,000 / 20 requires at least 100 coarse networks, and 2,000 / 100 requires at least 20 ASNs when available. Production requires a >=32-character IP_HASH_SECRET and CF-Connecting-IP; only LOCAL_MODE loopback permits a synthetic local IP. Only keyed hashes of install/address/network/ASN keys are stored; install id is not authentication.
DECISION: retention = diagnostics 30 days, message 180 days, minimal id/hash/issue/outbox receipt retained because the existing cleanup already owns these periods and durable idempotency must survive prose expiry. Remote GitHub content is not deleted by local cleanup.
DECISION: retries = existing five-minute cron, 20-job batch, five-minute lease, eight automatic attempts before needs_review, 60s exponential delay capped at 24h; app ambiguous/crashed outcomes requeue for signed-marker reconciliation before any POST because automatic issue delivery cannot require hand-run triage. Permanent errors or exhausted attempts remain needs_review; activation gating remains in force. Reconciliation scans at most 10 pages of 100 issues and refuses another POST if exhausted.
DECISION: destination = APP_GITHUB_REPOSITORY=luv-jeri/cojeev, pinned on each accepted report, same GITHUB_TOKEN because website GITHUB_REPOSITORY must remain the library destination and config changes must not redirect a retry. App delivery never uses website project/email jobs.
DECISION: app issue text = fixed category title, context/message/diagnostics in literal code fences longer than every content backtick run; plain mentions also use the existing zero-width separator. Encoded markup is displayed literally, not decoded.
DECISION: labels = [user-report, category] because the server owns labels and exactly one category; intake marks app reports approved without AI/owner triage.
DECISION: shared allocation = migration 0005_app_reports.sql, existing integration.test.mjs/automatic sorted migration discovery, existing root reporting:test runner because workers/reporting has no package.json or separate migration registry. No manifest/lockfile change is needed.
DECISION: compile entry = lockf -k /Volumes/CojeevBuild/lanes/compile.lock <cmd> because coordinator R3 pins the machine-wide lock; even Miniflare tests compile through esbuild.

## R-3 contract

Native POST to `https://feedback.cojeev.com/v1/app-reports` (beta: `https://feedback-beta.cojeev.com/v1/app-reports`), Content-Type exactly application/json (no parameters), no shared secret, Origin or Turnstile token. Any Origin header is refused. App versions must match `^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$` (for example `0.1.0` or `0.1.0-beta.1`). Send exactly:

```json
{"id":"00000000-0000-4000-8000-000000000001","installId":"00000000-0000-4000-8000-000000000002","category":"crash","message":"The window closed unexpectedly.","diagnostics":"Redacted R-1 export","appVersion":"0.1.0","platform":"macos"}
```

Categories: memory, handoff, sharing, updates, skills-beta, crash, ui. `diagnostics` may be null. Preserve the complete payload and report UUID for Retry; a random install UUID persists per installation and is only an abuse key. UUID letter case is normalized to lowercase; other strings retain exact content. Observe the caps above, counting JSON serialization including keys/ids in the 4000 total. 201/200 and matching `{id,status:"accepted"}` permit “Report sent” with id, never “issue created.” Any error keeps the unsent draft; 429 waits Retry-After. A changed report gets a new UUID. Acceptance only promises persistence, and no status/withdrawal endpoint is added here. R-1/M-5 redaction remains required before sending; server scrubbing adds defense. R-2 must not reopen SQ4.

## Evidence ledger

WORKER-CHECK = `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock /usr/bin/time -p node --test workers/reporting/test/*.test.mjs` (final exit 0, 103 passed, no failures/skips).

| Done-when | Status | Command / evidence |
|---|---|---|
| Issue delivery, seven categories (synthetic) | passes: true | `WORKER-CHECK`: “✔ app_report_creates_labelled_issue”; repo, exact labels, saved issue URLs asserted for all seven |
| Issue delivery on beta, retained real URLs/labels | passes: deferred A2 / G-REACH-CANDIDATE | Owner token scope + beta deployment + coordinator synthetic beta receipts required; builder cannot write remotely |
| Retry, one issue including uncertain delivery | passes: true | `WORKER-CHECK`: “✔ app_report_retry_is_idempotent”; uncertain POST and expired lease with missing local receipt reconcile one issue |
| Validation | passes: true | `WORKER-CHECK`: “✔ app_report_rejects_bad_category_and_oversize”; wire/canonical/per-field caps, unknown keys and minimums |
| Admission, per install/IP | passes: true | `WORKER-CHECK`: “✔ app_report_rate_limited_per_install”; install/IP budgets, Retry-After, racing duplicate and window reset |
| Destination, limits, no app credential | passes: true | `WORKER-CHECK` (“ℹ pass 103”) plus `rtk git diff 1350f8d29749e3944dbdb07cac0c11f1f8af0dab`; only APP_GITHUB_REPOSITORY added, website settings retained, no new credential |
| Worker regression and running Worker | passes: true | `WORKER-CHECK`: “ℹ tests 103”, “ℹ pass 103”, “ℹ fail 0”, “✔ app_report_runtime_accepts_and_delivers_without_admin (339.86775ms)” |
| Plain root typecheck | passes: false PRE-EXISTING | `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck`: existing TS2307 image declaration error quoted below |
| Root typecheck with standard Next image declarations | passes: true | `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck -- --types next/image-types/global`: “> tsc --noEmit --types next/image-types/global”, exit 0 |
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

RED command: `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_' workers/reporting/test/integration.test.mjs` (exit 1, duration 702.903292 ms). These are feature failures against the missing route, before production implementation:
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

Initial `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck` (exit 2) caught the new D1 result generic, subsequently corrected. PRE-EXISTING: npm run typecheck: “components/brand/brand-sculpture.tsx(5,23): error TS2307: Cannot find module '@/public/brand/000h-sculpture.webp' or its corresponding type declarations.” The asset exists and import/config match the ancestor; this fresh checkout lacks Next's generated image declaration entrypoint. No reporting source depends on that image.

Worker regression command: `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock node --test workers/reporting/test/*.test.mjs`, first run exit 1, “ℹ tests 99”, “ℹ pass 97”, “ℹ fail 2”, “ℹ duration_ms 15088.124041”. Both legacy migration tests failed with “table reports has 21 columns but 24 values were supplied”: our new three fields were copied into historical 0001 fixtures. Fixture projection now removes exactly those fields as well as existing post-0001 fields; all existing migration assertions are retained. This was caused by R-2, not pre-existing.

Local independent review via requesting-code-review found three Important issues, no Critical: concurrent admission double charge, cross-repository number-only sharing in website triage/detail, and disabled website backlog starving app-only cron. All accepted for correction. Deterministic concurrent RED: `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_concurrent_retry' workers/reporting/test/integration.test.mjs`, exit 1, “racing identical retry at install limit must not be rejected”, duration 1123.450625 ms. The fixture gates only the first two existing-row reads while retaining real D1 writes; admission now rolls back a duplicate's counters with the report/outbox unique-ID failure.

Review regression RED command: `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_issue_numbers|app_report_cron_not_starved' workers/reporting/test/integration.test.mjs`, exit 1, duration 1506.679042 ms:
- “separate repositories cannot share an issue”, “true !== false”.
- “cron must deliver eligible app retry past older disabled website jobs”, “null !== 1”.
Corrections: website triage sharing checks are source-scoped; private detail sharing compares source plus pinned destination; webhook already scopes website rows. Disabled-provider source eligibility is applied in SQL before the shared outbox LIMIT 20. This fixes the number-identity and eligibility owners across sibling paths, rather than masking each caller.

Working runtime probe: `app_report_runtime_accepts_and_delivers_without_admin` boots another isolated Miniflare instance in beta/production-protection mode, with all outbound HTTP routed to the fake GitHub backend. It exercises the real POST route, waitUntil drain and saved issue URL/labels without calling admin triage/drain. This is local synthetic evidence; beta/installed gates above remain deferred.

Review regressions GREEN (combined race/source/eligibility pattern command, exit 0, duration 1778.65075 ms): “✔ app_report_concurrent_retry_uses_one_admission (774.799209ms)”, “✔ app_report_issue_numbers_do_not_change_website_triage (123.033125ms)”, “✔ app_report_cron_not_starved_by_disabled_website_provider (539.020458ms)”; “ℹ pass 3”, “ℹ fail 0”. Read-only follow-up review: “No remaining Critical or Important findings in the updated ancestor diff.” Its minor crash-coverage suggestion was incorporated by clearing the local issue receipt before expiring the lease; the test now asserts signed-marker recovery restores the same URL without another POST.

Final root typecheck (plain command above) exits 2 with only the PRE-EXISTING image declaration error. Supplemental check `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock npm run typecheck -- --types next/image-types/global` exits 0: “> tsc --noEmit --types next/image-types/global”. This supplies Next's standard declaration for image imports in the fresh checkout, without suppressing errors or changing source/tsconfig/manifests. No R-2 TypeScript errors remain.

The next full Worker run exercised 103 tests: “ℹ pass 102”, “ℹ fail 1”, “ℹ duration_ms 15842.46125”. All existing website/migration/triage tests and all required app tests passed; only the new runtime missing-IP control failed (“201 !== 503”). Diagnosis: Miniflare injects CF-Connecting-IP regardless of the omitted client header. The test-only edge adapter now removes that injected header for the negative control before calling the real Worker router. Positive runtime requests use the same unmodified router, D1 and outbound drain. The 503 assertion is retained. The narrow rerun also covers the strengthened crash-without-local-receipt check; production code is unchanged since the full run.

Narrow correction check: `rtk proxy lockf -k /Volumes/CojeevBuild/lanes/compile.lock node --test --test-name-pattern='app_report_runtime|app_report_retry_is_idempotent' workers/reporting/test/integration.test.mjs`, exit 0, duration 1353.916084 ms: “✔ app_report_retry_is_idempotent (821.503792ms)”, “✔ app_report_runtime_accepts_and_delivers_without_admin (233.251292ms)”, “ℹ pass 2”, “ℹ fail 0”. Missing-IP negative control now reaches the true trust boundary; automatic route delivery succeeds in the same production-shaped instance.

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

## Review fixes, 2026-10-08

Read both `/Volumes/CojeevBuild/lanes/core/r2-review-astra.md` and `/Volumes/CojeevBuild/lanes/core/r2-review-opus.md`. This UI worktree still has no AGENTS.md or CLAUDE.md; the supplied owner rules and shared owner instructions apply. The requested `git fetch origin && git merge origin/main` produced the expected integration-test conflicts. Merge `816adaf` retains both test sets and combines helper exports; its Worker suite passed 106/106. No rebase.

| Finding | Fix commit | Regression evidence |
|---|---|---|
| Cross-site app intake | `afd0438` | `app_report_requires_exact_json_and_absent_origin_before_writes`: RED 201 instead of 403; GREEN rejects every Origin and non-exact JSON Content-Type without report/outbox/counter writes. Empty Origin is tested directly because Miniflare strips it at its edge adapter. Website Origin rules retain their assertions. |
| IPv6 rotation and unlimited aggregate intake | `c15d342` | IPv6-prefix and global-window regressions both failed with missing expected rejection. GREEN groups equivalent IPv6 spellings and a /64, unifies mapped IPv4 with IPv4, preserves the install cap, and permits exactly 100 mocked issue POSTs per intake window despite rotating addresses/install IDs. Next-window admission succeeds. |
| Storage allocated on refusal | `3c38ba1` | Allocation regression was RED after 40 IP-blocked UUIDs changed the rate table; concurrent global loser also incorrectly had an install counter. GREEN proves IP/install/global refusals leave every counter unchanged, and concurrent requests at count 99 yield one winner. Budget checks precede the report insert in the atomic D1 batch; counter allocation is tied to that admission's unique random token hash. |
| Active Markdown and free-text title/version | `83fe783` | Hostile-title and version regressions were RED; GREEN uses the existing Markdown parser to verify three literal code blocks, no active links/images/definitions, and only the server's signed-marker HTML. Covers long injected backtick fences, raw/encoded mentions, references, links/images/comments, and old stored context. Titles are fixed category labels; versions reject free text and trailing line separators. |
| M2: silently missing labels | `49cc62b` | RED job state was done; GREEN missing-label new and reconciled receipts require review without duplicate creation. Real label-object receipts pass. Previously recorded local issue receipts retain idempotent completion. |
| M4: lease cutoff race | `5849d95` | RED a lease expiring between updates was incorrectly needs_review; GREEN one cutoff preserves processing until the next drain reconciles it. Existing retry/exhaustion checks pass. |

M1 is resolved by the requested merge. M3 is resolved by the atomic admission fix. M5 duplicate-drain cost is unchanged; idempotent retries retain their contract. M6 remains a deployment/token-scope gate. M7 client Windows-path redaction remains with R-1/W-12; shared website redaction was not broadened.

Final tested implementation head: `5849d95`. Command: `lockf -k /Volumes/CojeevBuild/lanes/compile.lock /usr/bin/time -p npm run reporting:test`. Result: **115 tests, 115 passed, 0 failed, 0 skipped**, runner duration **51.34 seconds**, command real **51.67 seconds**. The suite includes the complete local native intake → asynchronous mocked issue delivery → retry journey, website regressions, migrations, concurrency, rollback, and all new regressions. A local comparison confirms every test name from original R-2 head `95fc108` (102 integration tests) and fetched main (94 integration tests) is retained.

Check-running time: completed runner durations across merge, RED/GREEN and final commands total **177.48 seconds**, including esbuild/fixture bootstrap. Final command wall time is reported separately above. Lock queue waiting, writing tests, implementation/debugging, diff review and this documentation are excluded. Two earlier empty-Origin harness runs were stopped after reporting the Miniflare discrepancy; their full elapsed time was not instrumented and is not included in that total. No packaging, dependency installation, root test/typecheck, or browser runner was performed in this fix session.

The combined production/test diff was reviewed after all fixes and `git diff --check` passes. Only the Worker's own package test script was used. Application HTTP is local/synthetic with fake GitHub; no real GitHub issue API, deployed Worker or Cloudflare contact. The only remote read was the requested git fetch. All changes and the merge are local; no credentials printed, no push, PR, deploy or remote writes. This receipt changes documentation only after the tested implementation head; source/tests are unchanged.


## Second-review corrections (2026-10-08)

N1 Changed: coarse /24, /48 and optional ASN budgets join the same conditional report INSERT and atomic counter batch. The global storage backstop is 2,000 per ten minutes; 100 coarse networks at 20 each, or 20 ASNs at 100 each, are necessary to fill it. Refusals still allocate no reports, jobs or counters. Address/install protections and idempotent retries remain in force.

N1 Changed: migration 0006 adds indexed GitHub issue-creation reservations in the existing D1 database. Every app/website issue POST reserves capacity atomically after signed-marker reconciliation. The rolling-hour default and maximum are 200; GITHUB_ISSUE_HOURLY_LIMIT accepts integer settings from 1 through 200, with invalid/unsafe values falling back to 200. Attempts with failed or lost responses retain their reservation. Capacity waits leave reports stored and jobs pending/queued, restore the delivery attempt count and retry when the oldest reservation expires; they do not return an intake failure or needs_review. Existing reconciliation and shared-topic adoption need no creation capacity. Cron deletes expired reservations; no new service or remote setup is introduced here. Migration 0006 must accompany any future authorized rollout.

N1 Tests: before correction, a single /24 admitted 100 instead of 20, competing app/website jobs posted 3 issues against a configured ceiling of 2, and raised-backstop tests rejected the legitimate final admission. Separate /24 and /48 flood regressions pin 20 admissions, an unaffected network, unchanged counters on rejection and window reset. ASN rotation pins 100 admissions and unchanged rejection counters. Delivery tests cover competing leases, queued accepted receipts, later delivery, the default/maximum 200 ceiling through a rolling-hour boundary, reconciliation at capacity and reservation cleanup. All prior Worker tests remain present; backstop expectations now pin 2,000. One older atomic-storage test gets its own synthetic network because the new /24 tier correctly groups its formerly shared address with earlier fixtures.

N1 Result: final combined corrections passed npm run reporting:test, 122/122, including the local Miniflare POST -> waitUntil -> saved GitHub receipt journey with synthetic outbound responses. Source/diff review confirmed admission counters remain bound to the inserted report and creation reservations cover both destinations. No test was removed. Only the Worker's reporting:test script ran; GitHub, the deployed Worker and Cloudflare were not contacted.

Check-running time for the second-review correction set: 186.69 s total (RED 45.34 s; migration-loader setup failure 0.97 s; fixture-collision run 51.41 s; final GREEN 88.97 s). This excludes test writing, source editing, debugging, diff review, offline npm lockfile update and commits. First verification caught a SQL line comment flattened by the test migration loader; the migration now uses a block comment. No Rust/cargo compile, remote writes, push, PR or deploy.

m1 Changed: requested and returned GitHub label names are compared in lowercase. Test app_report_labels_match_github_case_insensitively covers both a new issue and signed-marker reconciliation with USER-REPORT and Crash echoed by GitHub. RED routed the report to needs_review; GREEN records the receipt as done with one issue POST. The combined 122/122 result and check-running time above include this regression.

m2 Changed: root cojeev-ui owns workers/reporting/test and now declares mdast-util-from-markdown ^2.0.3 as a devDependency. npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund updated the lockfile; the only manifest/lockfile additions are this direct declaration, with no dependency version or graph changes. Test markdown_parser_is_a_direct_dev_dependency_of_the_test_package failed before the addition and passes with matching manifest/lockfile declarations. The combined 122/122 result and separate check-running time above include this regression. All three findings are fixed locally; branch remains unpushed.


## Third-review corrections (2026-10-08)

N2 Changed: intake-time and cron GitHub drains use one FIFO queue. Atomic creation reservations refuse a newer report while an older enabled, due job is pending or processing. Equal timestamps use outbox insertion order, so a smaller UUID cannot jump an earlier arrival. Capacity waits stay pending/queued, refund the claimed delivery attempt, and retain the report.

N2 Changed: the creation reservation and first POST timestamp are recorded in one D1 batch. Only recorded `outbox.first_attempt_at` authorizes reconciliation; an expired pre-POST lease or an uncertain flag without a POST timestamp skips the scan. The signed-marker/actor scan starts at first POST minus 60 seconds, independent of intake age. Durable POST history survives pacing-reservation cleanup. Existing bounded reconciliation of attempted/lost POSTs and case-insensitive label checks remain covered.

N2 Tests/Result: P2 serves the older due report before fresh intake when capacity returns. P1 delivers a six-hour-old never-posted report in a repository that would exhaust ten reconciliation pages, with zero GETs and one POST. P1 also covers a crash before POST: that case failed with needs_review before the final correction and now delivers once without scanning. A six-hour two-/24 flood admits 1,440 reports (20 per network per ten minutes, 120/hour each) against the default 200/hour budget; the oldest report eventually delivers once and never becomes failed. The fixture exercises fresh intake at every available creation slot and cron drains at every ten-minute boundary; redundant full-budget intake drains are covered by the separate queue-clock test. Pending/processing FIFO reservation tests include equal-time arrivals with reversed UUID ordering and held-job exclusion.

m3 Changed: the same 0006 reservation table now enforces both rolling-hour and rolling-minute ceilings atomically. Hour default/maximum remains 200. `GITHUB_ISSUE_MINUTE_LIMIT` accepts integers 1..60; default/maximum is 60 and invalid/unsafe values fall back to 60. A capacity wait uses the later applicable expiry when both budgets are full. The 200/hour regression now spreads its POSTs over four minute windows.

m3 Tests/Result: default/configured/unsafe minute limits, competing drains, minute expiry, 403 secondary limits and 429 responses are covered. Retry-After seconds, HTTP dates, x-ratelimit-reset, combined hints and the headerless secondary-limit fallback are tested. Throttles restore the delivery attempt count, clear delivery errors and stay queued; ten consecutive throttles do not hit the eight-failure cutoff. Claiming a job rechecks due_at so a stale drain snapshot cannot resend before the provider deadline. Five regressions failed before implementation; the focused GREEN passed 9/9.

m4 Changed: the shared-budget queued-delivery regression never writes due_at by hand. It advances the fake clock to any short FIFO-yield deadline, asserts the full-budget deadline equals the oldest reservation plus one hour, verifies no early POST, and delivers stored jobs at that exact deadline. Waiting jobs have no first POST timestamp, error or spent failure attempt.

m4 Notes — plant and result: temporarily replaced the capacity-wait retry expression with `throw new IssueCapacityWait(Number.MAX_SAFE_INTEGER)`. The updated test failed at “hour capacity wait retries at the oldest reservation expiry”: actual due_at was 9007199254740991, expected oldest reservation + 3600000. The plant was repeated after the final clock-fixture adjustment and failed the same assertion. It was restored before the final full run and was never staged or committed.

Notes — storage: no new table, column or migration. Reuse `github_issue_attempts` from 0006 and `outbox.first_attempt_at` from 0002. Migration 0006 still must accompany any future authorized rollout. Tests isolate unfinished GitHub queues and pacing reservations between fixtures; fake clocks can move backwards between tests, so future reservations from another fixture cannot contaminate a flood model. Reports and durable outbox history remain available within each test.

Final validation: `lockf -k /Volumes/CojeevBuild/lanes/compile.lock /usr/bin/time -p npm run reporting:test` passed **132/132**, zero failures, cancellations or skips. It includes the complete local Miniflare native POST -> waitUntil -> saved issue receipt -> same-UUID retry journey with intercepted outbound responses. All original test names are retained; ten regression tests were added and the existing queue-clock regression strengthened. N1/coarse-network/ASN limits, rejected-write counter invariants, m1 labels and m2 dependency declarations all pass. Review of the combined diff and local Workers runtime guidance found no remaining scope issue; all new asynchronous operations are awaited and request state stays local.

Only the Worker's own reporting:test package script ran. Focused invocations use NODE_OPTIONS test-name filtering with `|^triage` so the second test file participates. No root typecheck, other project test, dependency installation, packaging or deployment. GitHub HTTP is synthetic and the working Worker is local; no real GitHub, deployed Worker or Cloudflare contact, credentials printed, push, PR or remote write.

### Check-running time

Times below are instrumented command wall times inside the compile lock, including failed and aborted runs. Compile-lock queue waiting is excluded. These measure check processes separately from test writing, source editing, debugging, review, documentation and commits; activities may overlap with a running check. No packaging was performed.

| Check | Running time | Result |
|---|---|---|
| N2 initial RED | 153.75 s | completed; P1/P2/POST-window assertions failed |
| N2 early GREEN attempt | 435.16 s | aborted; queue-clock assertion and unselected triage fixture |
| m3 RED | 84.18 s | five regressions failed; unselected triage fixture stopped |
| N2 focused fixture correction | 3.52 s | 7/8; corrected test-adapter typo afterward |
| N2 six-hour flood | 224.17 s | 4/4 including 1,440 flood admissions |
| N2 corrected P1 | 1.38 s | 4/4 |
| m3 GREEN | 14.15 s | 9/9 |
| m4 first D7 plant | 1.27 s | expected expiry assertion failure |
| First full attempt | 636.77 s | aborted; future pacing reservations leaked between fake-clock fixtures |
| N2 expired pre-POST lease RED | 1.59 s | expected needs_review versus done failure |
| N2 expired lease/journey GREEN | 9.24 s | 12/12 |
| m4 final D7 plant | 3.30 s | expected expiry assertion failure |
| Final full Worker suite | 376.39 s | 132/132 |

Instrumented check-running total: **1944.87 s**. One abandoned runner-option probe was not instrumented; its log write span was approximately 24 s and is separate from this total. That probe showed that appending the Node filter after the package script's file glob did not select tests. The early aborted checks and fixture corrections are included above rather than hidden from the total. Final full-suite runner duration: 376.17 s; command wall time: 376.39 s.

## Fourth-review corrections (2026-10-08)

Scope: findings C, m7/PL6 plus PL10, m5 and m6 from `/Volumes/CojeevBuild/lanes/core/r2-recheck3-opus.md`, starting at `0387adb`. This UI worktree and its ancestors have no AGENTS.md; supplied owner/builder instructions apply. The report was read in full. The separate m8 intake-drain finding and queue-throughput product decision remain outside this assignment.

Changed — C: the undeployed `0006_github_issue_budget.sql` now backfills `first_attempt_at=created_at` only for GitHub issue jobs with a null timestamp and `attempts>0`. No 0007, table or column is added. Apply 0006 with any future authorized rollout. The pre-0006 Miniflare/D1 fixture starts with a website job in needs_review/uncertain, one recorded attempt, no POST timestamp, and an existing signed-marker issue #77. After migration and admin-style retry, it performs two reads, adopts #77 and performs zero POSTs. Unattempted GitHub jobs and other delivery kinds keep null timestamps; P1 still covers new jobs that never POSTed.

Changed — m7: HTTP 403 counts as a throttle only with Retry-After, x-ratelimit-remaining: 0, or the secondary-rate-limit message. Other 403s immediately enter needs_review/failed with a fixed permission/access reason, also exposed by authenticated admin detail. Positive fixtures cover each allowed marker independently. PL10 fills both budgets with distinct minute/hour release times, asserts the later hour deadline, and proves no delivery at the earlier minute release.

Changed — m5: a provider throttle stops the current drain and persists a shared GitHub pause in existing outbox `delivery_status='throttled'` plus `due_at`. Later drains, reconciliation calls, and atomic creation reservations respect that pause. Admin retry preserves its deadline and reason. The multi-job/new-intake fixture observes only one POST until Retry-After expires, no paused creation reservation or POST timestamp, then all four accepted reports deliver.

Changed — m6: existing `payload_json.githubThrottles` stores a separate consecutive throttle count without spending the eight delivery-failure attempts. Delays start at 60 seconds and double to a one-hour cap, with provider Retry-After/reset hints as a floor. On the eighth throttle the job becomes needs_review/throttled with a named maintainer-review reason. Reconciliation throttles count too. Successful delivery or a non-throttle failure clears the consecutive count; existing GitHub state payload fields remain intact. Admin detail exposes the waiting/review status and reason through its existing fields. The earlier ten-unbounded-throttles test now pins the requested eight-throttle bound while retaining the zero-failure-attempt invariant; all prior test names are retained.

Tests — before production changes, the focused RED ran 8 tests: 4 passed, 4 failed. C failed with one duplicate POST; permission-denied 403 stayed pending; the first throttled drain sent three POSTs; repeated throttles remained queued without a named throttle status. Log: `/Volumes/CojeevBuild/lanes/core/r2-fixes4-red.log`.

Tests — PL10's temporary Math.min defect failed the new exact hour-deadline assertion. PL6's temporary all-403-throttle defect failed the permission-review assertion. Both plants were restored before final validation and never staged or committed. Logs: `/Volumes/CojeevBuild/lanes/core/r2-fixes4-pl10.log` and `r2-fixes4-pl6.log`. Focused GREEN passed 11/11, including the five new regressions, existing provider-time/repeated-throttle/stale-snapshot checks and triage fixtures; log `r2-fixes4-green.log`. Two final assertions additionally pin that a paused reservation allocates neither capacity nor POST history; the final full run checks them.

Review — the combined source/migration/test diff was reviewed once after the fix set was built. The shared pause covers all GitHub job kinds, retains the provider floor through admin retry, and leaves delivery-failure accounting separate. Test fixtures clear prior synthetic throttle markers because their fake clocks move backwards between tests. No manifest/dependency change, packaging, root typecheck, remote read/write, push or deployment is part of this correction set. All HTTP evidence uses synthetic responses and local Miniflare; no agent memory is used.

Result — the full Worker suite ran once after all production/test edits: `lockf -k /Volumes/CojeevBuild/lanes/compile.lock /usr/bin/time -p npm run reporting:test`, exit 0, **137 tests, 137 passed, 0 failed, 0 cancelled, 0 skipped**. Runner duration **445.63 s**, command wall time **445.81 s**. The full run includes the local native POST -> waitUntil -> saved issue receipt -> same-UUID retry journey, P1, the six-hour two-network flood, all existing migration/website regressions and the five new tests. Log: `/Volumes/CojeevBuild/lanes/core/r2-fixes4-full.log`. Only documentation/commit work follows this tested source snapshot; `git diff --check` passes.

### Fourth-fix check-running time

| Check | Command wall time | Result |
|---|---|---|
| Initial RED | 3.40 s | 4/8 passed; all four requested findings reproduced |
| PL10 Math.min plant | 1.43 s | expected later-release assertion failure |
| Focused GREEN | 7.94 s | 11/11 passed |
| PL6 all-403-throttle plant | 1.43 s | expected permission-review assertion failure |
| Final full Worker suite | 445.81 s | 137/137 passed |

Total check-running time: **460.01 s**. Times are instrumented inside the compile lock, excluding queue waiting, test writing, implementation/debugging, review, documentation and commits. Two queued check commands were cancelled before lock acquisition and ran no check process. No packaging or installation was performed. The branch remains local; no GitHub, Cloudflare or deployed Worker contact, push, merge or deployment occurred.

## Fifth-review corrections (2026-10-08)

Scope: N1, N2, N3 and m8 from `/Volumes/CojeevBuild/lanes/core/r2-recheck4-astra.md`, read in full, starting at `198dd57ff7580a6d67be8b19bdd8ec998540364a` on local `task/core-r-2`. Supplied owner/builder rules apply; no repository/ancestor AGENTS.md was found. Verification uses synthetic reports, local D1/Miniflare and intercepted providers.

Changed — N1: Retry-After seconds/HTTP dates and reset timestamps are validated before formatting or persistence. All provider cooldowns are bounded to one hour. Excessive, non-finite, negative, empty or malformed hints produce needs_review/throttled with a named invalid/excessive-cooldown reason, refund the failure attempt and clear the lease. The shared pause and atomic POST reservation ignore legacy oversized deadlines, finished/held jobs and expired or purged reports. An admin retry atomically clears an oversized stored deadline/status/reason while preserving a legitimate bounded provider pause; the SQL evaluates the current deadline rather than trusting an earlier read. Reconciliation and unrelated payload fields survive recovery. The new invalid-hint review path is manually recoverable after its bounded cooldown.

Changed — N2: paused GitHub jobs are excluded before selecting the batch, so twenty or more paused jobs cannot hide an eligible email. If a GitHub response starts a pause mid-batch, the loop continues independent email delivery while subsequent GitHub jobs remain paused. The mixed-provider regression covers both the first throttled drain and later targeted/scheduled email drains behind 21 GitHub jobs.

Changed — N3: headerless abuse-detection and rate-limit-exceeded 403 messages again count as throttles, alongside modern secondary-limit wording and the existing header markers. Permission denial remains a named permanent failure, covered by the retained PL6 negative case.

Changed — m8: both app and website intake routes explicitly request a bounded drain through waitUntil. It selects at most one eligible job belonging to the submitted report and two other GitHub jobs, preserving FIFO creation reservations. Extra own emails and the remaining backlog wait for scheduled drains, which retain a twenty-job batch. Direct administrative drains keep their existing batch behavior. Tests exercise the actual router and captured waitUntil promises, then scheduled draining through completion. The app fixture delivers two older jobs, keeps the fresh report pending behind FIFO, then eventually delivers it once; the website fixture sends its reporter acknowledgment plus two backlog jobs and later sends the owner alert.

Tests — the initial synthetic RED ran against unchanged `198dd57` production source: 15 cases, 14 failed, with only the existing modern-secondary-limit control passing. Four additional negative/empty/fractional header cases and the website intake case ran against a local git-archive copy of `198dd57` with the new tests: all five failed. In total, 19 of the 20 added cases fail on the starting source; the modern-wording case is an explicit preservation control. All prior named tests are retained.

Before quotes from `r2-fixes5-red.log`:

```text
not ok 1 - fixes5_N1_provider_hint_0_is_bounded_and_visible
not ok 9 - fixes5_N1_admin_retry_clears_stale_shared_pause_and_reconciles
not ok 10 - fixes5_N1_retention_cleanup_cannot_leave_a_shared_pause
not ok 11 - fixes5_N2_github_pause_delivers_email_in_current_and_backlogged_drains
not ok 12 - fixes5_N3_throttle_wording_0_remains_retryable
not ok 15 - fixes5_m8_intake_waitUntil_bounds_work_and_scheduled_drain_owns_backlog
```

The app intake failure was “intake claims at most its own job plus two others; got 20”; the separate website failure was “20 !== 3.” Email delivery after the first throttle was 0 rather than 1, the abuse-detection 403 entered needs_review rather than pending, and admin recovery remained pending rather than done. Large numeric hints also reproduced the original invalid-Date throw.

Focused verification: the first GREEN passed 22/23; its one failure identified an older test's split clocks. A direct drain used simulated future time but the admin route ran in Miniflare's separate real-time isolate, correctly making that simulated deadline look excessive. The retained test now runs that route on the same fake clock with background providers disabled, preserving its assertion that an ordinary 120-second pause survives admin retry. The next focused run passed 21/21, including the new cases, ordinary-pause preservation and the stale-snapshot regression. The final suite additionally checks manual recovery from the new review condition and the website journey.

Review/Notes: the combined source and regression diff was reviewed locally, including SQL bindings, pause selection, the atomic retry update, FIFO protection, provider independence and request limits. No table, column, migration, dependency or package script changed. All provider calls in the new journeys are intercepted and their pending work is awaited before restoring fetch. No real report/home-data fixture or agent memory was used; no GitHub, Cloudflare or deployed Worker contact, push or deployment occurred. No packaging was performed.

After quotes from the final full-suite log:

```text
✔ fixes5_N1_provider_hint_0_is_bounded_and_visible (568.0875ms)
✔ fixes5_N1_admin_retry_clears_stale_shared_pause_and_reconciles (324.099ms)
✔ fixes5_N1_retention_cleanup_cannot_leave_a_shared_pause (474.888041ms)
✔ fixes5_N2_github_pause_delivers_email_in_current_and_backlogged_drains (1536.635542ms)
✔ fixes5_N3_throttle_wording_0_remains_retryable (248.579667ms)
✔ fixes5_m8_intake_waitUntil_bounds_work_and_scheduled_drain_owns_backlog (3095.751542ms)
✔ fixes5_m8_website_waitUntil_reserves_own_email_and_two_backlog_jobs (3367.52025ms)
```

Result: the full Worker suite ran **once** after the final production/test edits: `lockf -k /Volumes/CojeevBuild/lanes/compile.lock /usr/bin/time -p npm run reporting:test`, exit 0, **157 tests, 157 passed, 0 failed, 0 cancelled, 0 skipped**. Runner duration **315.254 s**, command wall time **315.72 s**. This includes the complete local Miniflare intake -> waitUntil -> issue receipt -> idempotent retry journey, the six-hour/1,440-intake flood, all retained website/migration/pacing regressions and the twenty new cases. The final source snapshot also verifies that a legitimate provider pause survives admin retry, that a poisoned pause is cleared and reconciled without another POST, and that email and both bounded intake routes complete through later drains. Only documentation and commit work follow this run.

### Fifth-fix check-running time

| Check | Command wall time | Result |
|---|---:|---|
| Initial RED on 198dd57 source | 6.54 s | 1/15 passed; 14 expected regressions failed |
| Four additional hint RED cases on archived 198dd57 | 3.47 s | 0/4; four expected failures |
| First focused GREEN | 16.15 s | 22/23; split-clock fixture corrected afterward |
| Corrected focused GREEN | 16.74 s | 21/21 passed |
| Website intake RED on archived 198dd57 | 5.18 s | expected 20-versus-3 failure |
| Final full Worker suite | 315.72 s | 157/157 passed |
| **Total check-running time** | **363.80 s** | Includes the failed checks above |

Logs are `/Volumes/CojeevBuild/lanes/core/r2-fixes5-{red,extra-red,green,green2,website-red,full}.log`. Command wall times were measured inside the compile lock. Lock queue waiting, test writing, source editing/debugging, local diff review, documentation and commits are excluded; no packaging was performed. No root test/typecheck or browser/deployment runner was used. The existing Node module-type warning in the triage fixture remains advisory; its test passed. The branch remains local.
