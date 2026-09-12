# Release and recovery operations

This runbook describes implemented controls. It does not certify deployed beta,
production, provider delivery, browser acceptance, or owner inbox receipt.

## Fixed targets

| Environment | Website / API | Database | Private media |
| --- | --- | --- | --- |
| beta | beta.000h.cojeev.com / feedback-beta.cojeev.com | cojeev-ui-beta-reports (`e2adf4c4-5ab0-434d-b90f-96ea451e3be7`) | cojeev-ui-beta-report-media |
| production | 000h.cojeev.com / feedback.cojeev.com | cojeev-ui-reports (`056bebac-a74e-403f-8d83-9734870d1ec1`) | cojeev-ui-report-media |

Account: `25369d7051a3d996a1bca81f462a1fbc`. Production Worker names remain
`cojeev-ui-registry` and `cojeev-ui-reporting`; beta adds `-beta` to each name.
Beta never uses production D1, media, Turnstile, issue repository, or server
credentials. Production retains the existing GitHub Pages browser origin for
compatibility; beta accepts only its own website and API origins.

The static Next.js export remains unchanged. Custom-domain releases build with
empty `COJEEV_BASE_PATH`. The Pages-compatible build is a local/CI fixture only;
there is no automatic Pages deployment. Disable any Cloudflare Workers Builds
Git integration or historical Pages auto-publisher before enabling this workflow.
An optional owner-driven Pages publish must be deliberate and cannot promote
production or report production acceptance.

## Owner prerequisites

1. Confirm production data bindings against the table above. Verify private
   media and recovery buckets have no custom public domains and r2.dev disabled.
2. Verify GitHub main protection: PR required, required check **Verify release**,
   strict status checks, admin enforcement, conversation resolution, no force
   pushes or deletions. One maintainer means zero additional reviewer approvals
   on PRs; direct pushes are still blocked.
3. Verify `beta` and `production` environments permit only `main`. Production
   reviewer must be `luv-jeri` (ID `56066086`), self-review permitted, administrator
   bypass disabled. Create main-only `operations` without deployment approval;
   it holds only health-scoped tokens, not maintainer credentials.
4. Create a least-privilege Cloudflare token scoped to this account and the
   required Worker scripts, D1, R2, and custom-domain operations. GitHub stores it
   as `CLOUDFLARE_API_TOKEN` separately in beta/production environments. Do not put
   credentials in repository variables or build artifacts.
5. Configure the reporting credentials as **two protected secrets in the same
   environment**, `REPORTING_SECRETS_JSON` and `REPORTING_ADDITIONAL_SECRETS_JSON`.
   Each is a flat JSON object of secret name to value; deployment composes them
   into one set and validates the result.
   - `REPORTING_SECRETS_JSON` is the **base and is never rewritten**. Beta and
     production each already hold their own domain-scoped `RESEND_API_KEY` here.
     GitHub cannot return a secret value, so overwriting this bundle to add a
     binding would destroy that key. Do not replace it, read it back, or rotate a
     key merely to reconstruct it.
   - `REPORTING_ADDITIONAL_SECRETS_JSON` carries the **missing or new** bindings.
     Leave it unset to keep the previous single-bundle behaviour exactly.
   - **The two bundles must not share a key.** A key present in both fails the
     deployment by name before any Cloudflare command runs, rather than one bundle
     silently winning. A malformed, array, `null` or scalar bundle fails the same
     way. No error, log or temporary file ever contains a secret value.

   Across both bundles, beta bootstrap needs `ADMIN_TOKEN`, `HEALTH_TOKEN`,
   `IP_HASH_SECRET`, `TURNSTILE_SECRET`, and a real beta-only
   `TURNSTILE_SITE_KEY`. The first three require at least 32 characters.
   Optional keys: `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, `RESEND_API_KEY`, and
   `RESEND_WEBHOOK_SECRET`. Unknown keys and test Turnstile keys are rejected.
   Keep each token in the owner's approved secret store. Production may supply
   only new/rotated values (or `{}` in both bundles); deployment checks existing
   secret *names* without retrieving values and preserves omitted secrets. The
   existing public production Turnstile site key is preserved in configuration. A
   new production `HEALTH_TOKEN` must be supplied on its first deployment.

   **Rotating a key that lives in one bundle:** write the new value into the
   bundle that already holds that key, keeping every other key in that bundle
   intact. Never add it to the other bundle first — during the overlap the
   deployment would refuse as a duplicate. To move a key between bundles, remove
   it from the source bundle and add it to the target in that order, and confirm
   both bundles still parse as flat JSON objects. Only the `beta` and `production`
   environments hold either bundle; the health-only `operations` environment must
   never receive them.
6. Put the matching `HEALTH_TOKEN` in each deployment environment for live checks.
   Put only `BETA_HEALTH_TOKEN` and `PRODUCTION_HEALTH_TOKEN` in `operations`.
   `GET /v1/admin/health` accepts that environment's health token or ADMIN_TOKEN.
   A health token cannot read reports/media or mutate admin state. Tokens go in
   bearer headers, never URLs. Rotate server secret and matching CI secrets
   together; verify health access and rejection on report/admin mutation routes.
7. Provision Turnstile widgets for exact per-environment hostnames, private beta
   issues in `luv-jeri/cojeev-ui-beta-feedback`, production issues in
   `luv-jeri/cojeev-ui`, and signed GitHub/Resend webhooks. Follow
   [reporting operations](../reporting/OPERATIONS.md) for activation and historical
   backlog review. Configuration intentionally starts with email disabled and an
   empty activation cutoff. Connecting credentials does not authorize draining
   historical work. Production email budget is 95/day and 2850/month; beta is
   5/day and 150/month with tester `unread.fyi@gmail.com`.
8. Configure `cojeev-ui-private-recovery` with an enabled all-prefix expiration
   after at most seven days (604800 seconds), and abort incomplete uploads after
   one day. Both public domain forms must be disabled. The release script checks
   privacy and expiration before backup. Reserve scratch D1
   `cojeev-ui-restore-check` (`63aab6c0-4d49-4423-b3fc-c5c382290af7`), empty and
   unbound to websites/APIs. Do not copy production data to beta.

Read-only GitHub configuration verification (run locally under authorized login):

```sh
gh api repos/luv-jeri/cojeev-ui/branches/main/protection
gh api repos/luv-jeri/cojeev-ui/environments/production
gh api repos/luv-jeri/cojeev-ui/environments/production/deployment-branch-policies
gh api repos/luv-jeri/cojeev-ui/environments/beta/deployment-branch-policies
gh api repos/luv-jeri/cojeev-ui/environments/operations/deployment-branch-policies
```

Check actual returned settings and secret *names* in GitHub Settings. A configured
workflow file alone does not establish repository protection or successful
provisioning. The separate provisioning record is controller-owned.

## Build interface and promotion

The repository variables are `BETA_POSTHOG_PROJECT_TOKEN`,
`PRODUCTION_POSTHOG_PROJECT_TOKEN`, `BETA_ANALYTICS_ENABLED`,
`PRODUCTION_ANALYTICS_ENABLED`, and `PUBLIC_CONTACT_ENABLED`. These are public
build inputs. Contact defaults false until actual inbox routing is verified.
Analytics defaults false; project tokens are public write-only ingestion tokens,
never private PostHog account credentials.

The build tool supplies `NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT`,
`NEXT_PUBLIC_RELEASE_SHA`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REGISTRY_URL`,
`NEXT_PUBLIC_REPORTING_API_URL`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`,
`NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`,
`NEXT_PUBLIC_ANALYTICS_ENABLED`, `NEXT_PUBLIC_CONTACT_ENABLED`,
`COJEEV_REGISTRY_URL`, and `COJEEV_BASE_PATH`. Task 3 consumes the public flags.
Turnstile's site key comes from the API configuration endpoint, not a fake build
substitute. Public `/health` and `/release.json` identify environment and source
commit; they never expose report counts or provider readiness.

PR checks use Node 22.22.0, root lockfile `npm ci`, lint, Next type generation,
types, unit/reporting/hosting/release checks, two isolated environment builds,
example compilation, browser/motion/mobile/marketing/scroll gates, reporting and
analytics browser checks, a hosting CSP check that serves each packaged artifact
through the real website Worker
(`node scripts/release-csp.mjs ENV artifacts/release/ENV`, which fails if the policy
stops permitting the environment's API, EU PostHog or Turnstile, if it permits the
other environment's origins, or if the packaged page loads an unpermitted origin),
and a fresh consumer install from each beta/production artifact. Each artifact and its environment URLs are verified before a temporary
registry copy rewrites dependency URLs to the local test server. This tests the
actual packaged source; real domain routing and absence of cross-origin requests
still require Task 4. Fork PR jobs have no deployment environment or deploy credentials.
All Actions are pinned to upstream commit SHAs.

`build-pair` requires a clean full commit, including no untracked source. It uses
tracked-index snapshots into temporary directories and only public build variables.
Each copied file's Git blob hash must match the index; the index tree must match
the requested commit tree. Symlinks/submodules are refused and executable modes
preserved. Private local files and CI deploy secrets are never copied into the builder. Both bundles
come from that same commit. Each contains only `site/`, `api/`, `website/`, and
`manifest.json`. File inventories and SHA-256 digests are deterministic for the
actual bytes. Builds are identified by source SHA plus their recorded manifest
digest; the tool does not promise byte-identical compiler output across machines.

Only a successful full verification uploads `release-<SHA>`, retained 14 days.
Main deploys beta automatically, performs HTTP/release/header/404/registry and
authenticated delivery-health checks, then waits for production environment
approval. Production downloads this run's already-built production bundle and
checks the saved digest; it does not rebuild or select a newer source revision.
Per-environment deployment concurrency is shared with rollback jobs. Multi-Worker
deployment is sequential, not atomic: if API succeeds and website fails, the job
alerts and health detects version mismatch; use the compatible code rollback.

Local authorized commands (replace uppercase values; no secret values in argv):

```sh
node scripts/release.mjs build-pair FULL_COMMIT_SHA artifacts/release
node scripts/release.mjs verify beta FULL_COMMIT_SHA artifacts/release/beta MANIFEST_DIGEST
node scripts/release.mjs deploy beta FULL_COMMIT_SHA artifacts/release/beta MANIFEST_DIGEST
node scripts/release.mjs live beta FULL_COMMIT_SHA
```

Deployment/recovery requires `WRANGLER_BIN`: an absolute, canonical path outside
the checkout to Wrangler **4.131.1**. CI creates it from the isolated committed
`.github/wrangler-runtime` lock using `npm ci --ignore-scripts`. This fixes the
sharp/libheif advisory in the previous 4.130.0 deployment runtime without changing
the root application dependency lock. The owner must approve any local canonical
CLI installation/change. Reporting secrets travel to `--secrets-file /dev/stdin`;
no secret file is written. Wrangler logs use a temporary symlink to `/dev/null`,
sanitization is enabled, and subprocess diagnostics are not published.

## Recovery and code rollback

Every migration deployment first exports D1 to a private temporary directory,
refuses exports above 25 MiB, uploads SQL and a digest receipt to private R2, and
downloads the SQL again to verify its bytes before applying migrations. No backup
or receipt is a GitHub artifact. Seven fixed weekday slots per environment
(`beta/day-0.sql` through day-6, likewise production) bound storage to 350 MiB plus
small receipts. A later deployment on the same UTC weekday replaces that slot;
retention is the latest backup for each weekday, not every deployment. The bucket
is dedicated to these slots; other writers must not use it. Export failure,
oversize, missing retention, public exposure or failed readback stops migration
and produces an independent deployment alert. This D1 backup does not snapshot
private R2 media; never imply that it restores attachments.

Run **Isolated recovery check** from main with an environment and weekday slot.
Production requires owner approval. The tool validates the private receipt,
seven-day age, size and SQL digest, refuses a nonempty scratch database, restores
only into the fixed scratch UUID, then checks `PRAGMA quick_check`. Local
equivalent: `node scripts/operations.mjs restore beta beta/day-6.sql`.
The scratch database retains private restored data for owner inspection; remove
it promptly through an explicitly approved scratch-only cleanup before another
test. No automatic overwrite or production restore command exists. Private
temporary files are removed on success and failure. An interrupted runner can
retain temporary bytes until the hosted runner is destroyed; never upload them.

For code rollback, locate a successful main push **Verify and release** run with
its artifact still retained. Record run ID, full commit, and the environment's
manifest digest from its build log. Launch **Code rollback** from current main,
enter those identities, and explicitly acknowledge the schema boundary.
Production requires owner approval. The job verifies repository/run provenance,
downloads the old artifact, checks every file and exact target, and redeploys
both API and website without applying migrations or restoring data. It then
checks live identities and alerts on failure.

The currently reviewed boundary is additive `0002_safe_delivery.sql`; rollback
artifacts must contain it and no later migration. Do not roll back below Task 1,
and do not acknowledge compatibility after an incompatible later migration.
Future schema changes require updating the reviewed boundary before using this
workflow. The old artifact contains its original plain-text configuration; review
activation settings before rollback. Additive supplied secrets are preserved.
Expired/missing artifacts, unknown environments, wrong digests, or untrusted runs
are refused. Cloudflare version rollbacks also do not restore D1/R2 state.

## Monitoring and live acceptance

**Operations health** runs about every 15 minutes (GitHub scheduled jobs can be
delayed). It checks both public identities and each API's authenticated health.
Pending/processing work older than 30 minutes, failed/review-required jobs, quota,
provider misconfiguration after activation, and HTTP/schema failures open or update
a sanitized GitHub issue; recovery closes it. That issue is found by a single query
for open issues labelled `operations-alert` plus a per-environment marker comment,
so the label must not be renamed or removed from an open alert; the alert path
creates the label if it is absent. Intentionally held historical jobs
do not alone trigger an incident. Responses, report titles, addresses, tokens and
payloads are not included. Deployment and recovery failures alert through the
same GitHub path, independent of Resend.

**The scheduled health job is disabled until it is deliberately activated.** Its job
condition requires the repository variable `OPERATIONS_HEALTH_ENABLED` to equal `true`
in addition to `main`; a missing or `false` value keeps the job skipped, including a
manual `workflow_dispatch` run. Set that variable only after both beta and production
are actually live and `BETA_HEALTH_TOKEN` and `PRODUCTION_HEALTH_TOKEN` are present in
the `operations` environment and accepted by each API. Setting it earlier files public
alerts for environments that do not exist yet. Activation is a required launch step:
until the variable is set, no scheduled monitoring runs at all. This gate covers only
the scheduled sweep — the immediate deployment and recovery failure notifications in
`verify.yml`, `rollback.yml` and `recovery.yml` are independent of it and must never be
suppressed.

**Before merging this rollout branch to `main`, provision and verify the Task 4.3
credentials.** A push to `main` deploys beta automatically, so the beta environment
secrets and the CI deployment token must already exist and be verified at that point;
merging first and configuring afterwards means the first automatic beta deployment
fails. Do not add a bypass, and do not silence the resulting failure alerts.

Alerts mention `@luv-jeri`; actual delivery follows the owner's GitHub notification
preferences. Delivery to `unread.fyi@gmail.com` is not configured or verified by
these files. The owner must confirm their GitHub email/routing preference and test
one controlled failure plus recovery. GitHub scheduling outages cannot be detected
by a job that never runs; review workflow freshness in GitHub as part of ownership.

Task 4 must exercise real beta reporting, Turnstile, private attachments/inbox,
GitHub mirroring, delivered email and actual inbox receipt, provider failure paths,
clean consumer installs, search/deep links/canonical URLs, PostHog EU events and
privacy stops, keyboard/motion interactions, failed promotion, private backup and
isolated restore, code rollback, and independent alert recovery. Owner approval
then promotes the prepared production SHA and permits one labelled production
smoke report. Local tests and dry runs do not replace those checks.

The CSP gate above checks the emitted header against the packaged bytes; it runs no
browser. Live acceptance therefore still requires, on beta and before any promotion:
load `https://beta.000h.cojeev.com/` in a browser with devtools open, submit one
report, and confirm an empty console of CSP violations, a rendered Turnstile widget
that returns a token, a successful `POST` to `https://feedback-beta.cojeev.com`, and
PostHog requests reaching `https://eu.i.posthog.com` only while analytics is on.
Any `Refused to ...` console entry blocks promotion. Task 4 owns that check.

Workers run before static assets to guarantee headers and private-path refusal;
this uses Worker request quota. Monitor free allowances; do not automatically
upgrade. CSP permits Next inline bootstrap, Turnstile and EU PostHog, while
restricting connections to the matching API; beta/admin are noindex, hashed
framework assets immutable, HTML revalidated, and unknown routes retain 404.

References: [Cloudflare environments](https://developers.cloudflare.com/workers/wrangler/environments/),
[Worker-first asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/),
[rollback limitations](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/),
[R2 lifecycle API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/lifecycle/methods/get/),
[Wrangler advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
