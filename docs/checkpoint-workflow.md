# Checkpoint delivery workflow

Owner directive: Sanjay, 12 September 2026. This is the repository's source of truth for checkpoint commits, branch names and PR delivery.

## One checkpoint, one traceable change

1. Read `docs/superpowers/plans/2026-09-12-launch-master-checklist.md`. Select one pending task ID and identify its dependencies, acceptance criteria and required owner decisions.
2. Verify current remote state and the correct working copy. Preserve unrelated changes. Start a new branch from the appropriate reviewed base; dependent work may use a documented stacked PR rather than bundling unrelated checkpoints.
3. Implement only that checkpoint, including its focused tests, documentation and sanitized evidence. A checkpoint may contain several test/edit steps, but unrelated checklist items require separate PRs. If an item is too large, record child checkpoints under its existing ID before implementation and give each child its own PR.
4. Commit the checkpoint with its ID in the commit body. Use explicit staged paths and inspect the staged diff for unrelated work, credentials, private reports and generated noise. Additional corrective commits belong to the same PR until it is ready.
5. Open a PR containing the checklist ID, purpose, changes, verification results, screenshots/clips when relevant, risks, rollback and dependencies. Update the checklist log with its PR URL and source commit; keep the completion checkbox open while any required acceptance remains outstanding.
6. Review the exact latest diff and test results. Resolve findings and rerun affected checks after corrections. Independent review is useful; the primary agent still verifies the result personally. Passing generic tests is not owner visual approval.
7. Enable GitHub auto-merge only for a ready, reviewed checkpoint after all applicable acceptance conditions are satisfied. GitHub must enforce every required check, review and branch-protection rule. If a check is pending, auto-merge may wait for it; failed/cancelled checks must be repaired, not bypassed. Re-review after substantive new commits and disable auto-merge if a blocker appears.
8. Prefer squash merge, retaining the Conventional Commit PR title and checklist ID in the resulting commit. Record the merged commit and final result on the PR, then update the checklist log in the next checkpoint PR or one final `chore(tracking)` PR. A tracking-only PR uses its GitHub merge record as closing evidence; do not create an endless chain of PRs merely to log the preceding tracking PR. Do not claim merge/deployment before it actually occurs.

For an account configuration, research or manual acceptance checkpoint, commit sanitized procedures/results and link the PR. The audit trail is required even when no application code changes. Never commit credentials or personal inbox/report contents as evidence.

## Naming scheme

Use lowercase kebab-case in new branch names. Use exactly these change types unless the owner revises this convention:

| Type | Meaning | Example |
| --- | --- | --- |
| `feat` | New user-facing capability | `feat(search): add keyboard result previews` |
| `fix` | Correct behavior, accessibility, security or a demonstrated performance problem | `fix(ci): complete release checks within the job budget` |
| `chore` | Documentation, tests, maintenance, tracking or operational configuration | `chore(privacy): document report retention` |

**Branch:** `codex/<type>/<checkpoint-id>-<short-description>`

Examples: `codex/fix/b01-ci-partitions`, `codex/feat/h01-homepage-rework`, `codex/chore/e02-privacy-notice`. Child example: `codex/fix/h01-1-profile-motion`.

**Commit subject:** `<type>(<scope>): <imperative summary>`

Use a concise explanation of the actual change, not `updates`, `changes` or `fix everything`. Include `Checkpoint: B01` (or the relevant ID) and verification details in the body. Mark intentional breaking changes with `!` and a `BREAKING CHANGE:` explanation; obtain any necessary approval first.

**PR title:** `<type>(<scope>): <summary> [<CHECKPOINT-ID>]`

Example: `fix(ci): complete release checks within the job budget [B01]`.

Existing release branches and PR #2 are historical exceptions to the new naming scheme. Preserve their history; inspect their actual diff and status before deciding how dependent checkpoint PRs should target them. Do not force-rename, discard or rewrite them just to match the new convention.

## Required PR description

Use these headings in every checkpoint PR:

- **Checkpoint:** task ID and checklist path; explain any child ID.
- **Outcome:** user-visible result and scope; note what is intentionally unchanged.
- **Changes:** concise implementation or configuration summary.
- **Verification:** exact commands/check links, results, source revision and manual checks. Clearly identify anything not run.
- **Visual evidence:** before/after captures and owner decision for design work, or state why not applicable.
- **Risks and rollback:** compatibility, deployment/data impact and recovery procedure.
- **Dependencies and approvals:** base/stacked PRs, credentials, external actions and unresolved owner gates.

## Auto-merge boundaries

- Auto-merge is authorized for checkpoint PRs; this document does not itself enable it on any PR or change repository settings.
- Keep main protected and use PRs, not direct pushes. Do not use administrator bypass, force merge, weaken required checks, self-approve on the owner's behalf or fabricate visual approval.
- If auto-merge is unavailable, report that limitation; use an ordinary merge only after the same requirements pass. Do not silently change repository security settings to enable it.
- A merged code PR can trigger the approved beta pipeline. Production deployment still requires Sanjay's separate protected-environment approval.
- Missing business facts, legal decisions, security prompts, final design approval, registry namespace/submission approval and exact marketing text/recipient approval remain owner gates. Finish safe independent work while those are pending.
- Keep paid upgrades and historical report publication outside automatic execution.

## Handoff bootstrap

The checklist and this rule were written in the durable original project folder, while release work exists separately. Before starting implementation elsewhere, carry only the reviewed checklist, workflow and scoped `AGENTS.md` addition into the verified working copy, preserving its existing instructions. Put that bootstrap documentation into its own `chore(workflow)` checkpoint PR, named `codex/chore/w01-checkpoint-workflow`. Do not copy the original dirty application tree over the release checkout.
