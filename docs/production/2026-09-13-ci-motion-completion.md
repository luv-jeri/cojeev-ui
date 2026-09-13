# B02-3: exit animations that never completed in the catalogue gate

Checkpoint: **B02-3**, a child of B02. Base: reviewed `f3fa84babb0b0bc9dc3c132e788a7f9f39639075` (`chore(workflow): record persistent recovery and accepted polish [W02]`), branch `fix/b02-3-ci-motion-completion`.

Run [34741552569](https://github.com/luv-jeri/cojeev-ui/actions/runs/34741552569) attempt 2 failed eleven behavior checks while every layout, every shared preview and every shell check passed. Run [34711839842](https://github.com/luv-jeri/cojeev-ui/actions/runs/34711839842) failed a subset of the same checks. Each failure waits for a motion exit to finish: a tooltip to leave the DOM, a replacement branch to mount after `AnimatePresence mode="wait"`, a dialog to unmount, a heading decode to advance a frame.

## Cause

`page.clock` is not a page API. In Playwright, `Page.clock` is assigned directly from its browser context (`page.clock = this._browserContext.clock`), every clock call is stored as a **browser-context init script**, and that script is replayed into every page the context opens afterwards. The client `Clock` class exposes `install`, `fastForward`, `pauseAt`, `resume`, `runFor`, `setFixedTime` and `setSystemTime` — and **no `uninstall`**.

Two behavior cases in `scripts/check-docs.mjs` install a clock to hold a finite state still: `agent-chat` (Stop cancels a pending timer) and `button` (a pending action stays busy-disabled). Both restore system time and resume the clock for their own page, which is correct for themselves. Neither can remove it from the context, and the harness retired only the page between entries. From that entry onward, every page the behavior context opened started with fake `Date`, `setTimeout` and `requestAnimationFrame`. Motion's animation loop then ran on a simulated clock while Playwright's `waitFor` deadline kept running on the real one, so exits that normally settle in well under a second no longer completed inside 10 s.

Measured directly, with no application involved (`node tests/docs-clock-isolation.browser.mjs --probe`):

| Page | `Date.now`, `setTimeout`, `requestAnimationFrame` |
| --- | --- |
| New context, first page | native |
| Same page after install/pauseAt/runFor/setSystemTime/resume | replaced |
| **New page in the same context, after the owning page was closed** | **replaced** |
| First page of a fresh context | native |

### All observed failures follow a clock owner in the same worker

`npm run gate` runs with `COJEEV_DOCS_SHARDS: '3'`, so `scripts/run-production-gate.mjs` partitions the catalogue by `position % 3` into three worker processes, each with its own browser and its own behavior context. `agent-chat` is the 2nd entry of shard 3; `button` is the 9th entry of shard 2; **shard 1 contains neither**.

| Failed check | Shard | Position in shard | Clock owner in that shard |
| --- | ---: | ---: | --- |
| article-headings | 3 | 5 | agent-chat (2) |
| attachment | 3 | 6 | agent-chat (2) |
| bar-chart | 3 | 7 | agent-chat (2) |
| conversation-panel | 3 | 15 | agent-chat (2) |
| line-chart | 3 | 29 | agent-chat (2) |
| organism-assembly | 3 | 35 | agent-chat (2) |
| presence | 3 | 39 | agent-chat (2) |
| radial-chart | 3 | 41 | agent-chat (2) |
| empty | 2 | 20 | button (9) |
| motion-drawer | 2 | 33 | button (9) |
| radar-chart | 2 | 41 | button (9) |

Eleven of eleven failures follow their own shard's clock owner. Shard 1 reported **no** failures, although it ran the same shared cases on clean entries — `pie-chart` (38th) uses the identical chart Escape journey that failed for bar, line, radar and radial, and `linear-modal` (30th) uses the identical dialog dismissal journey that failed for motion-drawer. This supports the clock-leak explanation rather than general machine load. The controlled reproduction below establishes that mechanism for three cases; it does not independently prove the cause of every remaining CI symptom. The combined release run is still required.

This also explains why `.superpowers/chart-diagnosis.md` and `.superpowers/overlay-diagnosis.md` could not reproduce anything. Both replayed one or two components per process. The leak needs a clock owner and a motion-exit case in the *same* worker, and neither probe ever ran one.

## Reproduction and negative control

Before the correction, against the already-served static export, one process, the gate's own primary behavior context (1440/light):

```sh
# fails, with the CI messages verbatim
node scripts/check-docs.mjs --url=http://127.0.0.1:4322/cojeev-ui \
  --ids=agent-chat,attachment,bar-chart --widths=1440 --themes=light
# passes: same two cases, same code, without the clock owner ahead of them
node scripts/check-docs.mjs --url=http://127.0.0.1:4322/cojeev-ui \
  --ids=attachment,bar-chart --widths=1440 --themes=light
```

| Entry | With `agent-chat` first | Alone | CI, run 34741552569 |
| --- | --- | --- | --- |
| attachment | failed — `getByRole('button', { name: 'Restore attachment' })`, 10000 ms | pass | same message |
| bar-chart | failed — `getByRole('tooltip') to be hidden`, 10000 ms, `23 ×` still visible | pass | same message, `20 ×` still visible |

## Correction

`scripts/check-docs.mjs` already retired the primary behavior page after every entry, because an animated page can keep rendering while the next entry runs. It now retires that page's **context** as well, and opens the next one from the same `docsContext(width, theme)` helper that built it originally — the same viewport, colour scheme, permissions, downloads setting and theme init script.

A per-entry context is the smallest change that is also reliable. Detecting a replaced clock and rebuilding only then would depend on recognising whichever globals a future Playwright version or a future case happens to wrap; an unconditional fresh context needs no such recognition, and isolates storage and permission state at the same time. Nothing else changed: the clock stays available to the two cases that need it, no timeout was raised, no assertion was relaxed, no component motion was altered and no application source was touched.

### Cost

Six clock-free entries at 1440/light, same machine, same served build, one process:

| Behavior context lifetime | Wall time |
| --- | --- |
| One context reused for the run (previous behaviour) | 42.5 s |
| One context per entry (this change) | 50.0 s |

About 1.25 s per entry locally. At `COJEEV_DOCS_SHARDS: '3'` that is roughly a minute of extra wall time per worker across a ~50-minute gate, and the workers run in parallel. The figure is from a local machine against a local server; the runner's own ratio will differ.

## Verification

Executed on this branch, against the static export at `http://127.0.0.1:4322/cojeev-ui`:

| Check | Result |
| --- | --- |
| `node tests/docs-clock-isolation.browser.mjs --probe` | pass — the clock outlives its page and not its context |
| `node tests/docs-clock-isolation.browser.mjs` (agent-chat, attachment, bar-chart, button, empty) | pass — 5/5 layouts, previews, behaviors; 0 runtime errors; 58.9 s |
| `node tests/docs-clock-isolation.browser.mjs --negative` | pass — attachment, bar-chart and empty each rejected, for their own named assertion; 75.4 s |
| `node scripts/check-docs.mjs --ids=agent-chat,attachment,bar-chart` (before the repair) | attachment, bar-chart failed — the captured reproduction |
| `node scripts/check-docs.mjs --ids=agent-chat,attachment,bar-chart` (after the repair) | pass |
| `node tests/docs-transient-timing.browser.mjs` | pass — the B02-2 harness, which owns both clock cases, is unaffected |
| `node --test tests/ci-scope.test.mjs tests/production-gate.test.mjs tests/docs-harness-fingerprint.test.mjs tests/component-polish-runner.test.mjs` | 115 pass, 0 fail |
| `npm run lint` | 0 errors (2 pre-existing warnings, unrelated files) |

The new test covers both clock owners and three of the eleven reported failures — one from each of `MotionPresence mode="wait"` (attachment), a chart tooltip exit (bar-chart) and a keyed replacement (empty) — in catalogue order, so both leak sources and all three affected shapes are exercised without rebuilding the catalogue. `--negative` restores the previous context lifetime by handing the harness one behavior context for the whole run and keeping it open; it asserts the three cases fail **and** that each failure names its own assertion, so an unrelated defect cannot satisfy it.

### Not run

- The full catalogue gate (`npm run gate`) and `npm run gate:mobile` / `:marketing` / `:smooth-scroll`. The release job is the acceptance evidence for those; this checkpoint is a test-runner repair, verified with the affected journeys per `docs/checkpoint-workflow.md`.
- `node tests/docs-transient-timing.browser.mjs --negative`. The positive mode, which exercises the changed code path, ran and passed; CI runs both.
- WebKit, the install journeys, the analytics and reporting suites.
- A successful `npm run build` in this worktree: the attempted build was blocked because Turbopack rejects the shared `node_modules` symlink (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`). Browser evidence above uses the already-served export; no application source changed. CI must still build its own exact-revision artifact.

## Review outcome

Primary and separate standards/spec reviewers inspected the lifecycle and the negative control. The primary also reran the direct clock probe and scope tests. Evidence is now present and the temporary `out` symlink was removed. The order comment was corrected. The explicit page close is retained so the negative control recreates the old page-only cleanup faithfully; removing it would leave old pages alive when that control suppresses context closure. The positive regression checks real interaction outcomes rather than adding another mock-call-count assertion. Final release acceptance is still pending.

## Runtime risk

The change is confined to the documentation harness. The residual risk is the added wall time above; if a future gate approaches its 90-minute job budget, the same isolation can be narrowed to the entries that follow a clock owner without altering any assertion.
