# Fidelity gate

Candidate source SHA-256: b61b24daccdbb739c2aae1a77afc388e0909514ed8aaf4df39c09ed062a74f1c. Unchanged during run: NO.

Scope: alert, aspect-ratio, avatar, badge, button, card, direction, empty, item, kbd, label, marker, message, progress, separator, skeleton, spinner, typography. 18 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| alert | default-default-rest-720x240.html | 360 | PASS | 0 | 0.0000% |
| aspect-ratio | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| avatar | default-default-rest.html | 360 | FAIL | 0 | 0.3198% |
| badge | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| button | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| card | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| direction | default-default-rest.html | 360 | FAIL | 0 | 0.1701% |
| empty | default-default-rest-960x360.html | 360 | FAIL | 6 | 0.0000% |
| item | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| kbd | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| label | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| marker | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| message | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| progress | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| separator | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| skeleton | default-default-rest.html | 360 | FAIL | 2 | 0.0497% |
| spinner | default-default-rest.html | 360 | FAIL | 0 | 0.2673% |
| typography | default-default-rest-720x480.html | 360 | PASS | 0 | 0.0000% |
