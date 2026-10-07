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

## State at 2026-10-07 21:59 IST (latest update; Part A and the final review are done; B1 waits on production)

- **Owner rule (2026-10-07):** "compete all the task then do the review at last please". One Astra review over the whole integration diff, then one fix wave. Done.
- **Every Part A code task is merged** into `feat/move-to-cojeev-ui`. A25 runs only after B10.
  - Latest: A23 #136, lint fix #139 (ea52bce), A20 #138 (497f4bd), fix wave #141 (97addf6).
- **Final review:** Astra, `final-review-astra.md`, verdict NOT_READY. 0 Critical, 8 Important, 1 Minor. All fixed in #141 over two Sol rounds, plus Finding 9 from the B1 read-only run.
- **Rulings since A19** (full text in the ledger):
  - **R-A20-1:** a PR into the integration branch merges when every step before "Fetch the pinned baselines" is green. That step needs `scripts/release-baseline.json`, which only B1 writes. The B1 record PR must then be FULLY green: packaging, gates and migration gates.
  - **R-FW1-1:** the browser gate also exempts aborted same-origin `/ui/` HEAD fetches, which are Next's output-export route discovery. A HEAD request is never a demanded resource.
  - R-A19-1/2/3 and R-A22-1/2 are unchanged. R-A19-3 is narrowed by finding 8.
- **Flake fixed in A20:** `workers/reporting/test/integration.test.mjs`. The webhook timestamp cases now use ±310 s, because ±301 s with `Math.floor` could land inside the 300 s window.
- **B1 read-only drafts (2026-10-07):** saved in the gitignored `.superpowers/sdd/2026-10-01-move-to-cojeev-ui/b1-draft/` of this worktree. Redo every step at the real B1 run against the approved C0.
  - **Passed:** steps 5–14. Robots decision (b). Reporting `other` = 0. Apex storage empty.
  - **Steps 6–7 (21:5x, after the token edit):** `cojeev.com/*` → `cojeev-coming-soon`; nothing matches `cojeev.com/ui` (both stop checks OK). One dynamic redirect: `www` and `http` → `https://cojeev.com`. Turnstile: the production widget allows `000h.cojeev.com` and `luv-jeri.github.io`; the beta widget allows `beta.000h.cojeev.com`.
- **Cloudflare read token:** `~/.config/cojeev-ui/cloudflare-read-token`. Owner-edited 2026-10-07: Workers Scripts, Workers Routes, Single Redirect, DNS and Turnstile, all Read. Use it only as `$(cat …)` inside a command; never echo it. Zone `12e8b50b78c2c6af9e28406fede10d4e`, account `25369d7051a3d996a1bca81f462a1fbc`.
- **Owner answered "yes" (2026-10-07 21:41)** to the order:
  1. The owner approves a production deploy of `main`.
  2. B1 re-runs with C0 = that commit.
  3. `main` freezes from B1 step 2 until the B2 merge.
- **Why C0 moved:** `main` 2de8ed59 (#140, which includes #117 and #118) failed its release run 37641570358, in the browser check "milestone-path: Travel settles back to static paint". #140 had merged with its PR CI cancelled. Session sanjaykumar-82 owns the fix: #143 (560f8e5e), with release run 37650459426 in progress at 21:59. The first `main` commit whose release passes and that the owner approves for production becomes C0.
- **Next:**
  1. Watch `main` for a release run waiting on production approval: `gh api repos/luv-jeri/cojeev-ui/actions/runs/<id>/pending_deployments`.
  2. Tell the owner to approve it.
  3. Run B1 for real (step 2 = the freeze; step 4 = the prerelease upload, which needs owner go and replaces the existing `migration-baseline` asset).
  4. Open the B1 record PR, which must be fully green.
  5. B2–B10, each with owner go.
- **Resume:** the `cojeev-build` skill was removed 2026-10-07. Start a fresh session with "resume from `docs/progress/move-to-cojeev-ui-checkpoint.md`".
- **Production:** unchanged at 16a3d05; cojeev.com/ui still returns 404.

## Standing rules

- Never print tokens or secrets.
- Never push to `main`; it changes only through a PR with the admin-squash flow, with `enforce_admins` restored afterwards.
- No AI co-author trailers in commits, and no "Generated with" footer in PR bodies.
- Never use a bare `git stash`.
- No time estimates. Ask the owner one question at a time.
