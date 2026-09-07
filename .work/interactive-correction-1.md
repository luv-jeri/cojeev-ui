# Interactive visual correction batch 1

This is a correction checkpoint, not complete 29-component fidelity proof. Base captures use one authored fixture per component at360px under the existing sequential, repeated-sample gate.

Fixed fixture props removing Radix ARIA state, native Calendar weekday and selected-week bindings, original plain Tabs default plus explicit pills, Resizable v4 nested panel scope and explicit source height, cmdk group grid continuity, source input insets, and reduced-motion declaration semantics. Toast viewport mounting and closed HoverCard wrapper preserve authored fixture layout. Semantic metadata identifies Switch visible pseudo thumb and unsupported Chromium native slider pseudo computed styles.

Focused full registry+gate TypeScript compile and edited TSX ESLint pass. Full application typecheck is blocked only by this worktree's stale generated registry.json metadata; main regeneration owns that output.

|Component|Initial result|Correction result|Style differences|Pixel ratio|
|---|---|---|---:|---:|
|accordion|RUNTIME_ERROR|FAIL|4|0.0038209876543209877|
|alert-dialog|PASS|unchanged prior PASS|0|0|
|calendar|FAIL|PASS|0|0.0007067901234567901|
|checkbox|FAIL|FAIL|1|0|
|collapsible|FAIL|PASS|0|0|
|combobox|FAIL|PASS|0|0|
|command|FAIL|FAIL|0|0.002462962962962963|
|context-menu|FAIL|PASS|0|0|
|date-picker|PASS|unchanged prior PASS|0|0|
|dialog|PASS|unchanged prior PASS|0|0|
|drawer|PASS|unchanged prior PASS|0|0|
|dropdown-menu|PASS|unchanged prior PASS|0|0|
|hover-card|FAIL|PASS|0|0.00015123456790123457|
|input-otp|FAIL|FAIL|0|0.004496913580246914|
|menubar|PASS|unchanged prior PASS|0|0|
|navigation-menu|FAIL|FAIL|9|0.0004969135802469135|
|popover|FAIL|FAIL|0|0.001595679012345679|
|radio-group|FAIL|FAIL|14|0.011299382716049383|
|resizable|FAIL|FAIL|0|0.0013302469135802468|
|scroll-area|FAIL|PASS|0|0.00037037037037037035|
|select|PASS|unchanged prior PASS|0|0|
|sheet|PASS|unchanged prior PASS|0|0|
|slider|FAIL|FAIL|6|0.0008333333333333334|
|switch|FAIL|FAIL|44|0|
|tabs|HARNESS_UNSTABLE|HARNESS_UNSTABLE|0|0|
|toast|FAIL|PASS|0|0|
|toggle|FAIL|PASS|0|0|
|toggle-group|FAIL|FAIL|32|0.022790123456790122|
|tooltip|FAIL|FAIL|1|0|

Remaining work is explicit: shared flow timing/semantic aliases, cmdk selected-item stacking, native OTP intrinsic sizing, navigation selected ink, residual popover/radio/resizable pixels, slider real-track/pseudo comparison, ToggleGroup composition and source selected paint, and deterministic Tabs source sampling. Root owns sampler opacity/native-pseudo support; no absent visible source part is silently ignored. Raw evidence is in artifacts/interactive-base360 and artifacts/interactive-correction360.
