# Reporting

The floating **Make it better** button opens component requests and bug reports. `/requests/` is the public demand board. `/feedback-admin/` is a private maintainer view protected by the Worker, not by the static page. All three use the library's existing design primitives.

## Run locally

```sh
npm ci
npm run reporting:dev
```

In a second terminal:

```sh
NEXT_PUBLIC_REPORTING_API_URL=http://localhost:8787 SAHAJIV_NEXT_DIST_DIR=.next-reporting npx next dev --port 3100
```

Open `http://localhost:3100/sahajiv-ui/`. The local maintainer token is in `.work/reporting/local-admin-token`; enter it in `/sahajiv-ui/feedback-admin/`. Keep tokens out of chat, Git and URLs. Local reports persist in Wrangler's local D1/R2 storage; outbound email and GitHub are disabled. Local mode refuses remote request hosts.

## Cloudflare setup

```sh
npx wrangler login
npm run reporting:provision
npm run reporting:deploy
```

Provisioning creates a dedicated D1 database, private R2 bucket and managed Turnstile widget. It writes resource IDs/site key to `workers/reporting/wrangler.jsonc`, and secrets to the ignored mode-0600 `.work/reporting/cloud-secrets.json`. It does not copy credentials from other applications. Deploy sends the secrets over stdin, checks the bundle, then deploys the Worker.

Set `NEXT_PUBLIC_REPORTING_API_URL` to the deployed Worker origin at site build time. The widget fetches the public Turnstile site key from `/v1/config`; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is an optional explicit override. Allow the exact site origin in `ALLOWED_ORIGINS` and its hostname in Turnstile. No wildcard CORS and no secret in `NEXT_PUBLIC_*` variables. The current static Next export needs no server routes or hosting migration.

## GitHub

The target is `luv-jeri/sahajiv-ui`. Use a dedicated fine-grained token with **Issues: read and write** and repository metadata read permission on that repository. Supply it through a private terminal environment variable named `REPORTING_GITHUB_TOKEN`, then run:

```sh
node scripts/reporting.mjs github-connect
```

Alternatively, use `npx wrangler secret put GITHUB_TOKEN --config workers/reporting/wrangler.jsonc`. Never place the token in a source file or shell history. GitHub issue creation starts after the D1 receipt, independently of media upload. Missing credentials leave delivery jobs pending; accepted reports remain available in the maintainer view.

Public issues contain a reference and authenticated report link. Descriptions, reference URLs, email, screenshots, videos and diagnostics are private in D1/R2. Every submission gets a report and tracked issue; related component requests share one demand topic and completion status. An optional `GITHUB_PROJECT_ID` enables GraphQL association; its token additionally needs project access. GitHub Project workflows can map issue state to board columns.

Configure the repository **Issues** webhook using the local GitHub CLI login:

```sh
REPORTING_API_URL=https://sahajiv-ui-reporting.unread-fyi.workers.dev node scripts/reporting.mjs github-webhook
```

This idempotently creates or updates the matching callback, keeping its signing secret out of terminal output. The callback is `WORKER_ORIGIN/v1/github/webhook`; HMAC signatures and delivery IDs are validated. Repository webhook write permission is required. This command does not copy the local GitHub token into the Worker. To notify completion from GitHub, close an issue as completed with the `feedback:released` label. Component requests also need this exact line in the issue body:

```text
Component: https://YOUR-LIBRARY-SITE/docs/component-name/
```

The URL must belong to configured `SITE_URL` and return a live HTML page. Closing an issue alone does not send a release notification. The maintainer view can also set planned/in-progress/live status; marking a request live notifies all associated requesters.

## Email placeholder and activation

`EMAIL_ENABLED=false` and `EMAIL_FROM=hello@your-domain.invalid` intentionally disable outgoing mail. The interface says email is disconnected; it does not claim an acknowledgement was sent. Pending acknowledgements remain in the outbox.

After acquiring the domain:

1. Onboard it with `npx wrangler email sending enable YOUR_DOMAIN` and finish the DNS verification reported by Cloudflare.
2. Add `"send_email": [{ "name": "EMAIL" }]` to the production Worker config. Set `EMAIL_FROM` to your verified sender and `EMAIL_ENABLED` to `true`.
3. Redeploy. In the maintainer view, run pending deliveries. Verify a real received and completion email in your inbox before promising mail delivery to visitors.

The templates have a plain-text and HTML version in SahaJiv's colors. A Cloudflare acceptance ID means accepted by the email provider, not guaranteed inbox delivery. Unknown outcomes are held for review; rate-limit failures back off automatically.

## Reliability and privacy

- Report + attachment slots + delivery jobs are committed in one D1 transaction. Stable client ID, receipt token and payload hash make repeat submissions safe. An ambiguous send locks the exact payload for retry; checking the receipt does not resubmit it.
- Each attachment uploads against its saved manifest and private receipt. Server checks size, media signature and SHA-256. A failed upload leaves text saved and can be retried separately. Private downloads require maintainer authorization and are served as attachments with no cache.
- A D1 outbox drains after submission and every five minutes. Jobs use leases and bounded exponential backoff. Uncertain provider responses require review instead of claiming exactly-once delivery. Maintainers can inspect and retry failed jobs.
- The browser keeps bounded diagnostics in memory. No form values, cookies, storage contents or network bodies/headers are captured. Screenshots and pins require an explicit action. Review shows the payload and actual attached images/videos. Redaction is best effort; visual media may include personal content the user must review.
- Diagnostics/media expire after 30 days. Contact and private report details expire after 180 days. A cron performs the deletion. Public request titles/status/demand remain. Local drafts and receipt files belong to the user's device and can be cleared explicitly.
- The public delivery target is **36 hours, depending on demand and complexity**. It is not a timer or an unconditional guarantee.

## Checks

```sh
node --import tsx --test tests/reporting-contract.test.ts tests/reporting-browser-client.test.ts
npm run reporting:test
npm run typecheck
npm run lint
npm run reporting:check
```

With both local services running, `npm run reporting:browser` runs the browser journeys and saves screenshots in `.work/reporting/browser/`. It refuses non-local reporting services and creates clearly named local test reports. Browser checks and final evidence are recorded in `VERIFICATION.md`. They use local services and test provider adapters; those results do not prove actual inbox receipt or a live GitHub issue until those integrations are activated and checked separately.

References: [Cloudflare D1 transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Cloudflare Email Service](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [GitHub webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).
