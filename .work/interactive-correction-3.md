# Interactive correction checkpoint3

Source evidence and bounded corrections:

- Calendar: patterns.css99 selected week-number padding6px wins over unselected padding. Removed generated table-reset specificity that erased it; all sampled styles now match.
- Toggle: components-2.css1359 circle selection has authored important precedence. Exclude circles from the generic late dark selection override; dark Circle states now exact without introducing important.
- Switch: source :has(input:disabled:checked) carries one type-selector more specificity than the dark base. Restore disabled+checked dark precedence after translating to real Radix data attributes; exact.
- Tooltip: ui.js176 uses an8px gap, now the public default. The remaining tiny pixels require separate paint diagnosis.
- Drawer: source title is patterns.css71 v-dockpanel__title, not the dialog section heading. Restore the authored centered lead typography and remove un-authored overflow/max-height. Height delta is gone; close timing still reflects the documented hidden-descendant source lifecycle defect.
- Shared flow exception explicitly requested by root: include selected .v-quest__opt under the exact dark beige precedence from alive.css529. Added .v-quest__opt and .v-quest__opt-body to sampled Questionnaire parts; root owns final Questionnaire run.

Focused registry+gate TypeScript passes; changed TSX ESLint passes. Five-family bounded360px recheck:

| Family/file | Verdict | Style deltas | Pixel difference |
|---|---|---:|---:|
| calendar/default-default-rest-480x480.html | PASS | 0 | 0.0318% |
| calendar/default-default-rest-dark-480x480.html | PASS | 0 | 0.0228% |
| calendar/default-default-selected-480x480.html | PASS | 0 | 0.0318% |
| calendar/default-default-selected-dark-480x480.html | PASS | 0 | 0.0228% |
| toggle/circle-default-rest.html | PASS | 0 | 0.0000% |
| toggle/circle-default-rest-dark.html | PASS | 0 | 0.0000% |
| toggle/circle-default-disabled.html | PASS | 0 | 0.0000% |
| toggle/circle-default-disabled-dark.html | PASS | 0 | 0.0000% |
| toggle/circle-default-on.html | PASS | 0 | 0.0000% |
| toggle/circle-default-on-dark.html | PASS | 0 | 0.0000% |
| switch/default-default-disabled-dark.html | PASS | 0 | 0.0000% |
| tooltip/default-default-open.html | PASS | 0 | 0.0475% |
| tooltip/default-default-open-dark.html | PASS | 0 | 0.0481% |
| drawer/default-default-rest-480x480.html | PASS | 0 | 0.0000% |
| drawer/default-default-rest-dark-480x480.html | PASS | 0 | 0.0000% |
| drawer/default-default-open-480x480.html | FAIL | 1 | 1.2605% |
| drawer/default-default-open-dark-480x480.html | FAIL | 1 | 1.1401% |

Full29-family frozen matrix is documented in .work/interactive-full-matrix-report.md with machine summary. No full matrix was repeated; prior exact Toggle/Switch/Tooltip files were skipped. These bounded fixes do not resolve or hide the recorded source lifecycle, in-flow menu, invalid single-group initial state, or excluded health-line conflicts.
