# Default documentation screenshot review

Reviewed **77 / 77 components, 154 / 154 requested images**: desktop 1440px light and mobile 360px dark. These are the already-produced `artifacts/production-docs` screenshots; no additional broad browser gate was started. Each component was inspected once in paired contact sheets. Originals were opened for Accordion, Alert, ButtonGroup, Collapsible, NavigationMenu, RadioGroup, Resizable, Tabs and Sidebar where scale or a suspected issue needed confirmation.

This is a visual review of the captured default viewports, not every below-fold part, variant, open popup or interaction. Home, getting started and the new creative entries also receive separate runtime and responsive review. Screenshot hashes and exact per-entry coverage are in `verification/default-visual-review.json`.

## Concrete findings

1. **V1 — Alert:** `artifacts/production-docs/alert-360-dark.png`: status check is almost black on a dark alert surface and difficult to see. Fixed by this agent; focused evidence is in the focused contrast checks described in RELEASE-REPORT.md.
2. **V2 — Button Group:** `artifacts/production-docs/button-group-360-dark.png`: Day, Week and Month all have the same solid pink fill; the selected Week state is visually indistinguishable. The desktop light image clearly singles out Week. Fixed by this agent; focused evidence is in the focused contrast checks described in RELEASE-REPORT.md.
3. **V3 — Navigation Menu:** `artifacts/production-docs/navigation-menu-360-dark.png`: counts 12, 8 and 4 use near-white foreground on light-pink badges, impairing readability. Resolved in the release: existing accent ink and padded Tabs targets.
4. **V4 — Sidebar:** `artifacts/production-docs/sidebar-360-dark.png`: the pale collapse chevron on its pink button has very little visible contrast. Resolved in the release: existing accent ink and padded Tabs targets.
5. **V5 — Tabs:** `artifacts/production-docs/tabs-1440-light.png` and `tabs-360-dark.png`: default tab buttons lack padding; the selected pill hugs the text with a one-line-height target. Read-only source confirms dimensions exist only for explicit pills/lenses/underline classes; default TabsTrigger has none. Resolved in the release: existing accent ink and padded Tabs targets.

Card/Bubble contrast was already assigned and was not duplicated. Carousel inherits the known Card description contrast issue. No other new concrete layout/readability problem was identified in these captured default viewports. Horizontal cropping inside code/install blocks is their intentional scrolling behavior, not document overflow.

## Per-entry checklist

| Component | 1440 light | 360 dark | Note |
|---|---|---|---|
| accordion | Reviewed | Reviewed | No new issue seen |
| adjuster | Reviewed | Reviewed | No new issue seen |
| alert | Reviewed | Reviewed | V1: dark status glyph low contrast; fixed in the release |
| alert-dialog | Reviewed | Reviewed | No new issue seen |
| ambient-background | Reviewed | Reviewed | No new issue seen |
| animated-number | Reviewed | Reviewed | No new issue seen |
| aspect-ratio | Reviewed | Reviewed | No new issue seen |
| attachment | Reviewed | Reviewed | No new issue seen |
| avatar | Reviewed | Reviewed | No new issue seen |
| badge | Reviewed | Reviewed | No new issue seen |
| breadcrumb | Reviewed | Reviewed | No new issue seen |
| bubble | Reviewed | Reviewed | Previously assigned contrast issue, not duplicated |
| button | Reviewed | Reviewed | No new issue seen |
| button-group | Reviewed | Reviewed | V2: dark selected state indistinguishable; fixed in the release |
| calendar | Reviewed | Reviewed | No new issue seen |
| card | Reviewed | Reviewed | Previously assigned contrast issue, not duplicated |
| carousel | Reviewed | Reviewed | Card-derived contrast falls under existing assigned issue |
| chart | Reviewed | Reviewed | No new issue seen |
| checkbox | Reviewed | Reviewed | No new issue seen |
| code-block | Reviewed | Reviewed | No new issue seen |
| collapsible | Reviewed | Reviewed | No new issue seen |
| combobox | Reviewed | Reviewed | No new issue seen |
| command | Reviewed | Reviewed | No new issue seen |
| context-menu | Reviewed | Reviewed | No new issue seen |
| data-table | Reviewed | Reviewed | No new issue seen |
| date-picker | Reviewed | Reviewed | No new issue seen |
| dialog | Reviewed | Reviewed | No new issue seen |
| direction | Reviewed | Reviewed | No new issue seen |
| drawer | Reviewed | Reviewed | No new issue seen |
| dropdown-menu | Reviewed | Reviewed | No new issue seen |
| dropzone | Reviewed | Reviewed | No new issue seen |
| empty | Reviewed | Reviewed | No new issue seen |
| field | Reviewed | Reviewed | No new issue seen |
| hover-card | Reviewed | Reviewed | No new issue seen |
| icon | Reviewed | Reviewed | No new issue seen |
| input | Reviewed | Reviewed | No new issue seen |
| input-group | Reviewed | Reviewed | No new issue seen |
| input-otp | Reviewed | Reviewed | No new issue seen |
| item | Reviewed | Reviewed | No new issue seen |
| kbd | Reviewed | Reviewed | No new issue seen |
| label | Reviewed | Reviewed | No new issue seen |
| marker | Reviewed | Reviewed | No new issue seen |
| marquee | Reviewed | Reviewed | No new issue seen |
| menubar | Reviewed | Reviewed | No new issue seen |
| message | Reviewed | Reviewed | No new issue seen |
| message-scroller | Reviewed | Reviewed | No new issue seen |
| multi-select | Reviewed | Reviewed | No new issue seen |
| native-select | Reviewed | Reviewed | No new issue seen |
| navigation-menu | Reviewed | Reviewed | V3: pale count labels on pink; reported to root |
| pagination | Reviewed | Reviewed | No new issue seen |
| popover | Reviewed | Reviewed | No new issue seen |
| preview | Reviewed | Reviewed | No new issue seen |
| progress | Reviewed | Reviewed | No new issue seen |
| questionnaire | Reviewed | Reviewed | No new issue seen |
| radio-group | Reviewed | Reviewed | No new issue seen |
| resizable | Reviewed | Reviewed | No new issue seen |
| scroll-area | Reviewed | Reviewed | No new issue seen |
| select | Reviewed | Reviewed | No new issue seen |
| separator | Reviewed | Reviewed | No new issue seen |
| shape | Reviewed | Reviewed | No new issue seen |
| shape-scene | Reviewed | Reviewed | No new issue seen |
| sheet | Reviewed | Reviewed | No new issue seen |
| sidebar | Reviewed | Reviewed | V4: pale collapse chevron on pink; reported to root |
| skeleton | Reviewed | Reviewed | No new issue seen |
| slider | Reviewed | Reviewed | No new issue seen |
| spinner | Reviewed | Reviewed | No new issue seen |
| stepper | Reviewed | Reviewed | No new issue seen |
| switch | Reviewed | Reviewed | No new issue seen |
| table | Reviewed | Reviewed | No new issue seen |
| tabs | Reviewed | Reviewed | V5: default tabs have no padding; reported to root |
| text-reveal | Reviewed | Reviewed | No new issue seen |
| textarea | Reviewed | Reviewed | No new issue seen |
| toast | Reviewed | Reviewed | No new issue seen |
| toggle | Reviewed | Reviewed | No new issue seen |
| toggle-group | Reviewed | Reviewed | No new issue seen |
| tooltip | Reviewed | Reviewed | No new issue seen |
| typography | Reviewed | Reviewed | No new issue seen |

## Assigned fixes completed

V1 and V2 are corrected in the owned Alert/ButtonGroup files. A bounded two-family production fixture verified both themes, normal motion and Off, native pointer/keyboard selection, and all six Alert color variants. Final screenshot review also closed the adjacent dark-pink Alert description/ghost-action contrast issue; body paint and shared motion engines were unchanged. V3–V5 remain handed to root/other owners; this report does not claim they are fixed.
