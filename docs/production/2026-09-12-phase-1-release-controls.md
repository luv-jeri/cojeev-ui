# Phase 1 release controls — 12 September 2026

## B03-1: pin the fresh-consumer installer

Scope: replace both floating `shadcn@latest` calls in `scripts/verify-install.mjs` with one `shadcn@4.21.0` constant, matching the reviewed exact root dependency. The receipt now records the installer specification. Component source, dependency manifests/lockfile, framework configuration and release gates are unchanged. The consumer remains a newly created directory outside the repository.

Source: base `93fe99b1d7f14ac081ddbb0ba4b8c615669575e9` plus this checkpoint's installer change. The tested script SHA-256 is `d39150f91033c704f073116e1680bc9a7bead198ee09c6762558a58e34f9d3b5`. This evidence covers B03-1 only; B02 and the remaining B03 acceptance are open.

### Local verification

Node `v22.22.0` was selected on PATH for all npm, npx and Node commands. These commands ran in the isolated checkpoint worktree; the server ran concurrently with the consumer check:

```sh
rtk proxy env COJEEV_REGISTRY_URL=http://127.0.0.1:48713 npm run build
rtk proxy python3 -m http.server 48713 --bind 127.0.0.1 --directory public
rtk proxy node scripts/verify-install.mjs --url=http://127.0.0.1:48713 --components=button,badge,card,accordion,dialog --tmp=/private/tmp --receipt=/private/tmp/000h-phase1-jKXhib/b03-1-install-receipt.json
rtk proxy npx --yes shadcn@4.21.0 --version
rtk proxy node --check scripts/verify-install.mjs
rtk git diff --check
```

| Check | Result |
| --- | --- |
| Registry generation within `npm run build` | PASS: 173 items, comprising the foundation, 66 base components and 106 additional entries |
| Full Next.js site build | FAIL in this local setup: Turbopack rejects the pre-existing `node_modules` symlink pointing outside its filesystem root; no site-build pass is claimed |
| CLI version | PASS: `4.21.0` |
| Fresh consumer initialization and registry installation | PASS: both pinned CLI calls completed; five requested components plus their dependencies came from the freshly generated localhost registry |
| Consumer TypeScript and production build | PASS: `tsc --noEmit && vite build`, exit 0; Vite 7.3.6 transformed 532 modules |
| Script syntax and diff whitespace | PASS |

Sanitized receipt: installer `shadcn@4.21.0`; Node `v22.22.0`; components `button,badge,card,accordion,dialog`; `freshDirectory: true`; `publicCLIInstall: PASS`; `typecheckAndBuild: PASS`; `build: PASS`; `screenshotVerification: not-run`. Run interval: `2026-09-12T10:29:18.438Z`–`2026-09-12T10:30:12.216Z` (53.778 seconds). The temporary consumer and raw receipt were kept outside the repository for local review.

The local server returned HTTP 200 for the requested registry items and their registry dependencies, then was stopped. Before restoring the 176 generated files, every generated diff was checked against the base: the only difference was the intentional substitution of the public registry URL with localhost. Those temporary URL substitutions are excluded from this checkpoint.

### Limits and handoff

The constant change was verified through the real CLI install and consumer build. The existing consumer dependency ranges and upstream initialization resources remain network-dependent; this checkpoint pins the installer version only. Vite emitted a size warning for the consumer JavaScript chunk (921.69 kB, 258.63 kB gzip); the build still exited 0.

Screenshots, interaction checks, optional-component consumers, the complete release gate, account configuration checks and hosted-registry verification were not run for this child checkpoint. There was no deployment, provider report or registry submission. The full site build must still pass independently in CI with checkout-local dependencies. PR review, required checks and the separate production approval gate remain required. Rollback is a revert of this scoped checkpoint commit.
