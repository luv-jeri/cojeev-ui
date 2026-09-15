# Task 2 report — L-02/C-02 travelling tabs and icon composition

## Outcome

Dark pills and lenses now give the travelling selection layer the same existing
pink accent and fixed ink pairing as the stationary dark selection. The shared
trigger owner aligns arbitrary icon-and-text children inline with `var(--s-2)`
without adding space to text-only triggers. The Tabs documentation example now
shows the existing decorative Icon beside each text label without including the
SVG in the accessible name.

The public `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` props, ref
handling, controlled/uncontrolled state, arbitrary children, disabled behavior,
focus styling, light treatment, and notebook/rail/underline selection rules are
unchanged.

## Files changed

- `registry/cojeev/styles/flow-press.css`
  - Replaces the pills-only dark paint exception with paired `--glide-bg` and
    `--glide-fg` values scoped to travelling pills and lenses.
- `registry/cojeev/styles/tabs.css`
  - Makes every TabsTrigger an inline-flex alignment owner with centered children
    and the shared 8px gap. Existing notebook and rail overrides remain later in
    the cascade.
- `components/examples/navigation.tsx`
  - Reuses each section's existing decorative Icon for every Tabs appearance.
  - Removes the redundant forced `aria-label`; the visible text remains the
    accessible name and the SVG remains `aria-hidden`.
- `tests/tabs-integration.browser.mjs`
  - Bundles the actual Tabs and Icon components into one focused Playwright
    fixture for pills/lenses, light/dark, movement, quiet modes, and label states.
- `docs/quality/library-integration-status.md`
  - Records the L-02/C-02 behavior, evidence, and approval boundary.

## Focused verification

Pinned runtime for all executable checks: Node `v22.22.0` via `fnm`.

### RED — base behavior

Command:

```text
rtk proxy zsh -lc 'eval "$(fnm env)"; fnm use 22.22.0 >/dev/null; /usr/bin/time -p node --test tests/tabs-integration.browser.mjs'
```

Result: exit 1; test-runner duration 1216.13 ms; tool wall time 1.24 s.

```text
TAP version 13
# Subtest: tabs pair dark travelling paint with icon labels and preserve quiet fallbacks
not ok 1 - tabs pair dark travelling paint with icon labels and preserve quiet fallbacks
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly deep-equal:
    + actual - expected

      {
    +   alignItems: 'normal',
    +   display: 'block',
    +   gap: 'normal',
    -   alignItems: 'center',
    -   display: 'inline-flex',
    -   gap: '8px',
        iconHidden: 'true'
      }
1..1
# tests 1
# pass 0
# fail 1
# duration_ms 1216.134
real 1.24
```

The failure was expected: TabsTrigger did not own inline icon/text layout. The
same regression continues to its dark pills/lenses token assertions after that
first defect is corrected.

### GREEN — patched behavior

Command:

```text
rtk proxy zsh -lc 'eval "$(fnm env)"; fnm use 22.22.0 >/dev/null; /usr/bin/time -p node --test tests/tabs-integration.browser.mjs'
```

Result: exit 0; test-runner duration 7474.93 ms; tool wall time 7.50 s.

```text
TAP version 13
# PASS Tabs dark/light travel paint, icon/text composition, long/disabled/focus states, Flow Off and reduced motion
# Subtest: tabs pair dark travelling paint with icon labels and preserve quiet fallbacks
ok 1 - tabs pair dark travelling paint with icon labels and preserve quiet fallbacks
  ---
  duration_ms: 7100.840625
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
# duration_ms 7474.931208
real 7.50
```

The check proves:

- pills and lenses have visible moving and settled selection paint;
- dark travelling paint resolves to `--v-pink` and its label to
  `--v-on-accent`, while the native selected trigger stays transparent beneath
  the travelling layer;
- Flow Off restores the stationary selected fill and selection remains usable;
- reduced motion places the layer immediately at the selected trigger;
- the default decorative folder Icon is visible at 20x20, remains
  `aria-hidden`, and aligns with visible text using the shared 8px gap;
- long text-only tabs retain their content-driven width and 44px target without
  an empty icon gap;
- disabled state and visible keyboard focus remain intact; and
- the active tab continues to own the only active panel.

### Visual evidence

Fresh fixture captures were generated and visually inspected:

- `output/playwright/library-integration/tabs/pills-light.png`
- `output/playwright/library-integration/tabs/pills-dark.png`
- `output/playwright/library-integration/tabs/lenses-light.png`
- `output/playwright/library-integration/tabs/lenses-dark.png`

The first visual inspection correctly exposed that the raw CSS fixture had not
reproduced Icon's Tailwind-generated stroke utility. The fixture was corrected
to apply the shipped Icon class treatment, then the same focused check was run
again. The final four images visibly show the folder next to Files, stable label
alignment, and the light/dark selection pairings.

### Diff checks and timing separation

`rtk git diff --check` passed before the report edit with no output. The final
staged command was `rtk git diff --cached --check`; it exited 0 with no
whitespace errors and a tool wall time below 0.01 s.

Formal check-running time is 1.24 s for RED and 7.50 s for the final GREEN.
Intermediate fixture/debug reruns, test authoring, implementation, screenshot
inspection, documentation, self-review, and packaging are excluded from those
figures; those activities were not timed by a command.

## Self-review

- Completeness: every L-02/C-02 behavior has a direct browser assertion or an
  affected light/dark capture. The test mounts the real primitives rather than
  duplicate HTML.
- Quality: the selection fix is two paired custom properties on the existing
  flow owner. It removes redundant pills-only leaf paint rather than adding a
  second motion layer or component family.
- API discipline: no TypeScript component contract changed. Existing later
  notebook/rail gap rules continue to win where their compositions need them.
- Accessibility: visible text supplies each tab's name; the decorative Icon is
  hidden from accessibility; native disabled behavior and the shared focus ring
  remain visible and functional.
- Scope: Task 1 readiness code and all consumer applications remain untouched.

## Remaining concerns and intentionally omitted checks

- The full test suite, catalogue, Next build/app launch, generated public
  registry payload refresh, deployment, and final real-docs visual pass were
  intentionally not run under this checkpoint's focused boundary. The
  controller owns the combined real-docs and release-candidate gates.
- The four fixture screenshots were inspected locally, but they are not owner
  visual approval and do not certify unrelated Tabs appearances or browsers.
- The fixture includes only the small generated utility treatment needed to
  render the actual component classes outside Tailwind; it is not a general test
  framework.
