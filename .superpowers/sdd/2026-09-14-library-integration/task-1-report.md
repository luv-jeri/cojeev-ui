# Task 1 report — L-01 readiness motion and L-03 integration note

## Outcome

L-01 is corrected in the shared press hook. Availability and visibility changes
remain quiet, including Button's `disabled`/`busy`/`rest` transitions delivered
in one observer batch. Semantic selection changes and real pointer/keyboard input
retain press feedback. Cleanup and Flow Off behavior are covered by the focused
browser regression.

L-03 is documented as a separate consumer-owned presentation issue. No consumer
application, disabled paint, focus style, deployment, or server was changed.

## Files

- `registry/cojeev/motion/flow-press.ts`
  - Enables `attributeOldValue` for the existing observer.
  - Reconstructs each `data-state` transition in reverse mutation-batch order.
  - Suppresses availability endpoints (`disabled`, `busy`, and `rest`) and all
    availability/visibility-only attributes while preserving semantic state input.
- `tests/flow-availability.test.mjs`
  - Renders the actual hook plus Button, IconButton, and Item.
  - Covers native disabled, Button loading, `aria-disabled`, `data-disabled`,
    `inert`, `hidden`, a `disabled` -> `busy` -> `rest` mutation batch, pointer,
    keyboard, `aria-pressed`, checked/on/open state pairs, Flow Off, cancellation,
    and unmount restoration.
- `docs/quality/library-integration-status.md`
  - Records L-01 behavior and the separate L-03 consumer handoff boundary.

The controller-owned edit in
`docs/superpowers/plans/2026-09-14-library-integration.md` was preserved and is
excluded from this checkpoint.

## Focused verification

Pinned runtime for both runs: Node `v22.22.0` via `fnm`.

### RED — base behavior

Command:

```text
rtk proxy fnm exec --using v22.22.0 node --test tests/flow-availability.test.mjs
```

Result: exit 1; test-runner duration 1214.27 ms; tool wall time 1.17 s.

```text
TAP version 13
# Subtest: flow press distinguishes readiness from semantic state and input
not ok 1 - flow press distinguishes readiness from semantic state and input
  ---
  duration_ms: 792.441375
  failureType: 'testCodeFailure'
  error: |-
    programmatic readiness must not produce press feedback
    + actual - expected

      {
    +   'aria-disabled-icon': 5,
    +   'data-disabled-item': 5,
    +   'disabled-button': 5,
    +   'hidden-item': 5,
    +   'inert-icon': 5,
    +   'loading-button': 5
    -   'aria-disabled-icon': 0,
    -   'data-disabled-item': 0,
    -   'disabled-button': 0,
    -   'hidden-item': 0,
    -   'inert-icon': 0,
    -   'loading-button': 0
      }
1..1
# tests 1
# pass 0
# fail 1
# duration_ms 1214.266834
```

### GREEN — patched behavior

Command:

```text
rtk proxy fnm exec --using v22.22.0 node --test tests/flow-availability.test.mjs
```

Result: exit 0; test-runner duration 2138.35 ms; tool wall time 2.11 s.

```text
TAP version 13
# Subtest: flow press distinguishes readiness from semantic state and input
ok 1 - flow press distinguishes readiness from semantic state and input
  ---
  duration_ms: 1656.761708
  type: 'test'
  ...
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2138.350042
```

### Diff check

Command:

```text
rtk git diff --check -- registry/cojeev/motion/flow-press.ts tests/flow-availability.test.mjs docs/quality/library-integration-status.md
```

Result: exit 0 with no output; tool wall time below 0.01 s. A final staged diff
check was also run after this report was added:

```text
rtk git diff --cached --check
```

Result: exit 0 with no whitespace errors; tool wall time below 0.01 s.

Check-running time is reported above and excludes implementation, debugging,
documentation, and review time. Those non-check activities were not timed by a
command.

## Self-review

- Standards: no caller API, observed-attribute list, paint, focus, or cleanup
  ownership changed. The implementation stays within the shared hook and uses
  the existing compact source style.
- Specification: every Task 1 behavior has a direct browser assertion. The
  mutation-batch fixture independently confirms old values `disabled`, `busy`
  and final value `rest`, so the test does not infer the batch from production
  logic.
- Mutation check: removing `attributeOldValue`, treating every `data-state` as
  semantic, or restoring the previous "any observed mutation" condition makes
  the focused readiness assertions fail. Removing pointer, keyboard, semantic,
  quiet, or cleanup behavior makes its corresponding assertion fail.

## Remaining concerns and intentionally omitted checks

- The full test suite, component catalogue, app launch, deployment, and final
  real-docs visual pass were intentionally not run under the checkpoint's
  focused-verification boundary. The controller owns the combined visual pass.
- L-03 still requires consumer-side integration and visual qualification for
  fast, slow, failed, rapid, and keyboard flows. Startup flicker remains
  unverified and is not claimed fixed here.
- The checkpoint preserves genuine disabled styling; it does not change how a
  consumer chooses between native disabled and transient busy semantics.
