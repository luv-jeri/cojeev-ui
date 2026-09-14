# Catalogue failures name their reason in the console summary

Checkpoint B02-8. Diagnostics only. No assertion, timeout, animation, screenshot, product
file, pipeline concurrency or CI-scope rule is changed by this checkpoint, and it fixes
neither of the failures that motivated it.

## The confirmed gap

`scripts/check-docs.mjs` already records why a layout or a shared preview failed. The
per-layout `catch` stores `layout.error`, and the preview `catch` stores
`preview.detail`; both are written into `results.json`. Its per-entry console line,
however, printed only the layout and preview *statuses*, alongside `behavior.detail`:

```json
{"id":"shape-scene","layouts":["…","1440/dark:failed"],"preview":"pass","behavior":"pass","detail":"…"}
```

So a job log said which column failed and never why. Both recorded reasons existed the
whole time inside the run's `production-evidence` artifact, which is about 256 MB.

## What that cost

Two pull-request runs on 14 September failed the gate, and reading either exact message
required reaching into that artifact rather than the job log:

| Run | Entry | Column |
| --- | --- | --- |
| [34808127946](https://github.com/luv-jeri/cojeev-ui/actions/runs/34808127946) | `shape-scene` | layout 1440/dark |
| [34807702931](https://github.com/luv-jeri/cojeev-ui/actions/runs/34807702931) | `shape-scene` | shared preview |

Both recorded messages end at the same observed stage. Playwright found the control,
reported it visible, enabled and stable, logged `click action done`, and then spent the
whole 10 s timeout on the line that follows it:

```
  - performing click action
  - click action done
  - waiting for scheduled navigations to finish
```

**That is the stage the run reached, and nothing more.** It is not a proven cause. Why the
wait after a completed click did not settle is unresolved: runner contention, a genuinely
scheduled navigation and a contributing regression are all still open, and no reproduction
exists. The same run's `article-headings` behavior failure, where two samples of the
heading text were identical, is likewise unresolved — a late observation and an animation
that never started or was reset produce the same message. Full evidence and its primary
review correction: `.superpowers/ci-followup-diagnosis-result.md`.

The point of this checkpoint is narrower than any of that. Whatever the cause turns out to
be, the reason the runner had already recorded should be legible in the log.

## The change

`scripts/lib/docs-summary.mjs` is a pure formatter, and `check-docs.mjs` prints its result
instead of building the object inline.

- `id`, `layouts`, `preview`, `behavior` and `detail` keep their existing names, order and
  meanings. A passing entry's line is byte-for-byte what it was.
- `layoutFailures` appears only when some layout recorded an `error`, mapping
  `width/theme` to that message.
- `previewDetail` appears only when the preview status is not `pass`.
- `results.json` is untouched, so anything reading the artifact is unaffected.

Each added message is bounded to 400 characters. When a message is longer, its **middle**
is dropped rather than its end: the head carries the assertion and the tail carries the
stage reached, and for a Playwright call log that final line is the whole diagnosis. The
untruncated text stays in `results.json`.

That bounding is a length limit and nothing more. It is **not** redaction and it removes no
category of content. What lands in the discarded middle depends entirely on the message, and
a message at or under the limit is printed exactly as given. In the two messages above the
resolved element's markup happens to sit in the middle and so does not survive, but that is
a property of those messages, not a guarantee. Keeping unwanted content out of these strings
is the job of whatever produces them; this checkpoint adds no new source of text, printing
only what the runner had already recorded.

`tests/docs-summary.test.mjs` checks that a passing entry gains no fields, that a failed
record carries both reasons, that a layout recorded as an `issue` gains no reason it never
had, and that truncation stays within the limit while keeping the assertion and the stage.

## Classifier scope

A new helper path is unclassified, and `scripts/ci-scope.mjs` resolves anything unnamed to
the full release job. Left alone, changing a printed line would have run the whole catalogue.

Both new paths are therefore named, as exact paths, in the two maps that already carry this
harness:

| Map | What it decides | Added |
| --- | --- | --- |
| `NAMED` | the checkpoint scope and its suites | `scripts/lib/docs-summary.mjs`, `tests/docs-summary.test.mjs` → `transient-timing` |
| `FOCUSED_BROWSER` | `affected` rather than the full catalogue | the same two paths → `transient-timing` |

No wildcard, prefix or suffix rule is introduced, no workflow step or branch protection is
touched, and no new suite is created: these two files join the harness that
`scripts/check-docs.mjs` already selects, because the formatter is imported by it. Browser
evidence is reduced to that bounded harness, never removed.

`tests/ci-scope.test.mjs` gains both classify rows, this checkpoint's own complete changed-file
list, and three negatives proving the mapping stays exact — an unnamed sibling under
`scripts/lib/`, a `.bak` of the helper and a `scripts/libs/` directory lookalike all still
resolve to the full job. Each map entry was confirmed load-bearing by removing it and watching
the suite fail: dropping the `NAMED` entry fails both classify rows, and dropping the
`FOCUSED_BROWSER` entry fails the bounded-harness selection test.

## Deliberately not done

- `behavior.detail` is left exactly as it prints today. It was never part of the gap.
- `scripts/lib/docs-summary.mjs` is **not** added to `docsHarnessFiles`. That fingerprint
  exists to detect the harness changing mid-run, and this module only formats console text
  — it cannot alter a pass or fail, which is decided from `results.json`. Adding it would
  have pulled in `docs-harness-fingerprint.mjs`, its test's fixed file list and the
  `ci-scope.mjs` mapping for no confirmed gap. `check-docs.mjs` is itself in that list, so
  this checkpoint changes `harnessSha256` regardless.
- No repair to `shape-scene` or `article-headings` is attempted here.
