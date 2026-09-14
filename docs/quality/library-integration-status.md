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

## C-01 / C-03 — controlled branch-ledger Tree

`Tree` is now an installable controlled disclosure list. Native `ul`/`li`
structure, separate expansion and selection buttons, branch-local loading,
empty, retry and truncation feedback, focus recovery and consumer-owned data
preserve the approved boundary. C-03 is satisfied by composing this Tree from
the existing row, icon and control vocabulary; no second decorative component
or unsupported ARIA treegrid contract was added.

The focused source and browser checks passed, including controlled state,
keyboard behavior, quiet modes, disabled paint, narrow layout and RTL. Five
curated fixture captures were viewed. The final real-documentation visual pass
and the previously recorded collapsed RTL-chevron minor remain final-review
work, not Task 5 acceptance claims.

## I-01 / I-02 — declaration-safe exports and compiler boundary

`InputWrapper` exposes `React.ReactElement` and `useGalleryRef` exposes
`React.RefCallback<T>`, preserving callback-ref cleanup. The real copied-source
composite fixture emitted declarations for its 27-file closure under the
repository baseline: TypeScript 5.9.3, React 19.2.8 and `@types/react` 19.2.18.
The focused compiler check passed in 2.10 seconds after the original inferred
`useGalleryRef` reproduced TS4058 in 2.68 seconds.

This does not certify every copied file under `exactOptionalPropertyTypes` or
`noUncheckedIndexedAccess`. Keep the separate composite compiler boundary in
[Strict TypeScript integration](../guides/strict-typescript-integration.md)
until the exact installed closure passes with a consumer's stricter flags.

## I-03 — verified optional file-backed fonts

The registry ships the text-only helper at the exact logical target
`scripts/cojeev-materialize-fonts.mjs`. shadcn 4.21.0 installed it at
`src/scripts/cojeev-materialize-fonts.mjs` in the measured src-layout fixture.
It verifies the two embedded canonical SHA-256 values, materializes only the DM
Sans and Bricolage Grotesque WOFF2 files beside the active stylesheet, rewrites
only their source URLs, refuses partial or drifted state, and verifies an
idempotent rerun. Binary font files are not registry-file entries; both OFL
notices and the default embedded install remain intact.

The focused materializer check passed 2/2 in 0.13 seconds. The candidate browser
requested both materialized faces under a self-only CSP, reported both faces
loaded through the FontFaceSet API, and made zero external requests. A later
registry add refreshes the shared stylesheet to its default embedded form, so
the optional helper belongs after the final add/update; see
[Optional local font files](../guides/local-fonts.md).

## I-04 — measured payload, open optimization

The fresh Button profile emitted 448,120 raw / 145,907 gzip JS bytes and 82,749
raw / 15,799 gzip CSS bytes. The fresh Projects profile (Button, IconButton,
Input, Tabs, Item, ActivityFeed and Tree) emitted 923,806 raw / 259,028 gzip JS
bytes and 166,865 raw / 29,586 gzip CSS bytes. Both profiles emitted the same
verified Cojeev font pair: 307,632 raw / 307,498 gzip bytes. Another 76,420 raw
/ 76,545 gzip font bytes belong to the initialized consumer's Geist preset and
are explicitly excluded from Cojeev font totals.

The source-qualified evidence includes actual emitted-file gzip measurements,
the copied-source import edges, Rollup rendered-JS contribution by dependency,
installed registry JSON bytes and hashes. Registry JSON is not presented as
runtime JS. The Projects JS chunk still triggers Vite's greater-than-500 kB
warning; its threshold was not changed. No small safe reduction was established,
so the library owner retains I-04 as a measured optimization backlog item. No
startup-time or performance-score improvement is claimed.

## I-05 — primary CLI and explicit candidate override

A fresh production consumer installed Button with `shadcn@4.21.0` from
`https://000h.cojeev.com`, then passed TypeScript and Vite build in 56.216
seconds. The first bounded attempt reached production but ran out of local disk;
after removing only its stopped consumer and task cache, the fresh retry passed.
That ENOSPC event is not a registry outage.

The separate loopback candidate installed and built Button first, then the full
Projects set including Tree and the font helper. Its eight recorded subprocesses
took 95.17 seconds in total; Chromium/CSP completion was part of the same run but
was not separately timed. The loopback override remains explicit and unpublished.
The intentional Pages mirror remains compatible; this checkpoint does not claim
a historical 403 is current and does not bypass provider protection.

## Evidence and upgrade handoff

- Candidate measurements, source hashes, command timings and CSP request proof:
  `artifacts/library-integration/delivery-qualification.json`, with supporting
  logs in `artifacts/library-integration/delivery-logs/`.
- Primary production fresh-install receipt:
  `artifacts/library-integration/production-button-install.json`.
- Earlier focused behavior evidence is recorded in the Task 1–4 reports and
  their committed tests. The complete catalogue and release suite were not run
  for this scoped integration checkpoint.

Install the qualified revision before removing consumer workarounds for L-01
(readiness pulse), L-02 (dark travelling Tabs paint) or I-01 (public inferred
return types). Retain consumer-owned busy/activation handling for L-03 until its
fast, slow, failed, rapid and keyboard fixture passes. Keep embedded fonts unless
the consumer explicitly chooses and verifies the I-03 helper after its final
registry add. Retain the I-02 compiler boundary until the exact installed source
passes the consumer's flags. I-04 remains measured/open. No consumer upgrade,
deployment, merge or owner visual approval occurred in this checkpoint.

## Complete status matrix

| ID | Status | Evidence or retained boundary |
| --- | --- | --- |
| L-01 | Fixed in qualified source | Focused readiness/semantic-input browser regression |
| L-02 | Fixed in qualified source | Focused dark travelling Tabs browser regression |
| L-03 | Documented consumer boundary | Consumer busy presentation and startup frame still require app evidence |
| C-01 | Implemented and candidate-installed | Controlled native disclosure-list Tree tests and fixture captures |
| C-02 | Implemented | Existing TabsTrigger composes decorative Icon and text |
| C-03 | Implemented through C-01 composition | Existing Item/Icon/control vocabulary; no duplicate family |
| I-01 | Fixed in qualified source | Explicit public return annotations and declaration fixture |
| I-02 | Documented and narrowly verified | Exact closure passes; universal strict-flag support is not claimed |
| I-03 | Qualified | 2/2 materializer checks plus two-font self-only CSP browser proof |
| I-04 | Measured, optimization open | Two emitted profiles and import/cost graphs; warning retained |
| I-05 | Qualified | Production Button install/build and separate local Tree/font candidate |
