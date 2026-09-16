# E03-2: explicit visitor analytics choice

## Outcome and authority

On 17 September, Sanjay approved the proposed Allow analytics / No thanks behavior and asked to enable analytics. E03-2 supplies the consent implementation and source-reviewed candidate. Production activation remains subject to the protected environment approval; no remote flags, provider settings or production bytes were changed by this checkpoint. Cost: $0.

The prompt appears only in configured builds on eligible public pages. Privacy contains inline allow and withdrawal controls. No event or page identifier is created before allowance. Only future page navigation, interactions and successful copies are eligible after Allow; suppressed history is not replayed. Decline survives reload when storage works, and normal withdrawal stops already-open tabs. DNT/GPC, disabled configuration and private pages suppress capture. Existing event/property limits remain intact.

## Failure boundaries

Read/write failure blocks this page. A failed withdrawal is broadcast to open peers when BroadcastChannel works, including when storage still contains an old allowance. Delayed storage events cannot undo the block. The visible message warns that an old allowance can return after reload when the change could not be saved. Without BroadcastChannel, persisted withdrawal still suppresses peers, but failed writes cannot notify them; an already-declined peer needs reload after a later Allow. These conservative fallback limits are documented in the [design](../superpowers/specs/2026-09-17-analytics-opt-in-design.md).

## Verification

Source base: main `a06b7be682010d73085122e968a30b4caa904bd9`, branch `feat/e03-2-analytics-opt-in`. Node 22.22.0. Test capture uses a dummy token and intercepts PostHog requests; it does not add dashboard events.

- Focused units: 18 passing, including pre-consent silence, persisted choices, failed storage, stale cross-tab events, DNT/GPC and bounded payloads. Final controller run: 0.19 seconds wall time.
- Targeted analytics/Privacy lint: passed, 1.91 seconds. TypeScript: passed (implementer); timing not separately recorded.
- Independent source review: initial failed-write and stale-event findings reproduced and fixed; final review passed within the documented fallback boundary.
- Enabled exported browser journey: passed, 38.68 seconds. Includes real two-tab failed-write withdrawal followed by stale consent and null storage events, pre-choice silence, decline/reload, future captures after Allow, fresh impression timing, privacy signals, private routes and existing event/copy checks.
- Disabled exported browser journey: passed, 10.26 seconds, both fresh and previously allowed visitors make zero PostHog requests.
- Enabled and disabled builds: 190 pages each; 25.19 and 24.51 seconds respectively. Separate immutable ignored exports prevented fixture replacement during checks.
- Final whitespace and added-document links: checked. Commands: `node --import tsx --test tests/analytics.test.ts`, targeted ESLint, `tsc --noEmit`, and `node tests/analytics.browser.mjs` with the enabled export, then `--expect-silent` with the disabled export. `ANALYTICS_TEST_OUT_DIR` selects each local snapshot; CI retains its default `out` export.
- Chrome visual check: desktop and 390×844 mobile, light/dark; readable prompt, equal actions, 44px mobile action height, no horizontal overflow, separate reporting launcher. Keyboard Tab reached No thanks with visible focus; Enter dismissed it. Privacy Allow changed the visible status to on, and keyboard withdrawal changed it to off. The local visual preview blocked external connections with CSP. Temporary viewport override was reset.

Check-running time above excludes authoring/debugging/review. The full release workflow, including the unset-build variant, broad catalogue and fresh-consumer release checks, is delegated to required CI, not claimed as local passes. Local visual inspection is engineering evidence, not fabricated owner visual approval or proof of deployment.

## Activation sequence and rollback

1. Merge only the reviewed E03-2 candidate through required checks and review protections. Keep any earlier production approval waiting.
2. Enable beta for the reviewed main revision, leave production off, and run the release workflow. Verify the new beta artifact and visitor choice behavior; record revision and artifact digest.
3. Build a production-enabled artifact from the same reviewed revision. A flag is inlined at build time; changing it cannot activate old bytes.
4. Sanjay approves the exact protected production deployment after beta and release acceptance. Check live opt-in silence/allow/withdraw behavior and a permitted production event receipt in PostHog, filtered by deployment/release.
5. Roll back by rebuilding and deploying analytics-disabled artifacts through the same approval path. Merely setting a variable false does not disable an already-published bundle.

E03/E04 broader policy and live verification remain open. Historical PostHog event counts are not a current visitor or successful-installation baseline.
