# Promotion failure evidence — 13 September 2026

Checkpoint: B06. **Negative checks passed; successful live release and rollback exercises remain pending.** No deployment, migration, provider request or production-data change was made by these local checks.

## Exact source and focused verification

Source: `5358d25aded2c7b030d394e289475bc030a82578`.

Node: `22.22.0`. Existing lock-installed dependencies were reused read-only from the local analytics fixture. No installation, application build or component catalogue sweep was needed.

```sh
node --test --test-name-pattern='manifest verification detects|tampered artifacts and failed backup|rollback run provenance rejects' tests/release.test.mjs tests/operations.test.mjs
```

Result: **3 tests passed, 0 failed**, 67.6 ms reported by the test runner. This is evidence for these three selected tests only, not a complete release-gate pass.

| Check | What the executable assertion proved |
| --- | --- |
| Wrong environment and modified manifest contents | Manifest verification rejects the wrong environment and altered artifact bytes; creating an artifact containing the test's forbidden private file is refused. |
| Failed backup or tampered website artifact | `deployRelease` rejects the request and the injected deployment-command recorder remains empty: no migration or deployment command is called. These are synthetic local artifacts and fake secrets, not live account tests. |
| Untrusted rollback source | A trusted successful main-run fixture is accepted; changing its conclusion to failure or its repository to a fork is rejected before artifact download. |

Relevant implementation: `scripts/release.mjs` verifies the artifact before backup/migration/deployment. `scripts/release-rollback-run.mjs` requires a successful push run from this repository's `main`, with the requested commit and release-workflow path.

## Observed GitHub failure — historical evidence, not a new failure injection

[Run 34688330949](https://github.com/luv-jeri/cojeev-ui/actions/runs/34688330949), created 12 September 2026 at 10:23:44 UTC, was re-read through GitHub on 13 September:

- Head: `d345a58bebad8276f05b68c0facea12d66bd6e58`.
- Event: `pull_request`.
- Verify release: **failure**.
- Beta deployment: **skipped**.
- Production deployment: **skipped**.

This confirms that the failed run did not execute either deployment job. **It does not independently prove a failed main-branch promotion was blocked:** pull requests are excluded from deployment regardless of test outcome. The current workflow separately declares beta's dependency on verification and production's dependency on both verification and beta. The focused negative tests above establish the artifact/backup rejection behavior without deliberately breaking main.

## Still required before B06 is fully closed

- A successful combined release candidate with recorded artifact identities (B02/B04).
- Beta and production live acceptance, with the owner's protected production approval.
- The planned live recovery/rollback exercise and recorded resulting release identities; synthetic failure checks are not proof of a restored live service.

No full CI rerun was requested for this evidence-only document. A later substantive release-candidate change still requires the applicable release acceptance.
