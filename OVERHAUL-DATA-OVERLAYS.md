# Data and overlay audit

September 8, 2026. Bounded source/style audit of all 31 assigned entries, preserving the parent stream's existing improvements. No registry generation, full build, commit or push was run by this stream.

## Evidence and limits

- Existing `scripts/check-docs.mjs` subset: 31 entries, 124 layout contexts (390/1440 × light/dark), all reported pass. All 31 source-preview controls passed; 21 active component behavior checks passed and 10 entries are passive.
- Final behavior checks for the 8 entries changed during the first run: 32/32 width/theme contexts and their component/preview controls pass. Receipts: `output/playwright/overhaul-data-overlays/results.json` and `output/playwright/overhaul-data-overlays-confirm/results.json`.
- Inspected desktop/light and mobile/dark screenshots for every entry, using `audit-sheet-1.png` through `audit-sheet-7.png`. Open-state screenshots were additionally inspected for alert-dialog, dialog, drawer, dropdown-menu, sheet, popover, toast, context-menu, hover-card and tooltip. These screenshots established actual overlay composition rather than just a closed trigger.
- Open-overlay capture: 19/20 initial contexts fit. Mobile context menu exposed a real 7px overflow because its 200px minimum exceeded the 193px available to the cursor's right. Content now respects Radix available width; targeted confirmation saved separately. Tooltip pointer entry into the tooltip itself remained visible in both tested contexts.
- Targeted browser assertions passed: nested data-table button click/Enter execute only the nested action, row Enter still selects, and a negative RTL scrollLeft reaches the table's logical end and clears the fade.
- Targeted SSR assertions passed: invalid aspect ratios, separator/resizable explicit horizontal precedence, and ChartRing no-table accessible description.
- Typecheck at this stream's audit point had one unrelated in-progress error in `app/workspace/page.tsx` (`Button asChild`); parent reports that error subsequently fixed. Parent owns the final integrated typecheck/build.
- Important gate limitation: `check-docs` can capture “Loading preview…” while reporting layout pass because it waits for the example wrapper. The marker 1440/light confirmation screenshot did so; the initial marker screenshots show the actual component. Parent was notified to tighten final readiness. Initial questionnaire 1440/light also requires final visual attention: its middle option looked blank in the contact sheet although the dark mobile screenshot and existing interaction test were readable.
- This pass does not prove every variant, long-content combination, submenu, or reduced-motion/Off lifecycle. Dynamic chart-suite requirements from the updated goal are assigned to the chart stream. Universal presence/motion and compound atomic reuse are tracked separately; existing Radix/atomic composition was preserved here.

## Per-entry ledger

Every row includes source and stylesheet inspection. Screenshots use `<id>-1440-light.png` and `<id>-390-dark.png` in the initial receipt folder; all four width/theme metric contexts were recorded. Active behavior details below state the actual checked actions, not inferred capabilities.

| Entry | Layout evidence | Pointer/keyboard or passive evidence | Source/style result |
| --- | --- | --- | --- |
| alert | 4/4 pass | Pointer dismissal and keyboard restoration | Reviewed existing source/styles; no additional change required in this bounded pass. |
| alert-dialog | 4/4 pass | Pointer/keyboard opening, focus inside, Escape, confirmation and restore | Reviewed existing source/styles; no additional change required in this bounded pass. |
| aspect-ratio | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Non-finite/zero/negative ratio now falls back to 16/9. |
| attachment | 4/4 pass | Real text download by pointer, keyboard removal and restoration | Reviewed existing source/styles; no additional change required in this bounded pass. |
| avatar | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Reviewed existing source/styles; no additional change required in this bounded pass. |
| badge | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Reviewed existing source/styles; no additional change required in this bounded pass. |
| bubble | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Reviewed existing source/styles; no additional change required in this bounded pass. |
| chart | 4/4 pass | Pointer reveals all three data tables; keyboard hides them; zero datum retained | Ring announces segment values without claiming a nonexistent table when showTable=false. Chart suite transferred to docs agent. |
| collapsible | 4/4 pass | Pointer expands and keyboard collapses content | Reviewed existing source/styles; no additional change required in this bounded pass. |
| context-menu | 4/4 pass | Pointer context menu action and keyboard context menu/Escape | Content respects actual available side width; all item types wrap, including submenu/check/radio items; explicit overlay layer. |
| data-table | 4/4 pass | Pointer and keyboard filters, numeric ascending sort, next page and row selection | Nested controls and prevented events do not activate row actions. Row Enter/Space remains supported. |
| dialog | 4/4 pass | Pointer rename/save; focus entry and restoration; keyboard opening/Escape | Reviewed existing source/styles; no additional change required in this bounded pass. |
| drawer | 4/4 pass | Pointer open/close and keyboard open/Escape | Dark-theme typography cascade now preserves dark ink on the light drawer surface. |
| dropdown-menu | 4/4 pass | Pointer checked item; keyboard menu opening/Escape | All item types wrap; explicit overlay layer. |
| empty | 4/4 pass | Pointer note creation; keyboard reset; partial/error/filtered states rendered | Partial-state heading/body uses readable ink on its tinted surface in dark mode; long text has width boundaries. |
| hover-card | 4/4 pass | Pointer hover and keyboard focus show card; Escape dismisses | Explicit overlay layer retained with viewport width/height boundaries. |
| item | 4/4 pass | Pointer and keyboard selection callbacks | Reviewed existing source/styles; no additional change required in this bounded pass. |
| kbd | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Reviewed existing source/styles; no additional change required in this bounded pass. |
| marker | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Success text uses the theme-aware semantic success foreground. |
| message | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Reviewed existing source/styles; no additional change required in this bounded pass. |
| popover | 4/4 pass | Pointer edit and keyboard opening/Escape | Reviewed existing source/styles; no additional change required in this bounded pass. |
| progress | 4/4 pass | Pointer and keyboard progress changes | Reviewed existing source/styles; no additional change required in this bounded pass. |
| questionnaire | 4/4 pass | Pointer and keyboard answers update completion and summary | Reviewed existing source/styles; no additional change required in this bounded pass. |
| resizable | 4/4 pass | Keyboard handle resize and pointer drag | Explicit horizontal orientation wins; duplicate panel padding removed after mobile screenshot showed text collapsing to letter columns. |
| separator | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Explicit orientation wins over variant; semantic and visual orientation agree. |
| sheet | 4/4 pass | Pointer preference toggle and keyboard opening/Escape | Reviewed existing source/styles; no additional change required in this bounded pass. |
| sidebar | 4/4 pass | Pointer navigation, keyboard collapse, collapsed accessible link and expansion | Reviewed existing source/styles; no additional change required in this bounded pass. |
| table | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Stable ref callback; negative RTL scrollLeft correctly clears the trailing fade; keyboard row focus has its own ring. |
| toast | 4/4 pass | Pointer save/undo; keyboard save and explicit dismissal | Danger uses the readable danger fill; long content wraps and action controls keep their width. |
| tooltip | 4/4 pass | Pointer hover and keyboard focus reveal tooltip; Escape dismisses | Hoverable tooltip content stays open under the pointer; long text wraps inside viewport. |
| typography | 4/4 pass | Static content; no component-owned interaction. Shared Preview controls tested independently. | Reviewed existing source/styles; no additional change required in this bounded pass. |

## Corrections after screenshot review

- Resizable: the initial mobile pane had 18/20px library padding plus 20px example padding, leaving roughly 29px for text. Panel now owns scrolling while composed content owns spacing. `resizable-mobile-final.png` shows ordinary word wrapping and both usable panes.
- Drawer: dark-theme global secondary typography outranked the component foreground on its light surface. A scoped override restores the correct ink.
- Context menu: uses the real available side width rather than forcing 200px near the cursor. Final targeted screenshots/boxes are in `corrections.json` and `<id>-correction.png`.

## Stable-file handoff

Changed this pass: `ui/aspect-ratio.tsx`, `ui/separator.tsx`, `ui/table.tsx`, `ui/data-table.tsx`, `ui/chart.tsx`, `ui/resizable.tsx`; styles for table, marker, empty, context-menu, dropdown-menu, hover-card, tooltip, toast, drawer and resizable. Chart source/style ownership has been released to the chart stream. Root owns final registry/consumer/build and universal lifecycle checks.

## Urgent dark overlay verification

After the user's dark-mode/stacking feedback, opened every assigned overlay type at 390 and 1440 pixels in dark mode with theme persisted before navigation, verified actual hydrated content, and saved fresh screenshots under `output/playwright/overhaul-dark-overlays/`. Inspected `sheet-0.png`/`sheet-1.png` containing all ten mobile open states. All twenty content-center hit tests land on the portal content or its descendants, with dropdown/context-menu/hover-card/popover at z45, dialogs at z40, drawer/sheet at z30 and tooltip at z60. Toast's viewport owns z50. This confirms standalone docs portal stacking; arbitrary nested overlays remain a separate integration case.

The drawer description had a real specificity collision with later dark typography. `.v-drawer` now gives the surface foreground rule precedence; `drawer-final-dark.png` verifies dark ink on its cream surface. Fresh measured default foreground/background pairs are #F6EFE2/#171512 for dark panels (15.93:1), #B5AC9E/#171512 for their body descriptions (8.12:1), and #111111/#FBF4E6 for inverted drawer/tooltip/toast text (17.25:1 before drawer's .85 text opacity; about11.52:1 after). Menu disabled text is #A79E90/#171512 (6.89:1). These are specific solid-color checks, not an automated full-page WCAG certification. Selected input text on pink selection remains a shared-theme concern passed to parent; no shared semantic token file was edited by this stream.

Entrance/exit migration of portal primitives is coordinated by parent and the shared motion stream; these dark screenshots are settled states and do not establish animation quality.
