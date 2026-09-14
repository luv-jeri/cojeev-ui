# Recovery command output — C04-2

Run 34798582235 passed build/packaging and then failed reading the recovery
bookmark with `Unexpected end of JSON input`, before migrations/deployment.

Cause: our subprocess wrapper set `WRANGLER_LOG=error` for every command.
Wrangler implements `--json` output using its ordinary logger, so this setting
suppresses the successful machine-readable response too. A direct read-only
Time Travel command returned a bookmark; the same command with that log level
returned exit zero and no output. No report contents were accessed.

Use normal log level only for `--json` commands and capture their output in
the existing private subprocess pipe. Do not stream raw stdout/stderr or retain
log files. Errors may expose only the fixed command/subcommand and numeric
Cloudflare API code, never a service message, request body or credential.

No component/build/migration changes. Native D1 recovery remains the selected
pre-migration safeguard; the R2 backup transport investigation remains deferred.
The owner-approved test exception is extended to this exact operations-only
correction. No automated tests run. Syntax/diff review and the read-only CLI
diagnosis are the local evidence; live deployment remains separate.
