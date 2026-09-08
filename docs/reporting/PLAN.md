# Reporting implementation

User contract: a morphing launcher opens a SahaJiv side panel for component requests and bug reports. Required email; links, images and videos; multiple pins and screenshot crop; useful reviewable diagnostics; public demand and age; existing component suggestions; durable receipt; automatic GitHub and email lifecycle. Email is intentionally unconfigured until the owner supplies a domain.

## Architecture decision

Keep the current static Next export. A separate Cloudflare Worker owns D1 records, private R2 attachments and a D1 transactional outbox, drained immediately and by cron. This is smaller than introducing Queues and a second consumer, and safer than writing directly to GitHub before storing a report. D1 batch writes atomically create reports, upload slots and delivery jobs. Retries use a stable client UUID and body hash. Media uploads retry against the original receipt.

The latest user contract supersedes the reference brief's optional email and manual issue creation. Public request titles and demand are visible; contact details, descriptions, reference links, media and diagnostics remain private. A public GitHub issue points maintainers to the authenticated report viewer. The public title is explicitly labelled before submission. Receipt tokens and admin secrets never enter public links.

Delivery target: “We aim to build requested components within 36 hours. Timing depends on demand and complexity.” No countdown masquerades as a guarantee. An existing request can be joined with an email and optional additional context; a shipped request links to its component. Every contribution is stored and counted by distinct email.

## Implementation sequence

- [x] Shared bounded contracts, redaction, matching and validation with failing behavior tests.
- [x] Worker: D1 migration, receipt intake, token-authorized R2 uploads, public board, admin status/read APIs and outbox.
- [x] Delivery: Cloudflare Email Service templates, GitHub issue reconciliation, optional Project association and signed lifecycle webhooks.
- [x] Browser: warm bounded console/error/network/click buffers; opt-in capture, crop, pins and previews; draft persistence and retry.
- [x] UI: existing SahaJiv primitives, keyboard accessible responsive side panel, request board, private maintainer screen.
- [x] Verification: real local workerd D1/R2 integration, external-provider fault tests, typecheck/lint/build, browser pointer/keyboard flows and light/dark/mobile screenshots.
- [x] Operations: local start, Cloudflare provisioning/deploy scripts, environment setup and honest email placeholder.

Remote activation and evidence are tracked in [VERIFICATION.md](VERIFICATION.md). GitHub token selection, verified email sender, and website publication remain pending; implementation checkmarks do not imply those external integrations were exercised live.

## Boundaries and checks

- Preserve the extensive existing uncommitted library changes; no commits, resets or generated-registry rewrites for this feature.
- No automatic screen capture, form-value capture, request bodies/headers, cookies or storage capture. Redact known secrets; diagnostics are inspectable and removable. Screenshot privacy is best effort and the preview is authoritative.
- Multiple image/video files: six slots, 10 MiB per file, 30 MiB total, magic bytes and SHA-256 checked server-side. SVG/HTML are rejected. Private downloads require authorization.
- Turnstile validated server-side and rate limits bound to a hashed IP in production; local development only may bypass Turnstile. Production must fail closed when protection is missing.
- Outbox failures never delete accepted reports. Uncertain email delivery requires maintainer reconciliation, because the email API has no documented idempotency key. No exactly-once claim.
- Admin auth is server checked. Status changes and completion notification jobs are atomic. “Live” requests require a component URL on the configured library site. Closing a GitHub issue alone is not release proof.
- Keep technical details and media for 30 days; delete report contact/private details after 180 days. Public request summaries may remain. Implement cleanup, not just policy copy.
- Cloudflare login/domain and GitHub credentials are external setup steps; report precisely what is locally proved versus remotely activated.

## References inspected

- `gamenightowl/src/components/BugWidget.astro`, sibling `packages/bug-capture/src/{screenshot,region}.ts`, and `worker/src/intake.ts`.
- SahaJiv `docs/product/DESIGN-PROMPT-13-REPORT-PANEL.md` and reporting intake reconnaissance under `docs/research/2026-09-03-v1-update-report/inputs/`.
- Local Next 16.3.4 static-export and client-component guides.
- Cloudflare [D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Email Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
