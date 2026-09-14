<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Checkpoint delivery workflow — owner directive, 12 September 2026

For implementation, checkpoint completion, commits, branches, PRs or merges in this repository, read and follow `docs/checkpoint-workflow.md` before starting. Each checkpoint requires its own scoped commit and PR, with checklist IDs and verification evidence. Use `feat`, `fix` or `chore` naming; use `<type>/<checkpoint-id>-<short-description>` for new branches. Do not add agent/vendor prefixes, generated-by labels or automatic co-author footers to branches, commit messages or PR text.

The owner permits auto-merge for these checkpoint PRs only after required checks, review requirements and checkpoint acceptance are satisfied. Preserve branch protections and the separate production approval gate. Planning a registry submission or outreach does not approve its final payload or destination.

Use proportionate verification from `docs/checkpoint-workflow.md`: prose-only updates need diff/link checks, narrow repairs need affected tests, and the combined release candidate needs the complete release gate. Do not rerun the full component catalogue for status edits or treat omitted tests as passing.
