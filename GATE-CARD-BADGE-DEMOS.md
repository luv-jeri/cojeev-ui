# Fidelity gate

Candidate source SHA-256: 4ef810bf96f96403b482cd5ec8b0135ba1cf3ba5a30501deb7d652d9aafade9c. Unchanged during run: yes.

Scope: card, badge. 24 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| card | demo.html | 360 | FAIL | 2 | 3.1065% |
| card | demo.html | 390 | FAIL | 2 | 2.9194% |
| card | demo.html | 768 | FAIL | 2 | 0.9314% |
| card | demo.html | 1024 | FAIL | 2 | 0.6986% |
| card | demo.html | 1440 | FAIL | 2 | 0.4968% |
| card | demo.html | 1920 | FAIL | 2 | 0.3726% |
| card | demo-dark.html | 360 | FAIL | 2 | 3.2383% |
| card | demo-dark.html | 390 | FAIL | 2 | 3.1026% |
| card | demo-dark.html | 768 | FAIL | 2 | 0.9975% |
| card | demo-dark.html | 1024 | FAIL | 2 | 0.7482% |
| card | demo-dark.html | 1440 | FAIL | 2 | 0.5320% |
| card | demo-dark.html | 1920 | FAIL | 2 | 0.3990% |
| badge | demo.html | 360 | FAIL | 13 | 0.8654% |
| badge | demo.html | 390 | FAIL | 13 | 0.7989% |
| badge | demo.html | 768 | FAIL | 13 | 0.5719% |
| badge | demo.html | 1024 | FAIL | 13 | 0.4290% |
| badge | demo.html | 1440 | FAIL | 13 | 0.3050% |
| badge | demo.html | 1920 | FAIL | 13 | 0.2288% |
| badge | demo-dark.html | 360 | FAIL | 13 | 0.9769% |
| badge | demo-dark.html | 390 | FAIL | 13 | 0.9017% |
| badge | demo-dark.html | 768 | FAIL | 13 | 0.7287% |
| badge | demo-dark.html | 1024 | FAIL | 13 | 0.5467% |
| badge | demo-dark.html | 1440 | FAIL | 13 | 0.3887% |
| badge | demo-dark.html | 1920 | FAIL | 13 | 0.2917% |

This supplementary run compares each original entries/<component>/demo.html, including parts omitted by the generated isolation cases. The same authored markup is rendered in both initial themes; no documentation example or newly designed fixture replaces it.
