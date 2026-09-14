# Library integration status

## L-01 — readiness must not look like a press

The shared `useFlowPress` observer now distinguishes semantic state changes from
availability and visibility changes. Removing `disabled`, `aria-disabled`,
`data-disabled`, `inert`, or `hidden` does not create press feedback. Button
transitions among `disabled`, `busy`, and `rest` are also quiet, including when
more than one transition arrives in the same mutation batch.

Selection transitions (`checked`/`unchecked`, `on`/`off`, and `open`/`closed`),
`aria-checked`, `aria-pressed`, and real pointer or keyboard activation retain
their feedback. The public `useFlowPress` signature and the existing disabled
paint and focus styling are unchanged.

## L-02 / C-02 — travelling tabs and icon labels

Dark pills and lenses now pair their travelling selection layer with the
existing pink accent and fixed accent ink. When Flow is off, or when reduced
motion requests an immediate result, the stationary selected trigger retains
that same readable paint relationship. Light treatment and the underline,
notebook, and rail selection rules are unchanged.

`TabsTrigger` now owns inline icon-and-text alignment with the shared 8px gap.
The documentation example composes the existing decorative `Icon` beside its
text label and leaves the SVG hidden from the accessible name. Text-only, long,
disabled, and keyboard-focused triggers remain supported without a new wrapper
or a public prop change.

The focused actual-component fixture covers light/dark pills and lenses,
moving/settled selection, quiet fallbacks, icon paint and alignment, long text,
disabled behavior, and visible keyboard focus. Its local captures are evidence
for controller review, not owner visual approval or a full catalogue result.

## L-03 — consumer-owned transient busy presentation

The remaining short-lived border, fill, or opacity changes seen while a project
loads are not resolved by L-01. Native `disabled` deliberately applies the
library's disabled paint, while the consumer's disabled project-row rule applies
its own opacity. The consumer owns whether transient reads should use those
visual states.

For Button-based actions, `loading` or `aria-busy` keeps Button's activation
guards without applying native disabled paint. That is a supported integration
path, not evidence that the consumer is visually stable: its indicator, label
layout, focus behavior, fast/slow/failing reads, rapid activation, and keyboard
behavior still need to be checked in the consumer before replacing its current
lock. Non-Button rows still need an explicit activation guard if they move from
native `disabled` to `aria-disabled`.

This checkpoint changes no consumer application files and makes no claim that
startup flicker or the full L-03 frame sequence is fixed.
