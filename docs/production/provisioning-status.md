# Live provisioning record

Updated 2026-09-12. These are provisioned resources, not launch acceptance.

| Resource | Verified state |
| --- | --- |
| Cloudflare account | `25369d7051a3d996a1bca81f462a1fbc` |
| cojeev.com zone | `12e8b50b78c2c6af9e28406fede10d4e`, Free |
| Production reporting D1 | Existing `cojeev-ui-reports`, `056bebac-a74e-403f-8d83-9734870d1ec1`; untouched |
| Production media | Existing private `cojeev-ui-report-media`; untouched |
| Beta feedback repository | Created `luv-jeri/cojeev-ui-beta-feedback`; private visibility verified |
| Beta D1 | Created `cojeev-ui-beta-reports`, `e2adf4c4-5ab0-434d-b90f-96ea451e3be7`, APAC; empty |
| Beta media | Created `cojeev-ui-beta-report-media`, Standard; no public access enabled |
| PostHog | New EU Cloud project `272306`, renamed `000h by Cojeev`, Free plan; no SDK or GitHub agent integration installed |
| PostHog privacy | Autocapture, web-vitals capture, dead-click capture and session recording disabled; discard client IP enabled; no events connected yet |
| Resend | `cojeev.com` verified by provider; Tokyo region; separate domain-scoped sending keys created and stored in the protected beta/production `REPORTING_SECRETS_JSON` secrets; webhook activation and actual delivery not verified |
| Contact forwarding | Active `hello@cojeev.com` → already-verified `unread.fyi@gmail.com`; catch-all remains disabled; actual inbox delivery still to test |
| Private recovery storage | Created `cojeev-ui-private-recovery`, Standard; no public access enabled; all-prefix seven-day object expiry and one-day incomplete-upload expiry verified; empty |
| Isolated restore database | Created `cojeev-ui-restore-check`, `63aab6c0-4d49-4423-b3fc-c5c382290af7`, APAC; empty, not beta or production |
| GitHub beta environment | Main-only deployment branch policy, no admin bypass |
| GitHub production environment | Main-only deployment branch policy; `luv-jeri` required reviewer; self-approval permitted, no admin bypass |
| GitHub operations environment | Main-only deployment branch policy, no admin bypass; intended for read-only health credentials, no secrets configured yet |
| Main branch protection | Active: strict `Verify release` required check, PR required, admins enforced, force pushes/deletions prohibited, conversations resolved; zero additional PR approvals for single-maintainer operation |
| Public build configuration | Environment-specific public PostHog project variables configured; analytics enabled; public contact link explicitly disabled until actual inbox verification |
| Historical public issues | Fresh inventory returned zero issues; no existing public report titles to sanitize |

Production and beta have not been deployed from this release branch. No production migrations or old delivery jobs have been run. Browser account login is not a usable deployment credential. The owner authorized narrowly scoped credential creation and team-wide Resend webhooks that discard unrelated provider IDs; the remaining issue/CI credentials are not yet provisioned. Beta domains/certificates, Turnstile, CI gates, live acceptance and rollback remain outstanding.

Fresh read-only checkpoint: main remains `49292870ca75712b558baa3b802e8f2469750815`; both beta hostnames fail DNS resolution, while the old production website/API `/health` routes return 404. Each GitHub environment lists `REPORTING_SECRETS_JSON` and no other secret. Its Resend-only value must be preserved when adding bootstrap credentials: local creation buffers were reset and are no longer available. Never overwrite it with an incomplete replacement or retrieve/rotate keys merely to reconstruct it.

The owner is away; browser account operations currently return `User unavailable`. Local homepage, release fixes and marketing research continue independently. No registry submission or outreach has occurred.

GitHub notification delivery to the chosen inbox remains unverified. The existing account-wide notification preference has not been changed; custom repository routing is not available for this personal repository. Do not treat an alert issue or mention as proof of arrival at the chosen inbox.

The release-checkout native listbox passed keyboard changes from Daily to Weekly to Off, skipping the disabled Monthly option. Browser-owned popup keyboard selection is still pending an unlocked Mac and final live release check. This partial check is not deployment certification.
