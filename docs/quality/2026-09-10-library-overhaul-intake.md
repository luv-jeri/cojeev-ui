# Library craft overhaul — September 10 review

Status: first-batch design approved by the owner with “continue and complete and fix all”. Implementation is in progress; completion requires per-batch evidence below. The latest owner review supersedes earlier visual acceptance assumptions.

## Implementation checkpoint

**Latest owner feedback / visual review reopened:**53 of55 intake rows plus the separately requested Hero Button collection now have implementation and local behavior evidence, most recently Dialog, Linear Modal and Icon/AnimatedIcon. Shape unification, superseding Bento acceptance and shared-shell requests remain open. Accordion has been revised again and personally inspected; passing tests do not mean the owner has accepted its appearance. See [recovery delivery](2026-09-11-recovery-delivery.md). Earlier checkpoint counts below are historical snapshots.

**Recovery delivery2026-09-11:** Twenty-seven rows are implemented and locally verified: Checkbox/Radio, Accordion, Card, Collapsible, Toast, twelve-concept Hero Button, Charts introduction and six chart families, Pagination, Tabs, Navigation Menu, paired Table/DataTable, Calendar, Date Picker, Rubber Slider, Switch, Input, Field, Input Group, Textarea and Label. See the [recovery checkpoints](2026-09-11-recovery-delivery.md) for exact behavior,186 copied snippets, source-matched downloads, inspected visuals and limitations. This supersedes missing-delivery findings for those rows only. The remaining28 component rows and shared-shell requests stay open; owner aesthetic acceptance and whole-library verification are not implied.

**Reopened2026-09-11 after owner rejection:** direct primary-agent audit confirmed Checkbox/Radio shape and mark controls disappeared from the real demos, and default Row Corners is a no-op. Prior independent approvals are not current visual acceptance. Accordion/new Card approaches and most requested families remain undelivered. See [before/request/after re-verification](2026-09-11-overhaul-reverification.md) for the55-row source census, fresh live evidence and explicit coverage limits. No component implementation changed during that audit.

The foundation batch now has shared field approaches/corners, a value-dependent Rubber slider, configuration-preserving workbench with formatted source, and real table/article scrollbars. Calendar/DatePicker add native single/range/multiple selection. Sidebar search uses Fumadocs through Command. The owner's 22:24 feedback supersedes the colourful compact grid: navigation now has a restrained labelled utility area, folding categories, delayed hover/focus previews and persistent footer invitations. Choice controls add explicit row/card/chip compositions and capsule/rocker/latch switches. These bounded areas have independent review and focused browser evidence; the whole checklist is not complete. See the Round 20 ledger and `.superpowers/sdd/2026-09-10-overhaul-foundations/` reports for exact limits.

Original findings below are retained as intake evidence, not descriptions of the newly implemented state. All unaddressed families remain open. The owner separately approved a lossless backup of seven duplicate files and registry rebuild; source/download/publication are distinct gates.

## The brief

Keep Cojeev's warm paper, precise ink, living contours, type, paired theme colours and shared motion. Replace generic compositions with useful, authored alternatives. Usually show three or four genuinely different ways to accomplish the same job. Colours, sizes, border radii, states and optional adornments are controls, not evidence of different concepts. Activity Feed is explicitly polish-only.

Every named request is retained below. “Triad/tried” is interpreted as the shared **Try it** workbench, based on the screenshot. “Krauser” is interpreted as **Carousel**; “linear model” maps to **Linear Modal**. Loading's actual catalogue ID is `spinner`. These mappings are assumptions, not new components.

## Evidence and what actually causes the repeated problems

This is a targeted source inspection plus one live icon interaction check, not a completed audit of every route.

| Finding | Current evidence | Consequence |
|---|---|---|
| The catalogue mixes incompatible concepts | `registry.json` lists badge colours, Field's invalid state, checkbox shapes and progress appearances in the same variants field. `components/component-preview.tsx` renders every variant and every size as another specimen. | Galleries can be extensive yet repetitive, and repeat configuration controls. Showing more examples alone does not solve discoverability. Reopens RF-U-005. |
| Preview actions wrap without a designed intermediate layout | `registry/cojeev/styles/preview.css` uses nested wrapping flex rows; `components/component-preview.tsx` injects another action group. User screenshot shows the result. | Fix the shared toolbar composition, not individual component pages. Reopens RF-U-003. |
| Rubber slider was not implemented | `SliderAppearance`, the actual `motion-progress.tsx` example and catalogue omit rubber. | A new value-dependent track profile is required; the current velocity-based thumb stretch is not the requested effect. |
| Calendar really only supports one selected date | `registry/cojeev/ui/calendar.tsx` restricts `mode` to `single`, selected state to `Date`, and its callback accordingly. | Range/multiple are public API work, not merely missing examples. The selection-morph symptom still needs a live motion reproduction. |
| Icon colour picker is ineffective in the default treatment | Live `/docs/icon/`: changing Outline to Blue left ink at `rgb(38,40,45)`; Organic Blue produced `rgb(149,186,232)` and Organic Pink `rgb(240,164,204)`. Source documents `tone` as accent-only for Outline. | Distinguish foreground colour from accent in the studio. Every visible colour control must affect its stated target, and copied JSX must reproduce it. Do not silently change every existing action icon's foreground contract. |
| Form appearance has multiple owners | Input embeds a pill radius and fill; InputGroup duplicates them; DatePicker has a later 14px trigger override; Textarea uses another corner treatment. | One shared family appearance contract is needed, with composition-specific geometry only when deliberate. |
| Field is not a duplicate Input | Field connects generated IDs, label, descriptions and error messages through context/Slot; Input renders the native control. | Keep the two contracts, use the same visual family, and demonstrate their relationship explicitly. |
| Global scrollbar coverage is partial | `docs/quality/global-scrollbar-audit.md` explicitly distinguishes organic ScrollArea/PageScrollBar from native CSS fallback. `TableContainer` still owns native horizontal overflow. | Migrate application-owned scroll regions through shared adapters; do not call a native fallback the custom thumb. Reopens coverage limits from RF-U-004 and the global-scrollbar work. |
| Sidebar links disappear by construction | `components/docs-shell.tsx` places GitHub/Work with me in `!compact` content; compact search expands and focuses the inline filter. | Put the links outside the scrolling/conditional index; retain compact settings and reversible index. The earlier Command/Fumadocs search request is not fulfilled by this filter. |
| Toast trigger stretches because of its container | `ToastExample` places Button in a full-width grid with default stretch alignment. Preview's direct-child Button rule does not reach it. | Correct the example's layout boundary, then repair toast content composition. Do not globally make all buttons shrink. |
| Chart picker is genuinely a native menu | `components/examples/charts.tsx` shares `DatasetControl` using NativeSelect. | Use Cojeev Select for chart demo tooling. Keep NativeSelect as an explicitly native component elsewhere. |
| Charts already have some meaningful data modes | Area: linear/step/stacked; Bar: grouped/stacked/horizontal; Line: linear/smooth/step. All are under Data display. | Preserve useful modes, improve their presentation, and add distinct analytic compositions rather than claiming none exist. |
| Two table docs do not mean two separate table engines | DataTable imports TableContainer/Table and adds filtering, sorting and Pagination. | Consolidate the catalogue entry/guide and retain both low-level table primitives and the composed data interface. |
| Linear Modal contains motion code, but that does not prove it plays | Local source has shared layout IDs and visibility-gated animation. Original: [UI Layouts Linear Card](https://www.ui-layouts.com/components/linear-modal), inspected September 10. | Reproduce the failure and compare actual opening/closing to the original; do not describe it as having no code or replace the reference with invented variants. |

Earlier behaviour-test passes did not establish visual approval. A recurring symptom reopens the existing issue; this intake does not erase previous evidence or assert the same root cause without a reproduction.

## Recommended order and alternatives

**Recommended: shared foundation first, then family batches.** The first batch establishes the Try it workbench, form appearance/radius, application-owned scroll containers and representative form designs, including the missing rubber slider. Later families reuse that tested contract.

Alternatives offered to the owner: hero features first (icons/shapes/navigation), or a behaviour-only repair pass across the named broken components before visual redesign. All three retain the complete scope below; the difference is sequencing, not cancellation.

The owner approved this first-batch design and foundation-first sequence on September 10. Remaining families stay in scope; do not reopen the same approval gate or label the entire library complete from foundation tests.

## Proposed first-batch design for approval

### One useful workbench

- The specimen is the hero, not its settings. A fixed hierarchy: Preview/Code at the leading edge and Copy code at the trailing edge; a clearly grouped tools shelf for Background, Motion and Reset.
- Wide layouts fit a composed header; intermediate widths deliberately use two aligned rows rather than accidental wrapping; narrow screens use a labelled tools grid. No hidden essential options or tiny icon-only controls without names.
- One interactive example and a concise, directly visible comparison of real approaches. A short “Use this when…” description and “Try…” interaction cue accompany each approach. Size, state, shape and radius live in their appropriate control groups rather than repeated galleries.
- Preserve specimen state when changing presentation, except explicit Reset. Copy the currently configured example, not always the catalogue's first variant.
- Code keeps the existing formatter/highlighter and selectable text. API tables get readable column proportions, type wrapping at meaningful boundaries and the real horizontal organic scrollbar.
- Icon and Shape studios can use a wider, specialised workbench while sharing these controls and copy behaviour; do not nest a whole library inside repeated generic preview cards.

### Three coherent form approaches

1. **Contour** — quiet outlined surface, stable external label, an ink edge that responds gently to focus; compact, general-purpose forms.
2. **Editorial** — open surface with an underlined input and margin/inline help; writing and low-density settings. The line draws toward the caret region without moving text.
3. **Inset** — label, value and supporting state contained in one shallow tonal well; denser grouped tasks and affixes. Focus travels along the inset edge rather than adding a blob behind the text.

These are proposed form compositions, not new palette names. Adapt them appropriately for native Input, InputWrapper, Field and InputGroup, Textarea, Select/NativeSelect, DatePicker, NumberInput and MultiSelect. Keep native refs, names, form submission, autofill, label associations and controlled/uncontrolled behaviour. No label may disappear when a value exists.

### Shared shape/radius contract

- Define one appearance owner with inherited default and local override, using the existing token scale. Expose named corners such as square, soft, round and pill where meaningful; map any continuous radius adjustment to the same underlying token rather than per-component CSS patches.
- Button, input-family shells and other configurable rounded surfaces opt into this same contract. One-line pills can remain pills; multiline controls cap effective radius to avoid pinched text corners. Circular glyphs, real data geometry and signature artwork do not inherit arbitrary field radii.
- Document the precedence of explicit local radius/shape versus inherited settings. Test reset and palette/theme changes without dropping values or focus. New settings must not duplicate the existing appearance or motion stores.

### Rubber slider

- Expose a named Rubber appearance in source, docs and live comparison.
- A short filled segment has a rounded, thick body; as its extent increases, the middle becomes visibly and monotonically thinner, retaining softly attached rounded ends. This deformation derives from value/extent, not only drag speed.
- Keep the near-round thumb easy to grab and the transparent interaction rail at least as large as today. Preserve min/max/step and keyboard controls. At zero there is no inverted/self-intersecting geometry; at max the strand is still visible.
- Velocity adds a bounded stretch-and-settle response. Quiet mode removes elastic time-based motion, not the meaningful value-to-thickness relationship.

### Scroll ownership

- Reuse ScrollArea/PageScrollBar and the global provider. Begin with shared API/TableContainer and the reading specimen, then inventory each application-owned overflow region below.
- Keep exactly one scroll owner per region. Preserve table sizing, RTL, scroll snap, keyboard/page scrolling, touch, overlays' focus management and refs. Do not reparent arbitrary app DOM through a global observer.
- Native browser-owned menus, frames and forced-colours fallbacks remain explicit platform exceptions. Do not hide a native bar until a working replacement exists.

## Complete request inventory

Status: **R** = user-reported; **S** = relevant source inspected; **L** = relevant live behaviour checked. These are evidence levels, not completion states. None of these redesign rows is marked implemented or verified by this intake. Proposed concepts below are not shipped variants or approved final designs.

### Shared docs, discovery and appearance

| Surface | Evidence | Required outcome |
|---|---|---|
| Try it / Preview | S | Composed responsive toolbar; discoverable options; understandable comparison; truthful copy output. |
| API props tables | S | Readable types, sensible column balance, custom horizontal scrollbar. |
| Code blocks | S | Preserve recent formatting/highlighting; retest all newly generated/configured examples. |
| Radius controls | S | Shared inherited setting and local overrides; consistent appropriate corners on configurable controls. |
| Global custom scrollbars | S | Enumerate and migrate owned overflow containers; both axes, real thumb and usable hit rails. |
| Docs sidebar/search | S | Remove “Components for everyday work.”; prominent persistent Work with me and GitHub in expanded/compact states; retain compact index/settings; shared Command presentation backed by Fumadocs search. |
| Make it yours / docs home (`/docs/`) | S | `app/docs/page.tsx` is the confirmed page. Give setup/customisation a useful authored composition and bring Request board into top-level discovery. |
| Request board (`/requests/`) | R | Authored shape/colour hierarchy, readable request states and purposeful motion; preserve truthful service availability and privacy boundaries. |
| Catalogue structure | S | Icon library and unified Shape studio at top; Charts category; one Tables entry with primitive/composed usage; preserve existing routes/links. |

### Forms and choices

| Component ID | Evidence | Repair / distinct directions to develop |
|---|---|---|
| `calendar` | S | Repair selected-contour motion; single-date calendar, connected date interval and multiple-date planning. Preserve disabled/required/outside-day/month behaviour. |
| `date-picker` | S | Shared field shell; single day, interval and preset-assisted selection using the same Calendar owner. |
| `input` | S | Contour, Editorial and Inset; no flat indistinguishable fill; meaningful focus/validation. |
| `field` | S | Explain label/control/help/error composition; align with Input; stacked, inline and integrated presentations only where useful. |
| `input-group` | S | Shared affix/action composition; joined toolbar input, quantity/unit control and multiline composer. |
| `label` | R | Consistent typography and associations; visible required/optional/help semantics rather than decorative label variants. |
| `multi-select` | R | Token collection, compact summary and searchable checklist; insertion/removal feedback and usable overflow. |
| `native-select` | R | Coherent field styling; preserve native operation and document native-popup limitation. |
| `number-input` | R | Stepper field, compact quantity control and scrub-capable adjustment with keyboard alternative. |
| `select` | R | Coherent field/select shells, compact action selector and rich labelled choices; custom list scrolling. |
| `textarea` | R | Writing field, integrated composer and annotated/limited response; preserve resize, selection and text scrolling. |
| `checkbox` | S | Separate boolean/indeterminate/disabled from appearance; checklist, choice tile and selection row; no repeated ambiguous “selected mark” panels. |
| `radio-group` | R | One-of-many clarity; compact list, choice cards and segmented decision. Show actual selected value and how to change it. |
| `questionnaire` | R | One question at a time, grouped review and compact branching response; preserve answer/validation contracts. |
| `option-wheel` | S | Add bounded wheel/trackpad selection without trapping page scroll; rotary arc, vertical reel and compact selector. Left/right alone is placement, not a new concept. |
| `slider` | S | Add the specified value-dependent rubber strand; polish round thumb, direction response and existing range/vertical/marked approaches. |
| `switch` | R | Tactile toggle, labelled sliding choice and compact state rail; unmistakable state without colour alone. |

### Navigation and progression

| Component ID | Evidence | Repair / distinct directions to develop |
|---|---|---|
| `breadcrumb` | R | Quiet path, compressed overflow path and contextual back/history approach. |
| `carousel` | R | Focused frame, visible-next-card rail and editorial sequence; usable buttons, keys and touch. |
| `navigation-menu` | R | Reproduce broken popup/layout/focus; compact navigation, anchored index and rich preview menu. |
| `pagination` | R | Reproduce colour/flicker on repeated page changes; numbered control, compact previous/next and jump-to-page. |
| `reading-trail` | R | Custom-scroll specimen; margin trail, progress ribbon and compact chapter index. |
| `sidebar` | R | Improve standalone component (distinct from docs shell): expanded hierarchy, compact tools/index and drawer composition. |
| `stepper` | R | Connected journey, compact current/total and review/checklist approach. |
| `tabs` | R | Repair selection/content transition and reversals; underlined navigation, contained segments and attached sections. |
| `toggle` | R | Repair switching motion; state, selection and appearance must not conflict; no cursor ownership changes. |

### Feedback

| Component ID | Evidence | Repair / distinct directions to develop |
|---|---|---|
| `alert` | R | Inline annotation, attached banner and actionable notice; status colour is orthogonal. |
| `progress` | S | Clarify determinate/indeterminate/unavailable and existing line/segmented/orbit approaches; one readable control surface. |
| `skeleton` | R | Reading, media and structured-data placeholders with restrained quiet-safe motion. |
| `spinner` (Loading) | R | Purposeful finite/in-progress cues, e.g. orbit, breathing contour and typing rhythm; retain truthful busy state. |
| `toast` | S | Non-stretched trigger; title/body/actions aligned; compact message, actionable receipt and bounded task-progress notification. |
| `activity-feed` | R | **Polish only; no added variants.** Improve hierarchy, grouping, timestamps and update continuity. |

### Data, icons and shapes

| Component ID | Evidence | Repair / distinct directions to develop |
|---|---|---|
| `chart` | S | Make an organised Charts introduction/composition guide; explain how chart frame, series, legend, tooltip and data table work together. |
| `area-chart` | S | Retain stacked/step modes; compare trend, cumulative composition and compact summary. Replace demo native selector. |
| `bar-chart` | S | Group comparison, stacked contribution and horizontal ranking; preserve numeric truth and shared legend. |
| `line-chart` | S | Trend comparison, step changes and compact/small-multiple reading; no invented smoothing across missing values. |
| `pie-chart` | S | Compare share disc, central-total ring and labelled contribution layout where the data supports each. |
| `radar-chart` | S | Profile comparison, focused single profile and legible companion values; no decorative distortion of scales. |
| `radial-chart` | S | Single goal, independent concentric goals and compact gauges; maintain correct denominators. |
| `chart-tooltip` | S | Shared legible point comparison and chart inspection; keyboard/Escape/edge placement and paired colours. |
| `avatar` | R | Identity portrait, named identity row and grouped participants; ensure fallback/loading/error behaviour. |
| `badge` | R | Status stamp, metadata tag and compact count/indicator; preserve non-interactive semantics unless an action exists. |
| `table` + `data-table` | S | One discoverable Tables guide with primitive and data-driven sections; repair pagination flicker; compact ledger, comparison and rich rows. Retain low-level exports and redirect old docs if consolidated. |
| `hover-card` | R | Compact identity, contextual preview and richer media detail; accessible focus alternative. |
| `icon` + `animated-icon` | L | Hero studio; working foreground/accent controls, organic line craft, timing and replay, search/copy; remove repeated mini-explorers. |
| `item` | R | Repair present behaviour; clear compact row, media item and actionable detail composition. |
| `milestone-path` | R | Vertical journey, horizontal sequence and compact checkpoint review. |
| `shape` + `shape-artwork` + related shape workbenches | S | One top-level Shape studio: choose silhouette/composition, fill/outline, colour, animation and speed; replay/pause, export SVG/React. Reuse low-level renderers and inspect overlap with `shape-scene` before consolidating; a 3D scene is not automatically a duplicate 2D primitive. |
| `tooltip` | R | Precise callout, shortcut hint and small annotated label; creative outline without obscuring text, focus or placement. |

### Layout and disclosure

| Component ID | Evidence | Repair / distinct directions to develop |
|---|---|---|
| `accordion` | R | Reproduce broken disclosure; compact FAQ, connected section and preview-led editorial accordion. |
| `aspect-ratio` | R | Teach proportional media through framed image, video/poster and comparison examples; ratio itself remains a numeric parameter, not an invented component behaviour. |
| `card` | R | Distinct editorial card, actionable summary and layered detail; current colour changes are not concept variants. |
| `collapsible` | R | Repair full interaction; inline disclosure, attached detail and expandable summary. Keep focused children safe when folding. |
| `dialog` | R | Confirmation, focused form and media/detail composition; preserve dismissal, trap and focus return. |
| `linear-modal` | S | Reference-first restoration: opening/closing geometry, image/title continuity, body reveal, placement and rapid reversal. Compare reference's original, centred and standalone approaches before porting. |

## Acceptance contract for every batch

1. Record the exact route, symptom and repeatable behaviour before fixing it. Separate reported, reproduced, source-confirmed, implemented and verified states; link existing issue IDs rather than adding duplicate closure claims.
2. For each true variant, name its purpose, structural/interaction difference and a specific thing the visitor can try. Colour/size/state/radius/adornment do not count toward the target. Do not force meaningless API variants onto semantic primitives.
3. Use Cojeev controls, icons, geometry and motion owners. Stable hit areas; one motion owner per animated property; bounded settling; no per-hover node detach/reattach.
4. Verify real interactions: rapid reversal, keyboard/focus, disabled/error/empty/long content, controlled updates and values persisting through cosmetic changes.
5. Inspect desktop and mobile, light and dark, representative alternate palettes, Motion Off and system reduced motion. Keep deformation that communicates value in quiet mode without continuous animation.
6. Test scroll behaviour and decoration separately: long content, both axes, drag, touch/keyboard, RTL where supported, only one painted scrollbar per owner.
7. Refresh actual docs variants/controls, descriptions, API types and copied examples. Check copied code, registry dependencies and live route behaviour separately.
8. Record screenshots and focused tests by component/batch. Passing generic bounds checks or a shared suite does not certify visual quality for the entire library. User visual approval remains a separate check.
9. Preserve existing dirty work, native semantics, public APIs and routes. No unrelated deletion, commit, push or publication. RF-S-002 was resolved by the owner's approved lossless backup; continue verifying current source/download freshness separately from publication.

## Related earlier requests retained

- The twelve-concept Hero Button collection is now delivered in the September11 recovery checkpoint. Shared action usage alone was not evidence of its earlier delivery; owner visual acceptance remains separate.
- Work with me prominence and Command/Fumadocs-backed sidebar search are explicitly part of this review, not assumed complete from compact-navigation delivery.
- App-wide moving-cursor flicker still needs user confirmation after the earlier shared hover ownership fixes; reopened symptoms need movement-across-edge tests, not only centre-point sampling.
- Recent code formatting, preview-background connection and compact navigation/theme-seam repairs must be preserved. New screenshots do not automatically establish that their exact old source cause has returned.

## Next handoff

Continue from `docs/superpowers/plans/2026-09-11-overhaul-recovery.md` and its delivery checkpoint, preserving the restored controls. Propagate behavior and visual verification through the remaining families. This checklist retains the whole request without pretending that a library-wide redesign is already finished.
