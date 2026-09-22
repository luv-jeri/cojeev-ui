# Ticket tooling

Executable form of the lifecycle in `docs/workspace/ROADMAP-TO-10.md`. The roadmap defined a
ticket lifecycle, a receipt template and a ticket prompt — all prose, which a model retypes per
ticket, and retyped evidence drifts. These scripts run the guards, record real exit codes and
hashes, and emit the receipt. None of them can decide that a check passed.

## Commands

```sh
# Freeze today's state (Phase 0 step 1). Read-only; writes only --out.
node scripts/ticket/snapshot.mjs --out=docs/workspace/baseline/snapshot.json
node scripts/ticket/snapshot.mjs --online          # also reads production + directory entry

# Token contract vs the supplied handoff. Cheap shared-foundation check.
node scripts/ticket/check-token-parity.mjs

# Run one ticket: guards, checks, scoped visual gate, receipt.
node scripts/ticket/run.mjs --ticket=docs/workspace/tickets/T-001.json
node scripts/ticket/run.mjs --ticket=... --dry-run     # guards + plan, executes nothing
node scripts/ticket/run.mjs --ticket=... --rehearsal   # bypass port guard; receipt excluded from evidence
node scripts/ticket/run.mjs --ticket=... --skip-gate

# Score governance.
node scripts/ticket/scorecard-guard.mjs --freeze   # integrator accepts current state as baseline
node scripts/ticket/scorecard-guard.mjs --report   # current vs frozen, nothing blocked
node scripts/ticket/scorecard-guard.mjs --check    # exit 1 on an unearned score rise
```

Exit codes for `run.mjs`: `0` ok · `2` usage · `3` gate/port busy · `4` unowned dirty file ·
`5` a check failed.

## The guards, and why each exists

| Guard | Refuses when | The failure it prevents |
| --- | --- | --- |
| Port/renderer | `:4317` is held or any `apps/gate/run.mjs` is alive | Two gate runs corrupt each other. Worse: editing a source file mid-census turns a 110-minute census into a mixed-snapshot result that looks complete and is worthless. |
| Ownership | A changed file is outside `allowedFiles` ∪ `generatedOutputs` ∪ `baselineDirty` | The roadmap's "one active writer per component" rule. A ticket that edits outside its boundary cannot be reviewed as one diff. |
| Rehearsal | never — but a rehearsal receipt is marked and the guard ignores it | A rehearsal bypassing the port guard must not become evidence. |
| Score | A criterion rises above its frozen value with no receipt naming it | The roadmap's final rule: *no criterion reaches 10 because code was merged or a model approved it.* |

## Ticket schema

```jsonc
{
  "id": "T-001",
  "title": "…",
  "objective": "one concrete user-visible or technical outcome",
  "criterionIds": ["Q02.05"],          // scorecard rows this ticket may move
  "owner": "W01 …, or the named owner and contract",
  "reviewTier": 1,                     // 1 mandatory review · 2 sampled · 3 batch at RC
  "startingSnapshot": "374dc1c + dirty tree",
  "allowedFiles": ["registry/cojeev/styles/tokens.css"],
  "generatedOutputs": ["registry.json", "public/r/cojeev.json"],   // may change as a consequence
  "baselineDirty": [".gitignore", "…"],// pre-existing edits, accepted into the snapshot
  "outOfScope": ["…"],
  "ownerConfirmations": ["…"],         // decisions reserved to the owner
  "checks": [{ "name": "lint", "cmd": "npm run lint", "timeoutMs": 600000 }],
  "gate": { "components": "button,badge", "out": ".work/T-001/visual" }
}
```

Tickets live in `docs/workspace/tickets/`. `docs/workspace/` is gitignored, so tickets, receipts
and the scorecard baseline stay out of version control, as `CONTRIBUTING.md` requires for internal
planning. `.work/` is always writable regardless of `allowedFiles`.

## Workflow

```
snapshot --out=… ──► author ticket ──► run.mjs ──► receipt ──► independent review
                                            │                        │
                                     scorecard-guard --check ◄───────┘
                                     (blocks any rise without an ACCEPT receipt)
```

1. `snapshot.mjs` — Phase 0 step 1. Quote its `sourceHash` in the ticket.
2. `run.mjs` — implements the change, then runs the ticket's own checks and gate.
3. Review the receipt; fill the outstanding fields.
4. Astra reviews the exact diff; set `- Review: ACCEPT FOR INTEGRATION`.
5. Raise the scorecard row, then `scorecard-guard.mjs --check` proves the rise was earned.
6. `--freeze` again to accept the new state as the next baseline.

## Honest limitations

- **The guard cannot make cheating impossible.** An agent with write access can hand-type a
  receipt claiming `Review: ACCEPT`. What the guard does is make the honest path the default and a
  fabricated one a deliberate, inspectable act — the file, its hash and its review line are all
  reviewable. Do not mistake it for cryptographic assurance.
- **The stale-hash check warns, it does not block.** The roadmap's rule is per-*affected
  behaviour*, which one global tree hash cannot express. Blocking on any hash change would flag
  every earlier receipt after every later edit, and a guard people learn to ignore protects
  nothing. Reported instead.
- **A rehearsal is not evidence.** Anything run while another renderer owns the gate port is
  excluded outright.
- `snapshot.mjs` flags a results file with a single component id across many rows as SUSPICIOUS.
  That is the signature of the two stale artifacts found at baseline; keep the check.
