# Agent Chat completion focus (B02-5)

Combined run [34790623446](https://github.com/luv-jeri/cojeev-ui/actions/runs/34790623446)
failed the `agent-chat` catalogue entry's behavior column while passing all six of its
layouts, every other behavior case and all nine motion presets:

```
locator.focus: Timeout 10000ms exceeded.
  - waiting for locator('[data-example="agent-chat"][data-example-role="interactive"]')
      .getByRole('button', { name: 'Stop generation', exact: true })
    - locator resolved to <button ... aria-label="Stop generation" ...>
    - element was detached from the DOM, retrying
```

This checkpoint repairs that case only. The same run also failed `shape-scene`'s shared
preview; that is a separate child, B02-7, and is neither addressed nor closed here.

No product source is changed. Product motion, native focus and clipboard requirements are
untouched; no timeout was raised and no assertion was removed or weakened.

## Cause: test-harness timing, not a product defect

`scripts/check-docs.mjs` focused `Stop generation`, a control whose lifetime is bounded by
the demo's own real 1800 ms completion timer, with no clock held. The `page.clock` block
covering the cancellation section ends earlier and restores real time, so the whole budget
for the focus call was the 1800 ms left after the `Continue` click settled. When the driver
round trip exceeds that, the demo has already replaced Stop with Send, `locator.focus()`
retries a locator that can never match again, and the 10 s default timeout fires. "Element
was detached from the DOM, retrying" is the symptom of that replacement.

The product's restore path is correct and is not timing-dependent:
`registry/cojeev/ui/agent-chat.tsx:109-113` captures `node.ownerDocument.activeElement === node` in a React 19
callback-ref cleanup, which runs before React removes the node, and `agent-chat.tsx:114-118`
focuses the textarea on the `running` → `false` edge only if that capture was true. A genuine
regression would fail the final restore assertion, not detach during setup.

That is an **argument** from the source, not a control. No test in this checkpoint mutates
the product's focus restoration — see "Coverage this checkpoint does not add" below.

## Correction

The agent-chat case now waits for `Allow once`, pins and pauses the clock across
options → working → complete (the only interval in which Stop is mounted), focuses Stop,
asserts native focus explicitly, advances the demo's own 1800 ms timer with `runFor(2000)`,
and restores real time in `finally`. `setFixedTime` before `pauseAt` keeps `toConsume` at
zero so a slow driver cannot make the captured instant stale. The real keyboard
`key(Retry, "Enter")`, the real completion driven by the demo's own timer, the "no stolen
outside focus" assertions and the whole cancellation section are unchanged.

**Permanent reproduction.** `tests/docs-transient-timing.browser.mjs` now delays
`locator.focus()` by 2500 ms for locators naming `Stop generation`, recorded as the
`completion-focus` intervention. 2500 > 1800 makes the old harness fail deterministically,
while under the corrected harness the paused clock means the delay cannot advance the demo.

## Verification

Local only. Node 22.22.0 (pinned via `fnm exec --using=22.22.0`), playwright 1.63.0, macOS,
hardware GL.

| Check | Command | Result |
| --- | --- | --- |
| Intervention guard | `node tests/docs-transient-timing.browser.mjs --check-intervention-guard` | `{"guard":"pass","completeModes":2,"missingIdsRejected":10}` |
| Delayed driver, corrected harness | `node tests/docs-transient-timing.browser.mjs` | pass; `injected` contains `completion-focus`; four entries pass layouts, preview and behavior |
| Delayed driver, harness reverted to `4a1a4f9` | same command, `scripts/check-docs.mjs` only at the old revision | **fails** with the run's exact error: `agent-chat: locator.focus: Timeout 10000ms exceeded` waiting for `Stop generation` |
| Negative mode | `node tests/docs-transient-timing.browser.mjs --negative` | pass; the four intended broken-behavior rejections intact, including "Cancelled timer must not reopen permission" |
| Clock isolation | `node tests/docs-clock-isolation.browser.mjs` | pass; `reusedContexts: 0`; `agent-chat, attachment, bar-chart, button, empty` all pass behavior, preview and layouts |

### What each control actually proves

Stating this precisely, because the three controls are easy to over-read:

| Control | What it proves | What it does **not** prove |
| --- | --- | --- |
| `--check-intervention-guard` | the expected intervention **id list** is enforced; a missing `completion-focus` is rejected (10 missing-id rejections) | nothing about product behaviour |
| Delayed driver on the reverted harness | the flake is real, is caused by the unheld clock, and the correction addresses it — **the old harness fails, the corrected one passes** | nothing about product behaviour: only `scripts/check-docs.mjs` is reverted; the application is never mutated |
| `--negative` | four unrelated product mutations (`retain-cancelled-timer`, `enabled-pending`, `hide-ring`, `opaque-reveal`) are still rejected | none of the four touches focus restoration on the `running` → `false` edge |
| Clock isolation | the second `setFixedTime`/`pauseAt`/`runFor`/restore cycle added to agent-chat leaks no fake clock into the entries that follow it — `attachment`, `bar-chart` and `empty` need a real exit animation and all passed | nothing about product focus behaviour |

**The delayed-driver control is a harness control, not a product control.** It demonstrates a
harness race and its repair. It does not demonstrate that a broken completion focus would be
rejected.

### Coverage this checkpoint does not add

The single assertion that proves the product behaviour —
`eventually(() => draft === document.activeElement, "Completion returns focus from Stop to
the draft")` — has never been shown to fail against a mutated product. No mutation in any
current mode covers it, and this checkpoint deliberately does not add one.

The reason it is deferred rather than done: in `--negative`, `retain-cancelled-timer` already
fails the agent-chat case at "Cancelled timer must not reopen permission", well before
completion focus is reached, so a second agent-chat mutation in the same mode would never
execute. A real control needs either a third mode (the clock-isolation suite's `--probe` is
the local precedent) or per-case gating so only one agent-chat mutation runs at a time. The
mutation itself is then small — a `goto` patch on `/docs/agent-chat/` making the draft
textarea's `focus()` a no-op, which must make the final assertion fail.

Recorded here so the absence is not mistaken for coverage. Worth doing when the suite next
gains a mode.

## Source and limitations

- Branch cut from `origin/main` at `00922a2`; the harness change is `76aaef1` from
  `fix/b02-7-preview-regressions`, cherry-picked unchanged.
  `scripts/check-docs.mjs` and `tests/docs-transient-timing.browser.mjs` are byte-identical
  between `4a1a4f9` and `00922a2`, so the cherry-pick carried no drift.
- The clock-isolation run reused an existing static export rather than building another. That
  artifact's source differs from this branch by exactly one line —
  `app/getting-started/page.tsx`, a documentation href — and the suite loads only
  `/docs/{agent-chat,attachment,bar-chart,button,empty}/` and `/docs/button/`, none of which
  that line affects. No new build was made.
- `scripts/check-docs.mjs` is listed in `docsHarnessFiles`, so this commit changes
  `harnessSha256`. Any pinned harness fingerprint needs refreshing.
- **Not run:** the full component catalogue, full build suites, the combined release gate,
  mobile/WebKit, analytics, install-consumer, deployment and provider operations. Everything
  above is local; there is no CI evidence for this change yet.

## Checkpoint tracking

- B02-5 is a child of **B02 — Verify the complete final-source gate**, in
  `docs/superpowers/plans/2026-09-12-launch-master-checklist.md`. B02-5 and the separate
  unresolved B02-7 now have explicit open rows. The PR records its exact reviewed source;
  merge and release results must be recorded only after they occur.
- **This checkpoint does not close B02-5 acceptance.** It repairs the case and proves the
  repair locally. Closure still needs the focused CI run on this branch, review, and merge.
- **B02 remains open.** The combined release gate has not been rerun, and B02-7 (`shape-scene`
  shared preview) is still open with its cause unproven; its evidence is preserved on
  `fix/b02-7-preview-regressions` at `6cb1688`.
