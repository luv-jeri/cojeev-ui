# Report notifications implementation plan

> For agentic workers: execute this bounded plan with executing-plans. Owner approved reporting repair on 14 September 2026.

**Goal:** Give the reporter and maintainer independent reliable notifications and expose reporting readiness honestly.

**Architecture:** Extend the existing receipt-first durable outbox, not direct sends from the request handler. Keep new-report activation separate from reviewed historical holds, per-environment quotas, recipient restrictions and idempotent delivery identities. No new queue or database migration unless the current schema demonstrably requires one.

**Tech stack:** Existing Cloudflare Worker, D1, Resend adapter and GitHub integration.

## Constraints

- Checkpoint C10-1, branch fix/c10-1-report-notifications. No screenshot/UI changes, provider writes, deployments, historical retries or secret access in the executor.
- Source/live diagnosis: email disabled; activation cutoff null; six jobs held; GitHub credential present; Resend API key present; webhook secret absent. These are setup gaps, not proof that provider credentials are valid.
- Owner inbox is unread.fyi@gmail.com. Owner email contains a minimal kind/reference and authenticated inbox link, not private text, reporter address, screenshots or diagnostics.
- Keep beta allowlisting, hard free-tier quota bounds, signed webhooks, retry identity, payload consistency, ambiguous-send review and private-report retention.

## Task 1: Durable owner alert and explicit readiness

Files: workers/reporting/src/{types,reports,delivery,index}.ts; workers/reporting/wrangler.jsonc; scripts/operations-health.mjs; affected reporting/operations tests; docs/reporting/OPERATIONS.md and master checklist.

- [ ] Write focused regressions first for one owner job per newly saved report, duplicate submission does not add jobs, delivery goes only to configured owner, owner failure does not discard reporter/GitHub jobs, and no secret/private text appears in its payload.
- [ ] Add optional REPORT_NOTIFICATION_EMAIL environment setting and `email_owner_received` outbox kind. Enqueue only for a valid configured owner address; never backfill historical reports. In delivery, choose the explicit owner recipient for this kind, use a minimal template and existing sendResend persistence/quota/idempotency path. Apply beta recipient constraints to this recipient too. Keep all old job kinds compatible.
- [ ] Add reporting-readiness values to authenticated health (activation and required provider/owner configuration), without exposing email addresses or secrets. Add an explicit deployment intent flag, default off, so intentionally staged environments remain distinguishable from a service expected to be active; an expected-active service with missing activation/email/GitHub/webhook/owner notification must be flagged. Do not blanket-classify all held historical jobs as failures.
- [ ] Keep EMAIL_ENABLED=false and activation blank in this implementation until provider setup is verified by the coordinator. Document a source-controlled activation checkpoint, preserving the fixed cutoff across future releases. No automatic Date.now cutoff on every deployment.
- [ ] Run affected Worker delivery/receipt and operations-health checks once after implementation. Record runtime separately from authoring/debugging. Independent review required for durable delivery and privacy changes; no full catalogue.
- [ ] Add C10-1 under C10 with evidence/limitations and commit exact paths with Checkpoint: C10-1. Do not claim live emails/GitHub issues or webhook provisioning. No push/merge/deployment until primary review.

## Task 2: Provider activation and live acceptance (coordinator)

- [ ] Verify existing Resend domain/sending credentials; configure signed Resend webhooks and protected secrets for beta and production without replacing existing bundles. No paid upgrades.
- [ ] Verify GitHub webhook endpoint/repository mapping. Preserve existing token scope and records.
- [ ] Publish explicit activation intent and a fixed current cutoff through the normal release process. Keep historical jobs held and keep the protected production approval gate.
- [ ] Submit one labelled beta report through the real form, verify receipt/attachment and correct private repository, reporter email and owner alert. Confirm provider delivered event separately from inbox receipt. Repeat one labelled production journey after approval; no bulk historical retry.
