# Skiper UI reference inventory

Captured 2026-09-08 UTC from the deployed first-party website. This bounded research task discovered the entire canonical catalogue and sampled five component pages (the initial 1, 37 and 40, followed by 42 and 99). It does **not** complete individual inspection of every component.

## Catalogue and provenance

The authoritative catalogue contains **106 entries: 37 free and 69 Pro**, across **14 canonical collections**. IDs span `skiper1` through `skiper107`, with `skiper93` absent. The client catalogue, rendered component directory, individual-page sidebar, and the `/v1/` sitemap set agree exactly. The visual New Releases section regroups IDs 105–107; it is not a fifteenth canonical collection. Each inventory row preserves the source name, canonical `collection_name`, page URL, registry URL, access status, and inspection status. Sources: [component directory](https://skiper-ui.com/components), [entry page/sidebar](https://skiper-ui.com/v1/skiper1), [sitemap](https://skiper-ui.com/sitemap.xml).

The catalogue metadata came from the publicly delivered component-directory bundle `2746-b3b99351038ccb04.js`, deployment `dpl_EupiPug8CbNSBYxUDsBT4kcTsCfx`. Its exact URL and SHA-256 are in `inventory.json`. No canonical public source repository or upstream commit was verified: the official footer links to [the founder profile](https://github.com/Gurvinder-Singh02), whose public repository listing did not contain a named Skiper repository. The local SahaJiv overlap snapshot is commit `a50d2d4a538d13c1e808cc94344f48a6fb58686b` plus its existing dirty worktree.

Two source discrepancies matter. The homepage calls Dynamic island free, while its specific catalogue row and [component page](https://skiper-ui.com/v1/skiper2) say Pro; the inventory uses the specific sources. Sitemap `/preview/skiper*` URLs returned the site's 404 view in all three samples; `/v1/skiper*` is the working public demo route. The stale-route captures are explicitly named `stale-preview-404`.

## License and access boundary

[Quick Start](https://skiper-ui.com/docs/quick-start) advertises personal/commercial component use and modification, requires attribution for free use, and removes that requirement for Pro. It documents `https://skiper-ui.com/r/{name}.json`; Pro installs require a purchased license passed in an Authorization header. A normal unauthenticated request for [skiper1](https://skiper-ui.com/r/skiper1.json) returned HTTP 401. [skiper37](https://skiper-ui.com/r/skiper37.json) and [skiper40](https://skiper-ui.com/r/skiper40.json) returned public source with the same custom usage terms in comments.

[Terms of Service](https://skiper-ui.com/docs/terms-of-service), marked updated September 7, 2025, reserve website content and restrict republication, sublicensing, copying, and redistribution unless stated otherwise. None of the inspected official evidence grants an MIT license or clearly grants redistribution of component source as a competing MIT library. Therefore the implementation boundary is original SahaJiv code, names, visuals, and assets informed by public behavior. Free availability is not an MIT grant. Pro source was not retrieved, authenticated, reverse-engineered from bundles, or bypassed. Saved website/source receipts are research evidence, not material to package into the SahaJiv registry.

## Representative inspection

### skiper1 — Anime js scrollbar (Pro)

[Public page](https://skiper-ui.com/v1/skiper1). A small fixed horizontal rail summarizes long-page reading position. Scrolling 1,600 px moved its indicator about 21 px, while a hovered rail revealed a contextual section card. On mobile the rail centers near the bottom. The documented usage separates page content from the rail and passes active section and card visibility state. Implementation source remained license-restricted.

The sampled drag gesture did **not** change document position; this is unverified drag behavior, not a working-drag claim. The rendered rail/handle are divs with no role or tabindex in this sample. Original SahaJiv direction: **Reading trail**, exposing current section, proportional progress, and real section links; use a semantic range control if scrubbing is included, with keyboard support and non-animated reduced-motion feedback. Overlaps: `scroll-area`, `progress`, `scroll-organism`.

### skiper37 — Animated number (free source)

[Public page](https://skiper-ui.com/v1/skiper37). Four vertically stacked number demonstrations combine a countdown, a spring counter, randomized transitions, and in-view formatted values. Pointer pause held the first panel pixel-stable over 1.3 seconds; reset visibly returned to `0:60`; Space on the focused button resumed the counter. Scrolling revealed a spring value settling at 500. Desktop and mobile screenshots were visually inspected.

Source inspection found demo-hardcoded values, a pause accessible label that stays “Pause timer” when paused, and registry dependencies that omit imported packages. The sampled source also uses subscriptions and timers that should not be adopted as production patterns without lifecycle redesign. Original direction: extend the existing `animated-number` through application-owned values, locale formatting, visibility-aware updates, reduced-motion presentation, and correctly named controls. This is largely an existing-library overlap rather than a new primitive.

### skiper40 — CssLink (free source)

[Public page](https://skiper-ui.com/v1/skiper40). Five displayed links explore underline direction, a small entering arrow, and filled highlight treatments; source includes six link exports including a baseline. The first link's arrow opacity changed from 0 to 1 on hover and returned to 0 under keyboard focus. Reduced-motion emulation left a 0.3-second pseudo-element transition, so focus and motion parity need original design work. No mailto link was activated.

Original SahaJiv direction: **Living link**, a semantic anchor with an original underline/arrow composition, focus-visible parity, inherited typography, disabled handling when appropriate, and complete reduced-motion behavior. Keep navigation explicit; decorative arrows should not become separate focus stops. Overlaps: `button` link treatment, `typography`, `navigation-menu`.

## Existing overlap candidates and next inspection order

These are candidate mappings inferred from names/catalogue metadata, **not individual review claims**: theme-toggle (4, 26), animated-icon (42, 99), text-reveal (27, 28, 31, 70, 72, 87, 88), progress (89, 94, 95), tooltip (43, 98, 101), command (92), accordion (103), card/collapsible (23, 52, 53), and agent-chat/input-group (81–85). `inventory.json` records additional per-row candidates against the active local registry. Inspect each rendered reference before deciding whether its core idea requires a new component, an example, a variant, or is already covered.

The first original implementation batch can add Reading trail and Living link while assessing Animated number as an enhancement to the existing component. After the icon slice, **101 entries remain discovered, not individually inspected**. A later full pass must cover each entry's public visual, trigger, interaction, responsive behavior, keyboard behavior, source-access boundary, and original-library disposition.

## Evidence index

- `inventory.json`: 106 stable rows, scope counts, category counts, license evidence, source-access state and exact provenance.
- `receipts/catalogue.extracted.json`: canonical first-party metadata parsed as data, not executed.
- `receipts/catalogue-2746-b3b99351038ccb04.js`: exact public directory bundle used only for catalogue metadata.
- `receipts/components.rendered.html`, `.txt`, `.png`: live directory evidence.
- `receipts/sitemap.html`, `terms.html`, `quick-start.html` and HTTP metadata: first-party route and terms evidence.
- `receipts/skiper1.registry.http.json`, `.registry.json`: normal 401 response.
- `receipts/skiper37.registry.json`, `skiper40.registry.json`: sampled public registry sources.
- `receipts/representative-interactions.json`: measured scroll, pause, hover, focus, reduced-motion, and viewport observations.
- `receipts/skiper{1,37,40}.desktop.*.png`, `.mobile.png`: sampled UI states; screenshots were actually viewed.
- `receipts/manifest.json`: content hashes for this research receipt set.

The initial inventory task wrote only this reference directory. The separately authorized original implementation slices below modified named native components and tests; no dependencies, app builds, Git commits or publication were performed.


## Original implementation handoff — 2026-09-08

Two original MIT SahaJiv primitives were added after the reference research. They use SahaJiv tokens and the shared `createMotionLane` / `useChoreography` / `useMotionVisibility` infrastructure; no Skiper implementation or assets were copied.

### ReadingTrail

Source: `registry/sahajiv/ui/reading-trail.tsx`; stylesheet: `registry/sahajiv/styles/reading-trail.css`. Example export: `ReadingTrailExample` from `components/examples/reading-details.tsx`.

`ReadingTrailProps` extends native `nav` props except children. Required `items: readonly { id: string; label: React.ReactNode }[]`. Defaults: `label="On this page"`, `offset=24`; `scrollRoot?: HTMLElement | null` defaults to the document. `offset` is the activation line, not a forced scroll offset; use native `scroll-padding` on the scroll root or `scroll-margin` on targets for sticky headers. Labels, real encoded fragment URLs, and the first current item render on the server. Missing targets keep their native links but do not contribute measured state. Duplicate and empty IDs are omitted.

```tsx
<ReadingTrail items={[
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
]} />
<section id="overview">...</section>
<section id="details">...</section>
```

For an overflow panel, obtain its mounted element with a React callback ref and pass it as `scrollRoot`. Normal activation records the fragment in history and focuses the destination. Document mode calls native `scrollIntoView`; a supplied scroll root uses its own `scrollTo`, accounting for its border, scroll padding and target scroll margin, so outer ancestors remain still. Temporary tabindex restores on blur/unmount. Modified clicks retain native browser behavior. A semantic progress element and `aria-current="location"` accompany the organic marker. Observers follow resize, font readiness, content insertions/removals, ID changes, and visibility; all listeners, frames, observers, focus overrides and motion lanes are cleaned up. Exported `getReadingTrailState` is the bounded geometry calculation used by the component and focused tests.

### LivingLink

Source: `registry/sahajiv/ui/living-link.tsx`; stylesheet: `registry/sahajiv/styles/living-link.css`. Example export: `LivingLinkExample` from the same example module.

`LivingLinkProps` extends native anchor props with required `href: string`, `disabled=false`, and `direction="up-right" | "forward"` (default up-right). The root remains an anchor; standard target, rel, download, and click props are forwarded. Disabled state removes href, sets aria-disabled and removes sequential tab focus; capture guards suppress disabled pointer/keyboard/auxiliary activation. Normal navigation is never prevented. The underline is an original SVG contour revealed with clipping, avoiding normalized-dash/non-scaling-stroke artifacts on long labels. Both hover and focus drive the same shared motion lane. Reduced-motion mode retains readable ink and settles directional travel immediately.

```tsx
<LivingLink href="/notes" direction="forward">Read the notes</LivingLink>
<LivingLink href="https://example.com" target="_blank" rel="noopener noreferrer">
  Open the source
</LivingLink>
<LivingLink href="/next" disabled>Next chapter</LivingLink>
```

### Focused validation

- Four tests in `tests/reading-trail.test.ts` pass: progress range, end-of-page current-section selection, missing/invalid/unsorted geometry, and SSR normal/disabled anchor destinations.
- Targeted TypeScript project `.work/skiper-originals/tsconfig.json` passes.
- Targeted ESLint for both source modules, examples and test passes with zero warnings.
- `.work/skiper-originals/check.mjs` passes in Chromium and WebKit. It checks real keyboard fragment navigation, destination focus, marker settling, dynamic appended content (progress updated from 100% to 61.5% without a scroll event), reduced-motion navigation, living-link hover/focus, actual native activation, disabled activation suppression, unmount/remount and 390px bounds/minimum navigation hit size.
- Browser receipts and viewed screenshots: `.work/skiper-originals/output/interactions.json`, `chromium-trail-last.png`, `chromium-mobile.png`, `webkit-mobile.png`. Both engines recorded no page errors.
- Two issues found during verification were fixed: restoring target tabindex too soon lost keyboard focus; normalized SVG dashes shortened long underlines under non-scaling strokes.

The root agent owns registry metadata, global stylesheet imports, documentation registration, and full production verification. This subtask ran an isolated Vite fixture and focused checks, without building, committing, or publishing the project.


### Scoped scroll follow-up

The focused regression `.work/skiper-originals/scoped-scroll.mjs` places the container mid-document with outer scrollY=650, a 7px container border, 32px scroll padding, and 14px target scroll margin. Before the fix, keyboard activation moved the outer document to 1055. After switching only container mode to measured `scrollRoot.scrollTo`, Chromium and WebKit both keep outer scrollY at 650, set inner scrollTop to 294, align the target 46px below the inner viewport top, retain destination focus and the fragment URL. Both normal and reduced motion pass. Receipt: `.work/skiper-originals/output/scoped-scroll.json`. Targeted ESLint/typecheck and the existing four tests also pass. No global files changed.


## Initial 20-action icon slice — 2026-09-08 (historical checkpoint)

Skiper [Animated icons 001](https://skiper-ui.com/v1/skiper42) renders 17 tile previews; [Animated icons 002](https://skiper-ui.com/v1/skiper99) renders three. Both were viewed at 1440px and 390px. Skiper42 sampled menu, trash, send and bell clicks changed the public rendered state. Skiper99 arrow hover visibly extends the shaft; menu and volume clicks change their symbols. The arrow effect is CSS, so unchanged HTML alone is not an absence-of-motion result. These sampled tiles are divs with no focusable native control. The source42 registry returned 401 and remains uninspected; source99 returned public code and was read. Its menu and volume rely on div onClick and hover styling. No restricted implementation was retrieved or copied.

At this initial checkpoint, the cross-source [Remocn gallery](https://remocn.dev/docs/icons/gallery) has exactly 100 canonical icons at the inventory's pinned commit `3e03565f5c0001e143c2ed941eea7c3181f13260`. `icon-mapping.json` maps all 100 honestly: 20 had their source structure and public desktop hover/focus sampled; the remaining 80 are catalogue mappings only. The first 20 captures show genuine native buttons and public Remotion players on hover/focus, with Lucide-based paths drawing before the action. Download, bell and send source received deeper implementation inspection; the other 17 were inspected for motion structure. Only native SahaJiv code and existing local geometry were used. The Remocn inventory was read without edits. Its MIT license does not remove separate Remotion runtime or Lucide artwork terms.

The local baseline already had geometry for all first 20 actions. Six convenience aliases now resolve to it: `check-circle → circle-check`, `close → x`, `alert → triangle-alert`, `loader → loader-circle`, `refresh → refresh-cw`, `trash → trash-2`. No new geometry was copied. Of the full 100-source mapping, 72 currently have a corresponding native shape name; 28 still need a future geometry decision. Availability is not an individual review or implementation claim.

The original action vocabulary is shared between `Icon` one-shot nearest-control feedback and `AnimatedIcon preset="auto"`. Checks and activity trace their strokes; alerts and info emphasize the inner mark; loader revolves while active; refresh makes one turn; search expands only its lens; bell swings its dome with a counter-moving clapper; download/upload move arrows with stationary trays; copy separates the front sheet; settings moves the gear around a stationary hub; trash lifts its lid over a stationary bin; plus makes a quarter turn; send travels along the plane's upward-right direction; heart has two restrained beats; star expands; thumbs-up lifts the hand. Other symbols use restrained scale feedback, and explicit tremor remains opt-in. None of these decorative effects asserts that an application operation succeeded.

### Exact integration changes for the parent

- Preserve catalogue entries `icon` and `animated-icon`; add no per-icon entries or dependency.
- Point both example registrations to `components/examples/action-icons.tsx`, named exports `IconExample` and `AnimatedIconExample`. Existing shared example files were not edited.
- Existing component props stay intact. `Icon` retains `name`, `size`, `draw`, `feedback` and native SVG/ref props. `AnimatedIcon` retains `preset`, `active`, `amplitude`, `duration` and native SVG/ref props; preset values remain `auto|tremor|draw|spin|bounce|validation|pulse|none`.
- Update the icon guide with the six aliases above and the native-button usage below. All old names continue to resolve. Icons remain decorative by default; name the actual button/link.
- Update the animated guide: `auto` uses finite action motion except `loader` / `loader-circle`, which loops while permitted and active. `active=true` starts/replays the effect; omit it for hover/focus. `amplitude=0` suppresses motion. `bounce` follows the icon's geometric direction, including left/up and send; existing explicit presets remain available.
- `draw` is an explicit animation owner and suppresses automatic Icon feedback. Both paths honor shared quiet settings; active motion stops for disabled/inert/hidden controls and offscreen AnimatedIcon. Touch does not acquire a persistent hover state. SVG consumer transforms/styles and forwarded refs remain owned by consumers.

```tsx
<Button onClick={downloadReport}>
  <Icon name="download" /> Download report
</Button>
<Button disabled={busy} onClick={refreshData}>
  <AnimatedIcon name={busy ? "loader" : "refresh"} active={busy} />
  {busy ? "Refreshing…" : "Refresh"}
</Button>
```

For a disabled busy button the icon remains static by design; place a running loader in an enabled status surface when continuous progress motion is desired. Keep status text and operation ownership in the application.

### Focused evidence

- `receipts/skiper42.*`, `skiper99.*`, `icon-preview-interactions.json`: official page/source access and sampled pointer/mobile states.
- `receipts/remocn-icons/source-fetches.json`, 20 pinned `.tsx.txt` receipts: source reference evidence. These receipts are excluded from registry production files.
- `receipts/remocn-icons/rendered-first20.json`, 20 `.hover.png` captures: public desktop hover/focus sampling. Each screenshot was viewed; early path drawing can leave partial geometry in a mid-animation still.
- `icon-mapping.json`: all 100 stable source rows, local baseline names, native mappings and explicit uninspected statuses.
- `tests/action-icons.test.ts`: named geometry/alias parity, SSR visibility, directional vectors, stationary semantic parts, finite/clamped progress.
- `.work/skiper-icons/check.mjs` and `output/interactions.json`: Chromium and WebKit pointer and keyboard focus for all 20 in both components; quiet/disabled/hidden/offscreen/flow opt-out, associated-label disable, consumer style/ref preservation and unmount cleanup. Mobile layout at 390px was captured and viewed.
- Additional inherited-feedback regression, mobile touch and final lint/typecheck outcomes are recorded in `.work/skiper-icons/output/verification.json` after completion.


## Completed full icon family — 2026-09-08

All **100 canonical Remocn icons** now have an individual source-structure review, public rendered hover/focus capture, viewed screenshot, and explicit original native disposition in `icon-mapping.json`. The remaining 80 were read from the same pinned commit `3e03565f5c0001e143c2ed941eea7c3181f13260`, with native/static functions, action variables, timings and SVG bindings recorded in `source-remaining80-structure.json`. This is an interaction/geometry review, not an upstream security audit. All source receipts use `.tsx.txt` and remain research data.

All 80 public gallery buttons mounted animation on hover and keyboard focus; the artwork's first SVG changed in each sample. The corresponding 80 mid-animation screenshots were individually viewed. As with the first 20, early draw frames can be intentionally incomplete; the native library renders complete geometry on the server and at rest. No install-command buttons were activated. The live gallery is a deployment observation; the pinned source is the reproducible implementation reference.

The full native family now has authored motion for every action. It shares five small building blocks — travel, hinge, stretch, trace, and emphasis — applied to named geometry parts. Media waves move away from fixed speakers; the camera shutter closes within its body; pause bars converge; the microphone capsule responds above its stand. File text writes within a fixed page, code brackets separate around their slash, the globe meridian turns within its fixed outline, and clock/timer hands sweep within fixed faces. Commerce symbols expose a moving part: card stripe, package seam, gift lid, medal ribbon, or cart wheels. Navigation follows the drawn arrow direction. The full per-icon description is recorded with each mapping row and exposed through `iconActionDescriptions`.

These are original interpretations, not replicas of Remocn timelines. Upstream looping clock, globe, sparkles, activity and flame behaviors are finite native interaction feedback; **only loader** loops while permitted and active. The first 20 actions retain their existing behavior. No motion indicates actual application success; native controls and application state own the action result.

The 28 formerly missing shapes came from the already installed `lucide-react@0.577.0` package. A distinct four-corner `maximize` shape was also added, preserving the existing diagonal `maximize-2` API. This makes **29 added shapes**, with the full installed ISC / Feather MIT notices retained in `registry/sahajiv/lib/icon-data.ts`. Existing compound strokes for menu, globe, link, save, rocket, help and bar chart were separated into parts without changing their coordinates or silhouettes. No Remocn geometry or runtime dependency was imported.

### Final parent integration deltas

- Keep the two existing catalogue entries and their existing example registrations. There are no per-icon catalogue components.
- Add guide aliases `home → house`, `help-circle → circle-help`, `plus-circle → circle-plus`, and `more-horizontal → ellipsis`; the earlier six action aliases remain.
- `iconActionNames` and `iconActionDescriptions` are additive exports for searchable icon pickers. Existing component props/presets remain unchanged.
- Both examples now search by name and action meaning, show 12 results per page, provide empty/clear states and accessible pagination, and expose real selection details. The animated example keeps its release/disable controls.
- Preserve the Lucide/Feather notice when regenerating registry source. No new dependency is needed.
- Root owns shared guide/catalogue/registry changes and the final integrated app checks; those files were not edited in this task.

### Final evidence and limits

`remaining80-fetches.json` and `source-remaining80-structure.json` capture pinned source receipts. `rendered-remaining80.json` records the public desktop pointer/focus samples. All 80 individual `.hover.png` files were visually inspected. The complete source-to-native mapping is `icon-mapping.json`, including descriptions, geometry origin, license evidence, and per-row browser receipt selectors.

`.work/skiper-icons/output/interactions.json` passes **200 native controls per engine** (all 100 icons in both Icon and AnimatedIcon) in Chromium and WebKit, checking real pointer and focus motion. Shared lifecycle assertions cover disabled controls, quiet/reduced settings, hidden and offscreen state, associated labels, consumer transforms/refs, native keyboard activation and unmount cleanup. All actions were included in the global disabled/quiet restoration invariants. Full 100-icon native contact sheets were viewed in both engines; the searchable example was viewed at desktop and 390px widths.

`output/explorer.json` verifies all 100 options are reachable without duplicate pages, semantic search, no-results/clear behavior, touch selection, disabled loader cancellation, active-icon removal while filtering, reduced motion and mobile bounds in both engines. Six focused unit tests, targeted ESLint and targeted TypeScript checks pass. `output/verification.json` records final source hashes and commands. Earlier legacy/touch receipts remain historical from the first 20-action slice; current full-family claims use the final receipts above. No dependencies, app builds, commits or publication were performed.

## Numeric motion and editing expansion — 2026-09-08

Eight additional/updated source dispositions are recorded individually in `numeric-mapping.json`; the full source contracts, native differences, API notes, license boundaries and focused runtime evidence are in `numeric-research.md`. This slice extends AnimatedNumber, adds NumberInput, and maps Value Swap to the existing WordRelay. All eight public previews were individually observed at desktop/mobile widths; six public source bodies were read and the two Skiper Pro sources remain unrequested. No other inventory row is promoted by this work.
