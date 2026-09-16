# Owner-approved expedited release — B02-6

On 14 September 2026, Sanjay explicitly requested deployment of the current
library to beta and production without more automated test runs. This supersedes
the full-suite requirement for this release only. It is not a claim that the
failed checks passed, and does not close the wider quality or launch checklist.

## Exact scope

The repository variable `OWNER_DEFER_TESTS_TREE` records the reviewed Git source
tree. Only an identical tree from this repository can use the exception. Missing,
different or malformed values and fork pull requests retain full verification.
Commit identities and artifact hashes remain separate and are never restamped.

Deferred: lint, standalone typecheck, unit/hosting/reporting tests, example checks,
catalogue/motion/mobile/marketing/scroll/browser checks, CSP browser checks and
fresh consumer installation. The workflow summary explicitly records NOT RUN.
No component code or unfinished B02-5 test correction is included here.

Update C04-1: [native D1 recovery](2026-09-14-first-launch-recovery.md) replaces
the extra R2 export as the pre-migration safeguard. No data is deleted; the
separate external-snapshot transport investigation is deferred until after launch.

Still required: locked dependencies and clean-source production builds, separate
beta/production artifacts, URL/environment and hash validation, private database
recovery bookmark before migrations, normal protected-main merge, beta live health checks,
Sanjay's protected production approval, and production live health checks. Email
and analytics activation flags are unchanged. No historical delivery is enabled.

## Known deferred findings

- Run 34790623446 failed Agent Chat completion focus: the test can reach Stop
  after the demo completes and removes the button. A local delayed-driver
  correction passes and a deliberately disabled focus restoration still fails;
  that unmerged correction remains separately preserved as B02-5.
- Shape Scene's interaction and six layout checks passed; its shared preview
  controls check failed remotely but passed locally. Cause remains unconfirmed.
- The full final-source suite and live consumer acceptance are not complete.

## Delivery and follow-up

Use a scoped Conventional Commit and PR for this exception, then the existing
combined release PR. Do not bypass branch protection or approve the protected
production environment on Sanjay's behalf. Beta precedes production within the
same release so its live failure cannot silently promote to production.

Clear `OWNER_DEFER_TESTS_TREE` after the approved release. Any different source
tree automatically restores the full policy; future waivers need fresh owner
authorization. Resume B02-5 after launch. Repository root cleanup remains I04-1,
after deployment, and shadcn submission must disclose deferred consumer evidence.

Verification for this checkpoint: source-diff and workflow syntax review only;
no automated tests run, per the owner's instruction. Deployment status is tracked
by the actual GitHub release jobs, not by this document.
