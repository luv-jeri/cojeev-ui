# Licence notices in component downloads — I03

Checkpoint I03 of `docs/superpowers/plans/2026-09-12-launch-master-checklist.md`:
"Sampled component/shared payloads did not include the project's MIT notice.
Correct registry generation so recipients receive applicable notices, then test
clean consumer output and upstream attribution."

Base commit `5358d25aded2c7b030d394e289475bc030a82578`.

## What a consumer actually received

Installing a component with the real shadcn CLI (4.21.0) from the built
payloads, into an empty project, wrote **81 files** and not one notice:

- no file named for a licence or notice, and no occurrence of `MIT License` or
  `Copyright (c) 2026 Sanjay Kumar` anywhere in the installed tree;
- the two font notices *did* arrive, at `src/styles/fonts/DMSans-OFL.txt` and
  `src/styles/fonts/BricolageGrotesque-OFL.txt`. They are declared in
  `registry/cojeev` as `registry:file` entries with a target, which is the
  mechanism that works.

## Why a header comment cannot fix it

Comparing each installed file against the `content` in `public/r/cojeev.json`
showed the payloads are not the problem — the payload content is verbatim, with
notices intact. The installer is: it re-prints every `.ts`/`.tsx` file it copies
and drops the comment the file opens with.

Of the 61 TypeScript files a `button` install writes, 15 opened with a comment
in the payload and **none of the 15 kept it** after installation. Three of those
carried upstream attribution:

| Source | Notice lost on install |
| --- | --- |
| `registry/cojeev/lib/bloom-engine.ts` | MIT — Copyright (c) 2026 Meng To (ThreeUI Semantic Bloom) |
| `registry/cojeev/lib/icon-data.ts` | ISC/MIT — Lucide contributors, Cole Bemis (Feather) |
| `registry/cojeev/lib/lucide-icon-data.ts` | ISC/MIT — Lucide contributors, Cole Bemis (Feather) |

A notice placed *after* a directive prologue survives: `motion-drawer.tsx` and
`linear-modal.tsx` open with `"use client";`, and their "Copyright (c) 2024 UI
LAYOUT" headers arrive in the consumer untouched. Those are left where they are.

So the project's MIT text could never have been delivered as a source header
either. It has to travel as an installed file.

## The change

`scripts/registry-notices.mjs` (new, 33 lines) collects the comment each
registry source opens with, keeps only the ones containing a copyright, groups
files that share an identical notice, and renders one text file that begins with
the repository's `LICENCE` verbatim.

`scripts/build-registry.mjs` writes that file to `registry/cojeev/NOTICES.txt`
and declares one more entry on the base item:

```
{ path: "registry/cojeev/NOTICES.txt", type: "registry:file", target: "lib/cojeev/NOTICES.txt" }
```

Every generated entry lists `.../r/cojeev.json` in its `registryDependencies`,
so the base is in the install closure of all 172 entries and the notice reaches
any consumer, whatever they install. No component source, public API, style or
payload content changed; nothing was authored beyond the file's
four-line preamble and its `Retained from …` separators — the licence and the
upstream notices are copied verbatim from files already in the repository.

`lib/cojeev/` is our own installed namespace, so the target cannot collide with
a consumer's own `LICENSE`, and no other entry claims that target.

## Verification

Runtime pinned to Node v22.22.0. Dependencies read from the existing
`analytics-fixture/node_modules`.

| Command | Result |
| --- | --- |
| `node scripts/build-registry.mjs` (before any edit) | 173 items; `git status` clean — the committed payloads were already current, so the diff below is only this change |
| `node scripts/build-registry.mjs` (after) | 173 items; 4 generated files changed, 21 inserted lines, no deletions |
| `node scripts/build-registry.mjs` twice more | `registry/cojeev/NOTICES.txt` byte-identical; no further diff |
| `node scripts/build-registry.mjs --metadata-only` | 172 entries refreshed, public payloads unchanged |
| `node --test tests/registry-notices.test.mjs` | 5/5 pass |
| `node --import tsx --test tests/*.test.ts tests/*.test.mjs` | **414/414 pass**, 20.0 s |
| `node scripts/lint.mjs` | exit 0 |

### Consumer installation, actually run

A fresh consumer, the real `shadcn add` against the built payloads served on
loopback:

- `motion-drawer` — `src/lib/cojeev/NOTICES.txt` present; contains the project
  MIT text verbatim, plus the Meng To and Cole Bemis notices that
  `src/lib/cojeev/bloom-engine.ts` and `src/lib/cojeev/lucide-icon-data.ts` lose;
  the installed `src/components/ui/motion-drawer.tsx` still carries its own UI
  LAYOUT header. This is `tests/registry-notices.test.mjs`, which asserts all of
  the above against the files on disk after the CLI has run.
- `button` — a plain component with no upstream code of its own: installed
  `src/lib/cojeev/NOTICES.txt`, 7106 bytes, `diff` byte-identical to
  `registry/cojeev/NOTICES.txt`. Closure confirmed in practice, not only in the
  dependency graph.

The test asserts against the live `LICENCE` and the live source headers, so
changing a licence or an upstream notice without rebuilding fails the suite.

## Generation and scope notes

- `public/r/*` is tracked in this repository and was already current, so this
  checkpoint commits only the four generated files it actually changes
  (`registry.json`, `public/r/cojeev.json`, `public/r/registry.json`,
  `public/registry.json`) — no catalogue-wide artifact churn.
- `registry/cojeev/NOTICES.txt` is generated but committed, like `registry.json`,
  because `shadcn build` reads it from disk.
- `scripts/ci-scope.mjs` has no allowlist entry for these paths, so CI resolves
  this change to the full release scope. That is the existing policy; it was not
  modified.

## Not covered

- The browser and catalogue gates, `npm run gate:*` and the full release
  workflow, were not run: this change adds one text file to the install payload
  and touches no component, style, motion or page source.
- `npm run typecheck` was not run; no TypeScript changed (the new files are
  `.mjs`, and `NOTICES.txt` is not compiled).
- The published site was not touched. Installation was verified from locally
  built payloads on loopback, never from the live registry.
- Notices are collected from `registry/cojeev/{lib,motion,ui}` only. CSS files
  carry no copyright headers today, and the font licences already ship as their
  own installed files.
- The two `"use client"` components keep their upstream headers because the
  current installer preserves them. If a future shadcn release stops doing that,
  `tests/registry-notices.test.mjs` fails on the installed file rather than
  passing silently.
- Whether `NOTICES.txt` should also be surfaced in the documentation site or the
  README is I01/I02 work, not this checkpoint.
