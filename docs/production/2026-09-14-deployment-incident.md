# Deployment incident log — 14 September 2026

Checkpoint: C04-3, a child of C04 (isolated beta deployment).

## Purpose

Retain the actual failures, evidence, corrections and unresolved follow-up work.
This is not component verification or proof of production deployment. The owner
has deferred automated suites for this release; do not describe them as passing.
Never retain credentials, raw subprocess output or private report contents here.

| Run | Observed failure | Correction / status |
| --- | --- | --- |
| [34797303429](https://github.com/luv-jeri/cojeev-ui/actions/runs/34797303429) | Mandatory external recovery snapshot stopped beta before upload. | PR42 replaced the deployment prerequisite with a native D1 Time Travel bookmark. The optional R2 snapshot failure is still unconfirmed, not repaired. |
| [34798582235](https://github.com/luv-jeri/cojeev-ui/actions/runs/34798582235) | Parsing the recovery result failed with empty JSON. | PR43 corrected the wrapper's log level: Wrangler sends machine-readable results through its normal logging channel. |
| [34799256382](https://github.com/luv-jeri/cojeev-ui/actions/runs/34799256382) | Recovery succeeded; upload failed with only `private output suppressed`. | C04-3 restores sanitized error headlines, exit/API/system codes and per-operation start/success/failure events in job logs and summaries. |

## Upload investigation

The deployment command uses `--secrets-file /dev/stdin`, supplied via Node
`execFileSync` with piped input. Wrangler opens that pathname with `readFileSync`.
[Node's pinned-version documentation](https://github.com/nodejs/node/blob/v22.22.0/doc/api/child_process.md#optionsstdio)
explains that subprocess pipes are not ordinary Unix pipes and cannot be used
through descriptor-file paths. A dummy-input read succeeds on this Mac; that
does not establish Linux compatibility. The next actual deployment must expose
the sanitized error before this is called the confirmed CI cause.

## Retained evidence and follow-up

- Every deployment operation records its timestamp and status in GitHub logs
  and the job summary. Failures inspect both output channels for API/system codes.
- Only upload error headlines are retained after credential redaction. Database
  query/export output and raw subprocess errors remain private and are not saved.
- No raw-error artifact or secret file is uploaded to GitHub.
- [ ] Confirm and repair the actual Worker upload error from CI.
- [ ] Record the successful beta release revision and run.
- [ ] Obtain the separate production-environment approval and record its result.
- [ ] Revisit optional R2 recovery export only if an external snapshot is needed.
- [ ] Remove the exact-tree test deferral after the expedited release; deferred
  component failures remain separate follow-up work, not this deployment repair.
