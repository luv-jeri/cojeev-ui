# Optional analytics launch hold

Checkpoint E03-1, a child of E03's explicit instruction to keep optional analytics off until its basis and behavior are verified.

## Account configuration changed

On 13 September 2026, the primary re-read these repository variables for `luv-jeri/cojeev-ui`, changed only the two enable flags, then verified the result through GitHub:

| Repository variable | Before | Verified after |
| --- | --- | --- |
| `BETA_ANALYTICS_ENABLED` | `true` | `false` |
| `PRODUCTION_ANALYTICS_ENABLED` | `true` | `false` |
| `PUBLIC_CONTACT_ENABLED` | `false` | `false` — untouched |

Public project tokens, PostHog project configuration/data, credentials, repository protections and deployment approvals were untouched. No website was deployed or changed by this action.

## What this proves — and does not

`scripts/release.mjs` supplies these enable flags to the environment-specific build. `scripts/release-config.mjs` validates their boolean strings and pins the EU analytics host; `lib/analytics/client.ts` requires enablement, an allowed host and a token before capture.

The verified variables control future builds; they do **not** rewrite an already-built artifact or establish the configuration captured by an already-running workflow. PR #15's run `34711839842` was already active. Inspect the actual resulting environment artifacts before promotion, and do not assume this variable change retroactively disabled their embedded analytics. Final release acceptance must use the exact reviewed commit and actual build configuration.

This is not proof that the live site currently sends no analytics. Network behavior on the final deployed release remains E04 acceptance. No claim is made here that cookieless tracking is legally exempt, that consent is universally required, or that a policy has been approved.

## Verification and rollback

Commands used: `gh variable list` (limited to these three flags), `gh variable set BETA_ANALYTICS_ENABLED --body false`, and the matching production command, all scoped to `luv-jeri/cojeev-ui`. Final readback showed the values above. No secret values were read or printed.

No component catalogue/build was rerun for this account-configuration record. The optional-analytics hold remains until E03's operator/jurisdiction/basis decision and E04's network/privacy verification are complete. Re-enabling requires recording that decision and a deliberate future build; merely reverting this document does not change account variables or deployed bytes.
