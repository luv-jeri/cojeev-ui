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

## State at 2026-10-01 (latest update)

- **Merged into the integration branch:**
  - A5 #105, A21 #106, A2 #107, A3 #108, A24 #109, A1 #110;
  - fix #111 (7f9509a), which types `REGISTRY_SITE` as `{ fetch: typeof fetch }` and fixed a root `tsc` break left by A3.
- **New merge gate (ruling):** before merging any task PR, run `npx next typegen && npx tsc --noEmit` locally.
- **B1:** steps 1–4 are DONE.
  - C0 = 2337a6b, R0 = 36891631881.
  - The `migration-baseline` prerelease is published.
  - **`main` is frozen for release-scope merges until B2.**
  - Steps 5–15 are delegated to Sol in `.worktrees/t-b1` (branch `chore/b1-baseline-record`, brief `task-B1-brief.md`). It uses the wrangler OAuth read session.
  - Afterwards, check the "Needs owner token" list in its README, then open the PR into integration and merge it.
- **In flight:**
  - A6: Gemini then Astra review.
  - A11: Astra then Gemini review. Afterwards, create the A11b task (ruling in the ledger); A17, A19 and A22 depend on A11b.
  - A7: re-runs the checks the type break blocked.
  - A8 and A10: resume their builds after the type fix.
  - A9: building.
- **Gemini seat:** works through the allow-rules in `~/.gemini/antigravity-cli/settings.json`. It must run with no `--effort` flag and a prompt that limits it to single read-only commands. Gemini findings that contradict ledger rulings are overruled with a recorded ruling.
- **Resume steps:**
  1. For each in-flight task, read `task-ID-final.md`, `task-ID-fix-r1-final.md` and the review files in the SDD workspace.
  2. Continue the loop: review, fix, re-review, then PR, the tsc gate and the merge.
  3. Then the next waves, per the plan's task table.

## Standing rules

- Never print tokens or secrets.
- Never push to `main`; it changes only through a PR with the admin-squash flow, with `enforce_admins` restored afterwards.
- No AI co-author trailers in commits, and no "Generated with" footer in PR bodies.
- Never use a bare `git stash`.
- No time estimates. Ask the owner one question at a time.
