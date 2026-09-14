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
