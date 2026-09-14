# Restart recovery — W02

The 13 September restart removed the temporary checkout directories and stopped the local server and agent sessions. Pushed source and GitHub evidence survived. No original dirty source was copied or overwritten.

## Restored workspace

- Persistent checkout: `/Users/sanjaykumar/Developer/cojeev-ui-release`.
- Restored release: `5e3570fb0762d474fbd4f6a29efd763811e3100a` on `chore/production-beta`.
- Dependencies restored with Node 22.22.0 and `npm ci --no-audit --no-fund`; 973 packages installed. Existing deprecation warnings remain; no dependency upgrade was made.
- Local preview: `http://127.0.0.1:4321/`; Next development server reported Ready, and `/docs/radio-group/` returned HTTP 200. This is development availability, not a new full runtime or deployment certification.
- Local analytics and reporting API are disabled. No report or email was sent.

## Accepted checkpoints

| Checkpoint | Merge | Evidence |
| --- | --- | --- |
| W01 workflow | `3730e236ac45957be29ffcf54e89de5fad1b28ff` | PR #12 merge re-read |
| B01-3 scoped component checks | `0e6079483a142d0aba140b1c0857b8777d34f314` | PR #27; focused run 34740348050 passed |
| H03-2 choice polish | `55bbcb49a91734ab4323bbd7edb80b96cb60394a` | PR #25; focused run 34740914190 passed; owner accepted local preview |
| V50-1 Accordion polish | `5e3570fb0762d474fbd4f6a29efd763811e3100a` | PR #26; focused run 34740919789 passed; owner accepted local preview |

PR #27 had merged before its focused job completed because the assembly branch did not enforce that check. The job subsequently passed, re-read after restart. PR #25 and #26 were merged only after explicit success read-back; no administrator bypass or protection change was used. Future assembly merges must likewise wait for explicit success rather than assuming `--auto` will wait.

## Continuing work

Two Claude Opus 1M/high investigations are assigned independently: chart Escape dismissal, and attachment/drawer recovery. Both are read-only diagnoses until primary review. Keep their reports in the persistent checkout's ignored `.superpowers/` directory; temporary session metadata is not durable evidence.

The full-candidate jobs automatically started by the two polish merges were cancelled deliberately while the previously identified runtime failures are investigated. Cancelled runs are not passes. No beta or production deployment, account mutation, registry submission or outreach occurred. B01/B02/B04 and live acceptance remain open.

This checkpoint changes documentation only. Verification is diff, links and recorded evidence; no new catalogue or build is required for this status reconciliation.
