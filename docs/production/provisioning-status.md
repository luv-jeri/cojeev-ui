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
| Resend | `cojeev.com` verified by provider; Tokyo region; sending keys not created yet |
| Contact forwarding | Active `hello@cojeev.com` → already-verified `unread.fyi@gmail.com`; catch-all remains disabled; actual inbox delivery still to test |
| Private recovery storage | Created `cojeev-ui-private-recovery`, Standard; no public access enabled; all-prefix seven-day object expiry and one-day incomplete-upload expiry verified; empty |
| Isolated restore database | Created `cojeev-ui-restore-check`, `63aab6c0-4d49-4423-b3fc-c5c382290af7`, APAC; empty, not beta or production |
| GitHub beta environment | Main-only deployment branch policy, no admin bypass |
| GitHub production environment | Main-only deployment branch policy; `luv-jeri` required reviewer; self-approval permitted, no admin bypass |
| GitHub operations environment | Main-only deployment branch policy, no admin bypass; intended for read-only health credentials, no secrets configured yet |
| Main branch protection | Active: strict `Verify release` required check, PR required, admins enforced, force pushes/deletions prohibited, conversations resolved; zero additional PR approvals for single-maintainer operation |
| Public build configuration | Environment-specific public PostHog project variables configured; analytics enabled; public contact link explicitly disabled until actual inbox verification |
| Historical public issues | Fresh inventory returned zero issues; no existing public report titles to sanitize |

Production and beta have not been deployed from this release branch. No production migrations or old delivery jobs have been run. Browser account login is not a usable deployment credential. Scoped credential creation awaits owner approval. Beta domains/certificates, Turnstile, CI gates, live acceptance and rollback remain outstanding.

GitHub notification delivery to the chosen inbox remains unverified. The existing account-wide notification preference has not been changed; custom repository routing is not available for this personal repository. Do not treat an alert issue or mention as proof of arrival at the chosen inbox.

The release-checkout native listbox passed keyboard changes from Daily to Weekly to Off, skipping the disabled Monthly option. Browser-owned popup keyboard selection is still pending an unlocked Mac and final live release check. This partial check is not deployment certification.
