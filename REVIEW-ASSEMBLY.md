# Assembly specimen redesign

This revision supersedes the earlier eight-part assembly and its screenshots. The default studio now offers **Profile, Panel, Dock and Chat**. Dashboard is absent from the chooser. `CompactDashboard` remains a deprecated compatibility alias for the compact task panel, with a historical-example caption.

## Recorded design

- **Profile:** a blue cover with three coloured signature shapes, overlapping yellow Avatar, identity, independent-maker tag, compact sample statistics, native Follow and Message buttons, and a save IconButton. Message reveals an InputGroup only when requested. A note is stored in local state; no external message is sent.
- **Panel:** a narrow Card with three real Item buttons, completion count, organic Progress and a reset action. One task starts complete; pointer and Enter use the native button contract.
- **Dock:** one 84px-high Card with Avatar, three native IconButtons and a small selected-tool caption. It has no form or large content panel.
- **Chat:** a compact Card with an avatar/header, three illustrative BubbleContent messages, MessageScroller, a clear control and one 52px InputGroup composer. Sending adds a user bubble locally; no generated reply or backend connection is implied.

The compositions have different part sets, sizes and silhouettes. They are assembled from existing Card, Avatar, Badge, Button, IconButton, Item, Progress, Shape, BubbleContent, MessageScroller, InputGroup and typography primitives. No missing primitive or new registry entry was needed.

## Motion and native ownership

`AssemblyPart` still forwards directly through Motion and Radix Slot to the atomic root. Its actual width, height, left, top and 96-point contour move together. It does not replace a collection of decorative blobs with a faded-in layout.

Newly introduced parts receive `from` / `fromContour` geometry so they start as floating shapes even when the chosen composition introduces a different primitive. Existing keyed roots retain their current Motion values. Arrival uses a short per-part delay; scattered shapes drift vertically by five pixels only while visible and motion is enabled. Interrupted animations stop through the shared motion registry and subsequent travel begins from current values.

At each part's arrival, `release` removes temporary `clipPath`, `rotate`, `data-motion="off"` and `data-flow="off"`. Position uses **left/top**, leaving native transform ownership available to hover and press. Assembly CSS no longer permanently substitutes Button padding, fill, border, radius, shadow or focus paint. Controls are inert and their contents hidden during travel, then become readable and interactive individually. Quiet mode directly selects the usable target geometry.

The chooser uses four native Buttons with pressed state, arrow-key traversal and Home/End. Assemble/Scatter is one explicit transport action; Replay is a named IconButton. Technical receipts and verbose visible lifecycle text were removed; concise phase announcements remain available to screen readers.

## Public contracts

- Existing `OrganismAssembly` controlled/uncontrolled value, `defaultAssembled`, `onValueChange` and `compositionProps` contracts remain.
- Existing `OrganismComposition` data and local/controlled state contracts remain. `OrganismMessage.from?: "agent" | "user"` adds message alignment. `OrganismState.profileComposer?: boolean` records profile message disclosure. `OrganismAction.action` adds `"message"`.
- `AssemblyPart` adds `from`, `fromContour`, `delay`, `release`, `floating` and `tone` (`pink`, `blue`, `olive`, `yellow`). Temporary motion ownership is explicitly released by the composition after `onRest`.
- ProfileCard, WorkSidePanel, ActionDock, ConversationPanel and CompactDashboard wrapper exports and props aliases remain compatible.
- Up to four supplied task/dock items are shown. Profile sample counts and seeded conversation are illustrative content; consumers can replace identity/copy and controlled state. Longer messages stay within the native scroll viewport. Identity text has a bounded visual title/description area.

## Exact files

Implementation:

- [assembly-geometry.ts](registry/sahajiv/lib/assembly-geometry.ts)
- [assembly-part.tsx](registry/sahajiv/ui/assembly-part.tsx)
- [organism-composition.tsx](registry/sahajiv/ui/organism-composition.tsx)
- [organism-assembly.tsx](registry/sahajiv/ui/organism-assembly.tsx)
- [assembly-part.css](registry/sahajiv/styles/assembly-part.css)
- [organism-composition.css](registry/sahajiv/styles/organism-composition.css)
- [organism-assembly.css](registry/sahajiv/styles/organism-assembly.css)
- [assembly.tsx](components/examples/assembly.tsx)

Evidence and runnable confirmation:

- [assembly-geometry.test.ts](tests/assembly-geometry.test.ts)
- [assembly-composition.test.ts](tests/assembly-composition.test.ts)
- [check-assembly-landing.mjs](scripts/check-assembly-landing.mjs)
- [check-organism-assembly.mjs](scripts/check-organism-assembly.mjs) and [check-assembly-paint.mjs](scripts/check-assembly-paint.mjs) now delegate to the current landing proof instead of asserting the rejected dashboard/eight-root arrangement.

## Verified and pending

**Passed:** seven focused Node tests cover finite 96-point contours, bounded geometry at local widths 240/280/328/360/390/500/700, all four compositions plus the legacy alias, zero/three/four item counts, profile disclosure geometry, intact native composer dimensions, native SSR element/selection semantics, seeded Bubble messages, the four-choice studio and released root clipping/motion attributes. The tests caught and corrected an unavailable icon before handoff. Owned-source ESLint passed with zero warnings; the three styles contain no `!important` or nested layers.

Reproduce the nonvisual checks:

```sh
rtk proxy node --import tsx --test tests/assembly-geometry.test.ts tests/assembly-composition.test.ts
```

**Pending the single root-owned visual batch:** actual landing screenshots at 360/390/1440 in light/dark, pointer/keyboard actions, focus transfer, native hover after release, continuous motion on rapid choice/replay, live Off/reduced behavior and rendered scroll/border readability. The updated local-dev proof is ready but was deliberately not run by this stream. Earlier assembly screenshots are historical and cannot validate this redesign.

```sh
rtk proxy node scripts/check-assembly-landing.mjs
```

The proof uses the existing local server at `http://127.0.0.1:4320/sahajiv-ui`, supports `BASE_URL`, `OUTPUT_DIR` and optional `WIDTH`, and writes screenshots/results under `output/playwright/review-assembly-redesign`. It performs no build, registry generation, installation, commit or publication.

Root owns the canonical typecheck and landing integration. This stream corrected its geometry-test type narrowing; the prior canonical check also reported an unrelated FloatLayer MotionStyle diagnostic being handled by root. No universal browser or release-readiness claim is made here.

## Scoped constellation and native-release correction

The scattered layout now uses deterministic asymmetric anchors and mixed sizes. Four geometry tests pass, including an added test that checks separation of rotated bounding boxes and their five-pixel drift at local widths 240–700. Arrival targets are unchanged.

The first integrated browser pass found that Motion retained the final inline `clip-path` when its MotionValue was replaced by `undefined`. Released state now supplies an explicit empty clip value, clearing the actual browser property. This differs from the earlier SSR-only evidence: server output could not expose the retained browser style. The landing proof includes compact per-part failure values if release regresses.

A targeted 390px Chromium DOM confirmation passed after this correction: all nine profile roots had empty inline clip paths and absent local motion/flow locks after initial assembly and replay; native Follow activation worked between them; replay restored temporary polygon clipping and inert state during travel. This confirmation captured no screenshots and did not repeat the full visual suite.
