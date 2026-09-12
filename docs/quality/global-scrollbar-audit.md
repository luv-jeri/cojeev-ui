# Global scrollbar coverage

Status: shared policy and explicit public-catalogue owners migrated. Updated 2026-09-11 after final recovery. The rendered 172-route scan finds only the intentionally native Select list outside the managed system. Hidden interactive states, private administration and browser-owned widgets are not implied by that scan.

## Policy

The app mounts one `ScrollbarProvider` in `app/layout.tsx`. It sets the shared managed appearance to a 4px, theme-coloured, organic thumb and exposes the same size and colour as root CSS variables. `ScrollArea` and `PageScrollBar` inherit that policy automatically; their existing `scrollbarSize`, `scrollbarColor` and `scrollbarVariant` props remain local overrides. A standalone `ScrollArea` or `PageScrollBar` keeps its compatible 6px organic default.

The provider is an outer application provider, not a DOM wrapper. Nested providers scope managed component overrides through React context and do not rewrite the root native policy.

## Actual coverage

There are two honest rendering levels:

- **Organic custom thumb:** `PageScrollBar`, `ScrollArea` and explicit element/textarea adapters. Public callers include the docs shell (with a thicker 6px navigation thumb), code/API tables, form menus, Command search, chart tables, dialogs, Linear Modal, Motion Drawer panes, Hover Card, reading/carousel/milestone layouts, icon/shape trays and the reporting form/review source. The final sweep migrated Dock, Resizable panes, the ScrollReveal specimen and the embedded icon-pack grid. Table filters now wrap instead of introducing an accidental tiny scrollport; nested Preview controls fit their available width. Native scroll owners remain underneath the decorative contour. A shared migration does not certify every consumer's unrelated interactions.
- **Styled native fallback:** any unadapted overflow below `html[data-scrollbar-policy="cojeev"]` inherits theme colour and width, but this is not an organic SVG thumb. Private feedback administration and browser-owned widgets remain outside the public-catalogue certification. Arbitrary future caller-supplied overflow is not automatically converted. No global DOM wrapping or reparenting was introduced.

Motion Drawer native API/stack tests and focused consumer tests pass. Dock's own viewport preserves inherited RTL, keyboard focus and button identity; its new scroll owner does not translate the native controls. Resizable panes retain their panel/ref API and child state. ScrollReveal keeps its actual scroll-target ref, so native wheel movement still drives progress.

Textarea examples now use TextareaScrollArea/ElementScrollBar, attaching the shared organic thumb to the actual native textarea. Native refs, caret/selection, resize and form values remain intact. Controlled text and native input events refresh the measured range; no idle loop or arbitrary DOM reparenting. The mount marker is reference-counted and restored on cleanup. Unwrapped horizontal overflow deliberately falls back to native bars on both axes; forced-colours also retains native scrolling. Other uses of plain Textarea are not automatically migrated.

The public reporting Details field also uses the textarea adapter; its explicit accessible-label association excludes the custom scrollbar's numeric value. Diagnostic and review source use a bounded owned viewport with selectable code. Native editing, focus, form values and the disconnected-send boundary pass. Overlay focus management, virtual/composite list ownership, table sizing, scroll snap, native code selection and third-party semantics were preserved through explicit owners, not inferred from global CSS.

## Performance and lifecycle

- The root provider writes two CSS variables only when its appearance configuration changes. It adds no layout element and no subtree observer.
- `PageScrollBar` measures the document through `ResizeObserver` on the document, body and rail, plus event-driven scroll and viewport resize updates. Updates are coalesced to one animation frame; there is no idle animation-frame loop and no whole-body `MutationObserver`.
- `ScrollArea` keeps Radix's native viewport and event-driven feedback. It does not poll and does not create a second scroll owner.
- Before hydration, the document shows the native themed fallback. While `PageScrollBar` is mounted, the native document bar is suppressed on both `html` and `body`. Managed Radix viewports likewise hide their native bar, including the WebKit pseudo-element, so a custom and native bar do not paint together.

## Platform limits

Native fallback scrollbars are not the SVG organic contour. Browser engine, operating-system overlay-scrollbar preferences and forced-colour settings control how much native scrollbar styling is honored. The policy deliberately does not claim identical scrollbar geometry inside browser-owned widgets, native select popups, cross-origin/third-party frames or shadow roots that do not inherit application CSS. Those controls keep their platform semantics.

## Focused verification

Final recovery evidence is in `output/playwright/recovery-20260911-visual-revision/final-integration/`:

- `scripts/audit-owned-scrollports.mjs --all`: 172 public documentation routes at 390×900, 670 rendered overflow observations; only the native Select list is unmanaged. Receipt: `owned-scrollports-all.json`. This enumerates defaults and rendered galleries; it does not interact with every hidden popup or exercise every scroll thumb.
- `tests/owned-scroll-interactions.browser.mjs`: real Resizable keyboard/drag with retained children and wheel scrolling, ScrollReveal native-wheel progress/quiet mode, long reporting textarea editing/accessibility and selectable review-source scrolling.
- Native Dock suite: RTL, focus/disabled/proximity callbacks, stable targets and viewport bounds at 1200/360px. Actual docs checks verify the five final migrated/overflow-corrected component routes.
- Fresh docs compact-navigation, workbench and reporting-stack checks retain route/focus, configuration, independent draft/file/review state and disconnected sending. Full source TypeScript, focused lint and the final 33-test foundation batch pass.

Earlier focused gates below remain family-specific evidence rather than a newly rerun whole-application suite:

- `npx tsx --test tests/scroll-appearance.test.ts`: shared inheritance, local overrides and size clamping.
- `node tests/scroll-appearance.browser.mjs`: 24px managed hit rails, 2px visual override and vertical/horizontal drag.
- `node tests/global-scrollbar.browser.mjs`: root policy, native fallback keyboard scrolling, hidden native bars for managed owners, one page rail, content-growth measurement, PageScrollbar keyboard control and drag at 390px.
- `node tests/textarea-scroll.browser.mjs`: native textarea identity/editing/ref/form/resize; managed Home/End/drag, native and controlled content growth; horizontal/forced-colour native fallback and StrictMode cleanup. Actual textarea docs exercise the same owner.
- Foundation batch: `tests/table-scroll.test.ts` and `tests/table-scroll.browser.mjs` pass native viewport ref/callback identity, explicit RTL direction, negative horizontal offsets, keyboard scrolling and real thumb drag for API tables and the reading specimen at 390px light/dark. Pagination flicker remains a separate retained task.
