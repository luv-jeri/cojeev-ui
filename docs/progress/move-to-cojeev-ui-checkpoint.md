# Checkpoint: move 000h to cojeev.com/ui

Written 2026-10-01, before an iTerm restart. The background jobs died with the terminal; everything else is on disk or on GitHub.

## Sources of truth

- **Spec:** `docs/specs/2026-10-01-move-to-cojeev-ui-design.md`, owner-approved.
- **Plan:** `docs/plans/2026-10-01-move-to-cojeev-ui.md`, owner-approved. The latest edit is bc6e6c8, which applies the preflight rulings M1–M10.
- **Ledger:** `.superpowers/sdd/2026-10-01-move-to-cojeev-ui/progress.md` in this worktree (gitignored, on disk).
  - It holds every ruling, minor and deferred note, and the line for each task.
  - Trust the ledger and `git log` over memory.
- **SDD workspace (same directory):**
  - `dispatch.sh ID BRANCH BASE_REF EFFORT`: builds a new task with Sol 6.1 in `.worktrees/t-<id>`.
  - `review.sh ID WHO EFFORT [BASE]`: runs a full task review. WHO is `astra` or `gemini`.
  - `fix.sh ID ROUND EFFORT FINDINGS_FILE`: runs a fix round with Sol.
  - `rereview.sh ID ROUND WHO EFFORT FINDINGS_FILE`: runs a scoped re-review of a fix round.
  - `brief.sh PLAN ID OUT`: extracts a task brief.
- **Integration branch:** `feat/move-to-cojeev-ui`. Every task PR targets it; A0 and A25 base on `main`.

## Model policy (owner, 2026-10-01): save Claude Code tokens

- **Builders:** GPT Sol 6.1 (`codex exec -m gpt-6.1-sol`).
- **Reviewers:** Astra (`codex exec -m gpt-6-astra`) plus Gemini (`agy … --model gemini-3.1-pro-high`).
- **No Claude.** No `claude -p` runs and no Opus. Opus's weekly limit on the build account resets 2026-10-05 12:30 IST, and it is not used anyway.
- **The Gemini seat is untested.** It was added to `review.sh` and `rereview.sh` just before the restart. Probe it once on a small diff before trusting it.
  - Check that the `.json` output parses and that `task-ID-review-gemini.md` contains the verdict.
  - If `agy -p` hangs or fails, run Astra at a second effort level as the second seat, and say so in the ledger.
- **Coordinator:** keep turns short. Read one-line verdicts and hand artifacts over as files.

## Done

| Task | Result |
|---|---|
| A0 | Merged to main as #104 (2337a6b). Production and beta `/health` `.release` are both 2337a6b (C0). Release run 36891631881 succeeded. |
| A5 | #105 → b21c41f |
| A21 | #106 → cbd560b |
| A2 | #107 → a44ed0a |
| A3 | #108 → 7bf2cdb |
| A24 | #109 → e06a058 |

How task PRs merged (ruling in the ledger):
1. `gh pr merge N --squash --match-head-commit <full sha>`.
2. Cancel the PR's `Verify and release` run. The full suite runs at the integration-to-main PR (B2).

## In flight at the restart

- **A1, fix round 1: build DONE.**
  - Commit `4bf2180` in `.worktrees/t-a1`; the worktree is clean.
  - Both Astra Important findings are FIXED. 38 tests pass, and the build, export gate and browser checks pass.
  - Next:
    1. `rereview.sh A1 1 astra high .superpowers/sdd/2026-10-01-move-to-cojeev-ui/task-A1-findings-r1.md`.
    2. The second-vendor full review (`review.sh A1 gemini high`).
    3. Then the PR and merge.

## Next steps, in order

1. **A1:** finish its fix loop and second review, then open the PR, merge it, and remove the worktree.
2. **A11 is launchable now**, because A2 has merged. Base it on `origin/feat/move-to-cojeev-ui`.
   - Carry the ledger pointer: `static-assets.test.mjs` Worker-side paths on the legacy host hit row 9's 404, so A11 must replace that check.
   - The brief is already extracted at `task-A11-brief.md`. Re-extract it if the plan changes.
3. **A6–A10** dispatch once A1 merges. Their briefs are extracted.
4. **Then the remaining groups**, in the task table's dependency order:
   - A12 (needs A2, A3, A11, A24; carry the A2 pointer: regenerate `worker-configuration.d.ts`), A13, A18;
   - A14, A15a;
   - A15b, A16a, A17, A19;
   - A16b;
   - A22, A23 (carry the ruling: scope the four reporting secrets to API promotions only);
   - A20.
5. **Retroactive second-vendor (Gemini) review** for A2 and A24 before B2, because Opus was unavailable when they merged.
6. **B1 (Part B):** step 1's precondition is now met, because production and beta both report C0 = 2337a6b.
   - Tell the owner when B1 starts.
   - Merges of release-scope changes to `main` are frozen from B1 step 2 until the B2 merge.
   - **Step 4 (public `migration-baseline` prerelease) needs the owner's yes**, after they see the secret-scan result. The scan prints file paths only.
7. **Owner go points:** B1 step 4, B2 (merge to main), B3, B5–B10, and every production `rollback.yml` dispatch. Ask before B8 (the coming-soon push) separately. Show the shadcn directory PR text before opening it.

## Standing rules

- Never print tokens or secrets.
- Never push to `main`; it changes only through a PR with the admin-squash flow, with `enforce_admins` restored afterwards.
- No AI co-author trailers in commits, and no "Generated with" footer in PR bodies.
- Never use a bare `git stash`.
- No time estimates. Ask the owner one question at a time.
