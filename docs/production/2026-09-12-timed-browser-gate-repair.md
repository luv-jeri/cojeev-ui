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

## Review correction: fingerprint the extracted observation code

Review of the initial synchronization commit (`846617c`) found that the normal Git-backed receipt fingerprint still hashed only `check-docs.mjs`. Its stable value could not detect edits to the newly extracted paint observer or changed details module. The initial receipt hashes above are therefore historical single-file evidence, not the final multi-file provenance claim.

Both start/end `harnessSha256` fields now use one deterministic path-and-content fingerprint over `scripts/check-docs.mjs`, `scripts/docs-behaviors-details.mjs`, `scripts/docs-transient-paint.mjs` and the fingerprint implementation `scripts/docs-harness-fingerprint.mjs`. The receipt records the exact ordered `harnessFiles` list. Each file contributes its relative path, a NUL delimiter, byte length, another NUL delimiter and raw bytes. Missing files fail closed. The existing start/end comparison now detects a mutation to either observation dependency in normal Git-backed runs as well as snapshot runs.

`tests/docs-harness-fingerprint.test.mjs` mutates each named observation file in an isolated temporary fixture. The extracted old single-file algorithm failed both cases with identical before/after hashes; the multi-file algorithm passes both mutation cases and repeated-read stability assertions. The actual delayed and negative catalogue regressions were then rerun, retaining all prior behavior checks and requiring stable amended fingerprints.

```sh
rtk proxy node --test tests/docs-harness-fingerprint.test.mjs
rtk proxy node tests/docs-transient-timing.browser.mjs --output=output/playwright/transient-fingerprint-delayed
rtk proxy node tests/docs-transient-timing.browser.mjs --negative --output=output/playwright/transient-fingerprint-negative
rtk proxy node node_modules/eslint/bin/eslint.js scripts/check-docs.mjs scripts/docs-harness-fingerprint.mjs tests/docs-harness-fingerprint.test.mjs --max-warnings=0
```

Results: **2/2 fingerprint tests pass**; delayed mode passes all three full behaviors; negative mode rejects exactly the original cancellation/ring/reveal failures. Both runs preserve passing layouts, shared preview, runtime checks, chrome and start/end provenance. Their amended fingerprint is `3634775e6f186b7f014da230795f44ab5e278444c75783c069dd0cbc119ef3fb`. Focused lint passes. No full catalogue rerun, application change or new build was needed for this provenance-only correction.

## Continuation: observe button loading before it completes

Run [34692165467](https://github.com/luv-jeri/cojeev-ui/actions/runs/34692165467) failed the `button` behavior check while all six of its layouts passed. After Loading duration was set to its 0.5s minimum and Add a note was pressed, `getByRole("button", { name: "Adding…", exact: true }).isDisabled()` timed out at 10000ms because the pending phase had already finished. The other two failures in that run were already corrected by `39d0c31`.

`ButtonExample` in `components/examples/static.tsx` sets phase `pending` and schedules exactly one `setTimeout` at `duration * 1000`; the loading Button renders `aria-busy` and `aria-disabled` and never sets the native `disabled` attribute. At the minimum duration the entire observable window is 500ms, shorter than a delayed driver round trip. Component behavior, CSS, product durations and gate timeouts are unchanged.

### Correction

The `button` case now uses the same narrow browser-clock pattern as Agent Chat, scoped to the first loading run only. It installs the clock while idle, fixes wall time to a known instant, then pauses at that same instant **before** the press, so a delayed `pauseAt` call cannot receive a stale target. Add a note remains a native Playwright click. The held clock makes the real pending semantics readable: the status message `Running the local example…`, `Adding…` reported disabled through `aria-disabled`, and no native `disabled` attribute. Advancing the clock by 1000ms then fires the actual 500ms timer and the success message is asserted. A nested `finally` restores system time and resumes the clock even if setup or an assertion fails. Every later assertion — duration slider control, keyboard error path, retry, the 10s cancellation and the final natively disabled control — runs on resumed real time and is unchanged. No assertion was dropped or weakened; two existing bare assertions gained explicit failure messages.

`tests/docs-transient-timing.browser.mjs` adds `button` as a fourth case in the existing mechanism. One new delayed intervention, `add-note`, sleeps 2500ms after the real Add a note click, so the driver observes the pending state late. One new negative intervention, `enabled-pending`, breaks only the pending semantic: a `MutationObserver` on the disposable browser page removes `aria-disabled` from `[data-slot="button"][aria-busy="true"]`, leaving a busy control that never blocks input. Expected case count, both intervention lists and the missing-intervention guard were updated accordingly.

### Verification

Node **25.3.0**, existing Chromium and locked dependencies. `out` was temporarily linked to an existing export whose tracked application source is byte-identical to this worktree (`app`, `components`, `registry`, `lib`, `data`, `public`, `workers`, `apps`, `next.config.ts`, `package.json`, `registry.json`, `components.json`, `postcss.config.mjs`, `tsconfig.json` all compared equal); the link was removed afterwards. No new build or dependency installation was performed.

```sh
rtk run node tests/docs-transient-timing.browser.mjs --output=output/playwright/transient-delayed-red
rtk run node tests/docs-transient-timing.browser.mjs
rtk run node tests/docs-transient-timing.browser.mjs --negative
rtk run node tests/docs-transient-timing.browser.mjs --check-intervention-guard
rtk run node node_modules/eslint/bin/eslint.js scripts/check-docs.mjs tests/docs-transient-timing.browser.mjs --max-warnings=0
rtk git diff --check
```

The red command was run with the delayed intervention in place and the original `button` case. It failed that case with `Expected text: Running the local example…`, reaching the missed transient state one assertion earlier than CI did and from the same cause; agent-chat, guided-pointer and text-reveal still passed, as did all layouts, previews and chrome. The corrected delayed run passed all **4** behaviors. The negative run rejected exactly four cases, `button` for the intended reason `Pending action must stay busy-disabled while it runs`, alongside the original cancellation, ring and reveal rejections, with layouts, preview, runtime checks, chrome and start/end provenance still passing. The intervention guard reported `{"guard":"pass","completeModes":2,"missingIdsRejected":9}`. Focused lint and whitespace checks passed.

Both corrected runs recorded matching start and end harness fingerprints of `67e7ae758f544d118b275515616e62c1254a75f46f53f1a465a36fe034c39dfd` over the existing four-file list, and `dirty: false` for the Git-backed application-source revision at `39d0c31320daed6081f18f4d4ef1456e8770f23c`, confirming this checkpoint changed no application source. The pre-correction red run recorded the previous fingerprint `3634775e6f186b7f014da230795f44ab5e278444c75783c069dd0cbc119ef3fb`.

Scope: no full catalogue pass, no 172-component or multi-width run, and no CI run is claimed here. Primary review and the complete final-revision gate remain owner-held steps. Rollback is a revert of this test-only commit.
