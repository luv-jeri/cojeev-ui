# First-launch recovery — C04-1

The owner rejected making an extra backup system a prerequisite for launching
an unused product. Run 34797303429 built the release successfully, but failed
during the subsequent R2 snapshot operation before either environment deployed.
The wrapper suppressed the underlying response; the exact R2 error remains
unconfirmed. It is not presented as a diagnosed permission failure.

## Actual state, checked without reading report contents

On 14 September, beta had no application tables. Production had two reports,
two attachment records, one topic and four queued jobs. Their contents were not
read, their origin is unconfirmed, and no records were deleted or delivered.

Both databases successfully returned current D1 Time Travel bookmarks through
the existing authenticated CLI. [Cloudflare documents Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
as automatic recovery with no extra backup charge; the free-plan window is
seven days. An extra R2 export is unnecessary for the immediate deployment.

## Change

Before migrations, validate the exact environment/database binding and retrieve
a D1 recovery bookmark. Reject missing or malformed bookmarks. The deployment
log records only the environment and bookmark, never report contents or secrets.
No separate backup upload or empty-database export occurs. Existing explicit
R2 snapshot/isolated-restore tools remain available but are not a deployment
prerequisite. Their transport issue and recovery exercise remain open follow-ups.

Site/API artifacts, checksums, additive migrations, environment isolation,
analytics/email hold flags and protected production approval are unchanged.

## Recovery

The recorded bookmark identifies the database state before migration. A D1
Time Travel restore overwrites the database in place and needs a separate,
explicit recovery decision; it is never performed automatically. It does not
restore R2 attachments or code versions. Keep code rollback and database
recovery distinct. For longer independent retention, finish the optional R2
snapshot setup after launch rather than making it block first publication.

## Verification and release exception

Actual read-only row counts and Time Travel info succeeded for both databases.
Source diff and JavaScript syntax reviewed. No automated tests or consumer
installations run, per Sanjay's explicit launch instruction. The exact-source
B02-6 deferral is updated to include this scoped operations-only correction;
component source remains unchanged. Deployment success is established only by
the subsequent GitHub deployment run, not by this document.
