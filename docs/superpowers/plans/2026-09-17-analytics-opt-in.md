# Analytics Opt-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Enable the approved optional website analytics only after an explicit visitor choice, with verifiable withdrawal and privacy-signal suppression.

**Architecture:** The existing analytics client owns consent and the final capture gate. A shared subscribed status powers a small global prompt and the Privacy page. Existing page/demo/copy capture remains bounded and must not replay events suppressed before consent.

**Tech Stack:** Existing React/Next.js, TypeScript, Cojeev primitives, node:test and Playwright. No new dependency or hosted service.

## Global Constraints

- Implement the approved [design](../specs/2026-09-17-analytics-opt-in-design.md) as E03-2. Source base is main `a06b7be`; isolated branch `feat/e03-2-analytics-opt-in`.
- Prefix shell commands with `rtk`. Use Node 22.22.0 from the installed fnm runtime for tests/builds. Read installed Next docs for client boundaries and public build variables before editing.
- Preserve existing tokens, small-screen usability and keyboard focus. Consult `docs/design/PRODUCT.md`, `docs/design/DESIGN.md` and existing analytics consumers. No component-library redesign or registry payload changes.
- Explicit prior choice; equally accessible Allow/No thanks; persistent withdrawal; DNT/GPC override; storage failure fails closed; old false opt-out never grants consent.
- No suppressed-history replay. Cancel deferred impression/variant work on withdrawal and do not count pre-consent exposure time. Keep disabled builds silent regardless of stored choice.
- No production deployment, enable-flag changes, provider changes, secrets or paid upgrades. Release approval stays separate. The controller handles final commits, PR and account operations.
- Focus verification on analytics, affected UI and enabled/disabled builds; required CI remains authoritative for merge/release. Record test-running time separately.

## Task 1: Implement and verify the complete visitor choice

**Modify:** `lib/analytics/client.ts`, `components/analytics/analytics-preferences.tsx`, `components/analytics/analytics-provider.tsx`, `components/analytics/analytics-preview.tsx` if needed for deferred-event consent, `app/privacy/page.tsx`, `tests/analytics.test.ts`, `tests/analytics.browser.mjs`.

**Create if needed:** `components/analytics/analytics-consent.tsx`, `components/analytics/analytics-consent.css` and a small shared status hook in that directory. Keep the prompt mounted by the existing provider; do not spread independent client state across consumers.

**Interfaces:** retain `track`, event maps, configuration and normalization APIs. Replace internal `setOptOut` callers with a clear consent setter. Export the versioned preference key for tests. Use a shared status subscription for both prompt and preferences. All permitted capture still passes through `client.track`.

- [x] Add a real failing unit test before production changes: an enabled client with empty storage must return false from `track('page_viewed', {route:'/docs/'})` and make zero requests. Existing schema tests must explicitly opt in before exercising active behavior.
- [x] Cover explicit Allow, decline, withdrawal, recreated-client persistence, malformed/legacy choice, read/write failure, browser-signal override, cross-tab withdrawal and disabled configuration. Assert actual request counts and bodies; do not merely test status labels.
- [x] Implement the smallest centralized consent state and capture gate. Suggested public semantics:

```ts
type AnalyticsConsent = 'unset' | 'allowed' | 'declined';
// Consent reads never interpret the old opt-out=false as allowance.
// setConsent('declined') blocks synchronously even when persistence fails.
// track checks configuration, browser signal and fresh persisted consent.
```

- [x] Add the approved prompt and inline preference controls using existing primitives. In a fresh enabled browser the prompt must offer both choices; Privacy must always make withdrawal discoverable. Explain blocked storage and browser privacy state without claiming provider anonymity.
- [x] Update Privacy copy to describe prior opt-in and the local preference key. Preserve reporting disclosures and owner facts.
- [x] Update the existing real-export browser harness. Keep active-behavior tests running by explicitly seeding allowed choice in those contexts. Add fresh unset contexts for before-choice silence, decline/reload, allow/future navigation/copy, withdrawal/reload, storage failure, GPC/DNT and private routes. Intercept every PostHog request; no real ingestion occurs. Preserve existing schema, copy-truth, SPA and impression tests.
- [x] Run focused unit tests, targeted lint and typecheck. Build an enabled fixture with the test token and environment/release stamps; run the analytics browser harness. Build a disabled fixture and run its silent mode. If a real-widget fixture is useful for rapid test-first iteration, it does not replace the exported-build checks.

```sh
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH node --import tsx --test tests/analytics.test.ts
rtk proxy env PATH=/Users/sanjaykumar/.local/share/fnm/node-versions/v22.22.0/installation/bin:$PATH node node_modules/eslint/bin/eslint.js lib/analytics/client.ts components/analytics app/privacy/page.tsx tests/analytics.test.ts tests/analytics.browser.mjs --max-warnings=0
```

- [x] Report files, red/green evidence, check times, final results and limitations to the controller. Do not push or change remote variables.

## Controller acceptance and release preparation

- [x] Review the complete implementation independently and resolve findings.
- [x] Inspect the running built UI once in Chrome: desktop/mobile and light/dark consent surface, keyboard reachability, decline/allow and Privacy withdrawal. A local preview is not a deployment.
- [x] Record owner approval, implementation behavior and sanitized test evidence in `docs/privacy/2026-09-17-analytics-opt-in.md`; add E03-2 beneath E03 in the master checklist. Leave overall E03/E04 open for exact-artifact/live acceptance and any remaining policy work.
- [x] Create a scoped E03-2 commit and PR with evidence/rollback. Follow normal CI/review/merge protections. Record exact remaining activation and production-approval actions; never enable an older artifact by flipping a flag prematurely.

Delivery: source commit `27d4201`, [PR #73](https://github.com/luv-jeri/cojeev-ui/pull/73). Required CI/merge and protected production approval remain pending. [Evidence and activation sequence](../../privacy/2026-09-17-analytics-opt-in.md).
