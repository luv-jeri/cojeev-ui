# Full composed isolation diagnostic and correction batch

Frozen implementation: 9b12add. Candidate source SHA-256: 6cf3605c59380cd5ed7060ddea5a5c74d27b328c650c8bd48ca3d5e767ae7a90. Both segments report unchanged source.

All 60 supplied isolation pages across six widths were measured: **360 unique rows, 274 PASS, 82 FAIL, 4 HARNESS_UNSTABLE**. The first segment stopped at the first dark ButtonGroup failure. Its completed Attachment/Breadcrumb rows are combined with the full remaining-16-family continuation, which explicitly continued through independent failures. Seven repeated early ButtonGroup rows remain in the original evidence; the combined result contains each manifest row exactly once.

| Family | Pass | Fail | Unstable |
| --- | ---: | ---: | ---: |
| attachment | 12 | 0 | 0 |
| breadcrumb | 24 | 0 | 0 |
| button-group | 6 | 18 | 0 |
| carousel | 12 | 0 | 0 |
| chart | 12 | 0 | 0 |
| data-table | 8 | 16 | 0 |
| dropzone | 12 | 0 | 0 |
| field | 24 | 0 | 0 |
| input | 36 | 0 | 0 |
| input-group | 0 | 12 | 0 |
| message-scroller | 12 | 0 | 0 |
| native-select | 18 | 6 | 0 |
| pagination | 24 | 0 | 0 |
| questionnaire | 6 | 18 | 0 |
| sidebar | 24 | 12 | 0 |
| stepper | 24 | 0 | 0 |
| table | 12 | 0 | 0 |
| textarea | 8 | 0 | 4 |

Evidence: artifacts/gate-composed-full-frozen/combined-results.json and summary.json. Raw segments and screenshots remain in gate-composed-full-frozen and gate-composed-full-continuation. All states are static reduced-motion samples; live and keyboard proof remains separate. Dropzone now passes against the recorded original-alive-runtime loader adapter, without changes to the reference files.

Deduplicated causes and owned corrections:

- ButtonGroup: the Item added an unsourced ghost variant; selected styling was disabled whenever the group had a travel layer, which also removed the other explicitly selected source-fixture label. Restore the default Button variant and authored selected context. Preserve the source dark pink selected border and the later utility ink text rule despite component-sheet ordering. The underlying shared Button slot selector requires the separate Button owner correction so composed Buttons inherit all authored states.
- DataTable: source components.css:186–194 applies horizontal filter scrolling and 2px bottom padding only up to640px. The port applied them at every width, adding2px to desktop filter and table height. Restore the exact media boundary.
- InputGroup: the shared Button icon alias already fixes the Invite glyph/width. Source patterns.css:42 raises only dashed scope badges to26px; restore this and the full search/scope specificity needed to keep their authored transparent background in dark mode. The default embedded Button dark rule needs the same shared slot correction as ButtonGroup.
- NativeSelect: dark default host used --v-beige-2 rather than the computed source --v-beige. Restore the source token.
- Sidebar: viewport width:auto, introduced for the authored expanded intrinsic width, also overrode the mini token width. Limit auto width to expanded viewport layout; collapsed retains --sidebar-w-mini.
- Questionnaire: the checked fixture contains two checked native radios, and the browser chooses the last; the shared RadioFixture chooses the first attribute. The interactive owner is correcting that fixture. Its dark selected radio host also differs under the original full-cascade background priority; shared RadioGroup/flow ownership is coordinated with root.
- Textarea: four light rows had reload self disagreement, while cross images differed by0–2pixels and computed styles were exact. This remains a harness finding pending a bounded identical-case recheck; no product change is inferred.

The owned CSS/TSX batch passes focused registry/fixture typecheck, changed TSX ESLint, CSS parsing with no important declarations, and whitespace checks. DataTable affected light/dark rest cases now pass all six widths with zero computed and pixel differences. Other changed-case verification follows the shared Button integration; this checkpoint does not claim those failures closed yet. The full-cascade blob-effects discrepancy remains open; engine-only parity remains separate.


## Affected-case verification after the batch

The follow-up checks pass 72 distinct targeted rows using the existing comparator and source self-agreement protocol: DataTable rest/light+dark12; NativeSelect default dark6; Sidebar collapsed/light+dark12; Textarea light6; ButtonGroup all four supplied states24; InputGroup light+dark12. These are affected-case checks on the integrated corrections, not a new all360 snapshot. DataTable on-state pages shared the corrected media rule and were not redundantly re-run. The historical360-row diagnostic remains unchanged.

All targeted visible computed styles are exact. DataTable, NativeSelect, Sidebar, and light ButtonGroup comparisons have zero pixel differences. ButtonGroup dark retains small comparator deltas up to0.0179%; InputGroup up to0.0003%; Textarea up to0.0002%. These are within the pre-existing gate limit and are reported rather than described as zero. Textarea A/A and B/B now agree at every width without a product change; its original four unstable rows remain in the historical artifact.

The last ButtonGroup on-state failures were a fixture issue: it deliberately removed every source aria-pressed attribute, reducing the two-pressed authored initial fixture to one. ButtonGroupFixture now preserves the initial attributes, then yields selection to the real production callback after the first action. A native browser pointer click on Month and keyboard Enter on Today exactly match original source pressed/active arrays, starting from the two-pressed fixture. Both sides report zero runtime errors. No new public API or substitute event behavior was introduced.

Targeted artifacts are in gate-composed-batch-data-table, gate-composed-batch-native, gate-composed-batch-sidebar, gate-composed-textarea-self-recheck, gate-composed-batch-buttons, and gate-composed-button-group-initial. The last directory also contains live-events.json. The intermediate ButtonGroup on failures are preserved in gate-composed-batch-buttons and superseded by the separately recorded final fixture check.

Remaining cross-owner work: Questionnaire's last-checked radio fixture and full-cascade dark selected-radio background are with the interactive owner. The full-cascade blob-effect discrepancy is still open; the earlier engine-style-only proof is separate. Actual docs Button pointer evidence remains the bounded measurement recorded in composed-field-motion-checkpoint.md, with higher docs workload and no reproduced frame stall.
