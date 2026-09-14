# 000h production, beta and CI/CD rollout

Approved by Sanjay on 2026-09-12. Execution record, not a claim of deployment.

## Global constraints

- Production: https://000h.cojeev.com and https://feedback.cojeev.com. Beta: https://beta.000h.cojeev.com and https://feedback-beta.cojeev.com.
- Preserve existing production D1/R2 identifiers and all data. Beta gets separate Workers, D1, private R2, Turnstile and secrets. Never copy production reports into beta.
- Beta is public by link and noindex. Main deploys beta automatically; production requires owner approval. Same source commit, separately built URL-specific artifacts, hashes verified before promotion.
- Reports have BOTH authenticated private inbox and public GitHub issues. Full descriptions, emails, attachments and diagnostics stay private. Public content is a safe title, generated summary, status and private report reference; explain visibility before submission.
- Production issues: luv-jeri/cojeev-ui. Beta: private luv-jeri/cojeev-ui-beta-feedback.
- Free-tier-first only; no paid upgrade. Resend sending, PostHog EU, existing Cloudflare static export architecture. No framework migration.
- hello@cojeev.com receives replies/hiring enquiries and forwards to unread.fyi@gmail.com. Never expose credentials in source, logs, browser variables or public artifacts.
- Hold historical delivery backlog for review before provider activation. Receipt-first persistence; retryable queues; explicit released lifecycle.
- No shadcn directory submission or namespace registration. Existing direct component downloads stay functional.
- Use tests before implementation. Do not treat mocked providers as live acceptance. Account login, email verification and security prompts require owner assistance. Report limitations honestly.

## Task 1: Safe reporting and Resend integration

Scope: workers/reporting/src, migrations, tests and reporting-specific operations documentation. Do not alter deployment configs or frontend in this task.

1. Keep receipt-first reports and authenticated private access. Public issue titles must never expose free-text sensitive descriptions. Existing request titles require deliberate safe handling. Preserve duplicate-safe GitHub mirroring, signed issue webhooks, and explicit released completion behavior.
2. Replace outgoing Cloudflare Email binding with a small fetch-based Resend adapter (POST https://api.resend.com/emails). Keep templates/queue, sender name `000h by Cojeev`, reply_to `hello@cojeev.com`, secret RESEND_API_KEY. Retain truthful disabled behavior until configured.
3. Stable idempotency key from delivery-job identity. Persist attempt/payload identity so retries cannot change a key's payload. Resend window is 24 hours: uncertain sends outside the window must stay in needs_review, never automatically resend. Different-payload conflicts require review.
4. Verify Resend/Svix webhook signatures, timestamps, duplicate protection. Distinguish queued, provider-accepted, delivered, failed/bounced. Return generic public responses; no email/payload logs. Add additive schema migrations and tests. Explicitly document webhook event configuration.
5. Enforce beta tester allowlist (initially unread.fyi@gmail.com) and small daily limit (5). Enforce conservative production daily/monthly ceilings (100/3000, configurable downwards), retain jobs on quota exhaustion, including provider 429. No upgrade. Counts must tolerate concurrent drains and UTC periods. Provider account allowance may be shared; handle provider quota responses safely.
6. Historical jobs are held using an explicit activation/cutoff policy before connecting tokens. Make activation opt-in; tests prove enabling a provider cannot silently drain historical jobs. Document administrator review/retry semantics.
7. Add minimal public GET /health with environment/release (no secrets/data counts), and authenticated GET /v1/admin/health with queue age, held/failed/quota/provider configuration diagnostics. Maintainer auth remains server enforced. Do not weaken existing origin, Turnstile, media or webhook protections.
8. TDD with existing Miniflare reporting harness. Run complete reporting suite once. Document RED/GREEN evidence and migrations/config/secret interface needed by subsequent tasks.

## Task 2: Hosting isolation and reproducible delivery pipeline

Scope: .github/workflows, workers/*/wrangler.jsonc, workers/registry-host, scripts/release*, scripts/operations*, release tests and docs/production. Respect Task 1 runtime interface.

1. Declare production/beta explicitly while preserving production identifiers. Beta resources resolved during provisioning, never fake UUIDs accepted for deploy. Website custom domains use exact hostnames; 404 responses genuine. Keep static Next.js export, empty base path for custom domains, GitHub Pages compatibility only as manual/non-independent path.
2. Tested response headers: noindex beta/admin, nosniff, referrer, appropriate CSP/security without breaking app/Turnstile/PostHog, immutable hashed assets and revalidated HTML. Public release.json/health identify environment+commit; private media never website-served.
3. A build/release tool validates clean source commit, exact environment URLs, no localhost or opposite-environment dependencies in deployed artifacts (exclude intentional literal localhost documentation/code examples from blanket false positives, test executable/config/registry references). Build beta+production from same SHA; generate manifest + deterministic file hashes. Build artifacts exclude all private reports/backups/secrets.
4. CI: PR checks lint/type/unit/reporting/hosting/example/browser/motion/install; pinned Node 22.22.0, lockfile npm ci, pin action SHAs. Fork PRs never get deploy secrets. Main deploys beta and checks live endpoints. Protected `production` job consumes that run's already-built production artifact after owner approval; it must not rebuild a newer revision. Per-environment serialized deployments. Remove existing independent Pages publish path.
5. CI instructions/configure script for main protection (PR+checks, no force), GitHub beta/production environments and luv-jeri reviewer with self-approval permitted. Protected secrets. Do not assume remote configuration succeeded without checking.
6. Scheduled HTTP health and authenticated delivery-health checks create/update a sanitized GitHub alert issue on failure/stalled jobs/quota, resolve on recovery; notifications independent of Resend. Do not leak response private contents.
7. D1 backup before migrations to private R2 recovery storage with bounded retention, restore into isolated scratch D1 to test. No production overwrite. Code rollback workflow for website+API prior versions; explicit compatible migration boundary and warnings that code rollback does not restore data. Fail closed on unknown targets/unverified artifacts.
8. Add local tests for manifest integrity, environment mixups, gating/headers/404, health and operations guardrails. Provide exact runbook for manual owner prerequisites and rollback. Remote deployment tests belong Task 4.

## Task 3: Public environment, reporting visibility, analytics and contact wiring

Scope: app, components, lib/analytics, lib/site-config, related tests and env example.

1. Restrained beta badge, beta crawler exclusions and correct canonical URLs. Exclude maintainer UI from analytics/indexing in all environments. No visual redesign beyond these approved launch additions.
2. Clear pre-submit report visibility: private maintainer details; sanitized public GitHub issue. Beta notification behavior explicitly labelled (tester-only). Wire provider state fields from Task 1 where helpful without claiming accepted means delivered.
3. PostHog EU explicit events only, environment and source-release identifiers. No replay/autocapture/forms/private report tracking. Respect opt-out/GPC/DNT; analytics disabled means disabled in production too. Separate real visits, copies, download requests and verified installs. Production dashboards filter production. Actual project token and live dashboard verification in Task 4.
4. Add verified hello@cojeev.com to Work with me while retaining GitHub, gated until forwarding/sender setup truly verified (or explicit public-contact enabled build config). No placeholder claim of verified email.
5. Read relevant installed Next docs and Cojeev craft skill before UI edits. Test config/privacy/visibility behavior; use existing brand components. Do not regress current library features.

## Task 4: Provision services, deploy beta, acceptance, then production

Controller-led external operations; only commit-reviewed source and verified artifacts may deploy.

1. Authenticate existing GitHub/Cloudflare and owner-assisted Resend/PostHog. Create dedicated repository-scoped issue token, CI least-privilege token, server secrets securely. Create private beta feedback repo, beta Workers/D1/private R2/Turnstile, exact custom domains and certificates. Do not change or copy production data.
2. Resend domain verification preserving DNS/mail, Cloudflare hello forwarding to verified unread.fyi@gmail.com; configure provider/bounce webhooks, restricted beta mail. No paid plans. Create PostHog EU project with privacy settings; environment-specific config. Secure rotation/access runbook.
3. Commit reviewed verified current library source and rollout work, PR required checks, protect main and environments, wire CI secrets, deploy beta from recorded SHA. Verify HTTPS/assets/deep links/search/previews/downloads/canonical/404 and clean consumer installations without cross-origin contamination.
4. Real browser beta receipt/Turnstile/attachment/private inbox/private GitHub/email tests; unauthorized media/report, invalid webhook, replay, interrupted upload and provider failure tests. Verify analytics dashboard and privacy stops. Native-select keyboard and Bento/choice/accordion/sidebar/quiet-motion visual checks.
5. Test failed deployment/blocked promotion, private backup/isolated restoration and code rollback without touching production data. Confirm health failure triggers GitHub notification.
6. Owner production approval; deploy same SHA prepared production artifact. One labelled production smoke report exercises receipt, private/public visibility, acknowledgement, issue lifecycle and released email. Confirm actual recipient inbox receipt, not just provider acceptance.
7. Record both environment release hashes/URLs/evidence and remaining limitations. Completion requires live journeys, CI and recovery exercised; source implementation alone is insufficient.
