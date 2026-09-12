# B03 — release controls verified in source

Checkpoint B03, inspected on 12 September 2026. This is a source and GitHub-configuration audit, not a deployment or live-service certification. The reviewed base is `d266f039cc716890e00f4c23f314a045ec6051e9`, including the B03-1 installer pin in [PR #5](https://github.com/luv-jeri/cojeev-ui/pull/5). This checkpoint changes documentation only.

## Verified controls

| Control | Observed evidence | Result |
| --- | --- | --- |
| Fixed build tools | Verification selects Node 22.22.0 and installs the root lockfile with `npm ci`. Actions in all four workflows use full 40-character commit references. The deployment runtime uses its separate committed lockfile, with Wrangler 4.131.1; artifact builds check root Wrangler 4.130.0. | Present; these are separate runtimes, not an implicit upgrade. |
| Fresh consumer installer | B03-1 replaces both floating installer calls with `shadcn@4.21.0`. Its real external-consumer installation/build and primary rebuild passed. | Verified in [B03-1 evidence](2026-09-12-phase-1-release-controls.md). Consumer dependency ranges and upstream initialization resources remain network-dependent. |
| Pull-request isolation | The verification job has read-only repository permissions, no deployment environment and no deployment secret bindings. Checkout does not persist credentials. Beta and production jobs require main and exclude pull-request events. | Fork pull requests cannot obtain deployment credentials through these jobs. Public build settings are not secret credentials. |
| Main protection | The live GitHub configuration requires a pull request, strict `Verify release`, and resolved conversations; administrators are included. Force pushes and deletion are disabled. Stale reviews are dismissed. | Present. Zero additional approving reviews accommodates the single maintainer; it does not waive checks. |
| Production approval | Both deployment environments allow only main and disallow administrator bypass. Production names `luv-jeri` as required reviewer and permits owner self-review. | Present. An agent review is not the owner's production approval. |
| Serialized promotion and rollback | Deploy and rollback share `deploy-beta` or `deploy-production`, with cancellation disabled. Production depends on verification and beta. | Present. A code rollback does not restore database or attachment data. |
| GitHub Pages compatibility | The verification workflow still builds the Pages fixture. The workflow inventory has no separate Pages publication job. | Compatibility retained without an independent automatic publication path. |
| Commit and artifact identity | Packaging rejects dirty or mismatched source, verifies tracked bytes against the committed index, and stamps each environment. Promotion verifies manifest identity and all packaged bytes, then deploys those files without rebuilding. | Implemented and covered by local tests; the final run's actual digests belong to B04. |
| Recovery guards | Deployment tests stop before migration when a backup fails. Rollback validates the source run and the reviewed migration boundary. Restore refuses a nonempty scratch database. | Local fixtures passed; no live recovery operation was performed. |
| Independent monitoring | The health workflow requires main plus `OPERATIONS_HEALTH_ENABLED=true`; alerts use GitHub, independently of Resend. The enabling variable is currently absent. | Intentionally not active. Activation and real alerts remain a later operations checkpoint. |

Sources: `.github/workflows/verify.yml`, `health.yml`, `rollback.yml`, `recovery.yml`; `.github/wrangler-runtime/package*.json`; `scripts/release.mjs`, `release-manifest.mjs`, `release-config.mjs`, `release-rollback-run.mjs`, `operations.mjs`, `operations-health.mjs`, and `verify-install.mjs`.

## Local verification

On the reviewed base, the primary agent ran:

```sh
node --test tests/release.test.mjs tests/operations.test.mjs
```

Node 22.22.0: **25 passed, 0 failed, 0 skipped**. These executable cases cover mismatched environment settings, tampered manifests, dirty source, credential-bundle validation, failed backups, rollback provenance, nonempty recovery targets, health-response validation and sanitized alerts. Provider operations are injected fixtures: a passing test is not a real Cloudflare backup, restore, deployment, email or issue submission.

The earlier root suite on this combined source also passed 343/343. Full remote verification remains a separate B02 acceptance condition. No cancelled or unfinished run is treated as passing.

## Account prerequisites for the later deployment phase

The authenticated GitHub CLI works. The browser inventory returned **User unavailable**; this does not establish whether the Mac is locked or whether another provider is signed in. Only secret names, never values, were inspected.

| Location | Already listed | Still missing from the protected environment |
| --- | --- | --- |
| GitHub beta | `REPORTING_SECRETS_JSON` | `CLOUDFLARE_API_TOKEN`, `REPORTING_ADDITIONAL_SECRETS_JSON`, `HEALTH_TOKEN` |
| GitHub production | `REPORTING_SECRETS_JSON` | `CLOUDFLARE_API_TOKEN`, `REPORTING_ADDITIONAL_SECRETS_JSON`, `HEALTH_TOKEN` |
| GitHub operations | No secrets listed | `BETA_HEALTH_TOKEN`, `PRODUCTION_HEALTH_TOKEN` |

There are no repository-level secrets. An existing bundle's name does not prove which keys it contains: preserve it rather than replacing it with an incomplete reconstruction. Before provisioning supplemental values, follow [the operations runbook](OPERATIONS.md), including its overlap rejection.

Before beta deployment, verify the isolated real Turnstile widget and required admin/health/IP-hash, repository-scoped GitHub and signed webhook bindings; provision only those confirmed missing. Production must retain its existing Worker secrets and check their names before adding missing bindings. These values must be provisioned through protected secret entry, never committed or pasted into evidence.

Repository auto-merge is disabled. No setting was changed. An ordinary checkpoint merge is permitted only after the same required checks, review and acceptance conditions; no administrator bypass is permitted.

## Completion boundary

This inspection verifies the listed controls and records the missing account prerequisites. B03 stays open until this scoped PR is reviewed, its required checks succeed and it is merged. B02/B04, actual beta/prod deployment, real mail/report journeys, owner production approval and live recovery remain separate checklist items. No application, homepage, live account setting, secret, private report, database or registry listing was changed. Rollback for this documentation checkpoint is a scoped revert.
