# Reporting

The floating **Make it better** button opens component requests and bug reports. `/requests/` is the public demand board. `/feedback-admin/` is a private maintainer view protected by the Worker, not by the static page. All three use the library's existing design primitives.

## Run locally

```sh
npm ci
npm run reporting:dev
```

In a second terminal:

```sh
NEXT_PUBLIC_REPORTING_API_URL=http://localhost:8787 COJEEV_NEXT_DIST_DIR=.next-reporting npx next dev --port 3100
```

Open `http://localhost:3100/cojeev-ui/`. The local maintainer token is in `.work/reporting/local-admin-token`; enter it in `/cojeev-ui/feedback-admin/`. Keep tokens out of chat, Git and URLs. Local reports persist in Wrangler's local D1/R2 storage; outbound email and GitHub are disabled. Local mode refuses remote request hosts.

## Cloudflare setup

```sh
npx wrangler login
npm run reporting:provision
npm run reporting:deploy
```

Provisioning creates a dedicated D1 database, private R2 bucket and managed Turnstile widget. It writes resource IDs/site key to `workers/reporting/wrangler.jsonc`, and secrets to the ignored mode-0600 `.work/reporting/cloud-secrets.json`. It does not copy credentials from other applications. Deploy sends the secrets over stdin, checks the bundle, then deploys the Worker.

Set `NEXT_PUBLIC_REPORTING_API_URL` to the deployed Worker origin at site build time. The widget fetches the public Turnstile site key from `/v1/config`; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is an optional explicit override. Allow the exact site origin in `ALLOWED_ORIGINS` and its hostname in Turnstile. No wildcard CORS and no secret in `NEXT_PUBLIC_*` variables. The current static Next export needs no server routes or hosting migration.

## GitHub

The target is `luv-jeri/cojeev-ui`. Use a dedicated fine-grained token with **Issues: read and write** and repository metadata read permission on that repository. Supply it through a private terminal environment variable named `REPORTING_GITHUB_TOKEN`, then run:

```sh
node scripts/reporting.mjs github-connect
```

Alternatively, use `npx wrangler secret put GITHUB_TOKEN --config workers/reporting/wrangler.jsonc`. Never place the token in a source file or shell history. GitHub issue creation starts only after a triage verdict approves the report (see below) and delivery is activated. Missing credentials leave jobs retained; historical jobs require review. Every report remains available in the maintainer view.

### Triage flow

1. A report is saved and the reporter gets an instant thank-you email. It stays `pending`: no GitHub issue exists yet, and the receipt says "Being reviewed".
2. A verdict (AI or owner) approves or rejects it through the admin triage routes.
3. Approved: the `github` job publishes a public issue built only from the scrubbed verdict title and body (emails, tokens, user paths and @mentions removed), the footer `Reported by a visitor.`, the hidden signed marker, and the label `bug` or `enhancement`. Description, email, links, media and diagnostics never reach GitHub. The reporter then gets "We're tracking your report as #N". A request that joins a topic with an issue shares it and gets the same email.
4. Rejected: the reporter gets a polite "About your report" email (never the AI's reason). If the report already had an issue, it is closed as not planned with the `invalid` label; if other approved reports share that issue, this one is only detached. Overturning a rejection reopens the issue and removes the label.
5. A `github` job for a report that is not approved fails permanently (state `needs_review`) without any GitHub request.

An optional `GITHUB_PROJECT_ID` enables GraphQL association; its token additionally needs project access. Deploy and verify the Worker with:

```sh
npm run reporting:deploy
npm run reporting:check
```

Configure the repository **Issues** webhook using the local GitHub CLI login:

```sh
REPORTING_API_URL=https://cojeev-ui-reporting.unread-fyi.workers.dev node scripts/reporting.mjs github-webhook
```

This idempotently creates or updates the matching callback, keeping its signing secret out of terminal output. The callback is `WORKER_ORIGIN/v1/github/webhook`; HMAC signatures and delivery IDs are validated. Repository webhook write permission is required. This command does not copy the local GitHub token into the Worker. To notify completion from GitHub, close an issue as completed with the `feedback:released` label. Component requests also need this exact line in the issue body:

```text
Component: https://YOUR-LIBRARY-SITE/docs/component-name/
```

The URL must belong to configured `SITE_URL` and return a live HTML page. Closing an issue alone does not send a release notification. A release resolves every report that shares the issue, and each reporter is emailed once. The maintainer view can also set planned/in-progress/live status; marking a request live notifies all associated requesters.

## Email and activation

`EMAIL_ENABLED=false` and `EMAIL_FROM=hello@your-domain.invalid` intentionally disable outgoing mail. The interface says email is disconnected; it does not claim an acknowledgement was sent. Pending acknowledgements remain in the outbox.

After verifying the sender domain with Resend:

1. Set the `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` Worker secrets and configure the signed events in the operations runbook.
2. Set `EMAIL_FROM` to the verified sender. Complete the activation/cutoff and quota checklist before setting `EMAIL_ENABLED=true`; no Cloudflare `EMAIL` binding is used.
3. Verify a new report's receipt, provider acceptance, signed delivery event, and real inbox receipt. Historical jobs stay held until individually reviewed.

## Rotated admin token

`REPORTING_ADMIN_TOKEN` is an optional GitHub environment secret read by every release deploy. When set (at least 32 characters), it wins over the `ADMIN_TOKEN` inside `REPORTING_SECRETS_JSON` / `REPORTING_ADDITIONAL_SECRETS_JSON`, for `ADMIN_TOKEN` only; every other key that appears in two places still fails the release. The deploy logs `ADMIN_TOKEN: rotated value from REPORTING_ADMIN_TOKEN` (never the value). The local triage tools read the same value from `.work/reporting/admin-token-<env>`.

Reporter emails: thank-you (on submit), "We're tracking your report as #N" (issue created or joined), "About your report" (declined), and the existing fixed/live notice. The owner alert is unchanged. The templates have plain-text and HTML versions. The sender name is `000h by Cojeev` and reply address is `hello@cojeev.com`. A Resend ID means provider acceptance; only a signed delivered event marks delivery. Unknown outcomes require review; quota failures retain jobs.

## Reliability and privacy

- Report + attachment slots + delivery jobs are committed in one D1 transaction. Stable client ID, receipt token and payload hash make repeat submissions safe. An ambiguous send locks the exact payload for retry; checking the receipt does not resubmit it.
- Each attachment uploads against its saved manifest and private receipt. Server checks size, media signature and SHA-256. A failed upload leaves text saved and can be retried separately. Private downloads require maintainer authorization and are served as attachments with no cache.
- A D1 outbox drains after submission and every five minutes. Jobs use leases and bounded exponential backoff. Uncertain provider responses require review instead of claiming exactly-once delivery. Maintainers can inspect and retry failed jobs.
- The browser keeps bounded diagnostics in memory. No form values, cookies, storage contents or network bodies/headers are captured. Screenshots and pins require an explicit action. Review shows the payload and actual attached images/videos. Redaction is best effort; visual media may include personal content the user must review.
- Diagnostics/media expire after 30 days. Contact, original titles, private details and persisted email payloads expire after 180 days. A cron performs the deletion. Maintainer-approved public titles/status/demand remain. Original free-text request titles are hidden from the public board and new GitHub issue titles.
- The public delivery target is **36 hours, depending on demand and complexity**. It is not a timer or an unconditional guarantee.

## Triage

`npm run triage` is a local judge for new reports. It pulls untriaged reports from the Worker, asks a tool-less Codex (`codex exec`, read-only, no shell or browser tools, empty working folder) for a JSON verdict on each, and sends the verdict back. The reporter's email is never sent to Codex.

```sh
npm run triage -- --dry-run          # judge and print, send nothing
npm run triage                       # production (https://feedback.cojeev.com)
npm run triage -- --env beta         # beta (https://feedback-beta.cojeev.com)
npm run triage -- --model <id>       # default gpt-5.6-sol
```

Each Codex run has a 120 second limit; a run that stalls is killed and counted as failed. A report the owner already decided answers 409 and is counted as skipped. The command exits 1 if any report failed.

The admin token comes from `REPORTING_ADMIN_TOKEN`, else the file `.work/reporting/admin-token-<production|beta>` (one line, mode 0600, trimmed). It is never printed or put in a URL.

## Dashboard

`npm run triage:dashboard` opens the review screen at `http://127.0.0.1:4330` (local only, never built or deployed). It lists reports by verdict, lets you mark an AI verdict as verified, and overturns a decision after showing what that will do. Add `?fixtures` to the URL for sample data.

The browser only calls relative `/api/...` URLs. The Vite dev server rewrites them to `<API>/v1/admin/...` and adds the admin token and the allowed `Origin` on the Node side, so the token never reaches the page. `TRIAGE_ENV=beta` selects the beta API; the token rules are the same as for `npm run triage`. `TRIAGE_API` overrides the API origin and exists only for tests against `npm run reporting:dev`; it must be a `localhost` or `127.0.0.1` address. The proxy refuses (403) any write whose `Origin` is not the dashboard's own.

A report still waiting for the AI has no Verify or Overturn buttons: run `npm run triage` first. A failed action (409, 410, 422 or no connection) is shown next to the buttons in the Worker's own words, and the list reloads.

Browser check against the local Worker (start `npm run reporting:dev` first): `node tests/triage-dashboard.browser.mjs`.

## Checks

```sh
node --import tsx --test tests/reporting-contract.test.ts tests/reporting-browser-client.test.ts
npm run reporting:test
npm run typecheck
npm run lint
npm run reporting:check
```

With both local services running, `npm run reporting:browser` runs the browser journeys and saves screenshots in `.work/reporting/browser/`. It refuses non-local reporting services and creates clearly named local test reports. Browser checks and final evidence are recorded in `VERIFICATION.md`. They use local services and test provider adapters; those results do not prove actual inbox receipt or a live GitHub issue until those integrations are activated and checked separately.

References: [Cloudflare D1 transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [GitHub webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).
