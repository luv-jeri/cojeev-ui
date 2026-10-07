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

## State at 2026-10-07 (latest update)

- **Owner rule (2026-10-07):** "compete all the task then do the review at last please". No per-task reviews. Build each task with Sol, run the tsc gate, and merge. After the last task, run ONE Astra review over the whole integration diff, then fix its findings in one wave. Gemini is skipped.
- **Merged into the integration branch (19 of 27 code tasks, plus the main sync):**
  - A5 #105, A21 #106, A2 #107, A3 #108, A24 #109, A1 #110, fix #111, A7 #112, A10 #113;
  - A11 #119, A9 #120, A12 #121, A6 #122, A18 #123, main-sync M1 #124, A8 #125, A11b #126, A13 #127, A15a #128, A14 #129 (b21d7a8).
- **Seams to check in the final review** (listed in the ledger): the A14-over-A15a hand merge of `scripts/release.mjs`; the M1 test fix for optional `source`; the A8 merge of the docs-search aliases.
- **Known red on M1:** `tests/ci-affected-ids.test.mjs` and `tests/icon-pack-retry.test.ts` fail with `ERR_MODULE_NOT_FOUND` on the `@/registry/cojeev/lib/lucide-icon-data` alias. Both already fail on pre-merge main (d43561a). Settle them at B2.
- **Wave 3 building (Sol, worktrees `.worktrees/t-<id>`):** A16a, A15b, A17, A19, all on b21d7a8.
- **Briefs ready:** A16b (needs A16a), A22, A23, A20. Dispatch each with `dispatch.sh` as soon as its dependencies merge. A25 runs after B10 only.
- **Merging:** `merge.sh ID "TITLE"` in the SDD workspace pushes, opens the PR, squash-merges at the head, and cancels PR CI. Parallel siblings: rebase onto `origin/feat/move-to-cojeev-ui`, hand-merge conflicts by checking which names each side actually uses, then run the tsc gate and the affected tests.
- **Production:** unchanged at 16a3d05; cojeev.com/ui still returns 404. B1 needs re-baselining (production moved off C0). B2–B10 each need owner go.

## Standing rules

- Never print tokens or secrets.
- Never push to `main`; it changes only through a PR with the admin-squash flow, with `enforce_admins` restored afterwards.
- No AI co-author trailers in commits, and no "Generated with" footer in PR bodies.
- Never use a bare `git stash`.
- No time estimates. Ask the owner one question at a time.
