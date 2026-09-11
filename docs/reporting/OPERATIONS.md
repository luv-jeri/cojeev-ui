# Reporting production and beta operations

This runbook describes the runtime contract; it does not claim deployment, sender verification, issue creation, or inbox delivery has occurred. Do not purchase upgrades. Existing direct component downloads are independent of reporting. No shadcn submission is part of this work.

## Environment contract

| Variable | Production | Beta |
| --- | --- | --- |
| `ENVIRONMENT` | `production` | `beta` |
| `SITE_URL` | `https://000h.cojeev.com` | `https://beta.000h.cojeev.com` |
| Worker origin | `https://feedback.cojeev.com` | `https://feedback-beta.cojeev.com` |
| `ALLOWED_ORIGINS` | `https://000h.cojeev.com,https://feedback.cojeev.com` | `https://beta.000h.cojeev.com,https://feedback-beta.cojeev.com` |
| `EMAIL_DAILY_LIMIT` | at most `100` | at most `5` |
| `EMAIL_MONTHLY_LIMIT` | at most `3000` | at most `3000`; reduce to allocate shared allowance |
| `BETA_TESTER_EMAILS` | unused | defaults to `unread.fyi@gmail.com` |

`RELEASE` is a non-secret release identifier shown in public health. Use separate D1/R2 resources, Turnstile configuration, Worker secrets, and provider webhooks for each environment. `LOCAL_MODE=true` is for loopback development only. Keep the existing server-enforced `ADMIN_TOKEN`, `IP_HASH_SECRET`, `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY`, GitHub repository/token/webhook configuration, and origin restrictions.

Email needs `EMAIL_ENABLED=true`, a verified address in `EMAIL_FROM`, and the `RESEND_API_KEY` Worker secret. It uses fetch to `POST https://api.resend.com/emails`; remove obsolete `send_email` configuration separately. Sender display name is fixed at `000h by Cojeev`, and `reply_to` is fixed at `hello@cojeev.com`. Never place secrets in frontend variables, Git, logs or URLs. Configure `RESEND_WEBHOOK_SECRET` before enabling sends. Do not use a paid-plan upgrade to resolve limits.

## Migration and activation

1. Back up the existing database using the existing approved deployment workflow. Apply `0001_reporting.sql` only to a new database; apply additive `0002_safe_delivery.sql` to both environments before deploying this runtime. Do not replay migration 0002 after it is recorded as applied.
2. The migration retains reports, receipts, attachments, topics and completed jobs. Legacy pending jobs become `held`; legacy processing jobs become `needs_review`. Existing topic titles remain private, with `public_title=NULL`. No existing title is automatically approved for public display.
3. Leave `EMAIL_ENABLED=false` while configuring providers. `DELIVERY_ACTIVATED_AT` is an explicit ISO UTC timestamp at or before current time. Missing, invalid or future values hold pending work. Set the cutoff at the intended activation time, not an arbitrary historical date. Even newly queued completion jobs for reports older than the cutoff require individual review.
4. Connecting a token never releases held jobs. New reports at/after the cutoff can drain once their provider is enabled. Held work remains held even after activation changes.
5. Review historical reports privately. Use authenticated `POST /v1/admin/deliveries/{encoded-job-id}/retry` for an individually reviewed job. This records `reviewed_at`, retains attempt/payload identity and releases that job only while activation is valid. It does not batch-release the backlog, bypass quotas/allowlists, or reset send identity.

For an uncertain email, first inspect the provider using the private job's provider ID or stable key `cojeev/{delivery-job-id}`. Within 24 hours, an explicit retry can reuse the identical payload/key. At or after 24 hours from the first attempt, both automatic delivery and the admin retry endpoint refuse another send. A changed sender/template/site/recipient payload and provider 409 also require review. Do not clear `payload_json`, `first_attempt_at` or the provider ID to force a resend. Confirmed corrections outside this window require a separately reviewed data operation or a new report; there is intentionally no automatic reset endpoint. Legacy processing jobs have no provable Resend identity and must be reconciled manually before retry.

The adapter conservatively counts every network attempt, including 429, failed and uncertain attempts. Quota reservations use one atomic database statement, so concurrent drains share the same daily/monthly ceiling. Periods reset on UTC boundaries. Invalid limit strings disable sending; configured limits can only lower hard ceilings. A provider 429 keeps the job pending with `delivery_status=quota` and a one-hour backoff, irrespective of prior attempt count. Once an attempted job exceeds its 24-hour identity window it instead requires review. Budget both deployments and other applications sharing the Resend account; these local counters cannot see those applications. Provider quota responses are authoritative, and no automatic upgrade occurs.

## Signed delivery events

Create one Resend webhook per environment at `/v1/resend/webhook`. Subscribe to `email.sent`, `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, and `email.suppressed`. Put that endpoint's `whsec_...` signing secret in `RESEND_WEBHOOK_SECRET`. Disable open/click tracking unless separately requested.

The receiver verifies HMAC-SHA256 over the exact `svix-id.svix-timestamp.body` string, supports multiple `v1` signatures, and rejects timestamps more than five minutes in either direction. It persists only event ID, provider email ID, normalized status, and timestamps; recipient and webhook payload are not logged or retained. Duplicate event IDs are ignored and acknowledgments are generic. Events arriving before the send API response are reconciled when the provider ID is saved. Failure/bounce takes precedence over delivery, and delivery takes precedence over acceptance, including concurrent/out-of-order arrivals.

The private receipt adds `emailDelivery` (`queued`, `held`, `sending`, `uncertain`, `quota`, `accepted`, `delivered`, `failed`, or `bounced`). The older `email` field remains compatible, but reports `sent` only after delivery confirmation. Admin report details expose state, normalized delivery status, attempt count, safe error reason, provider ID and review timestamps. `done` means the delivery job has finished its provider handoff, not guaranteed inbox delivery. An `email.sent` webhook means provider acceptance, not delivery. Real inbox receipt is a separate launch check.

## Public titles and release lifecycle

New GitHub issues use generic kind/reference titles. Public request topics use a generic reference until an authenticated maintainer sends `PATCH /v1/admin/reports/{id}` with `{"publicTitle":"A deliberately reviewed safe title"}`. This is a deliberate publication action; review the title for sensitive information, not only recognized secret/email patterns. Private originals stay accessible only to maintainers and expire with private report data. Search uses only the safe public title.

Previously published GitHub titles are external historical data: this migration does not edit or erase them. Review and sanitize any sensitive legacy titles separately with explicit GitHub authority. The runtime continues signed-marker/token-actor reconciliation to prevent duplicate issue creation. Issue closure alone cannot send a release email: the existing signed webhook requires `completed` plus `feedback:released`, and requests require a live URL under the configured site's `/docs/` path. Maintainer status `resolved` is an explicit release action. Keep that existing lifecycle; do not infer a release from provider email status.

After 180 days, cleanup replaces both the original topic title and its normalized plaintext deduplication key. Each retired key contains only `retired:` and the topic UUID, preserving the unique index without retaining private prose. Subsequent requests using the same free-text title create a new topic; explicit subscriptions by existing topic ID still work. Approved public titles, topic identity, status and demand remain intact.

## Health and launch checks

`GET /health` returns only `status`, `environment`, and `release`. It does not disclose credentials, counts or report data and is not a provider-readiness proof. `GET /v1/admin/health` requires the existing bearer maintainer authorization and returns queue counts by job/delivery state, oldest ages, configured provider booleans, current UTC usage, hard-bounded limits, and activation cutoff. It never includes addresses, payloads, tokens or original report text.

Before public activation, verify new receipt persistence, private attachment authorization, origin/Turnstile protection, a safe GitHub issue, a received email, and an explicitly released completion email. Inspect the signed delivered events and the actual inbox separately. Keep old jobs held during these checks. Failed/uncertain jobs need provider review; quota jobs need budget/reset; disabled provider booleans need configuration. Technical media expires after 30 days; contact/private titles/text and persisted email payloads expire after 180 days. Approved public titles, distinct-demand identities and delivery/event metadata remain for audit and duplicate protection.

Primary references checked during implementation: [Resend API](https://resend.com/docs/api-reference/emails/send-email), [24-hour idempotency keys and conflicts](https://resend.com/docs/dashboard/emails/idempotency-keys), [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [Svix manual signature specification](https://docs.svix.com/receiving/verifying-payloads/how-manual), [Resend event types](https://resend.com/docs/webhooks/event-types), [D1 atomic transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/).
