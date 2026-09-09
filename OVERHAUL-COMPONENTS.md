# Overhaul component audit

**Historical snapshot:** the counts and rendered results below predate the current review changes. Current source/registration includes all 68 named entries, but this older visual ledger does not certify their current variants, palettes or motion. See [REVIEW-PASS-REPORT.md](REVIEW-PASS-REPORT.md) for the latest focused evidence and [GOAL-REVIEW-AUDIT.md](GOAL-REVIEW-AUDIT.md) for remaining full-goal verification.

The active brief names **68 entries: 61 non-chart components and seven chart entries**. Every named entry has a source review and rendered evidence. This ledger separates documented variant coverage from behavior, motion and content-length checks. The full registry contains 89 UI entries plus one shared foundation.

## Documented variants and sizes

The complete advertised variant × size cross-product contains 194 combinations. Each was captured at **390px dark and 1440px light**, giving **388 cases**. All have passing final evidence; original failures and targeted confirmations remain recorded in [the variant report](OVERHAUL-VARIANTS.md). All 26 contact sheets were visually inspected. These counts do not imply every possible TypeScript prop combination.

| Component | Family | Variants × sizes | Final cases | Further evidence |
| --- | --- | --- | ---: | --- |
| aspect-ratio | Layout & Structure | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| card | Layout & Structure | 10 × 2 | 40/40 | [Motion](OVERHAUL-MOTION.md); [320px long content](OVERHAUL-LONG-CONTENT.md); [primitive motion](OVERHAUL-PRIMITIVES.md) |
| collapsible | Layout & Structure | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| resizable | Layout & Structure | 2 × 1 | 4/4 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| scroll-area | Layout & Structure | 2 × 1 | 4/4 | [Motion](OVERHAUL-MOTION.md) |
| separator | Layout & Structure | 2 × 1 | 4/4 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| sidebar | Layout & Structure | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| breadcrumb | Navigation | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| menubar | Navigation | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| navigation-menu | Navigation | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| pagination | Navigation | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| tabs | Navigation | 3 × 1 | 6/6 | [Forms / navigation](OVERHAUL-FORMS-NAV.md); keyed panel presence and pointer / arrow-key selection |
| alert | Feedback & Status | 6 × 1 | 12/12 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| alert-dialog | Feedback & Status | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| badge | Feedback & Status | 18 × 3 | 108/108 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| empty | Feedback & Status | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| progress | Feedback & Status | 3 × 3 | 18/18 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| skeleton | Feedback & Status | 5 × 1 | 10/10 | [Motion](OVERHAUL-MOTION.md); [primitive motion](OVERHAUL-PRIMITIVES.md) |
| spinner | Feedback & Status | 2 × 1 | 4/4 | [Motion](OVERHAUL-MOTION.md); [primitive motion](OVERHAUL-PRIMITIVES.md) |
| toast | Feedback & Status | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| tooltip | Feedback & Status | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| avatar | Data Display | 2 × 2 | 8/8 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| bubble | Data Display | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| data-table | Data Display | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| item | Data Display | 3 × 1 | 6/6 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| kbd | Data Display | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| marker | Data Display | 3 × 1 | 6/6 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| table | Data Display | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| typography | Data Display | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| context-menu | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| dialog | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| drawer | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| dropdown-menu | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| hover-card | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| popover | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| sheet | Overlays | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |
| button | Form & Input | 7 × 3 | 42/42 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| button-group | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| checkbox | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| combobox | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| command | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| date-picker | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| calendar | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| direction | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| field | Form & Input | 2 × 1 | 4/4 | [Forms / navigation](OVERHAUL-FORMS-NAV.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| input | Form & Input | 2 × 2 | 8/8 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| input-group | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| input-otp | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| label | Form & Input | 1 × 2 | 4/4 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| native-select | Form & Input | 2 × 1 | 4/4 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| radio-group | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| select | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| slider | Form & Input | 2 × 1 | 4/4 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| switch | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| textarea | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| toggle | Form & Input | 4 × 1 | 8/8 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| toggle-group | Form & Input | 1 × 1 | 2/2 | [Forms / navigation](OVERHAUL-FORMS-NAV.md) |
| attachment | Agent & Chat | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| message | Agent & Chat | 2 × 1 | 4/4 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md); [320px long content](OVERHAUL-LONG-CONTENT.md) |
| message-scroller | Agent & Chat | 1 × 1 | 2/2 | [Motion](OVERHAUL-MOTION.md); detached append, jump-to-latest and ScrollArea composition |
| questionnaire | Agent & Chat | 1 × 1 | 2/2 | [Data / overlays](OVERHAUL-DATA-OVERLAYS.md) |

## Charts

All 16 chart variants and the standalone dynamic tooltip were exercised at 390px dark and 1440px light: **34 specified cases**, each with successful latest evidence. [The chart report](OVERHAUL-CHARTS.md) preserves the initial hydration failure and bounded confirmations.

| Entry | Variants | Final specified cases | Behavior |
| --- | --- | ---: | --- |
| area-chart | linear, step, stacked | 6/6 | Real SVG geometry, pointer/keyboard tooltip, legend removal, visible data table; default also updated/zero/missing/empty data |
| bar-chart | grouped, stacked, horizontal | 6/6 | Real SVG geometry, pointer/keyboard tooltip, legend removal, visible data table; default also updated/zero/missing/empty data |
| line-chart | linear, smooth, step | 6/6 | Real SVG geometry, pointer/keyboard tooltip, legend removal, visible data table; default also updated/zero/missing/empty data |
| pie-chart | pie, donut | 4/4 | Real SVG geometry, pointer/keyboard tooltip, legend removal, visible data table; default also updated/zero/missing/empty data |
| radar-chart | polygon, rounded, grid | 6/6 | Real SVG geometry, pointer/keyboard tooltip, legend removal, visible data table; default also updated/zero/missing/empty data |
| radial-chart | full, semicircle | 4/4 | Real SVG geometry, pointer/keyboard tooltip, legend removal, visible data table; default also updated/zero/missing/empty data |
| chart-tooltip | controlled | 2/2 | Pointer/focus context, bounded placement and Escape |

## Cross-cutting evidence

- Dark popup readability, topmost hit testing, local transform origins and Escape/focus return: [forms/navigation](OVERHAUL-FORMS-NAV.md) and [data/overlays](OVERHAUL-DATA-OVERLAYS.md).
- Motion springs, nine selection presets, native document/region scrolling, ShapeMorph and real exit retention: [motion](OVERHAUL-MOTION.md).
- Theme crossfade interruption, sun/moon path interpolation, native icon contracts, additive Card depth, distinct Spinner point geometry and quiet/offscreen states: [primitives](OVERHAUL-PRIMITIVES.md).
- Fourteen compositions with 205-character prose and a 186-character unbroken filename at 320px in both themes: **28 final cases** in [long content](OVERHAUL-LONG-CONTENT.md).
- Root integration also checked 40 layouts at 320/768px for Alert, AnimatedIcon, Attachment, Empty, InputGroup, Presence, Shape, Tabs, Textarea and ThemeToggle, plus eight AgentChat/MessageScroller layouts and their actual controls.
- Agent chat reuses Bubble, Avatar, InputGroup/Input, Button, Attachment, Questionnaire and MessageScroller. Permission, denial, cancel, attachments, options and retry have reachable local-demo outcomes: [agent report](OVERHAUL-AGENT.md).

## Interpreting completion

A passing settled screenshot does not establish smooth motion or correct exits. Passive primitives use the shared type, spacing, color and geometry language; their removal belongs to the consumer that owns the conditional. `MotionPresence` must remain mounted around keyed `MotionSurface` children. Radix overlays retain their native focus/presence contract through the shared Motion adapter. No claim is made that a component can animate its own parent after that parent is removed.

The source has been reviewed against the supplied direction. There is no invented approved composition or formal visual-quality acceptance record. The final integration and publication status belongs in [OVERHAUL-REPORT.md](OVERHAUL-REPORT.md), not in the older 0.1.0 release report.
