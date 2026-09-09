# Fidelity gate

Candidate source SHA-256: 533324a634eb9dc174c414092bd8d2269ec0be29188a79b1df3a393c835276ac. Unchanged during run: yes.

Scope: alert-dialog, dialog, dropdown-menu. 6 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| alert-dialog | default-default-open-720x480.html | 360 | FAIL | 11 | 3.5920% |
| alert-dialog | default-default-open-dark-720x480.html | 360 | FAIL | 11 | 3.4151% |
| dialog | default-default-open-720x480.html | 360 | FAIL | 16 | 6.1160% |
| dialog | default-default-open-dark-720x480.html | 360 | FAIL | 18 | 4.3562% |
| dropdown-menu | default-default-open-480x360.html | 360 | FAIL | 11 | 1.6123% |
| dropdown-menu | default-default-open-dark-480x360.html | 360 | FAIL | 11 | 1.6423% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
