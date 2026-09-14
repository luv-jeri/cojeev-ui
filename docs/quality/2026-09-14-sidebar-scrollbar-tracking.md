# Documentation sidebar scrollbar: tracking, cold-load handoff and rail access

Checkpoint H02-1, child of **H02 · B — Documentation sidebar**
(`docs/superpowers/plans/2026-09-12-launch-master-checklist.md`). Reported after launch:
in the expanded component list and the compact expanded index, the sidebar scrollbar did
not follow the content while scrolling, and a refresh showed the browser's own scrollbar
before the custom one replaced it.

Three separate defects were found. All three were reproduced and measured against a
minified production artifact. Only the first was also checked against `next dev`, where it
does not reproduce — it is an artefact of production minification, which is why it survived
to production. The other two were not exercised in `next dev`, so nothing is claimed about
their behaviour there.

## 1. The thumb was painted once per gesture and then frozen

Radix keeps its thumb in step with the viewport from a `requestAnimationFrame` loop that
it invokes immediately. The production minifier reads the `@__PURE__` annotation on that
immediately-invoked expression's callee as marking the *call* pure, concludes the loop has
no effect and deletes it, so the shipped helper is reduced to reading two properties and
returning a stub. The stub is still truthy, which convinces Radix's thumb effect that a
live listener exists, so the thumb is written only by the single direct call at the start
of a gesture.

Measured on the production build, expanded list, 1440x960: viewport `scrollHeight` 7868,
`offsetHeight` 665, track 665 px, thumb 56.2 px, correct travel 608.8 px.

| Gesture | viewport `scrollTop` | thumb painted at | correct | drift |
| --- | --- | --- | --- | --- |
| keyboard End | 7203 | 20.6 px | 608.8 px | -588.4 px |
| keyboard Home | 0 | 597.0 px | 0 px | +597.0 px |
| PageDown 1-3 | 625 / 1250 / 1875 | 5.1 / 53.8 / 106.9 px | 52.8 / 105.7 / 158.5 px | about -50 px each |
| thumb drag | 955 | 200.7 px | 80.7 px | +120.0 px |

Per-frame sampling across one `End` press recorded the viewport moving through nine
intermediate positions while the thumb transform never changed, and instrumenting the
`transform` setter showed exactly one write for the whole gesture.

**Repair.** `registry/cojeev/ui/scroll-area.tsx` gained `useThumbTracking`, which repeats
the same geometry from the live DOM: track length less the rail's own padding, the thumb's
rendered length, and the viewport's scroll range. It is armed by a scroll event and
releases itself as soon as the position stops changing, so an idle scrollport schedules
nothing. Horizontal rails and right-to-left travel are handled explicitly. Radix keeps its
drag geometry, its thumb sizing and its hit target; only the position paint is made
independent of the eliminated loop.

The component ships through the registry, so the repair also protects anyone whose own
bundler performs the same elimination.

## 2. The native document scrollbar painted before the overlay arrived

The native document scrollbar was suppressed only by `data-page-scrollbar="mounted"`,
which an effect writes after hydration. Sampling every frame from first paint:

| time | document scrollable | computed `scrollbar-width` | overlay attribute | custom rail |
| --- | --- | --- | --- | --- |
| 507 ms | yes | `thin` | absent | hidden |
| 1494 ms | yes | `none` | `mounted` | hidden |
| 1525 ms | yes | `none` | `mounted` | visible |

For about **990 ms** the native bar was the only one on screen, then it was swapped.

**Repair.** A small inline bootstrap in the document head marks the root
`data-page-scrollbar-pending` before first paint, and clears that marker itself after a
bounded five-second window. The stylesheet suppresses native paint while either that
pending marker or the existing mounted attribute is present. `acquirePageScrollbar` drops
the pending marker the moment the overlay takes ownership, so an unmount inside the
window hands the native scrollbar straight back. The bootstrap string and the marker name
live beside the other scrollbar helpers in `registry/cojeev/motion/scroll-thumb.ts` as
plain constants, with no module side effects and no new provider.

### What each failure mode now does

| Situation | Native scrollbar | Scrolling |
| --- | --- | --- |
| Normal load | suppressed from first paint, overlay takes over | unchanged |
| Scripting disabled | retained — the bootstrap never runs | native, unchanged |
| Bootstrap blocked by policy | retained — no marker is ever set | native, unchanged |
| Bundle fails, or is slower than the window | suppressed briefly, then **restored** when the marker times out | native throughout: wheel, trackpad, touch and keyboard |
| Overlay unmounts inside the window | restored immediately | native, unchanged |

The document is never taken over, so every input keeps working in all of these.

## 3. An open component preview covered the scroll rail

The sidebar's component preview opened 18 px to the right of the entry button. The scroll
rail sits 36 px further right — past the entry's 12 px inset and the scrollport's 24 px
right padding — so in the expanded list the preview opened on top of the rail.

| layout | entry right edge | rail right edge | clearance needed | old offset | preview left | covered the rail |
| --- | --- | --- | --- | --- | --- | --- |
| expanded | 237 | 273 | 36 px | 18 px | 255 | yes |
| compact | 141 | 149 | 8 px | 18 px | 159 | no |

With a preview open, a hit test at the thumb's own centre returned the preview, and a full
press-drag-release logged no pointer events on the rail at all: the thumb could not be
grabbed. Pausing over an entry on the way to the scrollbar is enough to trigger it, since
the preview opens on a 520 ms hover.

**Repair.** The preview's side offset now clears the rail. Its hover behaviour, delay,
placement side, alignment and content are unchanged, and nothing is hidden.

## Verification

`registry/cojeev/ui/scroll-area.tsx`, `registry/cojeev/motion/scroll-thumb.ts`,
`registry/cojeev/styles/scroll-area.css`, `components/docs-navigation-entry.tsx`,
`app/layout.tsx`, regenerated registry downloads, and a new focused browser check
`tests/docs-sidebar-scrollbar-tracking.browser.mjs`.

```
node scripts/build-registry.mjs
npx tsc --noEmit                       # TypeScript: No errors found
node scripts/lint.mjs                  # exit 0
rm -rf out .next && npx next build     # exit 0
node tests/docs-sidebar-scrollbar-tracking.browser.mjs --url=<deployed production>
node tests/docs-sidebar-scrollbar-tracking.browser.mjs      # serves the fresh out/
```

The check runs 32 assertions. It covers both list states with continuous wheel, thumb
drag, keyboard (End/Home/PageDown) and viewport resize, plus a cold reload, scripting
disabled, and a run with the hydration chunks blocked while the head bootstrap is allowed.
It samples every frame during a gesture, because a frozen thumb repeats a single painted
position while the viewport moves.

The rail-clearance assertion waits for the preview to become visible and requires it to
have opened before measuring, so a preview that never appears fails the check rather than
passing it. That assertion is the only coverage the preview offset has, since the offset
is a plain number with no unit test.

| Artifact | Result |
| --- | --- |
| Deployed production build | **10 passed, 22 failed** |
| Rebuilt from this branch | **32 passed, 0 failed** |

Worst mid-gesture drift falls from 596.5 px of 609 px of travel to 0.2 px, and the number
of distinct thumb positions during a moving gesture rises from one for the whole gesture to
one per moving frame.

The pre-hydration handoff, sampled every 100 ms from first paint on the rebuilt artifact:

| Run | First sample | Handoff |
| --- | --- | --- |
| Normal load | 50 ms: pending marker set, `scrollbar-width: none`, document scrollable | 475 ms: marker gone, `data-page-scrollbar="mounted"`, still `none` — no native frame at any point |
| Hydration chunks blocked | 58 ms: pending marker set, `scrollbar-width: none`, document scrollable | 5144 ms: marker gone, no owner attribute, `scrollbar-width: thin` — the native scrollbar is back, and wheel and keyboard scrolling were both confirmed working afterwards |

Sidebar screenshots for both layouts were inspected: the organic thumb, the 24 px drag
target, the rail hairline and the sidebar layout are unchanged.

## Scope and limits

- The full component catalogue, the release gate and the other suites were **not** run for
  this checkpoint and are not claimed as passing.
- The new browser check is runnable by hand
  (`node tests/docs-sidebar-scrollbar-tracking.browser.mjs`, optionally `--url=<origin>`).
  It is **not** wired into any script, package.json entry or CI workflow, so no required
  check runs it and it cannot fail a pull request as things stand.
- Right-to-left horizontal scrollports are handled in code but not exercised; this
  repository has none to test.
- The measured hydration delay and the root stylesheet's size are a separate performance
  concern and are not addressed here.
- Test browsers on macOS force overlay scrollbars, so always-show-scrollbars could not be
  emulated. The cold-load evidence uses computed `scrollbar-width` and attribute timing
  instead, which is platform-independent; on a classic-scrollbar platform the same window
  is a visible bar.
