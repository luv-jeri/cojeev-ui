# Interactive29 complete isolation matrix checkpoint

Revision bda75de with harness040fefa. Three independent Vite/browser processes (ports4342–4344), each sequential A/A/B/B, six widths360/390/768/1024/1440/1920. Exact unaffected six-width files were reused only from the prior fixed receipt. All924 authored rows across29 families were sampled. This is a visual isolation checkpoint, not a claim that all behavior or source defects are resolved.

656 exact;714 PASS under the existing0.1% pixel threshold;204 FAIL;6 unstable source captures. Of the PASS rows,36 Select/Combobox/DatePicker open-labeled cases only compare their actual closed bootstrap state: they are explicitly pending real-open coverage and are superseded by root3dfedc9 trigger runs.

| Family | Rows | Exact | PASS | FAIL | Source unstable | Pending actual open |
|---|---:|---:|---:|---:|---:|---:|
| accordion | 24 | 24 | 24 | 0 | 0 | 0 |
| alert-dialog | 24 | 12 | 12 | 12 | 0 | 0 |
| calendar | 24 | 0 | 0 | 24 | 0 | 0 |
| checkbox | 48 | 48 | 48 | 0 | 0 | 0 |
| collapsible | 24 | 24 | 24 | 0 | 0 | 0 |
| combobox | 24 | 24 | 24 | 0 | 0 | 12 |
| command | 12 | 12 | 12 | 0 | 0 | 0 |
| context-menu | 24 | 12 | 12 | 12 | 0 | 0 |
| date-picker | 24 | 24 | 24 | 0 | 0 | 12 |
| dialog | 24 | 12 | 12 | 12 | 0 | 0 |
| drawer | 24 | 12 | 12 | 12 | 0 | 0 |
| dropdown-menu | 24 | 12 | 12 | 12 | 0 | 0 |
| hover-card | 24 | 0 | 12 | 12 | 0 | 0 |
| input-otp | 12 | 12 | 12 | 0 | 0 | 0 |
| menubar | 24 | 12 | 12 | 12 | 0 | 0 |
| navigation-menu | 24 | 24 | 24 | 0 | 0 | 0 |
| popover | 24 | 12 | 12 | 12 | 0 | 0 |
| radio-group | 36 | 36 | 36 | 0 | 0 | 0 |
| resizable | 24 | 24 | 24 | 0 | 0 | 0 |
| scroll-area | 24 | 0 | 24 | 0 | 0 | 0 |
| select | 36 | 24 | 24 | 12 | 0 | 12 |
| sheet | 24 | 12 | 12 | 12 | 0 | 0 |
| slider | 12 | 12 | 12 | 0 | 0 | 0 |
| switch | 36 | 30 | 30 | 6 | 0 | 0 |
| tabs | 108 | 90 | 102 | 0 | 6 | 0 |
| toast | 24 | 12 | 12 | 12 | 0 | 0 |
| toggle | 144 | 120 | 126 | 18 | 0 | 0 |
| toggle-group | 24 | 8 | 8 | 16 | 0 | 0 |
| tooltip | 24 | 12 | 16 | 8 | 0 | 0 |

Confirmed local corrections in progress: Calendar selected week padding lost to semantic table reset; Toggle circle dark source selection precedence; Switch disabled checked dark specificity after :has(input) translation; Tooltip8px authored offset; Drawer source dockpanel title typography. The complete receipts remain untouched so improvements can be compared against actual failing evidence.

Unresolved classification:

- Source lifecycle conflict: morph.js326 calls unavailable window.VAlive when opening hidden descendants. Actual Dialog/AlertDialog have only close-border and inner-control transition differences after the geometry/type correction. Toast light pixels are exact but action transition differs. Production hooks remain active.
- Source positioning conflict: unlayered flow.css :where(.v-glide){position:relative} overrides authored absolute menu positioning. Dropdown/Context/MenuBar open scenes grow source ancestors in normal flow while real Radix portals remain anchored. The report does not mark those scenes passing.
- Sheet and HoverCard include health-line, an explicitly excluded composite (HANDOFF D11 / AGENT-BRIEF28–30). Its font/layout mismatch propagates into container geometry. The full scenes remain failing; a separately recorded same-base-children scope fixture is root-owned.
- ToggleGroup generated on fixture puts two aria-pressed=true items in a declared single group. Source boot retains both until a real selection event; Radix single semantics retain one. Preserve this invalid source evidence and verify real selection separately.
- Tabs default light on has six oracle-unstable rows; candidate is stable. Other default light rows have tiny pixel differences. ScrollArea has zero sampled style differences with small pixel differences; neither family is labeled pixel-exact.
- ToggleGroup circles have zero computed differences in rest but thin rim pixel differences. Investigate generated body paint before changing CSS.

Machine summary: .work/interactive-full-matrix-summary.json. Full styles, statePreparation, oracle/candidate stability and image evidence are in the four artifacts directories named in that summary. No original reference files were edited.
