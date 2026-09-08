# Remocn inventory and adaptation research

Captured 2026-09-08. Canonical source commit: [`3e03565f5c0001e143c2ed941eea7c3181f13260`](https://github.com/Remocn/remocn/commit/3e03565f5c0001e143c2ed941eea7c3181f13260), committed 2026-09-08 14:53:31 UTC. This is research evidence, not a claim that every component has been visually reviewed or implemented.

Current review progress: **11 source-and-rendered samples, 4 additional source-only samples, and 285 components awaiting individual rendered review.** The initial three-sample findings below are retained as dated context.

## Catalogue scope

The pinned root registry includes three registries: `remocn` (154 entries), `remocn-ui` (46), and `remocn-icons` (101). Together they contain **301 unique installable entries: 296 components and 5 shared helpers**. The 296 components include 100 animated icons and 196 other components. Every row in [inventory.json](inventory.json) has a stable ID, source title and slug, category, docs link, commit-pinned source link, dependency/license evidence, inspection status, and overlap candidates against the captured local 106-entry baseline. All source file paths resolve in the non-truncated GitHub tree. [Root registry](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry.json), [motion registry](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry/remocn/registry.json), [UI registry](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry/remocn-ui/registry.json), [icon registry](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry/remocn-icons/registry.json).

| Category | Entries |
| --- | ---: |
| Typography | 58 |
| UI primitives | 37 |
| Transitions | 24 |
| Shaders | 22 |
| UI blocks | 11 |
| Filters | 10 |
| Effects | 8 |
| UI flows | 8 |
| AI scenes | 5 |
| Social | 5 |
| Layout | 4 |
| Compositions | 3 |
| Undocumented component (`brush`) | 1 |
| Animated icons | 100 |
| Shared helpers | 5 |

Live deployment differs slightly: `/r/registry.json` returned **300 entries**, with `select-menu` present only in the pinned repository registry. There were no live-only entries. The docs search UI nevertheless displayed “296 components.” Do not equate the source catalogue with a guaranteed deployed install count. The three sampled `/r/<name>.json` URLs returned 200. See [live registry receipt](receipts/live-registry-check.json).

The complete docs capture has 230 MDX pages plus 22 metadata files. Dedicated component-tagged docs exist for 192 non-icon entries; the icon gallery covers 100 icons. `brush`, the 5 helpers, and the 3 menu-row helpers use related reference pages, explicitly labelled in each row. This avoids inventing dedicated routes. The initial close pass read the starting guide, concepts page, and three sample component docs. The subsequent native implementation also read the checklist/onboarding docs and inspected four further source entries, as recorded below. Remaining pages are captured and indexed, not claimed as read.

## What the starting guide contributes

The [Showcase reel guide](https://remocn.dev/docs/guides/showcase-reel) recommends a short collection reel: hook, count, one demonstrative beat per item, shared mechanism, a few value claims, command/link close, and brand lockup. Its useful idea for SahaJiv is **self-demonstration with an unobtrusive, stationary progress counter**. A native component gallery can explain states through actual working previews and repeatable controls. The guide's authored video timing, visual identity, text, logos, and remote media are separate from that concept.

Docs features worth adapting include live editable previews, source tabs, reset controls, a shareable configuration, grouped catalogue navigation, clear installation variants, prop tables, and component-level `useWhen` / `avoidWhen` guidance. The three samples demonstrated text or numeric customization and reset. Share links, clipboard behavior, studio integration, exports, and all catalogue search behavior were not exercised. See [interaction receipts](receipts/interaction-observations.json).

## Three inspected samples

**Soft Blur In → improve `text-reveal` and `presence`.** Source uses one frame of staggering per code point, a 27-frame opacity/blur resolve, a faster 9-frame 16px vertical settle, and a cubic easing curve. It uses `Array.from`, not grapheme segmentation, and fixed frame timing without an FPS conversion. In the live docs, changing the text immediately changed the preview; keyboard ArrowRight changed Blur from 12 to 13; Code selected correctly; reset restored the default text. SahaJiv can retain the two-phase reveal idea with original motion values, grapheme-safe segmentation, a static accessible text equivalent, responsive line wrapping, and reduced-motion behavior. [Source](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry/remocn/soft-blur-in/index.tsx).

**Button → improve native control state feedback.** The source separates named visual states (`idle`, `hover`, `press`, `loading`, `success`) from resolved visual styles. The companion hook interpolates those styles. Label space is preserved while spinner/check layers change opacity. The underlying button has no click callback or disabled/busy contract: it is a video visual. Live customization changed the preview label, Code switched, and reset restored “Continue.” Keep SahaJiv's native interaction/focus semantics and use the state composition idea only where real outcomes drive loading and success. A small docs/source drift was also found: docs describe a `mode` prop absent from the sampled `ButtonProps` source. [Button source](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry/remocn-ui/button/index.tsx), [concepts](https://remocn.dev/docs/ui/concepts).

**Mesh Gradient → improve `ambient-background` / `depth-background`.** This is a thin wrapper around Paper's shader: wall-clock speed is disabled and Remotion frame/FPS supplies time in milliseconds. A render gate waits two animation frames for GPU setup. The first short browser capture showed its loading skeleton; a later settled capture showed an actual canvas with a purple mesh field and no captured page errors. Keyboard ArrowRight changed Distortion from 0.6 to 0.65; reset restored 0.6. SahaJiv should use its native background architecture, original palette/materials, a lightweight quiet/static state, and a clear loading/fallback path. [Source](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/registry/remocn/shader-mesh-gradient/index.tsx).

All three pages were viewed at 1440×1000 and 390×844. Every mobile sample measured 428px document content for a 390px viewport; screenshots show the navigation strip extending beyond the right edge. Button's fixed video composition also becomes too small to read as an application control on mobile. These are reference-site observations, not assertions about SahaJiv. Screenshots and measurements are in `receipts/`; no broader responsive or accessibility pass is claimed. At this initial stage, 3 components had been sampled and 293 still needed individual review; the later typography slice below updates those totals.

## License boundary

Remocn's actual root license is MIT, copyright 2026 Remocn, with notice retention for copied or substantial adapted code. A renamed component does not remove that condition. [Pinned MIT license](https://github.com/Remocn/remocn/blob/3e03565f5c0001e143c2ed941eea7c3181f13260/LICENSE).

The runtime/dependency code is separately licensed. Remotion has its own eligibility and redistribution terms; it is not MIT because the wrapper is MIT. Paper shader code is Apache-2.0 (Remocn pins `@paper-design/shaders-react` 0.0.76), with its own notice requirements. Animated icons are described as Lucide-derived; Lucide uses ISC and includes MIT notices for Feather-derived geometry. The clean adaptation route for this MIT SahaJiv library is original native code with no Remotion dependency, preserving upstream notices whenever actual code or geometry is reused. These findings establish the dependency boundary, not a complete transitive legal audit. [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md), [Paper license](https://github.com/paper-design/shaders/blob/main/LICENSE), [Lucide license](https://github.com/lucide-icons/lucide/blob/main/LICENSE).

Brand-specific AI/social replicas, remote avatars, screenshots, logos, fonts, and music should not be assumed reusable from the code license alone. The inventory records source provenance; SahaJiv implementation should use original names, copy, assets, and visual design.

## Useful overlap and gap candidates

| Remocn idea | Local coverage | Adaptation direction |
| --- | --- | --- |
| 58 typography entries | `text-reveal`, `typography`, `animated-number`, `marquee` | Extend coherent existing families rather than duplicate every timing preset as a component. |
| 100 animated icons | `animated-icon`, `icon` | Expand semantic icon feedback and selectable motion variants with existing geometry/notices. |
| Timeline UI states | Existing controls | Real state transitions, readable feedback, focus, keyboard, disabled/loading semantics. |
| AI/chat flows | `agent-chat`, `conversation-panel`, `bubble`, `message` | Actual supplied message data, clear activity state, user-controlled progressive disclosure. |
| Animated charts | `line-chart`, `bar-chart`, chart family | Improve update/entry/quiet motion inside existing chart components. |
| Shader backdrops | `ambient-background`, `depth-background` | Original material variations and performance/fallback discipline. |
| Staged checklist/onboarding | `stepper`, `item`, `questionnaire` | A native milestone path with clear completed/current/upcoming state. |
| Social profile/count scenes | `profile-card`, `avatar`, `animated-number` | Original activity or people compositions driven by user content. |
| Code walkthrough/terminal scenes | `code-block`, `preview` | Code annotations, diff explanations, real copy feedback; no simulated execution claims. |
| Reel/bento/constellation composition | `carousel`, `organism-composition`, `organism-assembly` | Configurable collection stories with real navigation and a stable position indicator. |

## Evidence and reproduction

- [inventory.json](inventory.json): complete source catalogue, docs inventory, license evidence and overlap mapping.
- [inventory audit](receipts/inventory-audit.json): uniqueness, category counts, and source-path existence.
- [source fetch manifest](receipts/source-fetches.json): 260 successful pinned fetches (root files plus docs).
- [source tree](receipts/tree.json) and [commit](receipts/commit.json): catalogue identity and date.
- [representative fetch manifest](receipts/representative-fetches.json): source receipts; initial guessed `config.tsx` requests returned 404 and were replaced with tree-confirmed `config.ts` files. No 404 body is presented as source.
- [interaction observations](receipts/interaction-observations.json): only executed actions and observed results.
- [local baseline](receipts/local-baseline.json): the 106 local entries used for overlap inference.
- [build-inventory.mjs](receipts/build-inventory.mjs): rebuilds the inventory from captured source without network access.

## Native implementation follow-through

The assigned first native slice adds **MilestonePath** and **ActivityFeed** as original SahaJiv compositions. The source-only follow-up inspected `check-list`, `onboarding-stepper-flow`, `chat-flow`, and `x-followers-overview`; these four entries are explicitly `source-inspected-render-pending` in the inventory. Their concepts are partly adapted, not marked fully covered. Source code was not copied and no Remotion dependency was added.

`MilestonePath` composes the existing Stepper provider, List, Item, Indicator and Title plus native Button, Badge and typography. It adds variable-length data with explicit complete/current/upcoming status, richer descriptions and metadata, optional title selection, empty state, and a connected progress path. The provider gets an unrendered terminal slot so an all-complete journey has no falsely current visible item. The shared group glider is disabled using its supported `data-no-glide` boundary because this component's title callback is not a controlled row-selection model; status markers and finite connector animation remain. This also avoids stale group-marker coordinates after a runtime direction change. No base Stepper feature claim is made.

```tsx
<MilestonePath
  title="A useful beginning"
  items={[
    { id: "gather", title: "Gather the notes", state: "complete" },
    { id: "draft", title: "Make a first version", state: "current", description: "Make the open questions visible." },
    { id: "review", title: "Invite a fresh perspective", state: "upcoming" },
  ]}
  onMilestoneSelect={setSelectedId}
/>
```

`ActivityFeed` is an original new composition: the captured Remocn catalogue has no direct activity-feed equivalent. Its related references are supplied notification data and ordered chat scheduling; exact source equivalence remains pending and is not claimed. It composes Avatar, Badge, Item content/title/description, typography, AnimatedIcon, Button, and native MotionPresence/MotionSurface. It preserves caller order and stable IDs, renders semantic timestamps and arbitrary supplied details, supports explicit progressive reveal, moves focus to the first revealed row, and announces visible counts. Omitting `initialVisible` displays all supplied entries including later appends. It never invents activity or performs a request.

```tsx
<ActivityFeed
  title="Project activity"
  initialVisible={3}
  pageSize={3}
  entries={[
    { id: "review-1", title: "Reviewed the draft", actor: { name: "Mira Shah" }, timestamp: "Today, 10:42", dateTime: "2026-09-08T10:42:00+05:30", badge: { label: "Review", variant: "olive-soft" } },
  ]}
/>
```

Implementation files: `registry/sahajiv/ui/milestone-path.tsx`, `styles/milestone-path.css`, `ui/activity-feed.tsx`, `styles/activity-feed.css`; the examples are `components/examples/activity-details.tsx` (`MilestonePathExample`, `ActivityFeedExample`). Shared registration is owned by the parent task.

Validation: **6 static-render tests pass**, the focused TypeScript project passes, and the actual dev docs passed **4 browser contexts** (390/1440px × light/dark), covering keyboard milestone selection, full completion/restart, activity reveal/focus/announcement, supplied entry prepend, and final-page access. Both components retained their behavior with Motion Off, Flow Off and reduced motion. Long-content/RTL stress changed DOM text and direction to inspect CSS; it is paired with real prop rendering tests, not presented as an exhaustive arbitrary-prop browser suite. No page errors were captured, and both inner and document bounds were within the viewport in all four contexts. Mobile/dark/RTL screenshots were visually inspected. See [native browser results](receipts/native/results.json), [quiet results](receipts/native/quiet-results.json), [tests](receipts/native-additions.test.ts), and [coverage](receipts/native-coverage.json).

All captured upstream TypeScript has a `.txt` suffix in `receipts/source/` so it cannot be mistaken for SahaJiv application source by the repository's broad TypeScript include. Original repository paths remain in the fetch manifests and source URLs.

## First nine typography entries: native TextReveal improvement

The first nine typography entries were individually read at commit `3e03565f5c0001e143c2ed941eea7c3181f13260`, along with their docs, and exercised in their actual source previews. The receipt records 3.35 seconds of running DOM motion per entry, pause, edited text, a keyboard parameter change, Code output and reset. Desktop 1440px and mobile 390px screenshots were viewed. Every reference page still measured 428px document width at the 390px viewport. These are bounded source samples, not an exhaustive source accessibility or arbitrary-prop review.

- **soft-blur-in** — Character opacity and blur resolve over 27 frames; upward travel resolves over 9 frames; one-frame character stagger. Array.from splits code points, including spaces. Native disposition: **entrance-concept-adapted**. Existing soften/grapheme entrance reused. Native blur is 5px with font-relative travel and shared easing, and grapheme clusters stay intact; long delay is distributed evenly.
- **per-character-rise** — Sharp character rise: 21-frame fade, 10-frame 32px upward travel, one-frame stagger, no blur. Native disposition: **entrance-concept-adapted**. Existing rise/grapheme entrance reused. Native cadence and distance differ; Unicode segmentation and bounded long-text sequence improve application use.
- **bottom-up-letters** — Character staircase from +46px: 12-frame fade, 7-frame travel, default three-frame stagger. Native disposition: **entrance-concept-adapted**. Existing direction and stagger controls express the upward staircase. Native travel stays smaller and font-relative; long sequences compress evenly rather than leaving a simultaneous tail.
- **top-down-letters** — Character staircase from -46px, otherwise the same 12-frame fade, 7-frame travel and three-frame stagger as Bottom-Up Letters. Native disposition: **entrance-concept-adapted**. Existing downward direction reused; focused runtime confirms opposite vertical sign. Native distance/cadence are intentionally different.
- **spring-scale-in** — Words split on ASCII spaces scale from 0.7 to 1 with an overshooting cubic easing over 11 frames, default three-frame stagger. Actual sampled scale reached 1.02893. Native disposition: **entrance-concept-adapted**. New bloom entrance uses original finite keyframes 0.86 → 1.025 → 1, shared settle easing and inherited unit duration/delay. Whitespace stays actual text instead of fixed margins.
- **micro-scale-fade** — A single complete phrase fades and scales from 0.96 to 1 over 18 frames; no exit. Native disposition: **entrance-concept-adapted**. New scale entrance and whole-phrase split fill a real gap. Native duration remains configurable; text can wrap naturally.
- **scale-down-fade** — Whole phrase enters over 16 frames with +8px travel and scale 1.04 → 1; scheduled final 11-frame fade/shrink/upward exit uses video duration. Frontmatter incorrectly calls it entrance-only; body and source include exit. Native disposition: **entrance-adapted-exit-pending**. New settle entrance adapts the larger-to-rest scale with a small font-relative rise. The timed exit is not implemented by TextReveal.
- **blur-out-up** — Words enter with 6px blur, +10px travel and fade, despite clean-entry wording in docs; near clip end, words fade, blur to 8px, then move up to -14px with stagger. Native disposition: **entrance-adapted-exit-pending**. Existing softened word entry reused. The source-defining upward blurred exit remains pending; no coverage is claimed through an entrance name match.
- **focus-blur-resolve** — Whole phrase resolves 14px blur, opacity, +14px travel and 1.01 → 1 scale over 23 frames; final 16-frame exit fades with blur to 10px and -10px travel. Native disposition: **entrance-adapted-exit-pending**. Whole-phrase softened entry is newly possible. Native blur amplitude, travel, timing and absence of tiny scale differ; the scheduled blurred exit remains pending.

Two documentation contradictions matter: Scale Down Fade's frontmatter says entrance-only although its source and body schedule an exit; Blur Out Up's docs describe a clean arrival although source and observed preview start with blur. Source and actual behavior determine the dispositions.

The existing **TextReveal** gained `split="text"` and three entrance variants: `bloom` (small finite overshoot), `scale` (restrained growth), and `settle` (slight scale-down with upward travel). Existing rise/fade/soften/fold, word/grapheme, direction, duration, stagger and replay contracts remain. Long sequences now distribute delay evenly across at most 600ms; maximum per-unit duration stays 1500ms. Empty text produces no animation units. Quiet and offscreen states override motion styles immediately and cleanup settles scale as well as opacity, blur, fold and travel. No Remocn source, new runtime dependency, or video timeline was added.

TextReveal remains an entrance family. **The three source-timed exits remain pending**, and no existing Presence behavior is claimed as an exact match without separate comparison. Six entrance-only concepts are adapted; three in/out entries are partial. Overall Remocn progress is now **11 source-and-rendered samples, 4 additional source-only samples, 285 components still awaiting individual rendered review**, out of 296 components / 301 registry entries.

The example's Arrival and Reveal by native controls expose real props, and keyboard replay announces a count. WordRelayExample is preserved. The parent owns catalog and guide changes; exact replacements are in [typography handoff](receipts/typography-nine-handoff.json).

Validation: 4 static-render tests pass (Unicode clusters, whole-phrase whitespace, empty content, safe literal markup and original default semantics); focused TypeScript passes. The actual docs and in-memory transpilation of the actual native source passed at 390px and 1440px: seven intermediate/final variant states, shared-clock direction and overshoot, rapid replay and text interruption, Motion Off, Flow Off, reduced motion during playback, offscreen interruption/re-entry, long grapheme sequences and unbroken tokens, whole-phrase RTL, zero duration, empty content and unmount. The overshoot test found and verified a fix for Motion's property transition inheritance. No page errors occurred. Screenshots establish native mobile/desktop reading and wrapping; exact source timing equality is not claimed.

Evidence: [nine source fetches](receipts/typography-nine-source-fetches.json), [source preview results](receipts/typography-nine/results.json), [native runtime results](receipts/text-reveal-native/results.json), [focused tests](receipts/text-reveal.test.ts), [runtime fixture](receipts/text-reveal-fixture.tsx), and [handoff with source hashes](receipts/typography-nine-handoff.json).

## UI Primitives: individual source/rendered review and native overlap improvements

Captured 2026-09-08T17:38:53.570Z; source commit `3e03565f5c0001e143c2ed941eea7c3181f13260`. All **37 UI Primitives** now have individual pinned-source and rendered sample evidence: **69 source files**, **32 canonical public player routes**, shared parent players for three leaf entries, and explicit composed evidence for Field (Signup Flow) and SkeletonBlock (Skeleton). The two helpers have no standalone public player. Desktop 1440px and mobile 390px galleries were inspected; live deployment commit is unknown. This does not assert exhaustive props, accessibility or Customizer coverage.

**32 native concepts are verified at the stated scope; five remain owner handoffs:** Caret, Cursor, BlurIn, Sheet and Drawer. Exact source equivalence is false throughout. Existing native geometry, semantics, motion amplitudes and theme are intentional adaptations; video-frame APIs were not copied. Each row includes the precise source contract, reused or improved behavior, remaining differences and receipts in [the 37-row review](receipts/ui-primitives/review.json).

| Canonical source row | Native disposition | Native target |
| --- | --- | --- |
| remocn:spinner | native-core-concept-verified | spinner |
| remocn:caret | native-owner-handoff-pending | Owner handoff |
| remocn:button | native-core-concept-verified | button |
| remocn:accordion | native-core-concept-improved | accordion |
| remocn:alert-dialog | native-core-concept-verified | alert-dialog |
| remocn:dialog | native-core-concept-verified | dialog |
| remocn:sheet | partial-native-concept-pending-shared-motion | sheet |
| remocn:drawer | partial-native-concept-pending-shared-motion | drawer |
| remocn:checkbox | native-core-concept-verified | checkbox |
| remocn:radio | native-core-concept-improved | radio-group |
| remocn:switch | native-core-concept-verified | switch |
| remocn:input | native-core-concept-verified | input |
| remocn:blur-in | native-owner-handoff-pending | presence |
| remocn:field | native-core-concept-verified | field |
| remocn:select-item | native-core-concept-improved | select |
| remocn:select | native-core-concept-improved | select |
| remocn:select-menu | native-core-composition-verified | radio-group |
| remocn:dropdown-menu-item | native-core-concept-improved | dropdown-menu |
| remocn:tabs | native-core-concept-verified | tabs |
| remocn:dropdown-menu | native-core-concept-improved | dropdown-menu |
| remocn:cursor | native-owner-handoff-pending | Owner handoff |
| remocn:toast | native-core-concept-verified | toast |
| remocn:command-menu-item | native-core-concept-verified | command |
| remocn:command-menu | native-core-concept-verified | command |
| remocn:tooltip | native-core-concept-verified | tooltip |
| remocn:progress | native-core-concept-verified | progress |
| remocn:skeleton-block | native-core-concept-verified | skeleton |
| remocn:skeleton | native-core-concept-improved | skeleton |
| remocn:slider | native-core-concept-verified | slider |
| remocn:combobox | native-core-concept-improved | combobox |
| remocn:popover | native-core-concept-verified | popover |
| remocn:context-menu | native-core-concept-improved | context-menu |
| remocn:toggle-group | native-core-concept-verified | toggle-group |
| remocn:stepper | native-core-concept-improved | stepper |
| remocn:resizable | native-core-concept-verified | resizable |
| remocn:message-bubble | native-core-concept-improved | bubble |
| remocn:typing-indicator | native-core-concept-improved | bubble |

Useful gaps were filled in existing controls: Accordion gained measured interruptible collapse with immediate inert closing content; AsyncContent gained a caller-controlled loading handoff that preserves edited child state; StepperList gained horizontal connected stages; Bubble gained real reaction and typing parts; Select/Combobox gained persistent selected marks distinct from temporary highlight. RadioGroup now repairs the immediate-arrow deferred-focus edge without replacing Radix roving focus. Dropdown/ContextMenu class construction no longer receives children or adornment values. Persistent options reuse the existing pictographic RadioGroup.

The focused native suite passes at 390px and 1440px with pointer/keyboard actions, interruption, long/RTL content, Motion Off, Flow Off, reduced and offscreen states. Dedicated radio checks cover controlled/uncontrolled immediate and held keys, Home/End, disabled skipping, wrapping, Tab, RTL, preventDefault, rejected controlled callbacks and unmount. The broad 27-page run has 27 passing layouts, 21 passing behaviors, two initially passive examples and four stale-harness failures; it is **not** called green. Current named checkbox/radio/progress/slider checks pass separately. Public Customizer failures are also retained without being relabeled. See [handoff and hashes](receipts/ui-primitives/handoff.json).

Sheet and Drawer full directional lifecycle work is assigned to the shared-motion owner; their rows remain pending until that owner's evidence is merged. Parent-owned Presence can address BlurIn's reversible blur/directional contract. Decorative Caret blinking and Cursor waypoint/click-ring illustration have no native equivalent in this slice and remain explicit handoffs.

Current inventory after preserving all previously merged icon and typography rows: **147 source-and-rendered components, four additional source-only components, 149 components awaiting individual rendered review**, out of 296 components / 301 registry entries. Earlier progress totals and typography-exit wording above are historical snapshots; current per-entry inventory is authoritative. Native concept coverage remains distinct from source inspection.

Remocn's pinned MIT license applies to its code; Remotion's separate license is not inherited through that MIT grant. No Remotion dependency, upstream implementation import, install, production build, commit or publication was performed.

## Decorative caret, guided pointer and reversible blur follow-up

BlurIn's source-defining wrapper behavior is now covered by an **existing MotionSurface composition**. At 390px and 1440px, native tests observed positive/negative horizontal translation for left/right, positive/negative vertical translation for up/down, intermediate opacity and wrapper blur on entry and exit, inert exit, actual removal, and same-node reversal back to clear content. Motion Off, Flow Off and reduced states are immediately readable. Native 6px blur/10px travel and retained 420ms exit are authored differences from source 8px/12px/18 frames; no duplicate BlurIn component was created.

WritingCaret and GuidedPointer have **verified isolated prototypes only**. Caret uses an optional bounded sequence of blinks, preserving inline style and opacity override. Pointer uses normalized stable-ID waypoints, finite interruption-safe travel, arrival ring/held press, native arrow geometry and real external controls. Unknown IDs/empty lists hide it, malformed points are ignored, finite coordinates clamp, and resize preserves normalized position. Quiet/offscreen and the simulated document-hidden branch settle without stale replay; unmount during travel stops detached-node writes. Hand geometry and native registry promotion remain pending.

Evidence and exact statuses: [three-row follow-up](receipts/guidance-prototypes/review.json), [prototype/runtime verification](receipts/guidance-prototypes/verification.json). Only Caret, Cursor and BlurIn rows were mutated from a fresh inventory; all other rows, including completed Sheet/Drawer, icons and typography, were preserved JSON-identical. No production source was edited in this follow-up.

## Writing Caret and Guided Pointer: native promotion

After checkpoint 03, **Caret and Cursor are now native-core-concept-verified**, implemented as original WritingCaret and GuidedPointer families. WritingCaret preserves a still decorative mark and caller-triggered blinking, CSS dimensions/color/radius and opacity override; each request is bounded. GuidedPointer preserves waypoint travel, arrow/hand distinction, finite arrival feedback and held press, using normalized stable-ID points and actual external controls. It never activates the illustrated content. Native authored geometry, milliseconds and finite caller-triggered requests replace source frame timing and autoplay.

The hand silhouette adds only the installed Lucide `pointer` geometry to the existing central icon pack. All 144 previous entries are preserved and the existing full Lucide ISC/Feather MIT notices remain. No Remocn implementation code or Remotion dependency was added.

Focused TypeScript, lint and two pure data-boundary tests pass. Native controls/lifecycle pass in four Chromium/WebKit × 390px/1440px contexts; the registered docs pass eight cases, including external hand variant changes, internal glyph choice, reset and actual Code-tab output. Both default examples and the hand variant compile as three copied snippets. Shared global/local quiet, reduced, offscreen, simulated hidden state, resize, interrupted travel and unmount are covered. Nine native/doc screenshots were inspected. Exact paths, current source hashes, contracts and remaining intentional differences are in [the final handoff](receipts/guidance-native/handoff.json) and [verification](receipts/guidance-native/verification.json).

Only the two owned inventory rows changed from a fresh read; the other 299 rows were preserved, including concurrent numeric reviews. Earlier prototype-pending notes are historical; current inventory dispositions are authoritative. These two closures do not complete the remaining Remocn catalogue review.
