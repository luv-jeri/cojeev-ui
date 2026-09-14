# Catalogue completion-focus and shared-preview failures (B02-5, B02-7)

Combined run [34790623446](https://github.com/luv-jeri/cojeev-ui/actions/runs/34790623446)
reported two catalogue failures in shard 3 and passed every layout and motion preset:

| Entry | Column | Reported detail |
| --- | --- | --- |
| `agent-chat` | behavior | `locator.focus: Timeout 10000ms exceeded` waiting for `Stop generation`; `element was detached from the DOM, retrying` |
| `shape-scene` | preview | `preview: "failed"`; the detail is written only to `results.json`, not to the console line |

Both are recorded as separate children: B02-5 (completion focus) and B02-7 (shared preview).
No product source is changed by either. Product motion, native focus, clipboard requirements
and every assertion remain as they were; no timeout was raised and no check was removed.

## B02-5 — Agent Chat completion focus

**Cause: test-harness timing, not a product defect.** `scripts/check-docs.mjs` focused
`Stop generation`, a control whose lifetime is bounded by the demo's own real 1800 ms
completion timer, with no clock held. The `page.clock` block covering the cancellation
section ends earlier and restores real time, so the whole budget for the focus call was the
1800 ms left after the `Continue` click settled. When the driver round trip exceeds that,
the demo has already replaced Stop with Send, `locator.focus()` retries a locator that can
never match again, and the 10 s default timeout fires. "Element was detached while focusing"
is the symptom of that replacement.

The restore path itself is correct and is not timing-dependent:
`registry/cojeev/ui/agent-chat.tsx:109-113` captures `document.activeElement === node` in a
React 19 callback-ref cleanup, which runs before React removes the node, and
`agent-chat.tsx:114-118` focuses the textarea on the `running` → `false` edge only if that
capture was true. A genuine regression would fail the final restore assertion, not detach
during setup.

**Correction.** The agent-chat case now waits for `Allow once`, pins and pauses the clock
across options → working → complete (the only interval in which Stop is mounted), focuses
Stop, asserts native focus explicitly, advances the demo's own 1800 ms timer with
`runFor(2000)`, and restores real time in `finally`. `setFixedTime` before `pauseAt` keeps
`toConsume` at zero so a slow driver cannot make the captured instant stale. The real
keyboard `key(Retry, "Enter")`, the real completion driven by the demo's own timer, and the
untouched "no stolen outside focus" and cancellation assertions all remain.

**Permanent reproduction.** `tests/docs-transient-timing.browser.mjs` now delays
`locator.focus()` by 2500 ms for locators naming `Stop generation`, recorded as the
`completion-focus` intervention. 2500 > 1800 makes the failure deterministic on unpatched
source, while the held clock prevents the demo advancing during the delay.

### Verification (local, Node 22.22.0 pinned, playwright 1.63.0)

| Check | Command | Result |
| --- | --- | --- |
| Intervention guard | `node tests/docs-transient-timing.browser.mjs --check-intervention-guard` | `{"guard":"pass","completeModes":2,"missingIdsRejected":10}` — a missing `completion-focus` id is rejected |
| Delayed driver, corrected harness | `node tests/docs-transient-timing.browser.mjs` | pass; `injected` includes `completion-focus`; all four entries pass layouts, preview and behavior |
| **Negative control — delayed driver, harness reverted to `4a1a4f9`** | same command with `scripts/check-docs.mjs` at HEAD | **fails**, reproducing the exact CI error: `agent-chat: locator.focus: Timeout 10000ms exceeded` waiting for `Stop generation` |
| Negative mode | `node tests/docs-transient-timing.browser.mjs --negative` | pass; the four intended broken-behavior rejections are intact, including "Cancelled timer must not reopen permission" |

The negative control is the load-bearing one: it shows the corrected case still detects a
genuinely broken completion focus rather than tolerating it.

### Not run

Full catalogue, full build suites, deployment and provider mutation were out of scope here.
The combined release gate has not been rerun; this is checkpoint evidence, not release
acceptance.
