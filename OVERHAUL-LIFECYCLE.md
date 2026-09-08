# Library lifecycle acceptance checklist

This is a finite follow-up to the 68-entry scope in `verification/overhaul-scope.json`, including the new AgentChat composition. It inventories visible structures whose conditional membership is owned by the library. It does not reinterpret text, numeric values, selected glyphs, native OS option menus, or caller-owned removal of a passive component as missing library boundaries.

An `exit` prop cannot retain its own unmount. The persistent parent must retain the keyed child through `MotionPresence`, or a native primitive must retain it while the shared Motion lane runs. Radix Presence alone does not produce a visible exit: it needs a distinct closing animation or a compatible retention adapter. The shared `useFlowAppearance` adapter uses a nonvisual CSS sentinel for Radix retention and Motion for visible paint. Off and reduced motion intentionally remove without a visible transition.

| Acceptance path | Owner | Implementation and required confirmation | Status |
| --- | --- | --- | --- |
| Collapsible close | motion_scroll | Remove forced `display:none`; use the shared lane and native Radix retention. Keyboard open/close, retained visible midpoint, final hidden children, rapid reversal, Off/reduced at 390/1440. | Accepted: 48-case verified native/AgentChat gate |
| Dialog / AlertDialog / Drawer / Sheet scrim close | motion_scroll | Replace entry-only scrim CSS with an opacity-only shared lane. Retain the actual scrim through close, restore trigger focus, keep a fixed full-viewport veil without translation/scale. Off/reduced at 390/1440. | Accepted: 48-case verified native/AgentChat gate |
| NavigationMenu content and viewport | motion_scroll | Use the native value and item identities for shared retained presence, including items mounted inside the viewport. The registered native Content is retained by `usePresence`; its shared Motion lane calls `safeToRemove` on completion. Open/close, item switch, Escape focus return, rapid reversal, Off/reduced at 390/1440. | Accepted: 48-case verified native/AgentChat gate |
| AgentChatOptions / AgentChatProgress generated rows | motion_scroll | Keep keyed option and step membership under external MotionPresence. Preserve label/radio and ol/li semantics; exiting controls inert and hidden to accessibility APIs. | Accepted: 48-case verified native/AgentChat gate |
| DataTable visible rows and filtered-empty panel | agent_workspace | Hold actual filter/page/data membership at `TableBody` and empty-panel boundaries. Preserve table semantics and disabled/inert exits. Do not animate plain cell text updates as removals. | Accepted: native rows, stable source IDs, filter/page/empty, rapid reversal, quiet modes |
| Command / Combobox filtered result membership and Empty | agent_workspace | Preserve cmdk filtering, ranking, registration, keyboard selection and focus. Its persistent results surface receives coordinated paint; individual internally removed options are not retained. | Accepted with documented native filtering boundary |
| Pagination generated pages and ellipses | agent_workspace | Retain keyed generated range membership when page navigation changes the range. Preserve nav/list/button semantics and clear current-page labeling on exiting links. | Accepted: retained range membership, pointer/keyboard and quiet modes |
| Calendar month day-grid replacement, including DatePicker | docs_craft | Animate the actual changing month/day grid while preserving DayPicker keyboard/date semantics. The default DayPicker `animate` option is false; caption text alone is not the target. | Accepted: Chromium 1440/light + WebKit 390/dark |
| Button loading indicator | docs_craft | Hold the locally conditional busy indicator under a persistent boundary; preserve button children, accessible busy/disabled behavior and focus. | Accepted: Chromium 1440/light + WebKit 390/dark |
| Cartesian inspection crosshair and active dots | root | Hold hover/focus-created crosshair/dot removals; the existing coordinate spring only covers movement while mounted. | Accepted: root browser gate |
| Individual bar data records and radar points | root | Retain data-record membership inside an existing series; a series-level AnimatePresence does not retain an independently removed child mark. | Accepted: root browser gate |

## Existing coverage by family

| Family | Current boundary coverage |
| --- | --- |
| Overlay content | Dialog, AlertDialog, Drawer, Sheet, Popover, HoverCard, Tooltip, Select, Combobox content, ContextMenu, DropdownMenu, Menubar and submenu content use shared Motion appearance with native Radix retention. CommandDialog and DatePicker compose these content primitives. Toast uses its native open-state boundary. Scrims and NavigationMenu are the explicit follow-up rows above. |
| Tabs and disclosure | TabsContent has external MotionPresence around the selected native force-mounted panel; explicit caller `forceMount` remains caller-controlled. Collapsible has the explicit follow-up row above. Sidebar/resizable changes retain their DOM and are not parent-removal boundaries. |
| AgentChat | Attachment tray, individual attachments, composer errors, and pending/allowed/denied permission branches already have keyed external boundaries. AgentChatMessage supplies states; the example thread owns keyed message insertion/removal. Generated options/progress rows are the explicit follow-up above. |
| Charts | ChartFrame plot/empty swap, chart tooltip and tooltip rows, Cartesian/radar series, and pie/radial slice membership have AnimatePresence. Data geometry updates animate existing marks. The inspection/individual-mark gaps above are narrower than those covered parent boundaries. |
| Search, data and calendar | DataTable, cmdk search results, generated pagination and month-grid changes are tracked explicitly above. NativeSelect delegates its OS popup/options to the browser; no AnimatePresence wrapper is required there. |
| Passive atoms and composition | AspectRatio, Card, Separator, Breadcrumb, Alert, Badge, Empty, Avatar, Bubble, Item, Kbd, Marker, Table, Typography, foundational form parts, Attachment, Message and Questionnaire mostly render caller-supplied children. Consumers must keep a MotionPresence boundary outside their own conditionals to animate removal. Loading/status/value paint and native loading/focus details are not claimed as separate retained-unmount coverage. Spinner, Skeleton, icons, shapes and TextReveal retain their separate tested motion policies. |
| Scrolling | ScrollArea delegates native scrolling/thumb visibility to Radix; PageScrollBar and MessageScroller preserve document/viewport scroll behavior. These retain their structural roots and do not create a message-removal boundary for caller children. |

The docs preview/variant boundary and the authored Alert, Empty, Attachment, saved-Textarea and AgentChat example conditionals were separately integrated with MotionPresence. This does not imply arbitrary external consumer conditionals inherit exit retention automatically.

## Evidence

Motion-owned follow-up proof is in `scripts/check-overhaul-lifecycle.mjs` and `output/playwright/overhaul-lifecycle/results.json`. It uses an isolated in-memory source fixture in an independent Chromium browser against the running docs CSS, without a Next or registry build. Each assigned family is checked at 390 and 1440 pixels in active, Off and reduced motion. The canonical `verified-results.json` contains 48/48 passing cases with no browser errors. The initial 48-case run passed 44; a targeted six-case inline NavigationMenu confirmation covers the final quiet-removal fix, and those matching cases are promoted into the verified file. Raw runs remain available. Other owners must supply their own evidence before their rows are accepted.

Chart owner reported 6/6 lifecycle cases at `output/playwright/overhaul-chart-lifecycle/results.json`: active/Off/reduced × 390/1440, covering bar/radar record exits and rapid reversal plus crosshair/dot exits. Its separate variant-context gate passed 32/32 with console errors captured.

Reproduce the native and AgentChat membership checks from the repository root with:

```sh
rtk proxy node scripts/check-overhaul-lifecycle.mjs --url=http://127.0.0.1:4320/sahajiv-ui
```

Optional `--widths=390,1440`, `--modes=active,off,reduced`, `--only=navigation-inline` and `--output=...` narrow the same checks. No generated registry or Next build is required.

Motion-owned source freeze: `motion/flow.ts`, `motion/use-flow.ts`, `ui/collapsible.tsx`, `styles/collapsible.css`, `ui/navigation-menu.tsx`, `styles/navigation-menu.css`, `ui/agent-chat.tsx`, and the four modal UI/CSS pairs (`dialog`, `alert-dialog`, `drawer`, `sheet`). The shared engine change adds the optional opacity-only `fade` kind; existing `grow`/`enter` callers retain their contracts. NavigationMenu needs its public `presence` registry dependency. Native inline and viewport content, modal focus return, rapid reversal, exact quiet removal, and exiting AgentChat row inertness/ol-li semantics passed. Typecheck, scoped ESLint, `git diff --check`, and 11 focused choreography/AgentChat tests passed. No full build or registry generation was run by this stream.

Calendar/Button owner reported accepted receipts at `output/playwright/calendar-button-lifecycle/final/results.json`, reproduced by `scripts/check-calendar-button-lifecycle.mjs`: Chromium 1440/light and WebKit 390/dark, retained old month snapshots with aria-hidden/inert and no duplicate IDs, a real animated week-grid box, pointer/Enter navigation, rapid reversal, retained loader exit, stable native Button identity/height, and immediate reduced/global Off/Flow Off behavior. The separate final dark Button paint comparison passes intended busy/idle endpoints in active and Flow Off.

Data lifecycle evidence is documented in [OVERHAUL-DATA-LIFECYCLE.md](OVERHAUL-DATA-LIFECYCLE.md) and reproduced by `scripts/check-overhaul-data-lifecycle.mjs`. The final two-context checks preserve `tbody > tr > td`, row callbacks and keyboard actions, source-index identities, current-page semantics, custom cmdk filtering/keywords/forceMount/shouldFilter behavior and immediate quiet modes. Ten final screenshots were inspected. The results-surface transition is an explicit boundary, not a claim of retained per-option exits.
