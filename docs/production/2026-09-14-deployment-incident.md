# Deployment incident log — 14 September 2026

Checkpoint: C04-3, a child of C04 (isolated beta deployment).
Upload correction: C04-4.

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
| [34800732477](https://github.com/luv-jeri/cojeev-ui/actions/runs/34800732477/job/103843338177) | Sanitized diagnostics confirmed system error `ENXIO` opening `/dev/stdin`. Recovery and migrations both succeeded. | C04-4 uses a protected real secrets file, described below. No API permission rejection was established by this failure. |

## Upload investigation

The deployment command uses `--secrets-file /dev/stdin`, supplied via Node
`execFileSync` with piped input. Wrangler opens that pathname with `readFileSync`.
[Node's pinned-version documentation](https://github.com/nodejs/node/blob/v22.22.0/doc/api/child_process.md#optionsstdio)
explains that subprocess pipes are not ordinary Unix pipes and cannot be used
through descriptor-file paths. A dummy-input read succeeds on this Mac; that
does not establish Linux compatibility. Run34800732477 now confirms this exact
failure on the Linux deployment runner; it is no longer a hypothesis.

## C04-4 correction

Use [Cloudflare's supported code-and-secrets upload](https://developers.cloudflare.com/workers/configuration/secrets/#upload-secrets-alongside-code)
with a real JSON file in a fresh temporary directory outside the workspace and
release artifact. Directory permissions are 0700; file permissions are 0600 and
creation refuses overwrites. The file is removed in `finally` on upload success
or failure. The job uses an ephemeral GitHub-hosted runner; abrupt runner
termination also discards its temporary filesystem. No secret file is included
in logs, Git or workflow artifacts. Existing unmentioned Worker secrets remain
preserved; no separate secret-rotation deployment was added.

PR44 (diagnostics) merged as `efe21472634193b9c11d9b2bb6fcdcca87fde15a`.
Its actual Linux deployment is the evidence for the root cause above. The
correction still requires a successful actual upload before deployment is claimed.

## Post-launch process improvements (not part of this repair)

- Apply affected-change checks to small PRs into main, not just other branches.
- Separate packaging from independent checks and reuse exact-source artifacts.
- Trim deployment dependencies to a small locked runtime.
- Deploy website/API independently when compatible, preserving accurate identity.
- Add per-operation timeouts and bounded health-check propagation retries.
- Give API preflight failures the same useful, credential-safe diagnostics.
- Revisit these as scoped checkpoints, not another redesign blocking launch.

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
