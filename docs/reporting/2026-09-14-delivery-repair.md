# Report delivery repair — 14 September 2026

Checkpoint: C10-1. This is a repair record, not a claim of live acceptance.

## Confirmed before repair

- Both reporting environments advertised `emailEnabled: false` and had no delivery activation cutoff.
- Production authenticated health reported six held outbox jobs (not six reports). GitHub was configured; email and the Resend signing secret were not ready.
- The sender domain `cojeev.com` was verified in Resend, but its webhook list was empty.
- New reports queued reporter acknowledgement and GitHub jobs, but no maintainer email.
- Production had an active GitHub issue webhook. Beta had none.
- Review found the Resend handler stored recognized event IDs without checking that the message belonged to this reporting environment. This needs correction before shared-account webhook activation.

## Account configuration completed

- Created beta GitHub webhook **678879958** on `luv-jeri/cojeev-ui-beta-feedback` for `issues` events only, with TLS verification and the existing beta signing secret.
- Destination: `https://feedback-beta.cojeev.com/v1/github/webhook`.
- GitHub subsequently recorded HTTP **202**. This proves acknowledgement, not a complete issue lifecycle.
- Production and the old inactive webhook were left unchanged. No historical job was retried or released.

## Deployment secret wiring

The release and rollback workflows pass a separate protected environment secret,
`RESEND_WEBHOOK_SECRET`, into the existing validated deployment bundle. Neither
existing credential bundle is rewritten. Duplicate keys stop deployment rather
than silently choosing a value. Missing standalone values preserve the existing
bundle behavior.

Focused verification of this boundary: two checks passed in **0.15 seconds** after
an initial expected missing-export failure. No component catalogue was run for this
configuration change. Provider setup, activation and live report acceptance remain
separate steps; do not mark them complete from these checks.

## Remaining acceptance

- Configure both Resend hooks and protected signing secrets, then verify their presence.
- Review the new owner-notification and webhook-isolation code.
- Release a fixed activation cutoff without backdating it to release historical work.
- Submit a clearly labelled new beta report: receipt, private inbox, issue, reporter acknowledgement, owner notification, and signed status updates.
- Obtain protected production approval and repeat the live journey once on production.
- Confirm actual inbox receipt separately from provider acceptance/delivery status.
