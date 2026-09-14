# B02-1: restore landing analytics acceptance coverage

Checkpoint: **B02-1**, a child of B02 / Phase 1 Task 3. Verified locally on 12 September 2026 from B01 base `d345a58bebad8276f05b68c0facea12d66bd6e58`, with only the test correction below applied. Full final-source CI acceptance remains pending.

## Failure and correction

The restored homepage renders six featured specimens: Motion Drawer, Semantic Bloom, Animated Icon, Dock, Agent State and Subtle Backgrounds. The analytics browser gate still waited for a slider that the homepage no longer renders. A fresh enabled export reproduced the failure before editing the test:

```text
locator.waitFor: Timeout 30000ms exceeded.
waiting for locator('[data-analytics-preview="slider"]') to be visible
tests/analytics.browser.mjs:258:20
Node.js v22.22.0
```

The fixture now targets the real Motion Drawer preview inside its featured card. At the gate's 1280 × 900 viewport, an inspected initial rectangle was y=997.03125–1191.03125, so the preview starts below the viewport. The existing scroll-to-specimen, one-second/50-percent impression behavior and scroll-away/return deduplication case remain. The event now also receives an exact property assertion for `component_id: "motion-drawer"`, `placement: "landing"`, `route: "/"`, public build stamps and privacy flags.

No homepage, component, analytics product code, configuration, dependencies, timeouts or existing cases changed. Docs interactions, successful source/install copies, failed guide copy, preview background selection, SPA navigation/campaign deduplication, DNT, GPC, opt-out/in, suppressed history, private routes and bounded payload checks remain in the complete script.

## Reproducible local fixtures

Used Node **22.22.0**, Next **16.3.4** and the existing locked dependency installation copied once into the isolated worktree. The source and dependency installation's `package-lock.json` SHA-256 both equal `161451361eaffd375810ca41fcece26208dd5d82abde635d59df7a6608847f95`. Each configuration was rebuilt with `npm run build`; each produced 189 static pages. No old export was used to reproduce the failure, and silent cases did not reuse the enabled export.

All commands ran in the isolated B02-1 worktree. Runtime selection for each command was:

```sh
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH <command>
```

Enabled fixture build, run before both the original failing test and the corrected passing test:

```sh
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH NEXT_PUBLIC_ANALYTICS_ENABLED=true NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_public_test_token NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT=beta NEXT_PUBLIC_RELEASE_SHA=0000000000000000000000000000000000000000 npm run build
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH ANALYTICS_TEST_ENVIRONMENT=beta ANALYTICS_TEST_RELEASE=0000000000000000000000000000000000000000 npm run analytics:browser
```

Unset fixture and browser run:

```sh
rtk proxy env -u NEXT_PUBLIC_ANALYTICS_ENABLED -u NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN -u NEXT_PUBLIC_POSTHOG_HOST -u NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT -u NEXT_PUBLIC_RELEASE_SHA PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH npm run build
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH node tests/analytics.browser.mjs --expect-silent
```

Explicitly disabled fixture and browser run:

```sh
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH NEXT_PUBLIC_ANALYTICS_ENABLED=false NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_public_test_token NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT=beta NEXT_PUBLIC_RELEASE_SHA=0000000000000000000000000000000000000000 npm run build
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH node tests/analytics.browser.mjs --expect-silent
```

The browser gate serves `out` locally on an ephemeral port. Both approved PostHog hosts are intercepted before page navigation. Every enabled request carries the dummy `phc_public_test_token`; requests are fulfilled or aborted locally. No real provider project, account or secret was used or changed.

## Results and acceptance boundary

| Check | Result |
| --- | --- |
| Fresh enabled export, original browser test | Expected red: missing slider selector timed out after 30 seconds |
| Same enabled export, corrected complete browser test | Pass: bounded capture, copy truth, privacy signals, route deduplication, impressions and demo intent |
| Fresh unset export and `--expect-silent` | Pass: zero captures, including after a real successful copy |
| Fresh explicitly disabled export and `--expect-silent` | Pass: zero captures, including after a real successful copy |
| `npm run analytics:test` under Node 22.22.0 | 12 passed, zero failed or skipped |
| `node --check tests/analytics.browser.mjs` under Node 22.22.0 | Pass |
| `git diff --check` | Pass |

No further analytics browser failures appeared after the fixture correction. These results establish local fixture coverage only; they do not establish complete CI, clean-consumer acceptance, live provider ingestion, a beta deployment or production approval. The primary owns the separate PR, exact-final-revision CI run and master-checklist updates. No push, PR, merge or deployment was performed in this subtask.

Visual approval is not applicable because rendered product code is unchanged. Rollback is the scoped B02-1 commit revert; it restores the stale selector and its known failing gate without changing analytics behavior.
