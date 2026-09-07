# Public source snapshot preparation

Prepared against main `9ac1fcd09966dcd696cb06a45c4f970816225a31` and its current working files. This task does not push, initialize the public repository, alter production code, or run another build/browser matrix. The original local Git history and private `.work` evidence remain intact.

## Explicit allowlist

`.work/public-release-manifest.json` contains **1,272 exact relative file names**, approximately **9.33 MB** at this checkpoint:

- App/docs and examples: `app/` (8), `components/` (16), `lib/` (3), `data/` (2).
- Reusable library: `registry/sahajiv/` (176), generated `registry.json`, `public/` (80).
- Reproducible checks: `apps/gate/` (14), `scripts/` (18), `tests/` (4), the current verification JSON, and the GitHub Actions workflow.
- Complete immutable supplied reference (925 files), including metadata, tokens, source scripts/styles, full catalog, entry demos, isolation fixtures, assets, two TTFs and their two OFL notices. Registry construction uses reference metadata/fonts; historical source gates need the catalog/fixtures and their shared assets. Keeping this complete preserves the original reference's relative resource paths.
- Root package/lockfile, TypeScript/Next/PostCSS/ESLint/shadcn configs, `.gitignore`, MIT `LICENCE`, `FONT-NOTICES.md`, and the specified current public docs.

Current ignored/untracked admissions are individually named: `BASELINE-STATUS.md`, `scripts/run-production-gate.mjs`, `verification/default-visual-review.json`, plus the explicitly regenerated `GATE.md`, `DOCS-VERIFICATION.md` and `RELEASE-REPORT.md`. Other untracked files are rejected, even if someone inserts their names in the manifest without authorizing that admission.

Excluded entirely: `.git`, `.work`, `.worktrees`, `artifacts`, `output`, `node_modules`, build/cache directories, environment files, root personal `AGENTS.md`/`CLAUDE.md`, historical `GATE-*.md`, and the superseded private-phase decision note. No private history is exported. The exporter creates one additional public `PUBLIC-SNAPSHOT.json` containing relative file names, SHA-256 hashes, sizes and the source revision; it contains no source checkout path.

## Fonts and fresh-clone inputs

Library code is **MIT**. DM Sans and Bricolage Grotesque are **SIL OFL 1.1**, not MIT; both original TTFs, both full OFL texts, font styles and root notices are included. Registry construction ships the notices alongside embedded font styles. No commercial font file is needed.

The allowlist covers the checked-in inputs to `npm ci`, `npm run build`, `npm run gate`, example-source compilation and optional historical gates. Use Node **22.12+** and install Playwright Chromium (`npx playwright install chromium`, or `--with-deps` on Linux CI). Next's ignored `next-env.d.ts` and build outputs are generated. No preexisting `node_modules`, `.next`, `out`, local receipt or browser cache is required. This is an input/dependency audit, not a claim that a fresh export has already completed installation/build/gates; root owns the release/consumer runs.

## Link and content checks

Checked local Markdown targets in README, INSTALLATION, CONTRIBUTING, DOCS-COMPONENTS, BUILD-STATUS, REFINEMENTS, PRODUCTION-PLAN, BASELINE-STATUS, REFERENCE-ISSUES, REFERENCE-RUNTIME-FINDINGS and current final reports/notices. Existing external links were inspected as public destinations; network publication availability is root's separate release check.

The authorized BASELINE-STATUS and REFERENCE-ISSUES edits replace excluded archive links/paths with meaningful archive run names. All baseline table rows, all **31 receipt hashes and 31 row counts** are preserved exactly; no historical failure was relabeled. With these two files overlaid, every checked local Markdown file target is in the allowlist. `verification/default-visual-review.json` has no private absolute path.

Text scan covers all included text, including original reference text and generated registry content. It checks user-home/local file paths, private keys, common provider tokens, embedded URL credentials and quoted secret assignments; reports contain locations/categories only, never matched values. The two binary TTFs are preserved with licences and are not treated as text. This is a bounded pattern scan, not a guarantee against every possible secret format.

**Remediation confirmed:** the initial scan found ComboboxInputProps `wrapperProps` metadata expanding TypeScript dependency types into two absolute checkout import paths, repeated across four generated registry files. Root corrected the API extractor and rebuilt at `9ac1fcd`; the property now retains the authored `InputProps` type. The final bounded scan has **zero private-path or credential-pattern findings** across all allowlisted text, including generated registry and verification JSON. The only main-checkout link failure before integration is the old BASELINE-STATUS link corrected in this commit; with these two authorized doc edits overlaid, all checked local file targets resolve. Root will finish GATE and the release verification paragraphs before calling the exporter. No actual release directory has been produced by this task.

## Portable exporter and focused checks

From the main checkout after this commit is integrated and current reports/registry are ready:

```sh
rtk proxy python3 .work/export-public-release.py --source "$PWD" --check
rtk proxy python3 .work/export-public-release.py --source "$PWD"
```

The second command creates a new random `sahajiv-ui-release-*` directory under the operating system's temporary directory and prints that destination. Optional `--parent` accepts an existing external parent, never an output directory to overwrite. The script re-reads current working bytes at execution time and copies only regular files into the new directory, preserving relative paths. It rejects escaping **and internal** symlinks, traversal, private paths, unapproved untracked files, sensitive-pattern matches, broken local doc targets, and a destination parent inside the source checkout. It runs no npm/network/publication command and copies no `.git`.

Nine focused synthetic checks pass: required-report blocking, current working bytes, explicit untracked admission, unique external output/relative files/hash receipt, output containment, denied paths, symlink rejection, arbitrary-untracked rejection, broken-link detection and redacted sensitive findings (some are grouped within one check). Test directories were temporary and cleaned. `git diff --check` passed. Receipts: `.work/public-release-audit.json`, `.work/public-release-export-tests.json`; test harness: `.work/test-public-release-export.py`.
