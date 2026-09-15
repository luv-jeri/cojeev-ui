# C08-2: screenshot capture hotfix for beta

Owner request, 14 September: repair the reported `appendChild` screenshot error
and deploy directly to beta, without a package-version bump or another full
catalogue/release run. Production and reporting service configuration are out of
scope. The original report draft and attachments must remain unchanged.

The patch is recorded on a dedicated `fix/c08-2-capture-sandbox` branch. Only the
beta website is deployed; the reporting API remains at its existing revision.
Source commits and the website release manifest identify the hotfix. This is not
a main merge or production release. Required branch protections remain intact.

## Verification scope

Use a focused browser reproduction of screenshot capture and check the actual
beta capture UI after publication. Build only the beta artifact. Do not run the
full component catalogue, unrelated reporting-service tests, database migrations,
or a production build. Live email delivery is a separate pending task.

The existing combined health checker assumes website and API revisions are
identical, so it will report `release-mismatch` for this intentional website-only
hotfix. Scheduled operations health is currently not enabled. Do not falsify the
API revision or change monitoring protections to hide this difference.

## Outcome

The screenshot library creates a measuring iframe by assigning `srcdoc` and
immediately reads its body. The asynchronous navigation can temporarily leave
that body null. Capture now supplies a standards-mode frame written in place,
without that navigation, and removes it on success, cancellation or setup error.

The focused browser regression reproduced the exact error without the patch;
with the patch all three assertions passed: real PNG capture, private-content
redaction, and cancellation cleanup. The browser check took 1.5 seconds total;
the affected typecheck passed (3.2 seconds warm). Diagnosis and implementation
time are separate from these check durations. No full suite was run.

Deployment is pending at this source commit. Record the actual beta release
identity and live capture result in the launch ledger and PR after publication.
The draft PR intentionally skips automatic CI for this owner-requested direct
beta hotfix; it must not merge until the applicable protected checks are met.
