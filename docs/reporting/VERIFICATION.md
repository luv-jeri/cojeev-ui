# Reporting verification — 9 September 2026

The reporting implementation is in this checkout. The production API, D1 database, private R2 bucket, managed Turnstile widget and GitHub Issues webhook are deployed. Website publication, a Worker GitHub token and the sender domain remain separate activation steps.

## Behavior checked

| Check | Result |
| --- | --- |
| Shared contracts and browser client behavior | 11 tests passed |
| Worker integration against real local workerd, D1 and R2 | 18 tests passed |
| Chromium browser journeys against the local Worker | 9 passed; no page errors |
| Full repository TypeScript | Passed |
| Full repository lint | Passed |
| Production static export | Passed; 170 pages, including `/requests` and `/feedback-admin` |
| Worker deployment and cron | Passed |

The Worker tests cover atomic intake and stable retries; invalid payload rejection; authenticated media upload, byte signatures and hashes; distinct demand; completion fan-out; already-available component links; production protection; signed release webhooks and replay handling; retention; GitHub reconciliation; uncertain provider responses; email rate limits; concurrent delivery claims; expired leases; and a disabled provider's backlog not blocking another provider.

The nine browser journeys cover:

1. Text and original attachment files survive closing the panel and reloading through IndexedDB.
2. A real server 422 for a private detail in a public title returns to an editable draft without losing fields or files.
3. A response deliberately interrupted after acceptance retries the same UUID, token and payload, with the report in D1 and attachment in R2.
4. Pointer element selection intercepts navigation; keyboard selection and Escape restore the panel.
5. Full-page capture extends beyond the viewport and excludes a `data-private` region, verified by image pixels.
6. Viewport capture still works on a page taller than 24,000 pixels.
7. Explicitly reviewed diagnostic warnings and theme survive a reload; secrets redact; cropped screenshot upload succeeds.
8. The maintainer deep link opens its report after authentication; private read, status save and lock work.
9. Request and bug forms fit a 390-pixel mobile viewport in light and dark modes.

Browser evidence is in `.work/reporting/browser/results.json` and the adjacent PNGs. Desktop request/bug, crop and mobile request/bug/board screenshots were visually inspected. These checks use Chromium and simulated mobile input; they are not proof of every browser or physical device.

## Production evidence

- API: `https://sahajiv-ui-reporting.unread-fyi.workers.dev`
- Worker version: `d755a819-019c-4b6e-bd3c-13b3d48f2c2b`
- D1: `sahajiv-ui-reports`, migration `0001_reporting.sql` applied remotely.
- R2: `sahajiv-ui-report-media`, private.
- Turnstile: managed widget restricted to `luv-jeri.github.io`.
- Cron: every five minutes, for delivery and retention.
- GitHub webhook: `676398504`, Issues events only; GitHub reported a successful HTTP 202 callback.
- GitHub Actions variable `REPORTING_API_URL` points to the deployed API.

Read-only live checks verified config and public-board HTTP 200 responses, exact CORS, unauthorized admin HTTP 401 and authenticated admin HTTP 200. A synthetic request without Turnstile was rejected with HTTP 403 before storage. Evidence is in `.work/reporting/live-smoke.json`. No successful public live submission is claimed: the updated website has not been published, and its real browser challenge has not been exercised on the hosted origin.

## Activation still needed

- **GitHub issue creation:** provide a dedicated repository token through the terminal, or explicitly authorize storing the current broader GitHub login as a Worker secret. The latter has not been done. The webhook is ready; real automatic issue creation remains unverified. Optional GitHub Projects association is implemented but no Project ID is configured.
- **Email:** the sender is `hello@your-domain.invalid`, and sending is disabled as requested. Templates and delivery recovery are tested with provider adapters. Actual email provider acceptance and inbox receipt remain unverified until the domain is verified and email enabled.
- **Website:** the new UI remains in the working checkout. Its GitHub Pages build is wired to the API environment variable. No feature commit or push was made from this task, preserving the extensive concurrent library edits.

Follow [README.md](README.md) for local preview, maintainer access, provisioning and activation commands. Credentials are in ignored private files; no credential value belongs in this document or in Git.
