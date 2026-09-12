# B02-2: reliable observation of finite browser states

Checkpoint: **B02-2**, a child of B02. Base: reviewed B02-1 commit `460159517187c848385593d8b618987d2b3b1910`.

Run [34688474452](https://github.com/luv-jeri/cojeev-ui/actions/runs/34688474452) failed three behavior checks while their layouts and shared previews passed. Source inspection and disposable browser probes identified finite states that a delayed test driver can miss:

| Check | Application behavior | Old observation race |
| --- | --- | --- |
| Agent Chat Stop | Thinking advances to permission after 1400ms; permission replaces Stop with Send and offers Cancel request | Stop can disappear between Send, the focus assertion and the native Stop click |
| Guided Pointer arrival | The selected click waypoint emits a 540ms ring and then returns to opacity 0 | Sequential status/position checks can consume the ring before opacity polling starts |
| Text Reveal replay | Four words animate from opacity 0 to 1 with a 480ms duration and 35ms stagger | Driver-side polling begins after the real click returns and may see only the settled words |

The unchanged application rendered the expected intermediate paint in event-triggered browser-frame probes. Recorded ring opacity was positive for 32 frames before settling to 0; text replay had 46 frames satisfying `0 < opacity < .99` before all words settled to 1. These observations establish a reproducible mechanism, not a reconstruction of the exact historical CI scheduling. Product durations, application/example code, dependencies and workflow budgets are unchanged.

## Correction

`scripts/docs-transient-paint.mjs` supplies one bounded opacity observer shared by the two paint checks. It attaches before the real native click, begins sampling on that click event, and retains whether an actual computed-opacity sample met the original predicate. Sampling has the existing 3500ms observation budget; listeners, timers, animation-frame callbacks and handles are cleaned up. Initial reveal paint is allowed to settle first, and the pointer starts from its still state, so old animation frames cannot satisfy the replay assertions. Existing final-paint, geometry, status, pointer/keyboard, accessibility, bounds and reduced-motion checks remain active.

The Agent Chat cancellation scenario installs the browser clock while idle, fixes its wall time to a known instant, then pauses at that same instant **before Send**. Fixed wall time cannot advance between the driver calls, so `pauseAt` cannot receive a stale past target even if its driver call is delayed. This uses no future-time margin. Stop remains a native Playwright click with normal actionability checks. After Stop, advancing the clock through the existing 1500ms interval proves cancellation. A nested `finally` restores system time and resumes the browser clock, including if setup or an assertion fails. All later conversation, error/retry and focus checks run with resumed time.

The focused regression runner imports the actual catalogue harness. It does not duplicate the three cases or introduce product hooks. It injects 2500ms driver delays before clock pause and Stop, and after Next/Replay clicks. Its negative mode temporarily disables computed ring/reveal paint or retains the cancelled timer in disposable browser pages. It requires the exact intended assertion failures plus passing layouts, preview, runtime-error checks, chrome and stable provenance; unrelated failures cannot be converted into success.

## Verification

Commands below use Node **22.22.0**, with the existing Chromium and locked dependencies. `out` points to a fresh existing export with matching application source; no new Next build or dependency installation was performed for this checkpoint.

```sh
rtk proxy node tests/docs-transient-timing.browser.mjs --output=output/playwright/transient-red
rtk proxy node tests/docs-transient-timing.browser.mjs
rtk proxy node tests/docs-transient-timing.browser.mjs --negative
rtk proxy node scripts/check-docs.mjs --serve --ids=agent-chat,guided-pointer,text-reveal --output=output/playwright/transient-matrix
rtk proxy node node_modules/eslint/bin/eslint.js scripts/check-docs.mjs scripts/docs-behaviors-details.mjs scripts/docs-transient-paint.mjs tests/docs-transient-timing.browser.mjs --max-warnings=0
rtk git diff --check
```

The red command was run before the synchronization correction. It failed Stop's original 10000ms locator timeout and both original intermediate-paint assertions, while layouts, preview and chrome passed. The corrected delayed run passed all three complete behaviors. The negative run rejected exactly the retained cancellation timer (`1 !== 0`), invisible ring and absent text interpolation. The normal focused matrix passed **18 layouts** (360/768/1440 × light/dark × three components), all three full behaviors, and all six chrome contexts. Existing reduced-motion cases remained active. Focused lint and whitespace checks passed.

The source/build comparison covered 542 files under `app`, `components`, `lib`, `registry/cojeev`, `data`, `next.config.ts`, `package.json` and `package-lock.json`. Both application-source fingerprints were `dd0c08d4d05a140bc2c5e437e76e635b7536f2856a80d6ef20fccf09c07b4030`. Local gate receipts identify the base revision plus the tested harness hash; these browser-only edits do not require rebuilding the unchanged application. Before-correction harness hash: `d5fbecbd5a5ba51e10e628c831a171e56cee615b9c7b5c2da1fc6e9fb9b7b581`. Corrected harness hash: `2a1f8b8ec2f4a23a3417d9f1f5656f9601510e0659adea9df0bf399e1367aa1d`.

An intermediate clock implementation exposed a setup race when a sampled `Date.now()` target became stale before `pauseAt`; its interrupted probes are not acceptance evidence. The final fixed-wall-time ordering specifically covers this boundary with a 2500ms injected delay and guaranteed cleanup.

This is focused checkpoint evidence. A complete final-revision CI gate, PR review and the separate production approval remain primary-owned acceptance steps. No deployment or complete catalogue pass is claimed here. Rollback consists of reverting this test-only checkpoint.
