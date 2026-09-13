# E02-2 — the reporting data flow on the privacy page

13 September 2026 · base `b80e070` · branch `chore/e02-2-reporting-privacy`.
Child checkpoint [E02-2](../superpowers/plans/2026-09-12-launch-master-checklist.md): prepare page
copy for what the reporting code already does; nothing here is deployed. Copy only — no tracking, policy enforcement, lawful
basis, retention decision or provider activation is introduced.

## 1. Source prepared

Five sections in `app/privacy/page.tsx`, between `What stays out` and `Installed components`, in the existing `GuideShell` heading and body typography. No layout, token, motion, homepage or operator fact changed. The `siteFlags.contactEnabled` branch is untouched; the stale "reporting features can use their own local settings" half-sentence was dropped because these sections replace it.

| Section | Verified against |
| --- | --- |
| When you send a report | Draft content stays local until submit, but the panel does contact the network first: `/v1/config` on open and on retry (`components/reporting/reporting-widget.tsx:247-267`) and the Turnstile script at the review step (`components/reporting/turnstile.tsx:7-13`) — the page says so rather than claiming nothing leaves. Required subject/description/email, optional pins, attachments, references, diagnostics — `lib/reporting/contracts.ts:21-60`. Review step with inspectable payload and file previews — `components/reporting/reporting-widget.tsx:943-982`. Media untreated beyond a type check — `lib/reporting/capture.ts:17-22`, `contracts.ts:36-41`. |
| Drafts stay on this device | IndexedDB workspace holding text, email, `File` objects, diagnostics and the receipt token — `lib/reporting/draft.ts:4-9,33-51`. `Clear draft` resets the active kind only — `reporting-widget.tsx:495-514`. Site-data clearing is the only full removal; no TTL exists. |
| Browser details are yours to add | Explicit inclusion after E08-1 — `reporting-widget.tsx:160-187,878-891`. Bounded in-memory buffer over console, failed requests and structural clicks, excluding field values, bodies, headers, cookies and storage — `lib/reporting/diagnostics.ts:19-74`. Best-effort masking — `contracts.ts:66-74`. |
| Where a report goes | Private Cloudflare storage of title, description, email, diagnostics and media — `workers/reporting/src/reports.ts:52-74`. Receipt-first: `createReport` writes the report, queues `github` and `email_received` outbox rows and returns the receipt — no issue is created at submit time (`reports.ts:56,63`). `drain()` holds every job until `DELIVERY_ACTIVATED_AT` is set and skips kinds whose provider is unconfigured (`delivery.ts:77-86`, `types.ts:26-28`), which the receipt reports as `pending`/`setup_required` (`reports.ts:21-22`). Mirrored issue is thin: generic title, report reference, maintainer link, no report content — `delivery.ts:48-50`. Private beta repository `…-beta-feedback` versus the public production repository — `wrangler.jsonc:40,82`, `docs/production/OPERATIONS.md:83-85`. Approved `public_title` gate — `lifecycle.ts:62`. Scheduled erasure at 30/180 days — `lifecycle.ts:39-53`. Copies that outlive it: the public issue (no deletion path exists), weekday-slotted full-database backups taken on every deployment — `scripts/release.mjs:79`, `scripts/operations.mjs:96,114-131` — and provider-side records. |
| Verification, receipt and email | Turnstile script in-page — `components/reporting/turnstile.tsx:10`. `remoteip` plus the report UUID as `idempotency_key` — `workers/reporting/src/security.ts:46`. Receipt file carries the live token — `reporting-widget.tsx:1138-1151` — but that token only reaches `GET /v1/reports/:id`, which returns status and attachment states and no report content (`index.ts:24`, `reports.ts:15-24`), and `upload()`, which accepts only a pre-declared slot with matching type, size and SHA-256 inside the 30-day window (`reports.ts:66-75`); report details and media are behind `requireAdmin` (`index.ts:25-26,42-44`). Email described as a queued conditional job through Resend, with no claim about current activation: `emailEnabled` is a runtime environment check (`types.ts:26`) that the panel reads live from `/v1/config` (`workers/reporting/src/index.ts:16`, `reporting-widget.tsx:552-557`), so a static page cannot state it. |

Retention is stated as configured behaviour, matching the widget's existing review-step wording, and is explicitly not offered as a promise that every copy is gone. Three survivals are named on the page and were each checked in code: the public GitHub issue (no code path deletes it); the private database backup, a full `d1 export` written to a private recovery bucket before every deployment under `<environment>/day-<0-6>.sql`, so seven rotating slots, with the release code asserting at backup time that the bucket is private and carries a deletion rule of at most seven days (`operations.mjs:97-100,114-131`); and provider-side operational records — both Workers run observability logs at 10% head sampling and traces at 1% with `invocation_logs: false` (`workers/reporting/wrangler.jsonc:9-20`), and the reporting Worker logs only the fixed string `reporting_request_failed` (`workers/reporting/src/index.ts:67`), never report contents. Attached media bytes live in a separate bucket and are not inside the database export. Nothing asserts what Cloudflare, GitHub or the email provider actually retain. No deletion guarantee, provider retention figure, mailbox receipt, age rule, lawful basis, jurisdiction or registration claim was added, and no external URL was introduced.

## 2. Corrections to the E01 inventory

`docs/privacy/2026-09-13-processing-inventory.md` was re-checked, not repeated.

1. **Gap 1 is fixed.** `selectDraft` no longer snapshots diagnostics when a bug draft is
   created; it uses `emptyDraft()` with `diagnostics: null` (`reporting-widget.tsx:168-171`).
   E08-1 (`2905ff1`) landed after the inventory, so the page says nothing is attached until
   the visitor includes it.
2. **Gap 3 is partly disclosed in the widget**, which now reports "This draft was cleared.
   Your other draft is unchanged." (`reporting-widget.tsx:509`). The behaviour — active kind
   only, no TTL — is unchanged, so the page still explains it.

Gaps 2, 7, 8 and 10 are still present and are now described on the page. Gaps 4, 5, 6, 12, 13 and 14 are server- or configuration-side, outside this copy change.

## 3. Checks run

Node v25.3.0; shared lock-installed dependencies symlinked read-only, no install performed.

```sh
node node_modules/eslint/bin/eslint.js app/privacy/page.tsx --max-warnings=0   # clean
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json                 # 0 errors
```

The first `tsc` run reported `TS2307` for `brand-sculpture.tsx` because the generated `next-env.d.ts` is absent from a fresh worktree; copying that generated file in produced the clean run. Not a repository defect, and no source was changed for it.

Not run: the component catalogue, the Next build, `check-landing-guides.mjs` and every Worker-backed reporting journey. The heading `A little clarity.` asserted by `scripts/check-landing-guides.mjs:25` is unchanged. No live account, production report or browser session was touched.

## 4. Still open

E02 remains open: purposes, lawful bases, the rights and erasure-request process, transfer statements and any children/age statement are unpublished. A05 cannot be settled until A01 records the postal address, registration status, countries served and intended age audience. Inventory section 11 owner decisions — `contact_hash` retention, whether an email address must be required, mailbox provider and retention, and whether permanent public issues are acceptable — are unchanged here. Rollback is a plain revert; no schema, flag, provider or stored report is affected.
