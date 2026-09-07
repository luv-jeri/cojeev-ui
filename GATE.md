# Fidelity gate

Candidate source SHA-256: f11aace4f0cec6170421e7a46587d73bc809e0d0b5b7716e2b78a88196bf98cb. Unchanged during run: yes.

Scope: attachment, breadcrumb, button-group, carousel, chart, data-table, dropzone, field, input, input-group, message-scroller, native-select, pagination, questionnaire, sidebar, stepper, table, textarea. 18 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| attachment | default-default-rest.html | 360 | RUNTIME_ERROR | 1 | 0.0000% |
| breadcrumb | default-default-rest.html | 360 | FAIL | 0 | 0.7429% |
| button-group | default-default-rest.html | 360 | FAIL | 0 | 0.1460% |
| carousel | default-default-rest-960x360.html | 360 | FAIL | 20 | 0.1546% |
| chart | default-default-rest-960x480.html | 360 | FAIL | 9 | 0.0000% |
| data-table | default-default-rest-960x560.html | 360 | FAIL | 8 | 0.9231% |
| dropzone | default-default-rest.html | 360 | FAIL | 0 | 0.1346% |
| field | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| input | default-default-rest.html | 360 | FAIL | 11 | 0.1691% |
| input-group | default-default-rest.html | 360 | FAIL | 2 | 5.4694% |
| message-scroller | default-default-rest-480x360.html | 360 | PASS | 0 | 0.0000% |
| native-select | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| pagination | default-default-rest.html | 360 | FAIL | 0 | 0.1571% |
| questionnaire | default-default-rest-720x600.html | 360 | FAIL | 3 | 0.0000% |
| sidebar | default-default-rest-480x640.html | 360 | FAIL | 0 | 3.8373% |
| stepper | default-default-rest-720x240.html | 360 | PASS | 0 | 0.0000% |
| table | default-default-rest-720x320.html | 360 | PASS | 0 | 0.0000% |
| textarea | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
