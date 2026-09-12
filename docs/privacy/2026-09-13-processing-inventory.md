# Processing inventory — reporting, contact and analytics

Checkpoint E01. Recorded 13 September 2026 against source commit
`5358d25aded2c7b030d394e289475bc030a82578` (branch `chore/e01-processing-inventory`).

This is an engineering inventory of what the code actually collects, where it goes and
what deletes it. It is not a privacy notice, a legal analysis or a public policy, and it
does not decide any lawful basis. E02 and E03 consume it; E07, E08 and E09 act on the
gaps in section 10. Section 11 lists what only the owner can settle.

## 1. How to read this

Every row is labelled with the strength of its evidence.

| Label | Meaning |
| --- | --- |
| **Code** | Read in this repository at the commit above, with the file and line cited. |
| **Config** | Declared in a committed configuration file. The live account/provider setting was not inspected in this review. |
| **Provider** | Behaviour of an external service. Not observable from this source; no guarantee is asserted here. |
| **Owner decision required** | Not established by code or by any committed record. Left open deliberately. |

Nothing in this document was confirmed by inspecting a live Cloudflare, GitHub, Resend,
PostHog or mailbox account. No production data was read.

## 2. Collection points

Four things move data off the visitor's device: the reporting widget, optional PostHog
analytics, the Cloudflare Turnstile check, and the hosting Worker's own request handling
(which includes a registry-metrics sink that is present in code but unbound in the
committed configuration — section 6). There is **no web contact form**. Contact is a
`mailto:` link to `hello@cojeev.com`, rendered only when `NEXT_PUBLIC_CONTACT_ENABLED=true` (currently `false` in `.env.example`), plus
a link to the maintainer's GitHub profile (`app/privacy/page.tsx:14`,
`components/landing/creator-page.tsx:17`).

The reporting widget is mounted in the root layout (`app/layout.tsx:26`), so its
diagnostics buffer starts on **every** page except `feedback-admin`
(`components/reporting/reporting-widget.tsx:191`, `lib/reporting/diagnostics.ts:8,31`).

## 3. Report fields collected in the browser

Validated by `validateReport` (`lib/reporting/contracts.ts:21-65`) before anything is sent.

| Field | Source | Limit | Purpose | Leaves device to | Evidence |
| --- | --- | --- | --- | --- | --- |
| `id` | `crypto.randomUUID()` in the browser | UUID v4 | Idempotent submit; receipt address; public issue reference | Worker, GitHub issue body, Cloudflare Turnstile | Code — widget:333, contracts:24 |
| `kind` | Tab choice | `bug` \| `request` | Routing and template | Worker, GitHub | Code — contracts:25 |
| `title` | Typed | 3–120 chars | Report subject; for requests also the private topic title | Worker only. **Not** in the GitHub issue title, which is `[Bug report] <first 8 of UUID>` | Code — delivery.ts:48; widget:582 |
| `description` | Typed | ≤6000 chars | The report itself | Worker only | Code — contracts:64 |
| `email` | Typed, required | ≤254 chars, lowercased | Receipt, progress updates, demand counting | Worker; Resend only when email delivery is enabled | Code — contracts:26-27 |
| `references[]` | Auto-extracted `https?://` URLs from the description | ≤8, ≤2000 chars each, credentials rejected | Context links | Worker only | Code — widget:325-331, contracts:20 |
| `pins[]` | Explicit element-picker clicks (bug only) | ≤8; structural CSS path, tag, x/y | Point at the broken element | Worker only | Code — contracts:28-35 |
| `attachments[]` manifest | Chosen files or generated screenshot | ≤6 files, ≤10 MiB each, ≤30 MiB total; PNG/JPEG/WebP/MP4/WebM | Evidence | Worker (manifest), R2 (bytes) | Code — contracts:1,36-44 |
| `diagnostics` | See section 4 (bug only) | See section 4 | Reproduce the bug | Worker only | Code — contracts:45-62 |
| `topicId` | Joining an existing request | UUID | Group duplicate requests | Worker only | Code — contracts:63 |
| `token` (receipt secret) | 32 random bytes in the browser | 64 hex chars | Authorises reading/uploading to this report | Worker stores only its SHA-256 | Code — client.ts:27-29, reports.ts:32 |
| `turnstileToken` | Cloudflare widget | ≤2048 chars | Abuse check | Worker, then Cloudflare siteverify | Code — security.ts:43-50 |

**Filenames** are stored verbatim (control characters and slashes replaced) and echoed in
the maintainer download's `Content-Disposition` — a filename can itself carry personal
information (Code — contracts:41, reports.ts:116).

## 4. Diagnostics

Two distinct mechanisms. Both are in-memory until the draft is saved.

**Continuous buffer** (`lib/reporting/diagnostics.ts:30-74`, started on every page):
wraps `console.warn`/`console.error`, `window.fetch`, `XMLHttpRequest.open`/`send`, and
adds a capturing `click` listener. Each group holds at most 40 events (`LIMITS.events`).

| Group | Captured | Explicitly not captured |
| --- | --- | --- |
| `console` | Warning/error text, unhandled errors, rejections — each `redact`ed and cut to 1000 chars; non-primitive arguments become `[object omitted]` | Nothing else |
| `network` | Only failed or ≥400 requests, as `<status> <route>`. Route is reduced to `/:segment/…` unless it is a public docs/requests path. `/v1/` and `feedback-admin` URLs are skipped entirely | URLs with query strings, request/response bodies, headers, cookies |
| `actions` | Clicks as `<route> <structural path> theme=<light\|dark>` | Clicks inside `input`, `textarea`, `select`, `[contenteditable]`, `[data-private]` or reporting chrome; no text, no values |

**Snapshot** (`lib/reporting/diagnostics.ts:75-87`) adds a device block. The server
allowlist for it is exact (`lib/reporting/contracts.ts:15`): `appVersion`, `userAgent`
(redacted), `platform`, `language`, `timezone`, `viewport`, `screen`, `pixelRatio`,
`online`, `theme`, `reducedMotion`, `touchPoints`, `hardwareConcurrency`, `deviceMemory`,
`connection`, `page`, `capturedAt`. Any other key is rejected outright — verified by
execution, see section 12.

`redact()` (`lib/reporting/contracts.ts:66-74`) rewrites URLs to route shapes, and masks
`Bearer` tokens, `sk-`/`gh*_` keys, email addresses, `token=`/`password=`/`secret=`-style
assignments, JWTs and `/Users/<name>` or `/home/<name>` paths. It is best effort on text
only; **image and video content is never inspected or redacted**.

## 5. Browser storage

| Key / store | Mechanism | Contents | Written when | Expiry / deletion | Evidence |
| --- | --- | --- | --- | --- | --- |
| `cojeev-reporting-v1` → `drafts` → `workspace` | IndexedDB | Both drafts in full: kind, title, description, email, topic, pins, **attached `File` objects (complete image/video bytes)**, diagnostics, frozen payload, receipt **including its bearer token** | Debounced 300 ms after any edit, on `pagehide`, and on tab switch | **None.** "Clear draft" resets only the active kind's record; the other draft and the database survive. No TTL, no shared-device warning | Code — draft.ts:10,46-53; widget:146-159,496-516 |
| `000h.analytics-opt-out` | localStorage | `"true"` / `"false"` | Only when the visitor toggles the analytics preference | None; cleared with site data | Code — analytics/client.ts:3,284-292 |
| `cojeev-docs-theme` | localStorage | `light` / `dark` / system choice | Theme control used | None | Code — theme-control.tsx:71 |
| `cojeev-docs-navigation` | localStorage | `collapsed` or absent | Docs sidebar toggled | None | Code — docs-shell.tsx:119 |
| `cojeev-receipt-<id>.json` | File download | Report id **and its bearer token** | "Download receipt" pressed | Under the visitor's control only | Code — widget:1135-1152 |

No cookie is set by this application's own code (`document.cookie` appears nowhere in
`app/`, `components/`, `lib/` or `workers/`). Analytics requests are sent with
`credentials: "omit"` (analytics/client.ts:314). Whether the Cloudflare Turnstile script
sets cookies or storage of its own was **not measured** in this review — Provider.

## 6. Analytics

Capture is off unless `NEXT_PUBLIC_ANALYTICS_ENABLED === "true"` **and** a permitted host
**and** a project token are all present (`lib/analytics/client.ts:111-128`). `.env.example`
ships `false`. A build with `NODE_ENV=production` alone does not enable it.

Nine events, each with a closed property allowlist (`lib/analytics/client.ts:13-50,191-256`):
`page_viewed`, `component_impression`, `demo_interacted`, `variant_selected`,
`install_command_copied`, `source_copied`, `guide_copied`, `copy_failed`,
`outbound_clicked`. Any unlisted property makes the whole event fail validation and
nothing is sent — verified by execution, section 12.

| Property | Shape | Notes |
| --- | --- | --- |
| `route` | Path only, base path stripped | `?`/`#` removed; `feedback-admin` and `workspace` routes return `null`, which drops the event (client.ts:134-142) |
| `component_id`, `placement`, `variant_id`, `variant_value`, `interaction_kind`, `copy_kind`, `destination_category` | Fixed sets or `[a-z0-9-]` tokens | No free text can pass |
| `utm_source/medium/campaign/content` | ≤64 chars, `[a-z0-9._-]` | Read from the query string; any other query parameter is discarded |
| `environment`, `release_sha` | `beta`/`production`, 40-hex commit | Added only when configured |
| `distinct_id` | `crypto.randomUUID()` | Held in a module-level singleton for the page load only; a full reload produces a new one. Never persisted |

Every event body sets `$process_person_profile: false` and `$geoip_disable: true`, and the
request uses `credentials: "omit"`, `referrerPolicy: "no-referrer"`
(`lib/analytics/client.ts:305-316`). Recipient: PostHog at `https://eu.i.posthog.com` or
`https://us.i.posthog.com` — `.env.example` names EU project 272306 as current.

Signals honoured before any send: `navigator.doNotTrack === "1"`,
`navigator.globalPrivacyControl === true`, and the stored opt-out
(`lib/analytics/client.ts:269-274,329-332`).

**Prior consent is not implemented.** When analytics is enabled, `page_viewed` fires from
the provider effect on first route settle (`components/analytics/analytics-provider.tsx:31-37`);
the opt-out is exercised after the fact. This is the E03 decision, recorded here as fact.

### Registry metrics (second analytics sink)

`workers/registry-host/src/index.mjs:21-37` writes one Cloudflare Analytics Engine data
point per `GET /r/<name>.json` registry request: the component name as index,
and `[name, kind, audience, success|error]` as blobs with the HTTP status as a double.
`audience` is `probe` when the request carries `x-cojeev-probe: 1`, otherwise
`unclassified`; the code comments that this is a measurement convention, not bot
detection. No visitor-supplied field is written.

**`REGISTRY_METRICS` has no binding in `workers/registry-host/wrangler.jsonc`.** The guard
at line 22 therefore skips the write in the committed configuration, so this sink is
presently inert. Binding it in the account would activate it without a code change.

## 7. Server-side storage

Cloudflare Worker `cojeev-ui-reporting` on `feedback.cojeev.com`; beta
`cojeev-ui-reporting-beta` on `feedback-beta.cojeev.com` (Config — `workers/reporting/wrangler.jsonc`).

| Store | Holds | Evidence |
| --- | --- | --- |
| D1 `reports` | id, token hash, payload hash, kind, **title, description, email in plain text**, `contact_hash`, references JSON, diagnostics JSON, pins JSON, topic, status, component URL, GitHub issue number/node/URL, timestamps, purge flags | Code — migrations/0001, reports.ts:52-54 |
| D1 `topics` | Raw requested title + normalised key, maintainer-approved `public_title`, status, component URL, timestamps | Code — reports.ts:48,51; lifecycle.ts:62 |
| D1 `attachments` | id, report id, filename, media type, size, SHA-256, state, R2 object key | Code — reports.ts:55 |
| D1 `outbox` | Delivery jobs: report id, kind, state, attempts, last error, **`payload_json` = the full rendered email including the recipient address**, provider id, delivery status, timestamps | Code — resend.ts:13; migrations/0002 |
| D1 `email_attempts` | One row per send attempt: id, job id, timestamp (quota accounting) | Code — resend.ts:21-23 |
| D1 `email_events` | Signed Resend webhook events: event id, provider id, status, timestamps | Code — resend.ts:67 |
| D1 `rate_limits` | SHA-256 of `<IP_HASH_SECRET>:<client IP>:<10-minute slot>`, count, expiry — an IP-derived pseudonymous key | Code — security.ts:37-41 |
| D1 `webhook_events` | GitHub delivery ids for replay protection | Code — lifecycle.ts:36 |
| R2 `cojeev-ui-report-media` (beta: `…-beta-report-media`) | Attachment bytes at `<reportId>/<fileId>` | Code — reports.ts:74 |
| R2 `cojeev-ui-private-recovery` | Weekday-slotted full D1 SQL exports — **these contain the plaintext `reports` table** — plus digest receipts | Code — scripts/operations.mjs:114-134; Config — docs/production/OPERATIONS.md |

`contact_hash` is `HMAC-SHA256(IP_HASH_SECRET, "report-contact:" + email)`
(`workers/reporting/src/reports.ts:41`). Its stated purpose is counting distinct demand
after the address is erased; it is deliberately kept past the contact purge.

Worker logs: `observability.logs` on at 10% head sampling, traces at 1%,
`invocation_logs: false` (Config — workers/reporting/wrangler.jsonc:9-20; the hosting Worker carries the same settings). The request handler never logs
payloads, addresses, tokens or raw provider errors; unknown failures log the fixed string
`reporting_request_failed` (Code — index.ts:66-67). What Cloudflare retains for sampled
logs and traces is Provider.

## 8. Third-party requests and recipients

| Recipient | Trigger | What it receives | Evidence |
| --- | --- | --- | --- |
| PostHog (`eu`/`us.i.posthog.com`) | Browser, only when analytics is enabled and not opted out | One allowlisted event per action (section 6) plus the connection's own network metadata | Code — analytics/client.ts:310 |
| Cloudflare Turnstile — browser script | Report review step renders `challenges.cloudflare.com/turnstile/v0/api.js` | Whatever the widget collects; site key `0x4AAAAAAEt12whn6p_17NLe`, action `reporting` | Code — turnstile.tsx:10; widget:1017-1024 |
| Cloudflare Turnstile — siteverify | Worker, on submit | The Turnstile token, the **client IP** as `remoteip`, and the **report UUID** as `idempotency_key` | Code — security.ts:46 |
| Cloudflare (Workers, D1, R2) | Every reporting request | Processor for all of section 7; also the network layer for `feedback.cojeev.com` | Config — workers/reporting/wrangler.jsonc |
| GitHub (`api.github.com` → public repo `luv-jeri/cojeev-ui`; beta `luv-jeri/cojeev-ui-beta-feedback`, recorded as private in docs/production/OPERATIONS.md:84) | Outbox `github` job | Issue titled `[Bug report]`/`[Component request] <first 8 of UUID>`; body carries the full report UUID, an HMAC marker, and a maintainer-only admin link. **No title, description, email, diagnostics or attachment reaches GitHub** | Code — delivery.ts:36,48-51 |
| Cloudflare Worker `cojeev-ui-registry` on `000h.cojeev.com` (beta `beta.000h.cojeev.com`) | Every page view | Serves the static export. Sees the full request: URL, client IP, user agent, referrer | Config — workers/registry-host/wrangler.jsonc |
| GitHub Pages (`luv-jeri.github.io`) | Only if a visitor uses that origin | Retained as a permitted browser origin and build-compatibility target, not the primary host | Config — workers/reporting/wrangler.jsonc:31; docs/production/OPERATIONS.md:16 |
| Resend (`api.resend.com`) | Outbox email job, only when `EMAIL_ENABLED=true` with a verified sender | Recipient address, subject, text and HTML body, `reply_to: hello@cojeev.com`, idempotency key `cojeev/<jobId>` | Code — delivery.ts:72, resend.ts:27 |
| `hello@cojeev.com` mailbox | Replies to notification emails; the `mailto:` contact link | Whatever the sender writes | Code — delivery.ts:72, site-config.ts:14 |

Email is currently **disabled** in both committed environments (`EMAIL_ENABLED: "false"`,
`DELIVERY_ACTIVATED_AT: ""` — workers/reporting/wrangler.jsonc:34-36,76-78), and beta sending is further
restricted to the single address in `BETA_TESTER_EMAILS`
(workers/reporting/wrangler.jsonc:81, enforced at resend.ts:8). No report
contents are emailed to an operator inbox: there is no maintainer-notification job. A
maintainer reads reports through `/feedback-admin/`, whose token is held in memory for
the tab only (`components/reporting/admin.tsx:51`).

The site loads no web fonts, tag managers or other third-party assets.

The hosting Worker sets the Content-Security-Policy that bounds all of the above
(`workers/registry-host/src/index.mjs:16`): `connect-src` permits only `'self'`, the
matching reporting API host and `https://eu.i.posthog.com` / `https://eu-assets.i.posthog.com`;
`frame-src` permits only `https://challenges.cloudflare.com`. Two consequences worth
recording: the US PostHog host that `lib/analytics/client.ts:89-92` still accepts would be
blocked by this policy, and `eu-assets.i.posthog.com` is allowed for scripts and
connections although no code loads the PostHog JS SDK. The Worker also sets
`referrer-policy: strict-origin-when-cross-origin` (:12), so a click through to GitHub or
another external site sends the site origin — the analytics request itself overrides this
with `no-referrer`.

## 9. Retention and deletion

Deletion is one `cleanup()` pass on a `*/5 * * * *` cron
(`workers/reporting/src/index.ts:76`, `lifecycle.ts:39-56`, Config — workers/reporting/wrangler.jsonc:56-59).

| Data | Period | Mechanism | Evidence |
| --- | --- | --- | --- |
| Attachment bytes in R2 | 30 days from report creation | `MEDIA.delete(object_key)`, 100 reports per pass | Code — lifecycle.ts:41-44 |
| Diagnostics JSON, pins | 30 days | Set to `NULL` / `[]`, `technical_purged=1` | Code — lifecycle.ts:45 |
| Attachment rows | 30 days | `DELETE FROM attachments` | Code — lifecycle.ts:45 |
| Further attachment upload | Refused after 30 days or once purged | HTTP 410 | Code — reports.ts:68 |
| Email address, title, description, references | 180 days | Overwritten with `''` / `[Expired report]`, `private_purged=1` | Code — lifecycle.ts:51 |
| Private topic title | 180 days | Replaced with `[Expired request]` | Code — lifecycle.ts:50 |
| Stored email payload (`outbox.payload_json`) | 180 days | Set to `NULL` | Code — lifecycle.ts:49 |
| Pending deliveries for expired reports | 180 days | Moved to `needs_review` | Code — lifecycle.ts:48 |
| `rate_limits` | ~10 minutes, removed on the next pass | `DELETE … WHERE expires_at<now` | Code — lifecycle.ts:52 |
| `webhook_events` | 30 days | `DELETE` | Code — lifecycle.ts:53 |
| `contact_hash` | **Never deleted** — retained by design for demand counting | No statement removes it | Code — lifecycle.ts:47-54 |
| `email_attempts` | **Never deleted** | Not referenced by `cleanup()` | Code — lifecycle.ts:47-54 |
| `email_events` | **Never deleted** | Not referenced by `cleanup()` | Code — lifecycle.ts:47-54 |
| `outbox` row identity (`report_id`, `kind`, `provider_id`, `delivery_status`, timestamps) | **Never deleted** | Only `payload_json` is cleared | Code — lifecycle.ts:49 |
| Approved `public_title`, status, demand count | Retained indefinitely by design | Not touched by cleanup | Code — lifecycle.ts:47-54 |
| D1 recovery backups in R2 | Seven weekday slots; each replaced on the next deployment on the same UTC weekday. A bucket lifecycle rule of at most 604800 s is **asserted at backup time**, and restore refuses a receipt older than seven days | Whether that rule is presently configured on the live bucket is Config, not verified here | Code — scripts/operations.mjs:97-104,106-113 |
| GitHub issues | No deletion | Public and permanent until a maintainer acts | Code — no deletion path exists |
| Local drafts | **No expiry** | See section 5 | Code — draft.ts |
| PostHog event retention | — | Provider; project setting not inspected | — |
| Resend message/event retention | — | Provider | — |
| `hello@cojeev.com` mailbox retention | — | **Owner decision required** | — |
| Cloudflare Workers logs/traces (reporting and hosting), and any GitHub Pages access logs | — | Provider | — |

## 10. Concrete implementation gaps

These are defects or unstated behaviours found in this pass, each with its location. They
are stated as engineering findings; the remediation belongs to E03, E06, E07, E08 and E09.

1. **Bug diagnostics are attached without the user's action.** Switching to the "Report a
   bug" tab calls `selectDraft("bug")`, which creates the draft with
   `diagnostics: snapshotDiagnostics()` and immediately persists it to IndexedDB
   (`components/reporting/reporting-widget.tsx:160-188`, invoked from :1225 and :238).
   The panel then presents diagnostics as a choice — heading "You're in control" with an
   "Include browser details" button (:870-889). The device block and the buffered console,
   network and click events are already in the draft at that point. The button reads
   "Refresh browser details" instead, which is the only signal that collection has
   happened. The review panel does allow removal before sending.
2. **The diagnostics buffer runs site-wide with no disclosure at collection time.**
   `startDiagnostics()` is called from the root-layout widget on every page
   (`reporting-widget.tsx:191`), patching `console.warn`/`error`, `window.fetch`,
   `XMLHttpRequest` and listening to every click. It stays in memory and is bounded to 40
   events per group, but nothing outside the report panel says it is running, and the
   privacy page does not mention it.
3. **Local drafts never expire and are not fully removable from the UI.** The IndexedDB
   record holds the email address, the free text, the receipt bearer token and the
   complete bytes of every attached image or video (`lib/reporting/draft.ts:46-53`).
   "Clear draft" writes an empty draft for the active kind only and leaves the other
   draft and the database in place (`reporting-widget.tsx:496-516`). There is no TTL and
   no shared-device warning. The failure message already tells people to clear site
   storage by hand.
4. **`email_attempts` and `email_events` have no cleanup.** `cleanup()` touches
   `reports`, `topics`, `attachments`, `outbox`, `rate_limits` and `webhook_events`
   only (`workers/reporting/src/lifecycle.ts:47-54`). Both tables grow without bound, and
   `email_attempts` is only needed for the current UTC day and month
   (`workers/reporting/src/resend.ts:21-23`).
5. **A link from report to delivery outcome survives the 180-day purge.** After the purge,
   `outbox` still holds `report_id` → `provider_id`, `email_events` still holds
   `provider_id` → delivery status and timestamps, and `reports` still holds
   `contact_hash`. Only `payload_json` is cleared (`lifecycle.ts:49`). The set is
   pseudonymous, but it is a retained per-recipient delivery history with no end date.
6. **`contact_hash` has no retention decision.** It is a keyed HMAC of the email address,
   kept deliberately (`workers/reporting/src/reports.ts:40-41`). Anyone holding
   `IP_HASH_SECRET` can confirm a candidate address against it. No period is defined
   anywhere, and rotating `IP_HASH_SECRET` would change every future hash and break demand
   counting against the rows already stored.
7. **The report UUID is disclosed to Cloudflare Turnstile** as `idempotency_key`
   alongside the client IP (`workers/reporting/src/security.ts:46`), and the same UUID is
   published in the GitHub issue body (`delivery.ts:36,50`). Neither is documented.
8. **The downloaded receipt file carries a live bearer token.** `cojeev-receipt-<id>.json`
   is the full receipt object including `token`, which authorises reading the private
   report and uploading to it (`reporting-widget.tsx:1135-1152`). The UI does not say the
   file is a credential.
9. **The maintainer report id travels in the URL.** The issue body links
   `/feedback-admin/?report=<uuid>` (`delivery.ts:49`), so the identifier lands in browser
   history and in the hosting Worker's request path. The site's
   `referrer-policy: strict-origin-when-cross-origin` keeps the query string out of
   cross-origin referrers, and the maintainer token stays in memory.
10. **Redaction does not extend to media.** Screenshots and video are stored and served
    byte-for-byte; `capturePage` blanks form controls and `[data-private]` in the cloned
    DOM (`lib/reporting/capture.ts:17-21`), but an uploaded file receives no treatment
    beyond a magic-byte check. `docs/reporting/README.md` states this; the visitor-facing
    copy does not.
11. **The privacy page predates this inventory.** `app/privacy/page.tsx` describes
    analytics accurately, but says only "Reporting features can use their own local
    settings" (:14) for a channel that stores an email address, free text, attachments and
    diagnostics on a Cloudflare service and opens a public GitHub issue. E02 owns the fix;
    it is recorded here because it is a promise-versus-behaviour gap, not a style issue.
12. **No prior-consent gate exists for analytics** (section 6). Recorded as behaviour, not
    as a conclusion about whether one is required.
13. **A second analytics sink exists in code with no binding.** `REGISTRY_METRICS` is
    written per registry request (`workers/registry-host/src/index.mjs:21-37`) but is
    absent from `workers/registry-host/wrangler.jsonc`, so it is inert today and would
    become active on an account change alone. The privacy page does not mention it.
14. **The deployed CSP is wider than the code needs and narrower than the code allows.**
    `eu-assets.i.posthog.com` is permitted for `script-src` and `connect-src` although
    nothing loads the PostHog SDK, while `us.i.posthog.com` — still an accepted host in
    `lib/analytics/client.ts:89-92` — would be blocked
    (`workers/registry-host/src/index.mjs:16`).

## 11. Owner decisions required

None of these can be derived from the source. They are listed so that E02–E09 do not
invent them.

| Question | Why it cannot be answered here |
| --- | --- |
| Lawful basis for each purpose — reports, receipt emails, demand counting, analytics, abuse prevention | No basis is asserted anywhere in the repository, and none can be inferred from code. |
| Operator legal identity (natural person or a registered entity) and its postal address | The repository names "Sanjay Kumar" as author and `hello@cojeev.com` as contact. That is not a controller identity. |
| Establishment/jurisdiction, and which regimes are in scope | Not recorded. Determines whether prior opt-in, a cookie/storage policy and transfer documentation apply. |
| Whether an email address must be required at all for a report (E07) | Code requires it unconditionally (`contracts.ts:26-27`); the product decision is not recorded. |
| Retention period for `contact_hash`, `email_attempts`, `email_events` and the residual `outbox` identity (gaps 4–6) | No period exists in code or docs. |
| `hello@cojeev.com` mailbox provider, location and retention | Not in this repository. |
| Whether the live `cojeev-ui-private-recovery` bucket has its ≤7-day expiration enabled and both public domains disabled | Asserted by the release script at backup time (`scripts/operations.mjs:97-104`); the account state was not inspected. |
| PostHog project retention and region settings; Resend retention; whether data-processing terms are in place with Cloudflare, GitHub, Resend and PostHog | Provider/account configuration, outside this source. |
| Whether public GitHub issues are acceptable as the permanent record of a report's existence | Issues are never deleted by any code path. |
| Children's-data position and any age statement | Nothing in the product addresses it. |

## 12. Verification

Base `5358d25aded2c7b030d394e289475bc030a82578`; branch `chore/e01-processing-inventory`.
Runtime pinned to Node v22.22.0. This checkpoint adds documentation only; no application
source was changed.

Every file and line cited above was read at this commit. Four checks were run against the
reporting and analytics modules directly, so the claims below rest on observed output
rather than on reading alone:

| Check | Result |
| --- | --- |
| `redact()` on an email, a `Bearer` token, a home path and a URL | `[email]`, `[redacted]`, `/[user]/…`, `/:segment/:segment` |
| `sanitizeRoute()` on `/feedback-admin/` and `/workspace` | `null` for both — the event is dropped |
| One `page_viewed` body actually passed to `fetch` | `{api_key, distinct_id, event, properties:{route, utm_source, environment, release_sha, $process_person_profile:false, $geoip_disable:true}}` with `credentials:"omit"`, `referrerPolicy:"no-referrer"` |
| An event carrying an unlisted property; a diagnostic carrying an unlisted environment key | Event returns `false` and sends nothing; diagnostic rejected with "Unsupported diagnostic environment field." |

Not done, deliberately: no live account was opened; no production or beta data was read;
no browser session was instrumented, so third-party cookie/storage behaviour of the
Turnstile script is unmeasured; the full component catalogue and the Next build were not
run, per the proportionate-verification rule in `docs/checkpoint-workflow.md` for a
documentation change.

E01 remains open. Sections 10 and 11 are the outstanding work; nothing here closes them.
