# Interactive bounded closeout

Frozen revision: e29d0f665c09d8bb5a685237a2e91cfa970c6901. Latest main was merged once before both runs. Both report the same candidate source hash, ad0ae11ba614602076a2dbec4734e8d0b9b64e4be552bba97acc612aa6c70c92, unchanged throughout.

Exactly 18 requested comparisons ran: six previously source-unstable Tabs light-on cases, plus DatePicker open in both themes at 360, 390, 768, 1024, 1440, and 1920 px. Each fixture retained sequential independent A/A/B/B reloads, fonts-ready settling, and decoded-pixel self checks. The two families ran concurrently on separate ports. No other family or state was rerun.

| Family | Rows | Outcome | Style deltas | Self-instability | Runtime errors | Measured interval |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| tabs | 6 | 6 PASS / 0 FAIL | 0 | source 0, candidate 0 | 0 | 14.762 s |
| date-picker | 12 | 0 PASS / 12 FAIL | 0 | source 0, candidate 0 | 0 | 40.561 s |

Runtime intervals use output-directory creation through final report write, including Vite/browser initialization and sampling but excluding process startup and final browser/server cleanup. Exact UTC boundaries and ports are in interactive-closeout-summary.json. Tabs exited 0; DatePicker exited 1 because all twelve visual comparisons failed. No runtime exception occurred.

Tabs: default-default-on-720x320.html now passes all six widths in this one repeat, with both source and candidate agreeing on decoded pixels and raw PNG bytes. Computed-style differences remain zero. Each source/candidate frame retains exactly 40 differing pixels, identical to the earlier failed self-stability receipt (0.012346% at 360 down to 0.002315% at 1920). This is below the existing 0.1% gate threshold, not exact pixel identity. The earlier six source-unstable rows are preserved; this repeat does not establish that the source can never vary.

DatePicker: all twelve actual-open rows remain FAIL despite zero differences among sampled computed properties. Source and candidate decoded-pixel self agreement is stable in every row. Light390 has a source raw PNG hash mismatch despite zero decoded-pixel self difference; this is retained explicitly in the raw receipt. Candidate raw bytes agree in every row. Light visual differences range 0.187905–2.440123%; dark differences range 0.192188–2.646605%.

DatePicker uses each paired authored rest fixture, then the same real click on [data-datepicker] > button after boot and before the width sweep. The source isolation places its 340px popup at left:0 beneath the trigger (reference/sahajiv-handoff-v4/isolation/date-picker/default-default-rest-480x520.html:5). Existing screenshots at360 show source overflow to the right and Radix collision adjustment into the viewport. Desktop screenshots also retain visible differences in calendar internals, including navigation chrome and day positioning; the DatePicker sampled part set does not resolve all of those descendant differences. Zero sampled style deltas therefore does not mean exact geometry or whole-scene fidelity. The prior post-default-fix360 pixel values are reproduced exactly.

No source bug or health-line difference is accepted by this closeout. No production, trigger CSS, fixture, shared motion, or harness edit was made. Foundation anchor review remains with root. The previous raw receipts remain unchanged; their paths and hashes are retained in the summary.

Receipts: interactive-closeout-tabs-receipt.json and interactive-closeout-date-picker-receipt.json. Generated gate reports retain every row, candidate hash, and action metadata. Failure PNGs remain in artifacts/interactive-closeout-date-picker/.
