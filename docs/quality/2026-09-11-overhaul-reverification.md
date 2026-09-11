# Overhaul re-verification — 11 September 2026

**Historical audit, followed by completed local recovery:** The findings below describe the pre-recovery checkout. The subsequent [recovery delivery](2026-09-11-recovery-delivery.md) records all 55 intake rows, the separate twelve-concept Hero Button collection and scoped shared-shell work. Shape Studio, the superseding Bento request and its recorded resize flicker close the final component group. Evidence includes per-family behavior tests, 374 validated copied snippets, source-matched downloads and primary-agent visual inspection—not owner aesthetic approval, a production build or complete behavioral certification of every catalogue component. The original audit remains historical evidence.

## Verdict

The full user overhaul was not delivered. Foundation work and Bento were delivered in bounded batches, but new choices also regressed discoverability. Prior independent approval and passing automated checks did not establish preservation of the user-facing capabilities or visual acceptance. Choice controls are reopened.

This audit was performed directly by the primary assistant without delegating. No component implementation was changed. The baseline is committed HEAD4929287 versus the current dirty checkout, not a claimed pristine screenshot of every intermediate revision. Existing uncommitted work is preserved.

## Confirmed before/request/after comparison

| Area | Before / requested | Current evidence | Verdict |
| --- | --- | --- | --- |
| Checkbox silhouettes | Organic, circle, rounded, pebble, leaf and flower were in the catalogue and wired through ReviewCheckboxExample. User wanted clearer demonstration and additional useful variants, not removal. | Catalogue now lists row/card/chip. Manifest routes to choice-foundations.tsx, whose checkbox hard-codes shape="rounded". Live Approach lists only Row, Card, Chip. Six public shapes still exist in selector.tsx. | Confirmed discoverability regression, not deletion of the underlying renderer. Restore a separate usable shape control. |
| Checkbox selected mark | Old demo exposed auto/dot/check/diamond/flower and show/hide mark, albeit confusingly. | New demo exposes neither indicator nor showIndicator. Public props remain. | Clarification was incorrectly achieved by hiding functionality. |
| Checkbox Corners | User asked for appropriate consistent corners on configurable surfaces, while retaining meaningful glyph shapes. | Live default Row remains borderRadius0 before and after choosing Pill; glyph path and shape stay unchanged. Row CSS explicitly forces radius0. | Visible no-op in the default approach; misleading replacement for shape selection. |
| Radio | Same six selectable silhouettes and mark configuration were available. | New demo hard-codes circle and exposes only row/card/chip. | Same regression as Checkbox. |
| Choice Card | User wanted a clearer, artistic alternative. | Live desktop/mobile light/dark card contains a small selection glyph beside a separate52×40 illustration, with label below illustration. Targets render within the specimen, with no runtime errors in this audit. | User's visual rejection stands. I did not reproduce a thrown error or overflow in these captures; do not invent a technical root cause. The hierarchy competes and original customization is absent. |
| Accordion | User requested several genuinely different accordion approaches and repair of disclosure/motion. | No new variants in catalogue; same primitive/style as HEAD; example still one FAQ arrangement. Live page has no approach controls. Four successive clicks toggle aria-expanded false/true/false/true. | New variants not implemented. Basic click toggling works; full motion/reversal/accessibility quality is not certified by that fact. |
| Ordinary Card | User requested editorial/actionable/layered alternatives, not only colours. | Same public variants and primitive/style as HEAD. Current example repeats a common badge/title/body/footer structure across palette variants. Captured default Pink in both themes/sizes. | Requested structural redesign not delivered. Default capture did not establish the exact separately reported broken state. |
| Hero button | User asked for10–15 meaningfully different hero buttons. | Catalogue still organic/capsule. | Not delivered. |
| Chart dataset picker | User explicitly reported native-looking dropdown. | charts.tsx DatasetControl still uses NativeSelect; chart primitive/style sources and their variant lists are unchanged. | Replacement request not delivered. |
| Toast trigger/layout | User reported stretched trigger and weak notification layout. | ToastExample still places Button in a grid without start alignment; primitive/style unchanged. | Source cause remains; no fresh toast interaction capture in this audit. |

## Full component-row census

Compared the55 primary component rows in the intake against HEAD:46 catalogue variant lists are unchanged. This is evidence of limited variant delivery, **not** proof that every unchanged component is broken or that shared changes had no effect. Rows containing aliases/paired entries retain their full scope in the original intake. Non-component shell requests are listed separately below.

| Component/family | Current finding / coverage |
| --- | --- |
| Calendar, Date picker | API/source changes exist for single/range/multiple. Catalogue variants remain empty; examples own selection modes. Prior tests are recorded, not freshly revalidated here. |
| Input, Field, Input group, Textarea | Contour/Editorial/Inset and shared appearance work exist. User aesthetic acceptance remains open; no fresh visual certification in this audit. |
| Label | Primitive/style and variant list unchanged. Required clarity/semantics work remains open. |
| Multi-select | Appearance/radius wiring changed; catalogue still both/icon-only/blob-only/none. Requested token/summary/searchable-checklist approaches not delivered as variants. |
| Native select | Appearance wiring changed; catalogue still ink. Native popup limitation remains. |
| Number input | Appearance wiring changed; catalogue still default. Distinct quantity/scrub approaches remain open. |
| Select | Shared field/style changes exist; no catalogue variants. Rich-choice/compact approaches remain open. |
| Checkbox, Radio group | Reopened regressions above; live inspected at1440/390 in light/dark. |
| Questionnaire | Primitive/style and six shape variants unchanged; requested alternative workflows remain open. |
| Option wheel | Primitive/style unchanged; left/right variants unchanged. Wheel-scroll improvement not established. |
| Slider | Rubber/range/vertical now appear alongside organic/line/segmented; source and prior focused tests exist. Not freshly revalidated in this audit. |
| Switch | Capsule/rocker/latch added. Prior tests do not establish current user visual acceptance. |
| Breadcrumb, Carousel, Navigation menu, Pagination | Primitive/style and empty variant lists unchanged; requested designs and specific interaction issues remain open. |
| Reading trail | Scroll-related style changes exist; default variant unchanged. New reading approaches remain open. |
| Standalone Sidebar, Stepper | Primitive/style unchanged; no new variants. Docs navigation work is not delivery of the standalone Sidebar redesign. |
| Tabs, Toggle | Primitive/style and earlier variant lists unchanged. Requested additional approaches and motion repairs remain open. |
| Alert | Existing status/palette variants unchanged; no delivered structural alternatives. |
| Progress | Existing organic/line/segmented/orbit/cream/unavailable list unchanged. Clarification and quality review remain open. |
| Skeleton, Loading/Spinner | Existing variants unchanged; additional useful compositions remain open. |
| Toast | Source cause noted above; additional variants not delivered. |
| Activity feed | Primitive/style/default unchanged. User requested polish only, not variants; polish remains unverified. |
| Charts introduction | Primitive/style and empty variant list unchanged; organised usage experience remains open. |
| Area, Bar, Line, Pie, Radar, Radial charts | Existing data modes preserved, but primitive/style and variant lists unchanged; requested new compositions not delivered. Dataset selector remains native. |
| Chart tooltip | Default unchanged; requested inspection/placement polish remains unverified. |
| Avatar, Badge | Existing square/palette/status treatments unchanged; requested meaningful alternatives remain open. |
| Table + Data table | Table scroll owner changed. Catalogue still has no new Table variants; pagination repair/consolidation not verified here. |
| Hover card | Primitive/style/no variants unchanged; requested contextual alternatives remain open. |
| Icon + Animated icon | Icon implementation and examples changed; catalogue now default/duotone/organic. Color/motion quality needs separate current behavior verification, not inferred from those changes. |
| Item, Milestone path | Primitive/style and variant lists unchanged; requested repairs/alternatives remain open. |
| Shape + Shape artwork/related studios | Shape primitive/style/default unchanged; unified studio completion not established. Low-level shapes should not be removed merely as catalogue cleanup. |
| Tooltip | Primitive/style/no variants unchanged; requested creative alternatives remain open. |
| Accordion | No new variants; direct live evidence above. |
| Aspect ratio → Bento | Bento delivered separately; preserving AspectRatio compatibility does not complete other layout requests. |
| Card | No structural variant delivery; direct live evidence above. |
| Collapsible, Dialog | Primitive/style/no variants unchanged; repairs/alternatives remain open. |
| Linear modal | Primitive/style/card+compact unchanged; reference-restoration claim not established. |

## Shared requests still require their own acceptance

Workbench layout/configuration, code formatting, API tables, radius scope, global organic scrollbar coverage, app-wide cursor flicker, command search, sidebar clarity/compact navigation, Work with me/GitHub prominence, docs-home setup, request board, chart categorisation and unified icon/shape discovery cannot be marked complete from Bento tests or this census. Some have implementation and earlier tests; user feedback reopens acceptance. The scope remains in the original intake, not cancelled by later feature requests.

## How the failure escaped review

1. The implementation correctly separated composition from shape conceptually, but changed the catalogue to compositions without supplying a replacement shape/indicator control.
2. choice-docs.browser.mjs intentionally tests Row/Card/Chip, click/Space, bounds,44px targets and screenshots. It has no assertion that the six original shapes remain discoverable in actual docs.
3. Legacy shape checks exercise a separate fixture. They prove retained primitive capability, not access through the newly mapped documentation example.
4. The task7 report explicitly says the broader docs gate still expects old Checkbox/Radio labels and was not used as the new gate. That mismatch needed reconciliation, not acceptance as completed coverage.
5. Independent review and automated test results were treated as stronger evidence than they were. They do not establish beauty or fulfillment of the full user's before/after request.
6. Work proceeded in bounded batches and later Bento work while the long checklist remained open. The handoff needed a prominent outstanding-scope statement, not just a completion headline for the latest feature.

## Recovery order, not a new redesign approval gate

First restore discoverability of the existing six shapes and selected-mark options, preserving selected values across presentation changes. Separate glyph shape from row/card/chip composition; remove or disable Corners where it is a no-op, or label a genuinely editable container radius precisely. Rework the rejected card hierarchy without adding more competing symbols. Acceptance checks must navigate the real docs and prove every preserved option is reachable and visible.

Then deliver the genuinely missing accordion alternatives and work through the remaining original checklist in explicit family batches. Each batch needs before/request/after evidence, real interaction tests and inspected visual captures. Do not declare the whole list complete from shared tests. No blanket rollback: retained primitives, useful radius work, calendar modes and slider work should be assessed separately from the faulty presentation changes.

## Fresh evidence and limits

- Original4320 documentation server responded200 again during this audit; the preceding Bento server stall is not assumed current.
-16 current screenshots: output/playwright/reverification-20260911/{checkbox,radio-group,accordion,card}-{1440,390}-{light,dark}.png. Primary assistant inspected the reported checkbox card on desktop/light and mobile/dark, accordion desktop/light and ordinary Card desktop/light directly. Other captures are available, not all individually visually certified.
- Direct browser measurements: default Row corners0→0 after Pill; selector path unchanged; Approach options exactly Row/Card/Chip. No page runtime errors observed on the four routes. Accordion basic clicks toggled state correctly.
- Remaining catalogue rows received source/metadata comparison, not comprehensive runtime verification. This is a candid audit checkpoint, not an all-components behavior pass and not a fix-completion report.
